import React, { useState, useEffect } from 'react';
import { Components, registerComponent } from '../../../lib/vulcan-lib';
import withErrorBoundary from '../../common/withErrorBoundary'
import { isServer } from '../../../lib/executionEnvironment';
import { useLocation, useNavigation } from '../../../lib/routeUtil';
import type { ToCData, ToCSection } from '../../../server/tableOfContents';
import qs from 'qs'
import isEmpty from 'lodash/isEmpty';
import filter from 'lodash/filter';

export interface ToCDisplayOptions {
  /**
   * Convert section titles from all-caps to title-case. Used for the Concepts page
   * where the LW version has all-caps section headings as a form of bolding.
   */
  downcaseAllCapsHeadings?: boolean
  
  /**
   * Don't show sections nested below a certain depth. Used on the LW version of the
   * Concepts page, where there would otherwise be section headings for subcategories
   * of the core tags, resulting in a ToC that's overwhelmingly big.
   */
  maxHeadingDepth?: number
  
  /**
   * Extra rows to add to the bottom of the ToC. You'll want to use this instead of
   * adding extra React components after the ToC if those rows have corresponding
   * anchors and should be highlighted based on scroll position.
   */
  addedRows?: ToCSection[],
}

const topSection = "top";

const isRegularClick = (ev: React.MouseEvent) => {
  if (!ev) return false;
  return ev.button===0 && !ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey;
}

const TableOfContentsList = ({sectionData, title, onClickSection, displayOptions}: {
  sectionData: ToCData,
  title: string|null,
  onClickSection?: ()=>void,
  displayOptions?: ToCDisplayOptions,
}) => {
  const [currentSection,setCurrentSection] = useState<string|null>(topSection);
  const { history } = useNavigation();
  const location = useLocation();
  const { query } = location;

  useEffect(() => {
    window.addEventListener('scroll', updateHighlightedSection);
    updateHighlightedSection();
    
    return () => {
      window.removeEventListener('scroll', updateHighlightedSection);
    };
  });


  // Return the screen-space current section mark - that is, the spot on the
  // screen where the current-post will transition when its heading passes.
  const getCurrentSectionMark = () => {
    return window.innerHeight/3
  }

  // Return the screen-space Y coordinate of an anchor. (Screen-space meaning
  // if you've scrolled, the scroll is subtracted from the effective Y
  // position.)
  const getAnchorY = (anchorName: string): number|null => {
    let anchor = window.document.getElementById(anchorName);
    if (anchor) {
      let anchorBounds = anchor.getBoundingClientRect();
      return anchorBounds.top + (anchorBounds.height/2);
    } else {
      return null
    }
  }

  const jumpToAnchor = (anchor: string) => {
    if (isServer) return;

    const anchorY = getAnchorY(anchor);
    if (anchorY !== null) {
      delete query.commentId;
      history.push({
        search: isEmpty(query) ? '' : `?${qs.stringify(query)}`,
        hash: `#${anchor}`,
      });
      let sectionYdocumentSpace = anchorY + window.scrollY;
      jumpToY(sectionYdocumentSpace);
    }
  }

  const jumpToY = (y: number) => {
    if (isServer) return;

    try {
      window.scrollTo({
        top: y - getCurrentSectionMark() + 1,
        behavior: "smooth"
      });
    } catch(e) {
      // eslint-disable-next-line no-console
      console.warn("scrollTo not supported, using link fallback", e)
    }
  }

  const updateHighlightedSection = () => {
    let newCurrentSection = getCurrentSection();
    if(newCurrentSection !== currentSection) {
      setCurrentSection(newCurrentSection);
    }
  }

  const { TableOfContentsRow, AnswerTocRow } = Components;

  if (!sectionData)
    return <div/>

  let filteredSections = (displayOptions?.maxHeadingDepth)
    ? filter(sectionData.sections, s=>s.level <= displayOptions.maxHeadingDepth!)
    : sectionData.sections;

  if (displayOptions?.addedRows) {
    filteredSections = [...filteredSections, ...displayOptions.addedRows];
  }

  const getCurrentSection = (): string|null => {
    if (isServer)
      return null;
    if (!filteredSections)
      return null;

    // The current section is whichever section a spot 1/3 of the way down the
    // window is inside. So the selected section is the section whose heading's
    // Y is as close to the 1/3 mark as possible without going over.
    let currentSectionMark = getCurrentSectionMark();

    let currentSection: string|null = null;
    for(let i=0; i<filteredSections.length; i++)
    {
      let sectionY = getAnchorY(filteredSections[i].anchor);

      if(sectionY && sectionY < currentSectionMark)
        currentSection = filteredSections[i].anchor;
    }

    if (currentSection === null) {
      // Was above all the section headers, so return the special "top" section
      return topSection;
    }

    return currentSection;
  }

  const handleClick = async (ev: React.SyntheticEvent, jumpToSection: ()=>void): Promise<void> => {
    ev.preventDefault();
    if (onClickSection) {
      onClickSection();
      // One of the things this callback can do is expand folded-up text which
      // might contain the anchor we want to scroll to. We wait for a setTimeout
      // here, to allow React re-rendering to finish in that case.
      await new Promise((resolve,reject) => setTimeout(resolve, 0));
    }
    jumpToSection();
  }

  // Since the Table of Contents data is sent as part of the post data and
  // partially generated from the post html, changing the answers ordering
  // in the ToC is not trivial to do via a graphql query.
  // Separating the ToC part with answers would require some refactoring,
  // but for now we can just sort the answers client side.
  const answersSorting = query?.answersSorting;
  if (answersSorting === "newest" || answersSorting === "oldest") {
    filteredSections = sectionsWithAnswersSorted(filteredSections, answersSorting);
  }
  
  function adjustHeadingText(text: string|undefined) {
    if (!text) return "";
    if (displayOptions?.downcaseAllCapsHeadings) {
      return downcaseIfAllCaps(text.trim());
    } else {
      return text.trim();
    }
  }

  return <div>
    <TableOfContentsRow key="postTitle"
      href="#"
      onClick={ev => {
        if (isRegularClick(ev)) {
          void handleClick(ev, () => {
            history.push("#");
            jumpToY(0)
          });
        }
      }}
      highlighted={currentSection === topSection}
      title
    >
      {title?.trim()}
    </TableOfContentsRow>
    
    {filteredSections.map((section, index) => {
      return (
        <TableOfContentsRow
          key={section.anchor}
          indentLevel={section.level}
          divider={section.divider}
          highlighted={section.anchor === currentSection}
          href={"#"+section.anchor}
          onClick={(ev) => {
            if (isRegularClick(ev)) {
              void handleClick(ev, () => {
                jumpToAnchor(section.anchor)
              });
            }
          }}
          answer={!!section.answer}
        >
          {section.answer
            ? <AnswerTocRow answer={section.answer} />
            : <span>{adjustHeadingText(section.title)}</span>
          }
        </TableOfContentsRow>
      )
    })}
  </div>
}

