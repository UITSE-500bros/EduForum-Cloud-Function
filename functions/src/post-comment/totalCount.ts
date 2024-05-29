import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db";

// add total new post in a community when a new post is created
export const addTotalNewPostFunction = async (snapshot: any, context: any) => {
  const communityID = context.params.communityID;
  const communityRef = db.collection("Community").doc(communityID);
  await communityRef.get().then(async (doc) => {
    if (!doc.exists) {
      console.log("No such document! (Community)");
    } else {
      const data = doc.data();
      if (data) {
        const members = data.userList;
        const batch = db.batch();
        for (const userID of members) {
          const newPostQuery = db
            .collection("NewPost")
            .where("userID", "==", userID)
            .where("communityID", "==", communityID)
            .limit(1);
      
          const querySnapshot = await newPostQuery.get();
      
          if (querySnapshot.empty) {
            console.log("No matching documents. (NewPost)");
            continue;
          }
      
          const newPostRef = querySnapshot.docs[0].ref;
          batch.set(newPostRef, {
            totalNewPost: FieldValue.increment(1),
          }, { merge: true });
        }
        await batch.commit();
      } else {
        console.log("No data in document!");
      }
    }
  });
};

// update total replies, comments when a new comment is created
export const updateTotalCommentsAndRepliesFunction = async (
  snapshot: any,
  context: any
) => {
  const communityID = context.params.communityID;
  const postID = context.params.postID;
  const commentID = snapshot.data().replyCommentID;
  if (commentID) {
    const commentRef = db
      .collection("Community")
      .doc(communityID)
      .collection("Post")
      .doc(postID)
      .collection("Comment")
      .doc(commentID);

    await commentRef.update({
      totalReply: FieldValue.increment(1),
    });
  } else {
    console.log("replyCommentID does not exist");
  }

  const postRef = db
    .collection("Community")
    .doc(communityID)
    .collection("Post")
    .doc(postID);

  await postRef.update({
    totalComment: FieldValue.increment(1),
  });
};

// update total replies when a comment is deleted
export const updateTotalRepliesWhenCommentDeletedFunction = async (
  snapshot: any,
  context: any
) => {
  const { communityID, postID } = context.params;
  const commentID = snapshot.data().replyCommentID;

  const communityRef = db.collection("Community").doc(communityID);
  const postRef = communityRef.collection("Post").doc(postID);

  const updatePromises = [];

  if (commentID) {
    const commentRef = postRef.collection("Comment").doc(commentID);
    updatePromises.push(
      commentRef.update({ totalReply: FieldValue.increment(-1) })
    );
  } else {
    console.log("replyCommentID does not exist");
  }

  updatePromises.push(
    postRef.update({ totalComment: FieldValue.increment(-1) })
  );

  await Promise.all(updatePromises);
};

// update total post when a new post is created

export const updateTotalPostCreatedFunction = async (
  snapshot: any,
  context: any
) => {
  const communityID = context.params.communityID;
  const communityRef = db.collection("Community").doc(communityID);

  return await communityRef.update({
    totalPost: FieldValue.increment(1),
  });
};

// update total post when a post is deleted
export const updateTotalPostDeletedFunction = async (
  snapshot: any,
  context: any
) => {
  const communityID = context.params.communityID;
  const communityRef = db.collection("Community").doc(communityID);

  return await communityRef.update({
    totalPost: FieldValue.increment(-1),
  });
};
