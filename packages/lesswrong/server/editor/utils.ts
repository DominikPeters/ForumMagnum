import pick from 'lodash/pick'
import mjAPI from 'mathjax-node'
import Revisions from '../../lib/collections/revisions/collection'
import {isAnyTest, isMigrations} from '../../lib/executionEnvironment'

export const trimLatexAndAddCSS = (dom: any, css: string) => {
  // Remove empty paragraphs
  var paragraphs = dom.getElementsByClassName("MJXc-display");
  // We trim all display equations that don't have any textContent. This seems
  // Likely fine, but there is some chance this means we are also trimming some
  // Equations that only have images or something like that. If this happen, we
  // want to adjust this part.
  for (var i = 0, len = paragraphs.length; i < len; i++) {
      var elem = paragraphs[i];
      if (elem.textContent.trim() == '') {
          elem.parentNode.removeChild(elem);
          i--;
          len--;
      }
  }
  const [firstLatexElement] = dom.getElementsByClassName("mjx-chtml");
  const styleNode = dom.createElement("style");
  styleNode.textContent = css;
  if (firstLatexElement) firstLatexElement.appendChild(styleNode);
  return dom
}

const MATHJAX_OPTIONS = {
  jax: ['input/TeX', 'output/CommonHTML'],
  TeX: {
    extensions: ['autoload-all.js', 'Safe.js'],
  },
  messageStyles: 'none',
  showProcessingMessages: false,
  showMathMenu: false,
  showMathMenuMSIE: false,
  preview: 'none',
  delayStartupTypeset: true,
}

if (!isAnyTest && !isMigrations) {
  mjAPI.config({
    MathJax: MATHJAX_OPTIONS
  });
  mjAPI.start();
}

export const preProcessLatex = async (content: AnyBecauseTodo) => {
  // MathJax-rendered LaTeX elements have an associated stylesheet. We put this
  // inline with the first (and only the first) MathJax element; this ensures
  // that it ends up in feeds, in greaterwrong's scrapes, etc, whereas if it
  // were part of the site's top-level styles, it wouldn't. This leads to
  // at most one copy per LaTeX-using post or comment; so there's some
  // duplication, but not the extreme amount of duplication we had before
  // (where a single post that used LaTeX heavily added ~80 copies of 19kb
  // each to the front page).
  //
  // The MathJax stylesheet varies with its configuration, but (we're pretty
  // sure) does not vary with the content of what it's rendering.

  // gets set to true if a stylesheet has already been added
  let mathjaxStyleUsed = false;

  for (let key in content.entityMap) { // Can't use forEach with await
    let value = content.entityMap[key];
    if(value.type === "INLINETEX" && value.data.teX) {
      const mathJax = await mjAPI.typeset({
            math: value.data.teX,
            format: "inline-TeX",
            html: true,
            css: !mathjaxStyleUsed,
      })
      value.data = {...value.data, html: mathJax.html};
      if (!mathjaxStyleUsed) {
        value.data.css = mathJax.css;
        mathjaxStyleUsed = true;
      }
      content.entityMap[key] = value;
    }
  }

  for (let key in content.blocks) {
    const block = content.blocks[key];
    if (block.type === "atomic" && block.data.mathjax) {
      const mathJax = await mjAPI.typeset({
        math: block.data.teX,
        format: "TeX",
        html: true,
        css: !mathjaxStyleUsed,
      })
      block.data = {...block.data, html: mathJax.html};
      if (!mathjaxStyleUsed) {
        block.data.css = mathJax.css;
        mathjaxStyleUsed = true;
      }
    }
  }

  return content;
}

const revisionFieldsToCopy: (keyof DbRevision)[] = [
  "originalContents",
  "updateType",
  "commitMessage",
  "html",
  "version",
  "userId",
  "editedAt",
  "wordCount",
];

/**
 * Make an editable document reflect the latest revision available
 *
 * Documents can get out of sync with revisions if a revision gets deleted, or
 * if there's a bug. This function will update a document to match the most
 * recent *version* in the revisions schema.
 */
export async function syncDocumentWithLatestRevision<T extends DbObject>(
  collection: CollectionBase<T>,
  document: T,
  fieldName: string
): Promise<void> {
  const latestRevision = await Revisions.findOne(
    {
      documentId: document._id,
      draft: false
    },
    { sort: { version: -1 } }
  )
  if (!latestRevision) {
    // Some documents are deletable, but typescript doesn't know that
    if ((document as unknown as {deleted: boolean}).deleted) {
      return
    } else {
      throw new Error(
        `Document ${document._id} (${collection.collectionName}) has no revisions`
      )
    }
  }
  await collection.rawUpdateOne(document._id, {
    $set: {
      [fieldName]: pick(latestRevision, revisionFieldsToCopy),
      [`${fieldName}_latest`]: latestRevision._id
    }
  })
}

export type MaybeDrafteable = { draft?: boolean } 
export const isBeingUndrafted = (oldDocument: MaybeDrafteable, newDocument: MaybeDrafteable) => oldDocument.draft && !newDocument.draft
