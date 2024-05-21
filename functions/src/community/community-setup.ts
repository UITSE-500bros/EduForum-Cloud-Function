import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db";
import { generateAlphanumericCode, NUMBER_OF_DIGIT } from "../util";
// add user to their default department

export const addUserDefaultDepartmentFunction = async (
  snapshot: any,
  context: any
) => {
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

  const communityRef = db
    .collection("Community")
    .doc(communityQuerySnapshot.docs[0].id);

  return communityRef.update({
    userList: FieldValue.arrayUnion(userID),
  });
};

// create empty subscription subcollection when new community is created
export const createSubscriptionSubcollectionFunction = async (
  snapshot: any,
  context: any
) => {
  const communityID = context.params.communityID;
  const subscriptionRef = db
    .collection("Community")
    .doc(communityID)
    .collection("Subscription")
    .doc("subscription");

  return subscriptionRef.set({
    userList: [],
  });
};

// add sample - announcement category everytime a new community is created
export const addSampleCategoryFunction = async (
  snapshot: any,
  context: any
) => {
  const data = {
    title: "Thông báo",
    isAnnouncement: true,
  };

  return await db
    .collection("Community")
    .doc(context.params.communityID)
    .collection("Category")
    .add(data);
};

// generate invite code for communities

export const generateCommunityCodeFunction = async (
  snapshot: any,
  context: any
) => {
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
};
