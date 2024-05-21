// The Firebase Admin SDK to access Firestore.
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// App init
admin.initializeApp();

// Initialize Firestore
export const db = getFirestore();
