import React, { useCallback } from "react";
import { registerComponent, Components } from "../../../lib/vulcan-lib";
import { useUpdate } from "../../../lib/crud/withUpdate";
import { useCurrentUser } from "../../common/withUser";
import { preferredHeadingCase } from "../../../lib/forumTypeUtils";
import { userCanDo, userOwns } from "../../../lib/vulcan-users/permissions";

const ShortformFrontpageMenuItem = ({ comment }: { comment: CommentsList }) => {
  const currentUser = useCurrentUser();
  const { mutate: updateComment } = useUpdate({
    collectionName: "Comments",
    fragmentName: "CommentsList",
  });
  const { MenuItem } = Components;

  const handleChange = useCallback(
    (value: boolean) => (event: React.MouseEvent) => {
      void updateComment({
        selector: { _id: comment._id },
        data: { shortformFrontpage: value },
      });
    },
    [updateComment, comment._id]
  );

  if (!comment.shortform) return null;
  if (!currentUser || !(userCanDo(currentUser, "comments.edit.all") || userOwns(currentUser, comment))) return null;

  return (
    <MenuItem onClick={handleChange(!comment.shortformFrontpage)}>
      {preferredHeadingCase(comment.shortformFrontpage ? "Remove from Frontpage" : "Allow on Frontpage")}
    </MenuItem>
  );
};

const ShortformFrontpageMenuItemComponent = registerComponent("ShortformFrontpageMenuItem", ShortformFrontpageMenuItem);

declare global {
  interface ComponentTypes {
    ShortformFrontpageMenuItem: typeof ShortformFrontpageMenuItemComponent;
  }
}
