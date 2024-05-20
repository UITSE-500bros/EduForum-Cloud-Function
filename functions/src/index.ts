// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
import * as functions from "firebase-functions";
// The Firebase Admin SDK to access Firestore.
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
// Crypto
import * as crypto from "node:crypto";

const NUMBER_OF_DIGIT = 5;

// App init

admin.initializeApp();
const db = getFirestore();

// Functions

// create Notification when a new post is created
export const createNewPostNotification = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(async (snapshot, context) => {
    const communityID = context.params.communityID;
    const postID = context.params.postID;
    const post = snapshot.data();

    // get community name
    const communityRef = db.collection("Community").doc(communityID);
    const communityDoc = await communityRef.get();
    if (!communityDoc.exists) {
      console.log("No such document! (Community)");
      return;
    }
    const community = communityDoc.data();
    const communityName = community?.name;

    const postCategory = post.category;
    for (const category of postCategory) {
      // check if the category is announcement
      const categoryRef = db
        .collection("Community")
        .doc(communityID)
        .collection("Category")
        .doc(category.id);
      const categoryDoc = await categoryRef.get();
      if (categoryDoc.data()?.isAnnouncement) {
        return;
      }
    }

    const subscriptionCommunityRef = db
      .collection("Community")
      .doc(communityID)
      .collection("Subscription")
      .doc("subscription");
    const subscriptionCommunityDoc = await subscriptionCommunityRef.get();
    if (!subscriptionCommunityDoc.exists) {
      console.log("No such document! (subscription)");
      return;
    }

    const subscriptionCommunity = subscriptionCommunityDoc.data();
    if (!subscriptionCommunity) {
      console.log("No data in document!");
      return;
    }

    const members = subscriptionCommunity.userList;

    const batch = db.batch();
    await members.forEach(async (userID: string) => {
      const notificationRef = db
        .collection("User")
        .doc(userID)
        .collection("Notification")
        .doc();
      const notificationData = {
        type: 2, // 2: new post
        community: {
          communityID,
          name: communityName,
        },
        triggeredBy: {
          userID: post.creator.creatorID,
          name: post.creator.name,
          profilePicture: post.creator.profilePicture,
        },
        post: {
          postID: postID,
          title: post.title,
        },
        timestamp: FieldValue.serverTimestamp(),
        isRead: false,
      };
      batch.set(notificationRef, notificationData);
    });

    return batch.commit();
  });

// add total new post in a community when a new post is created
export const addTotalNewPost = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(async (snapshot, context) => {
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
          await members.forEach(async (userID: string) => {
            const newPostQuery = db
              .collection("NewPost")
              .where("userID", "==", userID)
              .where("communityID", "==", communityID)
              .limit(1);
            const querySnapshot = await newPostQuery.get();
            if (querySnapshot.empty) {
              console.log("No matching documents. (NewPost)");
              return;
            }

            const newPostRef = querySnapshot.docs[0].ref;

            batch.set(newPostRef, {
              totalNewPost: FieldValue.increment(1),
            });
          });
          await batch.commit();
        } else {
          console.log("No data in document!");
        }
      }
    });
  });

// update total replies, comments when a new comment is created
export const updateTotalCommentsAndReplies = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onCreate(async (snapshot, context) => {
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
  });

// update total replies when a comment is deleted
export const updateTotalRepliesWhenCommentDeleted = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onDelete(async (snapshot, context) => {
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
        totalReply: FieldValue.increment(-1),
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
      totalComment: FieldValue.increment(-1),
    });
  });

// update total post when a new post is created

export const updateTotalPostCreated = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(async (snapshot, context) => {
    const communityID = context.params.communityID;
    const communityRef = db.collection("Community").doc(communityID);

    return await communityRef.update({
      totalPost: FieldValue.increment(1),
    });
  });

// update total post when a post is deleted
export const updateTotalPostDeleted = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onDelete(async (snapshot, context) => {
    const communityID = context.params.communityID;
    const communityRef = db.collection("Community").doc(communityID);

    return await communityRef.update({
      totalPost: FieldValue.increment(-1),
    });
  });

// delete all comments and votes subcollection when a post is deleted

// export const deletePostSubcollection = functions.firestore
//   .document("/Community/{communityID}/Post/{postID}")
//   .onDelete(async (snapshot, context) => {
//     const deletedValue = snapshot.data();

