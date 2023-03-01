import { capitalize } from "lodash/fp";
import { forumTypeSetting, ForumTypeString } from "./instanceSettings"

//Partial Type adds "undefined" erroneously to T, so we need to explicitly tell TS that it can't be undefined.
type NonUndefined<T> = T extends undefined ? never : T;

export type ForumOptions<T> = Record<ForumTypeString, T> |
  (Partial<Record<ForumTypeString, T>> & {default: T})

export function forumSelect<T>(forumOptions: ForumOptions<T>, forumType?: ForumTypeString): NonUndefined<T> {
  forumType ??= forumTypeSetting.get();
  if (forumType in forumOptions) {
    return forumOptions[forumType] as NonUndefined<T> // The default branch ensures T always exists
  }
  // @ts-ignore - if we get here, our type definition guarantees that there's a default set
  return forumOptions.default
}

export class DeferredForumSelect<T> {
  constructor(private forumOptions: ForumOptions<T>) {}

  get(forumType?: ForumTypeString): NonUndefined<T> {
    return forumSelect(this.forumOptions, forumType);
  }
}

/**
 * Convert heading to sentence case on the EA Forum, leave as is on LW (will usually be "start case" e.g. "Set Topics").
 * In the event of edge cases (e.g. "EA Forum" -> "Ea forum"), it's probably best to do an inline forumTypeSetting check
 */
export const preferredHeadingCase = forumSelect({
  EAForum: capitalize, // e.g. "Set Topics" => "Set topics"
  default: (s: string) => s,
});
