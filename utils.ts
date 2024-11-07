import winston from "winston";
import * as path from "path";
import { register } from "ts-node";
import * as fs from "fs/promises";

export const MIGRATIONS_COLLECTION_NAME = "firegration";

export const logger = winston.createLogger({
  transports: [new winston.transports.Console({})],
  format: winston.format.combine(
    winston.format.label({ label: "Firegration" }),
    winston.format.cli(),
    winston.format.colorize()
  ),
  level: "info",
});


export async function registerTsCompiler(tsconfigPath?: string) {
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
  const tsConfig =
    absoluteTsConfigPath && tsConfigExists
      ? JSON.parse(await fs.readFile(absoluteTsConfigPath, "utf-8"))
      : defaultTSConfig;

  logger.debug(`Using ts configuration: ${JSON.stringify(tsConfig)}`);

  register(tsConfig);
}

export function ensureValidMigrationFiles(files: string[]) {
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

export function getVersionFromMigrationFile(file: string) {
  return file.split("__")[0];
}

export function getSortedMigrationFilesByVersion(files: string[]) {
  return files.sort((a, b) => {
    const aVersion = getVersionFromMigrationFile(a);
    const bVersion = getVersionFromMigrationFile(b);

    return aVersion.localeCompare(bVersion);
  });
}
