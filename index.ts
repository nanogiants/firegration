#!/usr/bin/env node
import { program } from "commander";
import * as fs from "fs/promises";
import * as admin from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as path from "path";
import { register } from "ts-node";
import { MigrationFile } from "./firegration";
admin.initializeApp();
import { version } from "./package.json";
import winston from "winston";

const logger = winston.createLogger({
  transports: [new winston.transports.Console({})],
  format: winston.format.combine(
    winston.format.label({ label: "Firegration" }),
    winston.format.cli(),
    winston.format.colorize()
  ),
  level: "info",
});

const MIGRATIONS_COLLECTION_NAME = "firegration";

program.requiredOption("--migrations <path>", "Path to migrations folder");
program.option(
  "--migrationsCollection <string>",
  "Name of migrations collection",
  MIGRATIONS_COLLECTION_NAME
);
program.option("--databaseId <string>", "Id of firestore database to use");
program.option("--tsconfig <path>", "Path to tsconfig file");
program.option("--verbose", "Enable verbose logging", false);

program.version(version);

program.parse();

const {
  migrations,
  databaseId,
  tsconfig: tsconfigPath,
  migrationsCollection: migrationsCollectionName,
  verbose,
} = program.opts();

async function main() {
  if (verbose) {
    logger.level = "debug";
  }
  await registerTsCompiler();
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

main();

// ------------------------------ //

async function registerTsCompiler() {
  const defaultTSConfig = {
    compilerOptions: {
      noImplicitAny: false,
      target: "ESNext",
      module: "CommonJS",
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
    logger.warn(
      `No tsconfig file found at ${absoluteTsConfigPath}. Using default configuration`
    );
  }
  const tsConfig = tsConfigExists
    ? JSON.parse(await fs.readFile(absoluteTsConfigPath, "utf-8"))
    : defaultTSConfig;

  logger.debug(`Using ts configuration: ${JSON.stringify(tsConfig)}`);

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
