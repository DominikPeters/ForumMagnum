import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { captureException }from '@sentry/core';
import { linkIsExcludedFromPreview } from '../linkPreview/HoverPreviewLink';
import { isEAForum } from '../../lib/instanceSettings';
import { toRange } from '../../lib/vendor/dom-anchor-text-quote';
import { rawExtractElementChildrenToReactComponent, wrapRangeWithSpan } from '../../lib/utils/rawDom';

interface ExternalProps {
  /**
   * The content to show. This MUST come from a GraphQL resolver which does 
   * sanitization, such as post.contents.html
   */
  dangerouslySetInnerHTML: { __html: string };
  
  /**
   * Type-annotation reflecting that you can make a ref of this and call its
   * methods. (Doing so is handled by React, not by anything inside of this
   * using the ref prop)
   */
  ref?: React.RefObject<ContentItemBody>

  // className: Name of an additional CSS class to apply to this element.
  className?: string;

  /**
   * description: (Optional) A human-readable string describing where this
   * content came from. Used in error logging only, not displayed to users.
   */
  description?: string;

  /**
   * Passed through to HoverPreviewLink with link substitution. Only implemented
   * for hover-previews of tags in particular. (This was a solution to some
   * index pages in the Library being very slow to load).
   */
  noHoverPreviewPrefetch?: boolean;

  /**
   * If passed, all links in the content will have the nofollow attribute added.
   * Use for content that has risk of being spam (eg brand-new users).
   */
  nofollow?: boolean;

  /**
   * Extra elements to insert into the document (used for side-comment
   * indicators). This is a mapping from element IDs of block elements (in the
   * `id` attribute) to React elements to insert into those blocks.
   */
  idInsertions?: Record<string, React.ReactNode>;

  /**
   * Substrings to replace with an element. Used for highlighting inline
   * reactions.
   */
  replacedSubstrings?: Record<string, ContentReplacedSubstringComponent>
}

export type ContentReplacedSubstringComponent = (props: {
  children: React.ReactNode
}) => React.ReactNode;

interface ContentItemBodyProps extends ExternalProps, WithStylesProps, WithUserProps, WithLocationProps {}
interface ContentItemBodyState {
  updatedElements: boolean,
  renderIndex: number
}

// The body of a post/comment/etc, created by taking server-side-processed HTML
// out of the result of a GraphQL query and adding some decoration to it. In
// particular, if this is the client-side render, adds scroll indicators to
// horizontally-scrolling LaTeX blocks.
//
// This doesn't apply styling (other than for the decorators it adds) because
// it's shared between entity types, which have styling that differs.
//
// Props:
//    dangerouslySetInnerHTML: Follows the same convention as
//      dangerouslySetInnerHTML on a div, ie, you set the HTML content of this
//      by passing dangerouslySetInnerHTML={{__html: "<p>foo</p>"}}.
export class ContentItemBody extends Component<ContentItemBodyProps,ContentItemBodyState> {
  private bodyRef: React.RefObject<HTMLDivElement>

  private replacedElements: Array<{
    replacementElement: React.ReactNode
    container: HTMLElement
  }>
  
  constructor(props: ContentItemBodyProps) {
    super(props);
    this.bodyRef = React.createRef<HTMLDivElement>();
    this.replacedElements = [];
    this.state = {
      updatedElements:false,
      renderIndex: 0,
    }
  }

  componentDidMount () {
    this.applyLocalModifications();
  }
  
  componentDidUpdate(prevProps: ContentItemBodyProps) {
    if (this.state.updatedElements) {
      const htmlChanged = prevProps.dangerouslySetInnerHTML?.__html !== this.props.dangerouslySetInnerHTML?.__html;
      const replacedSubstringsChanged = prevProps.replacedSubstrings !== this.props.replacedSubstrings;
      if (htmlChanged || replacedSubstringsChanged) {
        this.replacedElements = [];
        this.setState({
          updatedElements: false,
          renderIndex: this.state.renderIndex+1,
        });
      }
    } else {
      this.applyLocalModifications();
    }
  }
  
  applyLocalModifications() {
    const element = this.bodyRef.current;
    if (element) {
      this.applyLocalModificationsTo(element);
      this.setState({updatedElements: true})
    }
  }

