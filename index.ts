#!/usr/bin/env node
import { program } from "commander";
import * as fs from "fs/promises";
import * as admin from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as path from "path";
import { register } from "ts-node";
import { MigrationFile } from "./firegration";
admin.initializeApp();
import {version} from "./package.json";
const MIGRATIONS_COLLECTION_NAME = "firegration";

program.requiredOption("--migrations <path>", "Path to migrations folder");
program.option("--migrationsCollection <string>", "Name of migrations collection", MIGRATIONS_COLLECTION_NAME);
program.option("--databaseId <string>", "Id of firestore database to use");
program.option("--tsconfig <path>", "Path to tsconfig file");

program.version(version);

program.parse();

const { migrations, databaseId, tsconfig: tsconfigPath, migrationsCollection: migrationsCollectionName } = program.opts();


async function main() {
  await registerTsCompiler();
  let migrationsPath = migrations;
  if (!path.isAbsolute(migrations)) {
    migrationsPath = path.join(process.cwd(), migrations);
  }
  console.info(`Migrations path: ${migrationsPath}`);

  const files = await fs.readdir(migrationsPath);
  ensureValidMigrationFiles(files);

  const sortedFilesByVersion = getSortedMigrationFilesByVersion(files);
  if (sortedFilesByVersion.length === 0) {
    console.info("No migrations to run");
    return;
  }
  const firestore = getFirestore(databaseId);
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

  console.info(`Current Firestore Version: ${currentVersion}`);

  for (const file of sortedFilesByVersion) {
    const migrationVersion = getVersionFromMigrationFile(file);
    if (currentVersion && migrationVersion <= currentVersion) {
      console.info(
        `Skipping migration because it has already been run: ${file}`
      );
      continue;
    }

    const migrationFilePath = `${migrationsPath}/${file}`;
    console.info(`Running migration: ${migrationFilePath}`);

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

main();

// ------------------------------ //

async function registerTsCompiler() {
  const defaultTSConfig = {
    compilerOptions: {
      noImplicitAny: false,
      target: "ESNext",
      module: "ESNext",
    },
  };
  const absoluteTsConfigPath = tsconfigPath
    ? path.isAbsolute(tsconfigPath)
      ? tsconfigPath
      : path.join(process.cwd(), tsconfigPath)
    : null;
  const tsConfigExists = absoluteTsConfigPath
    ? await fs
        .access(absoluteTsConfigPath)
        .then(() => true)
        .catch(() => false)
    : false;

  if (absoluteTsConfigPath && !tsConfigExists) {
    console.warn(
      `No tsconfig file found at ${absoluteTsConfigPath}. Using default configuration`
    );
  }
  const tsConfig = tsConfigExists
    ? JSON.parse(await fs.readFile(absoluteTsConfigPath, "utf-8"))
    : defaultTSConfig;

  console.debug("Using ts configuration:", tsConfig);

  register(tsConfig);
}

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
