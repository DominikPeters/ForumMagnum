import { allQueries } from '../../lib/queries';
import { generatedFileHeader, parsedGraphqlTypeToTypescript, graphqlTypeToTypescript, assert, simplSchemaTypeToGraphql } from './typeGenerationUtils';
import { getAdditionalSchemas, queries, mutations } from '../../lib/vulcan-lib/graphql';
import { getCollectionName } from '../../lib/vulcan-lib/collections';
import { getFragmentFieldType } from './generateFragmentTypes';
import { getSchema } from '../../lib/utils/getSchema';
import gql from 'graphql-tag';
import GraphQLJSON from 'graphql-type-json';
import { print as gqlPrint } from 'graphql';
import type { GraphQLScalarType } from 'graphql';

const queryFileHeader = generatedFileHeader+`//
// Contains Typescript signatures for queries, generated by
// server/codegen/generateQueryTypes.ts.
//
`

export function generateQueryTypes(context: TypeGenerationContext): string {
  const sb: string[] = [];
  const queryNames = Object.keys(allQueries) as (keyof typeof allQueries)[];
  
  for (const queryName of queryNames) {
    const queryGraphqlStr = allQueries[queryName];
    const parsedGraphql = gql(queryGraphqlStr);
    assert(parsedGraphql.definitions.length===1);
    const queryParsedGraphql = parsedGraphql.definitions[0];
    assert(queryParsedGraphql.kind==="OperationDefinition");
    
    const resultType = generateQueryTypeDefinition({context, queryName, parsedQuery: queryParsedGraphql});
    sb.push(resultType);
    const argumentsType = generateQueryArgumentsTypeDefinition(context, queryName, queryParsedGraphql);
    sb.push(argumentsType);
  }
  
  sb.push("interface QueryResultTypes {\n");
  for (const queryName of queryNames) {
    sb.push(`  ${queryName}: Query${queryName}Result\n`);
  }
  sb.push("}\n\n");
  
  sb.push("interface QueryArgumentTypes {\n");
  for (const queryName of queryNames) {
    sb.push(`  readonly ${queryName}: Query${queryName}Variables\n`);
  }
  sb.push("}\n\n");
  
  sb.push(`type QueryName = ${queryNames.map(n=>JSON.stringify(n)).join("|")}\n`);
  
  return queryFileHeader + sb.join('');
}

const extractQueryName = (queryText: string): string => {
  const match = queryText.match(/query ([_a-zA-Z][_a-zA-Z0-9]+)/)
  if (!match) throw new Error("Could not extract query name");
  return match[1];
}

export function generateQueryArgumentsTypeDefinition(context: TypeGenerationContext, queryName: string, parsedGraphqlVariables: any) {
  const sb: string[] = [];
  
  sb.push(`interface Query${queryName}Variables {\n`);
  for (let variableDefinition of parsedGraphqlVariables.variableDefinitions) {
    const parsedGraphqlType = variableDefinition.type;
    const variableName = variableDefinition?.variable?.name?.value;
    sb.push(`  ${variableName}: ${parsedGraphqlTypeToTypescript(context, parsedGraphqlType)}\n`);
  }
  sb.push(`}\n\n`);
  
  return sb.join('');
}

/**
 * Return a mapping from names of graphql resolvers (registered with
 * addGraphQLQuery) to their return types (as graphql strings).
 */
export function getResolverResultTypes(): Record<string,string> {
  let result: Record<string,string> = {};
  for (let {query,description} of queries) {
    const {name,returnTypeGql} = graphqlQueryPrototypeToNameAndReturnType(query);
    result[name] = returnTypeGql;
  }
  return result;
}

/**
 * Given the graphql prototype of a query, parse and extract its name and return
 * type. Eg
 *   TagUpdatesInTimeBlock(before: Date!, after: Date!): [TagUpdates!]
 * becomes
 *   {name: "TagUpdatesInTimeBlock", returnTypeGql: "[TagUpdates!]"}
 */
export function graphqlQueryPrototypeToNameAndReturnType(queryDefinition: string): {name: string, returnTypeGql: string} {
  // HACK: Separate the type from the rest with a regex
  // (There's probably a way to get the real graphql parser to do this)
  const match = queryDefinition.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(\(.*\))?:\s*([^:]*)$/s);
  if (!match) throw new Error("Query didn't match regex")
  const name = match[1];
  const returnTypeGql = match[3];
  return {name, returnTypeGql};
}

/**
 * Generate Typescript for a graphql query. parsedQuery is the AST of a graphql
 * query, ie something like:
 *   query myQuery {
 *     SomeResolver($arg: String!) {
 *       foo {
 *         _id
 *         title
 *       }
 *     }
 *   }
 */
