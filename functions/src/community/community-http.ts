import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db";
import { createCommunityDTO } from "./create-community.dto";
import { generateAlphanumericCode, NUMBER_OF_DIGIT } from "../util";

export const getMemberInfoFunction = async (data: any, context: any) => {
  const { communityID } = data;
  const communityRef = db.collection("Community").doc(communityID);
  const communityDoc = await communityRef.get();
  if (!communityDoc.exists) {
    return { error: "Community not found" };
  }
  const communityData = communityDoc.data();
  if (!communityData) {
    return { error: "Community data not found" };
  }
  const members = communityData.userList;
  const admins = communityData.adminList;

  // query to get all members in User collection
  const userList: {
    userID: any;
    name: any;
    department: any;
    profilePicture: any;
  }[] = [];
  const adminList: {
    userID: any;
    name: any;
    department: any;
    profilePicture: any;
  }[] = [];

  const userDocsPromises: any[] = [];
  const adminDocsPromises: any[] = [];
  members.forEach((memberID: string) => {
    userDocsPromises.push(db.collection("User").doc(memberID).get());
  });
  admins.forEach((adminID: string) => {
    adminDocsPromises.push(db.collection("User").doc(adminID).get());
  });

  await Promise.all(userDocsPromises).then((userDocs) => {
    userDocs.forEach((userDoc) => {
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
          userList.push({
            userID: userDoc.id,
            name: userData.name,
            department: userData.department,
            profilePicture: userData.profilePicture,
          });
        }
      }
    });
  });

  await Promise.all(adminDocsPromises).then((adminDocs) => {
    adminDocs.forEach((adminDoc) => {
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        if (adminData) {
          adminList.push({
            userID: adminDoc.id,
            name: adminData.name,
            department: adminData.department,
            profilePicture: adminData.profilePicture,
          });
        }
      }
    });
  });

  console.log("userList", userList);
  console.log("adminList", adminList);

  return {
    userList,
    adminList,
  };
};

export const createCommunityFunction = async (data: any, context: any) => {
  const { error } = createCommunityDTO.validate(data);
  console.log("Input data", data);
  if (error) {
    console.log("Error", error.message);
    return { error: error.message };
  }

  const {
    communityID,
    name,
    department,
    description,
    adminList,
    profilePicture,
    visibility,
    waitForApproval,
  } = data;
  const communityData = {
    name,
    department,
    description,
    adminList,
    profilePicture,
    visibility: visibility || "public",
    waitForApproval: waitForApproval || false,
    userList: [],
    totalPost: 0,
    inviteCode: "",
    timeCreated: FieldValue.serverTimestamp(),
  };

  // generate invite code
  while (1) {
    communityData.inviteCode = generateAlphanumericCode(NUMBER_OF_DIGIT);
    const communityQuerySnapshot = await db
      .collection("Community")
      .where("inviteCode", "==", communityData.inviteCode)
      .get();
    if (communityQuerySnapshot.empty) {
      console.log("Invite code is valid");
      break;
    } else {
      console.log("Invite code is invalid, regenerate invite code");
    }
  }

  await db.collection("Community").doc(communityID).set(communityData);
  return { communityData };
};
