import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db";
import { createPostDTO } from "./dto/create-post.dto";
import { createCommentDTO } from "./dto/create-comment.dto";

export const createPostFunction = async (data: any, context: any) => {
  const { error } = createPostDTO.validate(data);
  console.log("Input data", data);
  if (error) {
    console.log("Error", error.message);
    return { error: error.message };
  }

  const {
    postID,
    communityID,
    creator,
    title,
    content,
    downloadImage,
    isAnonymous,
    category,
  } = data;

  const postRef = db.collection("Community").doc(communityID).collection("Post").doc(postID);
  const postData = {
    communityID,
    creator,
    title,
    content,
    downloadImage,
    isAnonymous,
    category,
    timeCreated: FieldValue.serverTimestamp(),
    lastModified: FieldValue.serverTimestamp(),
    totalUpVote: 0,
    totalDownVote: 0,
    voteDifference: 0,
    totalComment: 0,
  }

  await postRef.set(postData);

  return { postData };
};

export const createCommentFunction = async (data: any, context: any) => {
  const { error } = createCommentDTO.validate(data);
  console.log("Input data", data);
  if (error) {
    console.log("Error", error.message);
    return { error: error.message };
  }

  const {
    commentID,
    postID,
    communityID,
    replyCommentID,
    creator,
    content,
    downloadImage,
  } = data;

  const commentRef = db.collection("Community").doc(communityID).collection("Post").doc(postID).collection("Comment").doc(commentID);
  const commentData = {
    postID,
    communityID,
    replyCommentID,
    creator,
    content,
    downloadImage,
    totalReply: 0,
    timeCreated: FieldValue.serverTimestamp(),
    lastModified: FieldValue.serverTimestamp(),
    totalUpVote: 0,
    totalDownVote: 0,
    voteDifference: 0,
  }

  await commentRef.set(commentData);

  return { commentData };
};