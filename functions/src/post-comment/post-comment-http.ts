import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db";
import { createPostDTO } from "./dto/create-post.dto";
import { createCommentDTO } from "./dto/create-comment.dto";
import { updatePostDTO } from "./dto/update-post.dto";
import { updateCommentDTO } from "./dto/update-comment.dto";

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
    downloadImage: downloadImage || [],
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

  const savedPost = await postRef.get();
  if (!savedPost.exists) {
    console.log("Failed to fetch the post after saving.");
    return { error: "Failed to fetch the post after saving." };
  }
  const savePostData = savedPost.data();

  return savePostData;
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
    replyCommentID: replyCommentID || null,
    creator,
    content,
    downloadImage: downloadImage || [],
    totalReply: 0,
    timeCreated: FieldValue.serverTimestamp(),
    lastModified: FieldValue.serverTimestamp(),
    totalUpVote: 0,
    totalDownVote: 0,
    voteDifference: 0,
  }

  await commentRef.set(commentData);
  // Retrieve the document to get the server-resolved timestamp
  const savedComment = await commentRef.get();
  if (!savedComment.exists) {
    console.log("Failed to fetch the comment after saving.");
    return { error: "Failed to fetch the comment after saving." };
  }
  const savedCommentData = savedComment.data();

  return savedCommentData;
};

export const updatePostFunction = async (data: any, context: any) => {
  const { error } = updatePostDTO.validate(data);
  if (error) {
    return { error: error.message };
  }
  const { communityID, postID, title, content } = data;
  const postRef = db.collection("Community").doc(communityID).collection("Post").doc(postID);
  const postData = {
    title,
    content,
    lastModified: FieldValue.serverTimestamp(),
  }
  await postRef.update(postData);
  return { postData };
};

export const updateCommentFunction = async (data: any, context: any) => {
  const { error } = updateCommentDTO.validate(data);
  if (error) {
    return { error: error.message };
  }
  const { communityID, postID, commentID, content } = data;
  const commentRef = db.collection("Community").doc(communityID).collection("Post").doc(postID).collection("Comment").doc(commentID);
  const commentData = {
    content,
    lastModified: FieldValue.serverTimestamp(),
  }
  await commentRef.update(commentData);
  return { commentData };
};