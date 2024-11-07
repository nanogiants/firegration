#!/usr/bin/env node
import { program } from "commander";
import { runMigrations } from "./index";
import { version } from "./package.json";
import { MIGRATIONS_COLLECTION_NAME } from "./utils";

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
  tsconfig,
  migrationsCollection: migrationsCollectionName,
  verbose,
} = program.opts();

runMigrations({
  migrations,
  databaseId,
  tsconfig,
  migrationsCollectionName,
  verbose,
});
