import { FieldValue, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { Change } from "firebase-functions/v1";
import { db } from "../db";
import { approveAllUserDTO } from "./dto/approve-all-user.dto";

export const updateMemberApprovalWhenUserUpdateProfileFunction = async (
  change: Change<QueryDocumentSnapshot>,
  context: any
) => {
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
};

export const createNewPostWhenUserRequestToJoinCommunityFunction = async (
  snapshot: any,
  context: any
) => {
  const { userID } = snapshot.data();

  const { communityID } = context.params;

  await db.collection("NewPost").add({
    userID,
    communityID,
    totalNewPost: 0,
  });
};

export const approveAllUserRequestToJoinCommunityFunction = async (
  data: any,
  context: any
) => {
  const { error } = approveAllUserDTO.validate(data);
  if (error) {
    return { error: error.message };
  }
  const { communityID, isApprove } = data;

  try {
    const res = await db.runTransaction(async (transaction) => {
      const memberApprovalQuerySnapshot = await db
        .collection("Community")
        .doc(communityID)
        .collection("MemberApproval")
        .get();

      const userIds: string[] = [];
      memberApprovalQuerySnapshot.forEach((doc) => {
        const memberApprovalData = doc.data();
        if (isApprove) {
          userIds.push(memberApprovalData.userID);
        }
        transaction.delete(doc.ref);
      });

      if (isApprove) {
        const communityRef = db.collection("Community").doc(communityID);
        transaction.update(communityRef, {
          userList: FieldValue.arrayUnion(...userIds),
        });
      }
      return true;
    });
    if (res) return { success: true };
    else return { error: true };
  } catch (error) {
    console.log("Transaction failure:", error);
    return { error: true };
  }
};
