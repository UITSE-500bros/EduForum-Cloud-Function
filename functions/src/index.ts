// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";

// The Firebase Admin SDK to access Firestore.
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Crypto
import * as crypto from "node:crypto";

admin.initializeApp();
const db = getFirestore();

const NUMBER_OF_DIGIT = 5;

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

    const communityId = communityQuerySnapshot.docs[0].id;

    // Reference to the CommunityMember document for this user
    const communityMemberRef = db.collection("CommunityMember").doc(userID);

    return communityMemberRef.set(
      {
        groupsRef: FieldValue.arrayUnion(communityId),
      },
      { merge: true }
    );
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

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
export const addMessage = onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  if (typeof original !== "string") {
    res.status(400).send("Text parameter is required and must be a string.");
    return;
  }
  // Push the new message into Firestore using the Firebase Admin SDK.
  try {
    const writeResult = await getFirestore()
      .collection("messages")
      .add({ original: original });
    // Send back a message that we've successfully written the message
    res.json({ result: `Message with ID: ${writeResult.id} added.` });
  } catch (error) {
    functions.logger.error("Failed to add message", error);
    res.status(500).send("Failed to add message");
  }
});

export const makeUppercase = functions.firestore
  .document("/messages/{documentId}")
  .onCreate((snapshot, context) => {
    // Corrected to use onCreate for Firestore triggers
    // Grab the current value of what was written to Firestore.
    const original = snapshot.data()?.original;

    if (typeof original !== "string") {
      // If original is not a string, log a message and exit
      functions.logger.log("Original data is not a string, unable to process.");
      return null;
    }

    // Log the document ID and original text
    functions.logger.log("Uppercasing", context.params.documentId, original);

    // Convert text to uppercase
    const uppercase = original.toUpperCase();

    // You must return a Promise when performing asynchronous tasks inside a function
    // such as writing to Firestore.
    // Setting an 'uppercase' field in Firestore document returns a Promise.
    return snapshot.ref.set({ uppercase }, { merge: true });
  });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