function generateQueryTypeDefinition({context, queryName, parsedQuery}: {
  context: TypeGenerationContext,
  queryName: string,
  parsedQuery: any
}): string {
  const sb: Array<string> = [];
  const interfaceName = `Query${queryName}Result`;
  const allSubfragments: Array<string> = [];
  
  sb.push(`interface ${interfaceName} {\n`);
  
  if (!parsedQuery?.selectionSet?.selections) {
    throw new Error(`Missing selections in parsedQuery: ${parsedQuery}`);
  }

  for (let selection of parsedQuery.selectionSet.selections) {
    switch(selection.kind) {
      case "Field":
        const resolverName = selection.name.value;
        const resolverResultTypeGql = context.resolverResultTypes[resolverName];
        const {typescriptType, subfragment} = graphqlTypeAndSelectionToTypescript({
          context, selection,
          graphqlType: resolverResultTypeGql,
          nonnull: false,
          namePrefix: interfaceName+"_",
        });
        sb.push(`  readonly ${resolverName}: ${typescriptType},\n`);
        
        if (subfragment)
          allSubfragments.push(subfragment);
        break;
      default:
        throw new Error("Unrecognized GraphQL selection kind at root of query: "+selection.kind);
    }
  }
  
  sb.push(`}\n\n`);
  for (let subfragment of allSubfragments)
    sb.push(subfragment);
  
  return sb.join('');
}

/**
 * Given a graphql type and a selection, return a corresponding Typescript type.
 * The selection is a piece of the syntax tree for a graphql query or fragment,
 * so it can have subselectors. If subselectors require generating additional
 * typescript interfaces to represent them, they are given names starting with
 * namePrefix and their declarations are returned together with the main type
 * as `subfragment`.
 */
function graphqlTypeAndSelectionToTypescript({context, graphqlType, selection, nonnull, namePrefix}: {
  context: TypeGenerationContext,
  graphqlType: string,
  selection: any,
  nonnull: boolean,
  namePrefix: string,
}): { typescriptType: string, subfragment: string|null } {
  if (graphqlType.endsWith("!")) {
    const {typescriptType: innerTypescriptType, subfragment} = graphqlTypeAndSelectionToTypescript({
      context, selection, namePrefix,
      graphqlType: graphqlType.substr(0, graphqlType.length-1),
      nonnull: true,
    });
    return { typescriptType: innerTypescriptType, subfragment };
  }
  if (graphqlType.startsWith("[") && graphqlType.endsWith("]")) {
    const {typescriptType: innerTypescriptType, subfragment} = graphqlTypeAndSelectionToTypescript({
      context, selection, namePrefix,
      graphqlType: graphqlType.substr(1, graphqlType.length-2),
      nonnull: false,
    });
    return {
      typescriptType: `Array<${innerTypescriptType}>`,
      subfragment,
    };
  }
  
  if (selection.selectionSet) {
    const fieldName = selection.name.value;
    const subfragmentName = namePrefix+fieldName;
    const subfragmentSb: string[] = [];
    const inheritFragments: string[] = [];
    const subsubFragments: string[] = [];
    
    for (let subselection of selection.selectionSet.selections) {
      if (subselection.kind === "FragmentSpread") {
        inheritFragments.push(subselection.name.value);
      }
    }
    if (inheritFragments.length > 0) {
      subfragmentSb.push(`interface ${subfragmentName} extends ${inheritFragments.join(", ")} {\n`);
    } else {
      subfragmentSb.push(`interface ${subfragmentName} {\n`);
    }
    for (let subselection of selection.selectionSet.selections) {
      if (subselection.kind === "Field") {
        const fieldName = subselection.name.value;
        const fieldType = getSelectedFieldType({context, graphqlType, fieldName});
        if (fieldType) {
          const {typescriptType: innerTypescriptType, subfragment: innerSubfragment} = graphqlTypeAndSelectionToTypescript({
            context,
            graphqlType: fieldType,
            selection: subselection,
            nonnull: false,
            namePrefix: `${namePrefix}_${fieldName}`,
          });
          subfragmentSb.push(`  ${fieldName}: ${innerTypescriptType}\n`);
          if (innerSubfragment) {
            subsubFragments.push(innerSubfragment);
          }
        } else {
          subfragmentSb.push(`  ${fieldName}: any //could not determine type of ${graphqlType}.${fieldName}\n`);
        }
      }
    }
    subfragmentSb.push(`}\n`);
    return {
      typescriptType: subfragmentName,
      subfragment: subfragmentSb.join("")+subsubFragments.join(""),
    };
  } else {
    return {
      typescriptType: graphqlTypeToTypescript(context, graphqlType, nonnull),
      subfragment: null
    };
  }
}

/**
 * Given a graphql type and a field name, where the graphql type is either the
 * name of a schema with fields or the name of a collection, return the type (as
 * a graphql string) of the named field. If not a valid field or not able to
 * determine the type, returns null.
 */
function getSelectedFieldType({context, graphqlType, fieldName}: {
  context: TypeGenerationContext,
  graphqlType: string,
  fieldName: string
}): string|null {
  const collection = context.collections[getCollectionName(graphqlType)];
  if (collection) {
    return getCollectionResolverTypeGql({context, collection, fieldName});
  } else {
    return context.gqlSchemaFieldTypes?.[graphqlType]?.[fieldName];
  }
}

