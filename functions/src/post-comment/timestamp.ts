import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db";

// add createTime when a new Post is created

export const addTimeCreatedToPostFunction = async (
  snapshot: any,
  context: any
) => {
  const communityID = context.params.communityID;
  const postID = context.params.postID;
  const postRef = db
    .collection("Community")
    .doc(communityID)
    .collection("Post")
    .doc(postID);

  return await postRef.update({
    timeCreated: FieldValue.serverTimestamp(),
  });
};

// add createTime when a new Comment is created
export const addTimeCreatedToCommentFunction = async (
  snapshot: any,
  context: any
) => {
  const communityID = context.params.communityID;
  const postID = context.params.postID;
  const commentID = context.params.commentID;
  const commentRef = db
    .collection("Community")
    .doc(communityID)
    .collection("Post")
    .doc(postID)
    .collection("Comment")
    .doc(commentID);

  return await commentRef.update({
    timeCreated: FieldValue.serverTimestamp(),
  });
};

// add lastModified when a post is edited

export const addLastModifiedToEditedPostFunction = async (
  change: any,
  context: any
) => {
  const data = change.after.data();
  const previousData = change.before.data();
  if (
    data.lastModified !== previousData.lastModified ||
    data.totalComment !== previousData.totalComment
  ) {
    return;
  }
  const communityID = context.params.communityID;
  const postID = context.params.postID;
  const postRef = db
    .collection("Community")
    .doc(communityID)
    .collection("Post")
    .doc(postID);

  return await postRef.update({
    lastModified: FieldValue.serverTimestamp(),
  });
};

// add last modified when a comment is edited
export const addLastModifiedToEditedCommentFunction = async (
  change: any,
  context: any
) => {
  const data = change.after.data();
  const previousData = change.before.data();
  if (
    data.lastModified !== previousData.lastModified ||
    data.totalReply !== previousData.totalReply
  ) {
    return;
  }
  const communityID = context.params.communityID;
  const postID = context.params.postID;
  const commentRef = db
    .collection("Community")
    .doc(communityID)
    .collection("Post")
    .doc(postID)
    .collection("Comment")
    .doc(context.params.commentID);

  return await commentRef.update({
    lastModified: FieldValue.serverTimestamp(),
  });
};
