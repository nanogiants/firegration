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

export type RunMigrationOptions = {
  /**
   * Path to the folder containing the migration files
   */
  migrations: string;
  /**
   * Id of the Firestore database to run the migrations on
   */
  databaseId?: string;
  /**
   * Path to the tsconfig file
   */
  tsconfig?: string;
  /**
   * Name of the collection to store migration information
   * @default "firegration"
   */
  migrationsCollectionName?: string;
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
};
