import React from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib'
import { getAlgoliaIndexName } from '../../lib/algoliaUtil';

const UsersSearchAutoComplete = ({clickAction, label}: {
  clickAction: (id: string) => void;
  label?: string;
}) => {
  return <Components.SearchAutoComplete
    indexName={getAlgoliaIndexName("Users")}
    clickAction={clickAction}
    renderSuggestion={(hit: any) => <Components.UsersAutoCompleteHit document={hit} />}
    renderInputComponent={(hit: any) => <Components.UsersSearchInput inputProps={hit} />}
    placeholder={label || "Search for Users"}
    noSearchPlaceholder='User ID'
  />
}

const UsersSearchAutoCompleteComponent = registerComponent("UsersSearchAutoComplete", UsersSearchAutoComplete);

declare global {
  interface ComponentTypes {
    UsersSearchAutoComplete: typeof UsersSearchAutoCompleteComponent
  }
}