/**
 * Given a collection and field name, return the GQL type (as a string) which
 * results from querying that field on that collection. Could be based on the
 * field's base type or based on resolveAs. If we can't resolve this to a
 * graphql type, returns null.
 */
export function getCollectionResolverTypeGql({context, collection, fieldName}: {
  context: TypeGenerationContext,
  collection: CollectionBase<any>,
  fieldName: string,
}): string|null {
  const schema = getSchema(collection);
  
  for (let schemaFieldName of Object.keys(schema)) {
    const fieldWithResolver = schema[schemaFieldName];
    if (fieldWithResolver?.resolveAs?.fieldName === fieldName) {
      assert(!!fieldWithResolver.resolveAs.type);
      return graphqlTypeStringOrScalarTypeToString(fieldWithResolver.resolveAs.type);
    }
  }
  
  if (fieldName in schema) {
    const fieldSchema = schema[fieldName];
    assert(fieldSchema?.type);
    if (fieldSchema?.resolveAs?.type && !fieldSchema?.resolveAs?.fieldName) {
      return graphqlTypeStringOrScalarTypeToString(fieldSchema.resolveAs.type);
    } else {
      return simplSchemaTypeToGraphql(context, schema, fieldName);
    }
  }
  
  return null;
}

/**
 * Given a string (GQL type) or a GraphQLScalarType (eg GraphQLJSON), return a graphql string.
 * If we can't resolve this to a graphql type, returns null.
 */
function graphqlTypeStringOrScalarTypeToString(gqlType: string|GraphQLScalarType): string|null {
  if (gqlType === GraphQLJSON) {
    return "JSON!"; //(untested branch, not sure if correct)
  } else if (typeof gqlType === "string") {
    return gqlType;
  } else {
    return null;
  }
}

/**
 * Collect graphql added schemas (corresponding to calls to addGraphQLSchema),
 * and build an index from graphql type => field name => field type (GQL type
 * string). This is incorporated into TypeGenerationContext as gqlSchemaFieldTypes.
 */
export function getGraphqlSchemaFieldTypes(): Record<string,Record<string,string>> {
  const parsedGqlSchemas = gql(getAdditionalSchemas());
  let result: Record<string,Record<string,string>> = {};
  
  for (let declaration of parsedGqlSchemas.definitions) {
    if (declaration?.kind === "ObjectTypeDefinition" && declaration.fields) {
      const objectTypeName = declaration.name.value;
      let fieldTypes: Record<string,string> = {};
      for (let field of declaration.fields) {
        const fieldName = field.name?.value;
        const fieldTypeGql = field.type;
        fieldTypes[fieldName] = gqlPrint(fieldTypeGql);
      }
      result[objectTypeName] = fieldTypes;
    }
  }
  
  return result;
}

/**
 * Collect graphql added schemas (corresponding to calls to addGraphQLSchema),
 * and make Typescript declarations that match them.
 */
export function graphqlSchemasToTS(context: TypeGenerationContext): string {
  const sb: string[] = [];
  const parsedGqlSchemas = gql(getAdditionalSchemas());
  
  for (let declaration of parsedGqlSchemas.definitions) {
    if (declaration?.kind === "ObjectTypeDefinition") {
      sb.push(graphqlTypeDeclarationToTypescript(context, declaration));
    }
  }
  
  return sb.join('');
}

/**
 * Wrapper around graphqlTypeDeclarationToTypescript, similar to graphqlSchemasToTS
 * except that it takes a GQL schema string as an argument rather than using the
 * schemas that were registered with addGraphQLSchema. Used for unit-testing.
 */
export function graphqlTypeDeclarationStrToTypescript(context: TypeGenerationContext, typeDeclaration: string) {
  const parsedGql = gql(typeDeclaration);
  const sb: string[] = [];
  
  for (let definition of parsedGql.definitions) {
    if (definition?.kind === "ObjectTypeDefinition" && definition.fields) {
      sb.push(graphqlTypeDeclarationToTypescript(context, definition));
    }
  }
  
  return sb.join('');
}

/**
 * Take a parsed graphql schema, and generate a corresponding Typescript declaration.
 */
export function graphqlTypeDeclarationToTypescript(context: TypeGenerationContext, declaration: any) {
  const sb: string[] = [];
  const objectTypeName = declaration.name.value;
  sb.push(`interface ${objectTypeName} {\n`);
  for (let field of declaration.fields) {
    const fieldName = field.name?.value;
    const fieldTypeGql = field.type;
    const fieldTypeTS = parsedGraphqlTypeToTypescript(context, fieldTypeGql);
    sb.push(`  ${fieldName}: ${fieldTypeTS}\n`);
  }
  sb.push('}\n');
  
  return sb.join('');
}