//   })

//

// add createTime when a new Post is created

export const addTimeCreatedToPost = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onCreate(async (snapshot, context) => {
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
  });

// add createTime when a new Comment is created
export const addTimeCreatedToComment = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onCreate(async (snapshot, context) => {
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
  });

// add lastModified when a post is edited

export const addLastModifiedToEditedPost = functions.firestore
  .document("/Community/{communityID}/Post/{postID}")
  .onUpdate(async (change, context) => {
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
  });

// add last modified when a comment is edited
export const addLastModifiedToEditedComment = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onUpdate(async (change, context) => {
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
  });

// add sample - announcement category everytime a new community is created

export const addSampleCategory = functions.firestore
  .document("/Community/{communityID}")
  .onCreate(async (snapshot, context) => {
    const data = {
      title: "Thông báo",
      isAnnouncement: true,
    };

    return await db
      .collection("Community")
      .doc(context.params.communityID)
      .collection("Category")
      .add(data);
  });

// add user to their default department

export const addUserDefaultDepartment = functions.firestore
  .document("/User/{documentId}")
  .onCreate(async (snapshot, context) => {
    const department = snapshot.get("department");
    const userID = context.params.documentId;

    const communityQuerySnapshot = await db
      .collection("Community")
      .where("department", "==", department)
      .get();

    if (communityQuerySnapshot.empty) {
      console.log("No matching community documents.");
      return;
    }

    // const community = {
    //   communityId: communityQuerySnapshot.docs[0].id,
    //   name: communityQuerySnapshot.docs[0].data().name,
    //   department: communityQuerySnapshot.docs[0].data().department,
    //   description: communityQuerySnapshot.docs[0].data().description,
    // };

    const communityRef = db
      .collection("Community")
      .doc(communityQuerySnapshot.docs[0].id);

    return communityRef.update({
      userList: FieldValue.arrayUnion(userID),
    });
  });

// create empty subscription subcollection when new community is created
export const createSubscriptionSubcollection = functions.firestore
  .document("/Community/{communityID}")
  .onCreate(async (snapshot, context) => {
    const communityID = context.params.communityID;
    const subscriptionRef = db
      .collection("Community")
      .doc(communityID)
      .collection("Subscription")
      .doc("subscription");

    return subscriptionRef.set({
      userList: [],
    });
  });

// generate invite code for communities

export const generateCommunityCode = functions.firestore
  .document("Community/{communityID}")
  .onCreate(async (snapshot, context) => {
    let inviteCode = "ABCDEF";
    while (1) {
      inviteCode = generateAlphanumericCode(NUMBER_OF_DIGIT);
      const communityQuerySnapshot = await db
        .collection("Community")
        .where("inviteCode", "==", inviteCode)
        .get();
      if (communityQuerySnapshot.empty) {
        console.log("Invite code is valid");
        break;
      } else {
        console.log("Invite code is invalid, regenerate invite code");
      }
    }
    return snapshot.ref.set({ inviteCode }, { merge: true });
  });

function generateAlphanumericCode(length: number) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

// create new communitymember document
// export const createCommunityMember = functions.auth
//   .user()
//   .onCreate(async (user) => {
//     const communityMemberRef = db.collection("CommunityMember").doc(user.uid);
//     try {
//       await communityMemberRef.set(
//         {
//           communities: [],
//         },
//         { merge: true }
//       );
//       console.log("CommunityMember document created for user:", user.uid);
//     } catch (error) {
//       console.error("Error creating CommunityMember document:", error);
//     }
//   });

// add community admin
// export const addAdminToCommunity = functions.firestore
//   .document("/Community/{documentId}")
//   .onCreate(async (snapshot, context) => {
//     const userID = snapshot.get("adminList")[0];

//     const community = {
//       communityId: snapshot.id,
//       name: snapshot.data().name,
//       department: snapshot.data().department,
//       description: snapshot.data().description,
//     };

//     // Reference to the CommunityMember document for this user
//     const communityMemberRef = db.collection("CommunityMember").doc(userID);

//     return communityMemberRef.set(
//       {
//         communities: FieldValue.arrayUnion(community),
//       },
//       { merge: true }
//     );
//   });
