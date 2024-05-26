import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { Change } from "firebase-functions/v1";
import { db } from "../db";

export const updateMemberApprovalWhenUserUpdateProfileFunction = async (change: Change<QueryDocumentSnapshot>, context: any) => {
  const data = change.after.data();
  const previousData = change.before.data();

  if (
    data.name === previousData.name &&
    data.profilePicture === previousData.profilePicture &&
    data.department === previousData.department
  )
    return;

  const newUser = {
    userID: context.params.userID,
    name: data.name,
    profilePicture: data.profilePicture,
    department: data.department,
  };

  // find all memberApproval where user is the creator
  const memberApprovalQuerySnapshot = await db
    .collectionGroup("MemberApproval")
    .where("userID", "==", context.params.userID)
    .get();

  const batch = db.batch();

  memberApprovalQuerySnapshot.forEach((doc) => {
    const memberApprovalRef = doc.ref;
    batch.set(memberApprovalRef, newUser);
  });

  await batch.commit();
}

export const createNewPostWhenUserRequestToJoinCommunityFunction = async (data: any, context: any) => {
  const { userID } = data;
  const { communityID } = context.params;

  await db.collection("NewPost").add({
    userID,
    communityID,
    totalNewPost: 0,
  });
}