import { db } from "../db";

export const markAllNotificationAsReadFunction = async (data: any, context: any) => {
  let userID: string;
  try {
    if (data) {
      userID = data.userID;
      if (!userID) {
        throw new Error("userID is undefined");
      }
    } else {
      throw new Error("data is undefined");
    }  
  } catch (error: any) {
    return { error: error.message };
  }

  const notificationRef = db.collection("User").doc(userID).collection("Notification");
  const notificationQuerySnapshot = await notificationRef.get();
  const batch = db.batch();

  notificationQuerySnapshot.forEach((doc) => {
    batch.update(doc.ref, { isRead: true });
  });
  
  await batch.commit();
  return { success: true };
};