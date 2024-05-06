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

// add sample - announcement category everytime a new community is created

export const addSampleCategory = functions.firestore
  .document("/Community/{communityId}")
  .onCreate(async (snapshot, context) => {
    const data = {
      title: "Thông báo",
      isAnnouncement: true,
    };

    return await db
      .collection("Community")
      .doc(context.params.communityId)
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

    const community = {
      communityId: communityQuerySnapshot.docs[0].id,
      name: communityQuerySnapshot.docs[0].data().name,
      department: communityQuerySnapshot.docs[0].data().department,
      description: communityQuerySnapshot.docs[0].data().description,
    };

    // Reference to the CommunityMember document for this user
    const communityMemberRef = db.collection("CommunityMember").doc(userID);

    return communityMemberRef.set(
      {
        communities: FieldValue.arrayUnion(community),
      },
      { merge: true }
    );
  });

// add community admin
export const addAdminToCommunity = functions.firestore
  .document("/Community/{documentId}")
  .onCreate(async (snapshot, context) => {
    const userID = snapshot.get("adminList")[0];

    const community = {
      communityId: snapshot.id,
      name: snapshot.data().name,
      department: snapshot.data().department,
      description: snapshot.data().description,
    };

    // Reference to the CommunityMember document for this user
    const communityMemberRef = db.collection("CommunityMember").doc(userID);

    return communityMemberRef.set(
      {
        communities: FieldValue.arrayUnion(community),
      },
      { merge: true }
    );
  });

// create new communitymember document
export const createCommunityMember = functions.auth
  .user()
  .onCreate(async (user) => {
    const communityMemberRef = db.collection("CommunityMember").doc(user.uid);
    try {
      await communityMemberRef.set(
        {
          communities: [],
        },
        { merge: true }
      );
      console.log("CommunityMember document created for user:", user.uid);
    } catch (error) {
      console.error("Error creating CommunityMember document:", error);
    }
  });

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