const TableOfContentsListComponent = registerComponent(
  "TableOfContentsList", TableOfContentsList, {
    hocs: [withErrorBoundary]
  }
);


/**
 * Returns a shallow copy of the ToC sections with question answers sorted by date,
 * without changing the position of other sections.
 */
const sectionsWithAnswersSorted = (
  sections: ToCSection[],
  sorting: "newest" | "oldest"
) => {
  const answersSectionsIndexes = sections
    .map((section, index) => [section, index] as const)
    .filter(([section, _]) => !!section.answer);
  const originalIndexes = answersSectionsIndexes.map(([_, originalIndex]) => originalIndex);
  const answersSections = answersSectionsIndexes.map(([section, _]) => section);

  const sign = sorting === "newest" ? 1 : -1;
  answersSections.sort((section1, section2) => {
    const value1 = section1.answer?.postedAt || "";
    const value2 = section2.answer?.postedAt || "";
    if (value1 < value2) { return sign; }
    if (value1 > value2) { return -sign; }
    return 0;
  });

  const sortedSections = [...sections];
  for (let [i, section] of answersSections.entries()) {
    sortedSections[originalIndexes[i]] = section;
  }
  return sortedSections;
};

function downcaseIfAllCaps(text: string) {
  // If already mixed-case, don't do anything
  if (text !== text.toUpperCase())
    return text;
  
  // Split on spaces, downcase everything except the first character of each token
  const tokens = text.split(' ');
  const downcaseToken = (tok: string) => {
    if (tok.length > 1) {
      return tok.substr(0,1) + tok.substr(1).toLowerCase();
    } else {
      return tok;
    }
  }
  return tokens.map(tok => downcaseToken(tok)).join(' ');
}

declare global {
  interface ComponentTypes {
    TableOfContentsList: typeof TableOfContentsListComponent
  }
}
