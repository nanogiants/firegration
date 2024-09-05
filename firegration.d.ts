import { Firestore } from "firebase-admin/firestore";

export type MigrationFile =
  | {
      migrate: MigrationFunction;
      default: undefined;
    }
  | {
      migrate: undefined;
      default: MigrationFunction;
    };

export type MigrationFunction = (
  params: MigrationParameters
) => Promise<void> | void;

export type MigrationParameters = {
  firestore: Firestore;
};
