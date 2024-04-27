// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";

// The Firebase Admin SDK to access Firestore.
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, FieldValue, Filter } from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

export const addUserDefaultDepartment = functions.firestore.document("/User/{documentId}")
    .onCreate(async (snapshot, context) => {  
        // Grab the current value of what was written to Firestore.
        const topicID = snapshot.get('topicID');
        const userID = snapshot.id;
        const communityRef = await db.collection("Community").where('topicID', '==', topicID).get();
        let communityId: String = "";
        if (communityRef.empty) {
            console.log('No matching documents.');
            return;
        }  
          
        communityRef.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
            communityId = doc.id;
        });
        const communityMemberRef = db.collection("CommunityMember").doc(userID);
        return await communityMemberRef.update({
            groupsRef: FieldValue.arrayUnion(communityId)
        });
    });


// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
export const addMessage = onRequest(async (req, res) => {
    // Grab the text parameter.
    const original = req.query.text;
    if (typeof original !== 'string') {
        res.status(400).send('Text parameter is required and must be a string.');
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
        functions.logger.error('Failed to add message', error);
        res.status(500).send('Failed to add message');
    }
});

export const makeUppercase = functions.firestore.document("/messages/{documentId}")
    .onCreate((snapshot, context) => {  // Corrected to use onCreate for Firestore triggers
        // Grab the current value of what was written to Firestore.
        const original = snapshot.data()?.original;

        if (typeof original !== 'string') {
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
