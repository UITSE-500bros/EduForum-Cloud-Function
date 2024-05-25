// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
import * as functions from "firebase-functions";

import {
  createNewCommentNotificationFunction,
  createNewPostNotificationFunction,
} from "./notification";
import {
  addTotalNewPostFunction,
  updateTotalCommentsAndRepliesFunction,
  updateTotalPostCreatedFunction,
  updateTotalPostDeletedFunction,
  updateTotalRepliesWhenCommentDeletedFunction,
} from "./post-comment/totalCount";
import {
  deleteAllPostSubcollectionFunction,
  deleteChildCommentAndVoteSubcollectionFunction,
} from "./post-comment/delete";
import {
  addLastModifiedToEditedCommentFunction,
  addLastModifiedToEditedPostFunction,
  addTimeCreatedToCommentFunction,
  addTimeCreatedToPostFunction,
} from "./post-comment/timestamp";
import {
  addSampleCategoryFunction,
  addUserDefaultDepartmentFunction,
  createSubscriptionSubcollectionFunction,
} from "./community/community-setup";
import { updatePostAndCommentWhenCreatorUpdateProfileFunction } from "./post-comment/update";
import { updateMemberApprovalWhenUserUpdateProfileFunction } from "./community/memberApproval";
import { createCommunityFunction, getMemberInfoFunction } from "./community/community-http";
import { createCommentFunction, createPostFunction } from "./post-comment/post-comment-http";

// http function

// get member info of a community
export const getMemberInfo = functions.https.onCall(getMemberInfoFunction);
// create new community
export const createCommunity = functions.https.onCall(createCommunityFunction);
// create new post
export const createPost = functions.https.onCall(createPostFunction);
// create new comment
export const createComment = functions.https.onCall(createCommentFunction);
// background function

// create Notification for new comment
export const createNewCommentNotification = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onCreate(createNewCommentNotificationFunction);

// create Notification when a new post is created
// MISSING: AUTO NOTIFY ADMIN FOR EVERY NEW POST
export const createNewPostNotification = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(createNewPostNotificationFunction);

// add total new post in a community when a new post is created
export const addTotalNewPost = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(addTotalNewPostFunction);

// update total replies, comments when a new comment is created
export const updateTotalCommentsAndReplies = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onCreate(updateTotalCommentsAndRepliesFunction);

// update total replies when a comment is deleted
export const updateTotalRepliesWhenCommentDeleted = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onDelete(updateTotalRepliesWhenCommentDeletedFunction);

// update total post when a new post is created
export const updateTotalPostCreated = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(updateTotalPostCreatedFunction);

// update total post when a post is deleted
export const updateTotalPostDeleted = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onDelete(updateTotalPostDeletedFunction);

// delete all comments and votes subcollection when a post is deleted
export const deleteAllPostSubcollection = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onDelete(deleteAllPostSubcollectionFunction);

// delete all child comment and votes subcollection when a comment is deleted
export const deleteChildCommentAndVoteSubcollection = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onDelete(deleteChildCommentAndVoteSubcollectionFunction);

// add createTime when a new Post is created
export const addTimeCreatedToPost = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(addTimeCreatedToPostFunction);

// add createTime when a new Comment is created
export const addTimeCreatedToComment = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onCreate(addTimeCreatedToCommentFunction);

// add lastModified when a post is edited
export const addLastModifiedToEditedPost = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onUpdate(addLastModifiedToEditedPostFunction);

// add last modified when a comment is edited
export const addLastModifiedToEditedComment = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onUpdate(addLastModifiedToEditedCommentFunction);

// add sample - announcement category everytime a new community is created
export const addSampleCategory = functions.firestore
  .document("/Community/{communityID}")
  .onCreate(addSampleCategoryFunction);

// add user to their default department
export const addUserDefaultDepartment = functions.firestore
  .document("/User/{documentId}")
  .onCreate(addUserDefaultDepartmentFunction);

// create empty subscription subcollection when new community is created
export const createSubscriptionSubcollection = functions.firestore
  .document("/Community/{communityID}")
  .onCreate(createSubscriptionSubcollectionFunction);

// generate invite code for communities
// export const generateCommunityCode = functions.firestore
//   .document("Community/{communityID}")
//   .onCreate(generateCommunityCodeFunction);

// update post and comment when creator update their profile picture, name, department
export const updatePostAndCommentWhenCreatorUpdateProfile = functions.firestore
  .document("/User/{userID}")
  .onUpdate(updatePostAndCommentWhenCreatorUpdateProfileFunction);

// update member approval when a user update their profile
export const updateMemberApprovalWhenUserUpdateProfile = functions.firestore
  .document("/User/{userID}")
  .onUpdate(updateMemberApprovalWhenUserUpdateProfileFunction);
