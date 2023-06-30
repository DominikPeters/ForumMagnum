import React from "react";
import { Components, registerComponent } from "../../lib/vulcan-lib";
import { useMulti } from "../../lib/crud/withMulti";
import { Link } from '../../lib/reactRouterWrapper';

const styles = (theme: ThemeType): JssStyles => ({
});

const UserListsPage = ({classes}: {
  classes: ClassesType,
}) => {
  const { SingleColumnSection, UserListListItem, Loading } = Components;

  const { results: listsOwnedByUser, loading: loadingListsOwnedByUser } = useMulti({
    terms: {
      view: 'userListOwnedByUser'
    },
    collectionName: "UserLists",
    fragmentName: 'UserListFragment',
  })
  const { results: listsContainingUser, loading: loadingListsContainingUser } = useMulti({
    terms: {
      view: 'userListContainsUser'
    },
    collectionName: "UserLists",
    fragmentName: 'UserListFragment',
  })

  return <SingleColumnSection>
    <h2>Lists You Manage</h2>
    {loadingListsOwnedByUser && <Loading/>}
    {listsOwnedByUser?.map((list: UserListFragment) => <UserListListItem key={list._id} userList={list}/>)}
    <Link to="/userLists/new">Create New</Link>

    <h2>{"Lists You're In"}</h2>
    {loadingListsContainingUser && <Loading/>}
    {listsContainingUser?.map((list: UserListFragment) => <UserListListItem key={list._id} userList={list}/>)}
  </SingleColumnSection>;
}

const UserListsPageComponent = registerComponent("UserListsPage", UserListsPage, {styles});

declare global {
  interface ComponentTypes {
    UserListsPage: typeof UserListsPageComponent,
  }
}
