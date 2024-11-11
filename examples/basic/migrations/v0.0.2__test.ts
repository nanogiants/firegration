import { MigrationFile, MigrationFunction } from "@nanogiants/firegration";

export const migrate: MigrationFunction = async ({ firestore }) => {
  // assume v0.0.1 has run. we can expect a field dateCreated to be available. Let's mark every user as inactive that was created before 2021

  const usersCollection = firestore.collection("users");

  const users = await usersCollection.get();

  for (const user of users.docs) {
    const { dateCreated } = user.data();

    if (dateCreated.toDate().getFullYear() < 2021) {
      await user.ref.update({
        active: false,
      });
    } else {
      await user.ref.update({
        active: true,
      });
    }
  }
};