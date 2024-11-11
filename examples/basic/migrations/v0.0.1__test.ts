import { MigrationParameters } from "@nanogiants/firegration";

// assume we have a collection called "users" and we want to add a new field called dateCreated
export default async function ({ firestore }: MigrationParameters) {
  const usersCollection = firestore.collection("users");

  const users = await usersCollection.get();

  for (const user of users.docs) {
    await user.ref.update({
      dateCreated: new Date(),
    });
  }
}