  applyLocalModificationsTo(element: HTMLElement) {
    try {
      // Replace substrings (for inline reacts) goes first, because it can split
      // elements that other substitutions work on (in particular it can split
      // an <a> tag into two).
      this.replaceSubstrings(element);

      this.markScrollableBlocks(element);
      this.collapseFootnotes(element);
      this.markHoverableLinks(element);
      this.markElicitBlocks(element);
      this.wrapStrawPoll(element);
      this.applyIdInsertions(element);
    } catch(e) {
      // Don't let exceptions escape from here. This ensures that, if client-side
      // modifications crash, the post/comment text still remains visible.
      captureException(e);
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }
  
  
  /**
   * Return whether a given node from the DOM is inside this ContentItemBody.
   * Used for checking the selection-anchor in a mouse event, for inline reacts.
   */
  containsNode(node: Node): boolean {
    return !!this.bodyRef.current?.contains(node);
  }
  
  /**
   * Return a text stringified version of the contents (by stringifying from the
   * DOM). This is currently used only for warning that an inline-react
   * identifier is ambiguous; this isn't going to be nicely formatted and
   * shouldn't be presented to the user (for that, go to the source docuemnt and
   * get a markdown version).
   */
  getText(): string {
    return this.bodyRef.current?.textContent ?? ""
  }
  
  getAnchorEl(): HTMLDivElement|null {
    return this.bodyRef.current;
  }
  
  
  render() {
    const html = this.props.nofollow ? addNofollowToHTML(this.props.dangerouslySetInnerHTML.__html) : this.props.dangerouslySetInnerHTML.__html
    
    return (<React.Fragment>
      <div
        key={this.state.renderIndex}
        className={this.props.className}
        ref={this.bodyRef}
        dangerouslySetInnerHTML={{__html: html}}
      />
      {
        this.replacedElements.map(replaced => {
          return ReactDOM.createPortal(
            replaced.replacementElement,
            replaced.container
          );
        })
      }
    </React.Fragment>);
  }


  /**
   * Given an HTMLCollection, return an array of the elements inside it. Note
   * that this is covering for a browser-specific incompatibility: in Edge 17
   * and earlier, HTMLCollection has `length` and `item` but isn't iterable.
   */
  htmlCollectionToArray(collection: HTMLCollectionOf<HTMLElement>): HTMLElement[] {
    if (!collection) return [];
    let ret: Array<HTMLElement> = [];
    for (let i=0; i<collection.length; i++)
      ret.push(collection.item(i)!);
    return ret;
  }
  
  /**
   * Find elements inside the contents with the given classname, and return them
   * as an array.
   */
  getElementsByClassname(element: HTMLElement, classname: string): HTMLElement[] {
    const elementCollection = element.getElementsByClassName(classname);
    
    if (!elementCollection) return [];
    
    let ret: Array<HTMLElement> = [];
    for (let i=0; i<elementCollection.length; i++) {
      // Downcast Element->HTMLElement because the HTMLCollectionOf type doesn't
      // know that getElementsByClassName only returns elements, not text
      // nodes/etc
      ret.push(elementCollection.item(i) as HTMLElement);
    }
    return ret;
  }
  
  // Find elements that are too wide, and wrap them in HorizScrollBlock.
  // This is client-only because it requires measuring widths.
  markScrollableBlocks = (element: HTMLElement) => {
    // Iterate through top-level (block) elements, checking their width. If any
    // of them overflow the container, they'll get replaced by a
    // ScrollableBlock.
    const allTopLevelBlocks = element.childNodes;
    for (let i=0; i<allTopLevelBlocks.length; i++) {
      const block = allTopLevelBlocks[i];
      if (block.nodeType === Node.ELEMENT_NODE) {
        const blockAsElement = block as HTMLElement;
        if (blockAsElement.scrollWidth > this.bodyRef.current!.clientWidth+1) {
          this.addHorizontalScrollIndicators(blockAsElement);
        }
      }
    }
  }
  
  // Given an HTML block element which has horizontal scroll, wrap it in a
  // <HorizScrollBlock>.
  addHorizontalScrollIndicators = (block: HTMLElement) => {
    const ScrollableContents = rawExtractElementChildrenToReactComponent(block)
    this.replaceElement(block, <Components.HorizScrollBlock>
      <ScrollableContents/>
    </Components.HorizScrollBlock>);
  };

  forwardAttributes = (node: HTMLElement|Element) => {
    const result: Record<string, unknown> = {};
    const attrs = node.attributes ?? [];
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.name === "class") {
        result.className = attr.value;
      } else {
        result[attr.name] = attr.value;
      }
    }
    return result;
  }


  collapseFootnotes = (body: HTMLElement) => {
    if (!isEAForum || !body) {
      return;
    }

    const footnotes = body.querySelector(".footnotes");
    if (footnotes) {
      let innerHTML = footnotes.innerHTML;
      if (footnotes.tagName !== "SECTION") {
        innerHTML = `<section>${innerHTML}</section>`;
      }
      const collapsedFootnotes = (
        <Components.CollapsedFootnotes
          footnotesHtml={innerHTML}
          attributes={this.forwardAttributes(footnotes)}
        />
      );
      this.replaceElement(footnotes, collapsedFootnotes);
    }
  }

  markHoverableLinks = (element: HTMLElement) => {
    const linkTags = this.htmlCollectionToArray(element.getElementsByTagName("a"));
    for (let linkTag of linkTags) {
      const TagLinkContents = rawExtractElementChildrenToReactComponent(linkTag);
      
      const href = linkTag.getAttribute("href");
      if (!href || linkIsExcludedFromPreview(href))
        continue;
      const id = linkTag.getAttribute("id") ?? undefined;
      const rel = linkTag.getAttribute("rel") ?? undefined;
      const replacementElement = <Components.HoverPreviewLink
        href={href}
        contentSourceDescription={this.props.description}
        id={id}
        rel={rel}
        noPrefetch={this.props.noHoverPreviewPrefetch}
      >
        <TagLinkContents/>
      </Components.HoverPreviewLink>
      this.replaceElement(linkTag, replacementElement);
    }
  }

  markElicitBlocks = (element: HTMLElement) => {
    const elicitBlocks = this.getElementsByClassname(element, "elicit-binary-prediction");
    for (const elicitBlock of elicitBlocks) {
      if (elicitBlock.dataset?.elicitId) {
        const replacementElement = <Components.ElicitBlock questionId={elicitBlock.dataset.elicitId}/>
        this.replaceElement(elicitBlock, replacementElement)
      }
    }
  }

  /**
   * Find embedded Strawpoll blocks (an iframe integration to a polling site),
   * and replace them with WrappedStrawPoll, which causes them to be a request
   * to log in if you aren't logged in. See the StrawPoll block in `embedConfig`
   * in `editorConfigs.js` (compiled into the CkEditor bundle). The DOM
   * structure of the embed looks like:
   *
   *   <div class="strawpoll-embed" id="strawpoll_{pollId}>
   *     <iframe src="https://strawppoll.com/embed/polls/{pollId}"></iframe>
   *   </div>
   *
   * (FIXME: The embed-HTML in editorConfigs also has a bunch of stuff in it
   * that's unnecessary, which is destined to get stripped out by the HTML
   * validator)
   */
  wrapStrawPoll = (element: HTMLElement) => {
    const strawpollBlocks = this.getElementsByClassname(element, "strawpoll-embed");
    for (const strawpollBlock of strawpollBlocks) {
      const id = strawpollBlock.getAttribute("id");
      const iframe = strawpollBlock.getElementsByTagName("iframe");
      const iframeSrc = iframe[0]?.getAttribute("src") ?? "";
      const replacementElement = <Components.WrappedStrawPoll id={id} src={iframeSrc} />
      this.replaceElement(strawpollBlock, replacementElement)
    }
  }
  
  replaceSubstrings = (element: HTMLElement) => {
    if(this.props.replacedSubstrings) {
      for (let str of Object.keys(this.props.replacedSubstrings)) {
        const replacement: ContentReplacedSubstringComponent = this.props.replacedSubstrings[str]!;

        try {
          // Find (the first instance of) the string to replace. This should be
          // an HTML text node plus an offset into that node.
          //
          // We're using the dom-anchor-text-quote library for this search,
          // which is a thin wrapper around diff-match-patch, which is a diffing
          // library with a full suite of fuzzy matching heuristics.
          const range: Range|null = toRange(
            element,
            { exact: str.trim() },
            { hint: 0 }, //TODO: store offsets with text, make use for resolving match ambiguity
          );
          
          // Do surgery on the DOM
          if (range) {
            const span = wrapRangeWithSpan(range)
            if (span) {
              const InlineReactedSpan = rawExtractElementChildrenToReactComponent(span);
              const replacementNode = replacement({
                children: <InlineReactedSpan/>
              });
              this.replaceElement(span, replacementNode);
            }
          }
        } catch {
          // eslint-disable-next-line no-console
          console.error(`Error highlighting string ${str} in ${this.props.description ?? "content block"}`);
        }
      }
    }
  }
  
  applyIdInsertions = (element: HTMLElement) => {
    if (!this.props.idInsertions) return;
    for (let id of Object.keys(this.props.idInsertions)) {
      const addedElement = this.props.idInsertions[id];
      const container = document.getElementById(id);
      // TODO: Check that it's inside this ContentItemBody
      if (container) this.insertElement(container, <>{addedElement}</>);
    }
  }


  replaceElement = (replacedElement: HTMLElement|Element, replacementElement: React.ReactNode) => {
    const replacementContainer = document.createElement("span");
    if (replacementContainer) {
      this.replacedElements.push({
        replacementElement: replacementElement,
        container: replacementContainer,
      });
      replacedElement.parentElement?.replaceChild(replacementContainer, replacedElement);
    }
  }
  
  insertElement = (container: HTMLElement, insertedElement: React.ReactNode) => {
    const insertionContainer = document.createElement("span");
    this.replacedElements.push({
      replacementElement: insertedElement,
      container: insertionContainer,
    });
    container.prepend(insertionContainer);
  }
}


const addNofollowToHTML = (html: string): string => {
  return html.replace(/<a /g, '<a rel="nofollow" ')
}


const ContentItemBodyComponent = registerComponent<ExternalProps>("ContentItemBody", ContentItemBody, {
  // This component can't have HoCs because it's used with a ref, to call
  // methods on it from afar, and many HoCs won't pass the ref through.
});

declare global {
  interface ComponentTypes {
    ContentItemBody: typeof ContentItemBodyComponent
  }
}
