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

// create Notification for new reply
async function createNotificationForReply(reply: any) {
  // get the parent comment
  const parentCommentRef = db
    .collection("Community")
    .doc(reply.communityID)
    .collection("Post")
    .doc(reply.postID)
    .collection("Comment")
    .doc(reply.replyCommentID);

  const parentCommentDoc = await parentCommentRef.get();
  const parentComment = parentCommentDoc.data();
  if (!parentComment) {
    console.log("No data in document! (Parent Comment)");
    return;
  }

  // check if the reply is created by the parent comment creator, if it is, do not notify
  if (reply.creator.creatorID === parentComment.creator.creatorID) {
    return;
  }
  // notify the parent comment creator
  const notificationParentCommentRef = db
    .collection("User")
    .doc(parentComment.creator.creatorID)
    .collection("Notification")
    .doc();

  const notificationParentCommentData = {
    type: 3, // 3: new reply of my comment
    community: {
      communityID: reply.communityID,
      name: reply.communityName,
    },
    triggeredBy: {
      userID: reply.creator.creatorID,
      name: reply.creator.name,
      profilePicture: reply.creator.profilePicture,
    },
    post: {
      postID: reply.postID,
    },
    comment: {
      commentID: reply.replyCommentID,
      content: reply.content,
    },
    timestamp: FieldValue.serverTimestamp(),
    isRead: false,
  };

  return await notificationParentCommentRef.set(notificationParentCommentData);
}

// create Notification for new comment
export const createNewCommentNotification = functions.firestore
  .document("/Community/{communityID}/Post/{postID}/Comment/{commentID}")
  .onCreate(async (snapshot, context) => {
    const communityID = context.params.communityID;
    const postID = context.params.postID;
    const commentID = context.params.commentID;
    const comment = snapshot.data();
    if (!comment) {
      console.log("No data in document! (Comment)");
      return;
    }

    // check if the comment is a reply, if it is, do not notify
    if (comment.replyCommentID) {
      await createNotificationForReply(comment);
      return;
    }

    const postRef = db
      .collection("Community")
      .doc(communityID)
      .collection("Post")
      .doc(postID);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      console.log("No such document! (Post)");
      return;
    }
    const post = postDoc.data();
    if (!post) {
      console.log("No data in document! (Post)");
      return;
    }
    const creator = post.creator;

    // check if the comment is created by the post creator, if it is, do not notify
    if (comment.creator.creatorID === creator.creatorID) {
      return;
    }
    // notify the post creator
    const notificationCreatorRef = db
      .collection("User")
      .doc(creator.creatorID)
      .collection("Notification")
      .doc();
    const notificationCreatorData = {
      type: 1, // 1: new comment of my post
      community: {
        communityID,
        name: post.community.name,
      },
      triggeredBy: {
        userID: comment.creator.creatorID,
        name: comment.creator.name,
        profilePicture: comment.creator.profilePicture,
      },
      post: {
        postID,
      },
      comment: {
        commentID,
        content: comment.content,
      },
      timestamp: FieldValue.serverTimestamp(),
      isRead: false,
    };

    const batch = db.batch();
    batch.set(notificationCreatorRef, notificationCreatorData);

    // notify the subscribers - exclude the post creator

    // get the post subscribers
    const postSubcribersQuery = await db
      .collection("PostSubscription")
      .where("postID", "==", postID)
      .where("userID", "!=", creator.creatorID)
      .where("communityID", "==", communityID)
      .get();

    if (!postSubcribersQuery.empty) {
      // send notification to the subscribers
      postSubcribersQuery.forEach((doc) => {
        const notificationSubscriberRef = db
          .collection("User")
          .doc(doc.data().userID)
          .collection("Notification")
          .doc();
        const notificationSubscriberData = {
          type: 5, // 5: new comment of post I subscribed
          community: {
            communityID,
            name: post.community.name,
          },
          triggeredBy: {
            userID: comment.creator.creatorID,
            name: comment.creator.name,
            profilePicture: comment.creator.profilePicture,
          },
          post: {
            postID,
          },
          comment: {
            commentID,
            content: comment.content,
          },
          timestamp: FieldValue.serverTimestamp(),
          isRead: false,
        };
        batch.set(notificationSubscriberRef, notificationSubscriberData);
      });
    }

    return batch.commit();
  });

// create Notification for announcement post
async function createNewAnnouncementNotification(community: any, post: any) {
  const communityID = community.id;
  const communityName = community.name;

  const members = community.userList;

  const batch = db.batch();
  await members.forEach(async (userID: string) => {
    const notificationRef = db
      .collection("User")
      .doc(userID)
      .collection("Notification")
      .doc();
    const notificationData = {
      type: 4, // 4: announcement
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
        postID: post.id,
        title: post.title,
      },
      timestamp: FieldValue.serverTimestamp(),
      isRead: false,
    };
    batch.set(notificationRef, notificationData);
  });

  return batch.commit();
}

// create Notification when a new post is created
// MISSING: AUTO NOTIFY ADMIN FOR EVERY NEW POST
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
        await createNewAnnouncementNotification(community, post);
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
