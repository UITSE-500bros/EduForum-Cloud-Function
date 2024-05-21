import { db } from "../db";
import { BATCH_SIZE, deleteCollection } from "../util";

// delete all comments and votes subcollection when a post is deleted
export const deleteAllPostSubcollectionFunction = (async (snapshot: any, context: any) => {
    const { communityID, postID } = context.params;

    const promises = [];
    promises.push(
      deleteCollection(
        db,
        `/Community/${communityID}/Post/${postID}/Comment`,
        BATCH_SIZE
      )
    );
    promises.push(
      deleteCollection(
        db,
        `/Community/${communityID}/Post/${postID}/Votes`,
        BATCH_SIZE
      )
    );

    await Promise.all(promises);
  });

// delete all child comment and votes subcollection when a comment is deleted
export const deleteChildCommentAndVoteSubcollectionFunction = async (snapshot: any, context: any) => {
    const { communityID, postID, commentID } = context.params;

    // find all comment which has replyCommentID = deletedCommentID
    const commentQuery = db
      .collection("Community")
      .doc(communityID)
      .collection("Post")
      .doc(postID)
      .collection("Comment")
      .where("replyCommentID", "==", commentID);

    const commentQuerySnapshot = await commentQuery.get();

    const promises: any[] = [];
    // delete all child comment and vote subcollection of child comment
    commentQuerySnapshot.forEach((doc) => {
      promises.push(doc.ref.delete());
      promises.push(
        deleteCollection(
          db,
          `/Community/${communityID}/Post/${postID}/Comment/${doc.id}/Votes`,
          BATCH_SIZE
        )
      );
    });

    await Promise.all(promises);
  }