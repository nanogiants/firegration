import { program } from "commander";
import * as fs from "fs/promises";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

program.requiredOption("--migrations <path>", "Path to migrations folder");
program.option("--databaseId <string>", "Id of firestore database to use");

program.parse();

const { migrations, databaseId } = program.opts();

async function main() {
  const files = await fs.readdir(migrations);
  ensureValidMigrationFiles(files);

  const sortedFilesByVersion = getSortedMigrationFilesByVersion(files);
  const firestore = getFirestore(databaseId);
  const migrationsCollection = firestore.collection("firemigrations");
  const versions = await migrationsCollection.listDocuments();
  let currentVersion = null;
  if (versions.length > 0) {
    versions.sort((a, b) => {
      return a.id.localeCompare(b.id);
    });

    const latestMigration = versions[versions.length - 1];

    currentVersion = latestMigration.id;
  }

  console.info(`Current Firestore Version: ${currentVersion}`);

  for (const file of sortedFilesByVersion) {
    const migrationVersion = getVersionFromMigrationFile(file);
    if (currentVersion && migrationVersion <= currentVersion) {
      console.info(
        `Skipping migration because it has already been run: ${file}`
      );
      continue;
    }

    const migrationFilePath = `${migrations}/${file}`;
    console.info(`Running migration: ${migrationFilePath}`);

    const { migrate } = await import(migrationFilePath);

    await migrate(firestore);
    await migrationsCollection.doc(migrationVersion).set({
      timestamp: new Date().toISOString(),
      caller: process.env.USER,
      version: migrationVersion,
    });
  }
}

main();

// ------------------------------ //

function ensureValidMigrationFiles(files: string[]) {
  const migrationFileRegex = /^v\d+\.\d+\.\d+__.+\.ts$/;
  const invalidFiles = files.filter((file) => !migrationFileRegex.test(file));
  if (invalidFiles.length > 0) {
    throw new Error(
      `Invalid migration files found: ${invalidFiles.join(", ")}`
    );
  }

  const versions = files.map(getVersionFromMigrationFile);

  const duplicateVersions = versions.filter(
    (version, index) => versions.indexOf(version) !== index
  );

  if (duplicateVersions.length > 0) {
    throw new Error(
      `Duplicate versions found: ${duplicateVersions.join(", ")}`
    );
  }
}

function getVersionFromMigrationFile(file: string) {
  return file.split("__")[0];
}

function getSortedMigrationFilesByVersion(files: string[]) {
  return files.sort((a, b) => {
    const aVersion = getVersionFromMigrationFile(a);
    const bVersion = getVersionFromMigrationFile(b);

    return aVersion.localeCompare(bVersion);
  });
}
