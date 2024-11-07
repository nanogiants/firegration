import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs/promises";
import * as path from "path";
import { MigrationFile, RunMigrationOptions } from "./types";
import {
  ensureValidMigrationFiles,
  getSortedMigrationFilesByVersion,
  getVersionFromMigrationFile,
  logger,
  MIGRATIONS_COLLECTION_NAME,
  registerTsCompiler,
} from "./utils";

admin.initializeApp();

export async function runMigrations({
  migrations,
  databaseId,
  tsconfig,
  migrationsCollectionName = MIGRATIONS_COLLECTION_NAME,
  verbose,
}: RunMigrationOptions) {
  if (verbose) {
    logger.level = "debug";
  }
  await registerTsCompiler(tsconfig);
  let migrationsPath = migrations;
  if (!path.isAbsolute(migrations)) {
    migrationsPath = path.join(process.cwd(), migrations);
  }
  logger.debug(`Migrations path: ${migrationsPath}`);

  const files = await fs.readdir(migrationsPath);
  ensureValidMigrationFiles(files);

  const sortedFilesByVersion = getSortedMigrationFilesByVersion(files);
  if (sortedFilesByVersion.length === 0) {
    logger.info("No migrations to run");
    return;
  }
  const firestore = databaseId ? getFirestore(databaseId) : getFirestore();
  const migrationsCollection = firestore.collection(migrationsCollectionName);
  const versions = await migrationsCollection.listDocuments();
  let currentVersion = null;
  if (versions.length > 0) {
    versions.sort((a, b) => {
      return a.id.localeCompare(b.id);
    });

    const latestMigration = versions[versions.length - 1];

    currentVersion = latestMigration.id;
  }

  logger.info(`Current Firestore Version: ${currentVersion}`);

  for (const file of sortedFilesByVersion) {
    const migrationVersion = getVersionFromMigrationFile(file);
    if (currentVersion && migrationVersion <= currentVersion) {
      logger.debug(
        `Skipping migration because it has already been run: ${file}`
      );
      continue;
    }

    const migrationFilePath = `${migrationsPath}/${file}`;
    logger.info(`Running migration: ${migrationFilePath}`);

    const migrationFile: MigrationFile = await import(migrationFilePath);

    if (!migrationFile.default && !migrationFile.migrate) {
      throw new Error(
        `Invalid migration file: ${file}. No default or migrate export found`
      );
    }
    await (migrationFile.default ?? migrationFile.migrate)({ firestore });
    await migrationsCollection.doc(migrationVersion).set({
      timestamp: new Date().toISOString(),
      caller: process.env.USER,
      version: migrationVersion,
    });
  }
}

export * from "./types";
