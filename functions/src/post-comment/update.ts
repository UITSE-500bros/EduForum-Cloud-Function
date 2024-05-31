import { db } from "../db";

export const updatePostAndCommentWhenCreatorUpdateProfileFunction = async (
  change: any,
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

  const newCreator = {
    creatorID: context.params.userID,
    name: data.name,
    profilePicture: data.profilePicture,
    department: data.department,
  };

  // find all post where user is the creator
  const postQuerySnapshot = await db
    .collectionGroup("Post")
    .where("creator.creatorID", "==", context.params.userID)
    .get();

  // find all comment where user is the creator
  const commentQuerySnapshot = await db
  .collectionGroup("Comment")
  .where("creator.creatorID", "==", context.params.userID)
  .get();

  const batch = db.batch();

  postQuerySnapshot.forEach((doc) => {
    const postRef = doc.ref;
    batch.update(postRef, { creator: newCreator });
  });


  commentQuerySnapshot.forEach((doc) => {
    const commentRef = doc.ref;
    batch.update(commentRef, { creator: newCreator });
  });

  await batch.commit();
};
