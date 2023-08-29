import { getForumType, ThemeOptions } from './themeNames';
import { baseTheme } from './createThemeDefaults';
import { createMuiTheme, Theme as MuiThemeType } from '@material-ui/core/styles';
import { getUserTheme } from './userThemes/index';
import { getSiteTheme } from './siteThemes/index';
import type { ForumTypeString } from '../lib/instanceSettings';
import deepmerge from 'deepmerge';

const themeCache = new Map<string,ThemeType>();

// Get a theme for the given theme options.
// NOTE: Somewhere downstream, this feeds into a JSS-compilation cache. It's
// important that, given the same theme options, this always return something
// reference-equal to other versions with the same theme options, or else there
// will be a memory leak on every pageload.
export const getForumTheme = (themeOptions: ThemeOptions): MuiThemeType&ThemeType => {
  const forumType = getForumType(themeOptions);
  const themeCacheKey = `${forumType}/${themeOptions.name}`;
  
  if (!themeCache.has(themeCacheKey)) {
    const siteTheme = getSiteTheme(forumType);
    const userTheme = getUserTheme(themeOptions.name);
    const theme = buildTheme(userTheme, siteTheme, forumType);
    themeCache.set(themeCacheKey, theme);
  }
  
  return themeCache.get(themeCacheKey)! as any;
}

const buildTheme = (userTheme: UserThemeSpecification, siteTheme: SiteThemeSpecification, forumType: ForumTypeString): ThemeType => {
  let shadePalette: ThemeShadePalette = baseTheme.shadePalette;
  if (siteTheme.shadePalette) shadePalette = deepmerge(shadePalette, siteTheme.shadePalette);
  if (userTheme.shadePalette) shadePalette = deepmerge(shadePalette, userTheme.shadePalette);
  
  let componentPalette: ThemeComponentPalette = baseTheme.componentPalette(shadePalette);
  if (siteTheme.componentPalette) componentPalette = deepmerge(componentPalette, siteTheme.componentPalette(shadePalette));
  if (userTheme.componentPalette) componentPalette = deepmerge(componentPalette, userTheme.componentPalette(shadePalette));
  
  let palette: ThemePalette = deepmerge(shadePalette, componentPalette);
  
  let combinedTheme = baseTheme.make(palette);
  if (siteTheme.make) combinedTheme = deepmerge(combinedTheme, siteTheme.make(palette));
  if (userTheme.make) combinedTheme = deepmerge(combinedTheme, userTheme.make(palette));
  
  let themeWithPalette = {
    forumType,
    ...combinedTheme,
    palette
  };
  return createMuiTheme(themeWithPalette as any) as any;
}
