#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs/promises"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const path = __importStar(require("path"));
const ts_node_1 = require("ts-node");
admin.initializeApp();
commander_1.program.requiredOption("--migrations <path>", "Path to migrations folder");
commander_1.program.option("--databaseId <string>", "Id of firestore database to use");
commander_1.program.parse();
const { migrations, databaseId } = commander_1.program.opts();
const MIGRATIONS_COLLECTION_NAME = "firegration";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        (0, ts_node_1.register)({
            compilerOptions: {
                noImplicitAny: false,
            },
        });
        let migrationsPath = migrations;
        if (!path.isAbsolute(migrations)) {
            migrationsPath = path.join(process.cwd(), migrations);
        }
        console.info(`Migrations path: ${migrationsPath}`);
        const files = yield fs.readdir(migrationsPath);
        ensureValidMigrationFiles(files);
        const sortedFilesByVersion = getSortedMigrationFilesByVersion(files);
        if (sortedFilesByVersion.length === 0) {
            console.info("No migrations to run");
            return;
        }
        const firestore = (0, firestore_1.getFirestore)(databaseId);
        const migrationsCollection = firestore.collection(MIGRATIONS_COLLECTION_NAME);
        const versions = yield migrationsCollection.listDocuments();
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
                console.info(`Skipping migration because it has already been run: ${file}`);
                continue;
            }
            const migrationFilePath = `${migrationsPath}/${file}`;
            console.info(`Running migration: ${migrationFilePath}`);
            const migrationFile = yield Promise.resolve(`${migrationFilePath}`).then(s => __importStar(require(s)));
            if (!migrationFile.default && !migrationFile.migrate) {
                throw new Error(`Invalid migration file: ${file}. No default or migrate export found`);
            }
            yield ((_a = migrationFile.default) !== null && _a !== void 0 ? _a : migrationFile.migrate)({ firestore });
            yield migrationsCollection.doc(migrationVersion).set({
                timestamp: new Date().toISOString(),
                caller: process.env.USER,
                version: migrationVersion,
            });
        }
    });
}
main();
// ------------------------------ //
function ensureValidMigrationFiles(files) {
    const migrationFileRegex = /^v\d+\.\d+\.\d+__.+\.ts$/;
    const invalidFiles = files.filter((file) => !migrationFileRegex.test(file));
    if (invalidFiles.length > 0) {
        throw new Error(`Invalid migration files found: ${invalidFiles.join(", ")}`);
    }
    const versions = files.map(getVersionFromMigrationFile);
    const duplicateVersions = versions.filter((version, index) => versions.indexOf(version) !== index);
    if (duplicateVersions.length > 0) {
        throw new Error(`Duplicate versions found: ${duplicateVersions.join(", ")}`);
    }
}
function getVersionFromMigrationFile(file) {
    return file.split("__")[0];
}
function getSortedMigrationFilesByVersion(files) {
    return files.sort((a, b) => {
        const aVersion = getVersionFromMigrationFile(a);
        const bVersion = getVersionFromMigrationFile(b);
        return aVersion.localeCompare(bVersion);
    });
}
//# sourceMappingURL=index.js.map