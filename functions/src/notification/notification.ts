import { db } from "../db";
import { FieldValue } from "firebase-admin/firestore";

// create Notification for new comment
export const createNewCommentNotificationFunction = async (
  snapshot: any,
  context: any
) => {
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
  const batch = db.batch();
  // check if the comment is created by the post creator, if it is, do not notify
  if (creator && comment.creator.creatorID !== creator.creatorID) {
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
    batch.set(notificationCreatorRef, notificationCreatorData);
  }

  // notify the subscribers - exclude the post creator

  // get the post subscribers

  let postSubcribersQuery = db
    .collection("PostSubscription")
    .where("postID", "==", postID)
    .where("communityID", "==", communityID);
  
  if (creator) {
    postSubcribersQuery = postSubcribersQuery.where("userID", "!=", creator.creatorID);
  }

  const postSubcribersQueryResult = await postSubcribersQuery.get();

  if (!postSubcribersQueryResult.empty) {
    // send notification to the subscribers
    postSubcribersQueryResult.forEach((doc) => {
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
};

// create Notification when a new post is created
// MISSING: AUTO NOTIFY ADMIN FOR EVERY NEW POST
export const createNewPostNotificationFunction = async (
  snapshot: any,
  context: any
) => {
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
      .doc(category.categoryID);
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
};

// util functions

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
