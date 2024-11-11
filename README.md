# Firegrations

Firegrations is a simple migration tool for Firestore. It allows you to define your migrations in code fully typed in Typescript and run them in a specific order.

## Installation

There are two operation modes of the migration tool. You can either use the CLI or the package as a library directly in your code.

If you solely want to use the CLI, you don't need to install this package. However, it is useful to install it for type information. You can use it directly from npx.

```sh
npx @nanogiants/firegration --migrations=./your-migrations-folder
```

For library usage, you can install the package from npm:

```sh
npm install @nanogiants/firegration
```

You also need Firebase Credentials in both modes to run the migrations. Simply set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable when running the migrations.

## Usage

### Write your migrations

You can write your migrations in a folder of your choice in Typescript. Each migration should be a separate file that exports a function that takes a Firestore instance as an argument. The naming scheme must satisfy the following regex: `v{semver}__{description}`.

You can either export a default anonymous function or export a named function `migrate`:

```ts
// migrations/v1.0.0__migration1.ts
import { MigrationParameters } from "@nanogiants/firegration";
export default async function ({ firestore }: MigrationParameters) {
  // Your migration code here
}
```

```ts
// migrations/v1.0.1__migration2.ts
import { MigrationParameters } from "@nanogiants/firegration";
export async function migrate({ firestore }: MigrationParameters) {
  // Your migration code here
}
```

### Run your migrations

You can run your migrations using the CLI or the library.

#### CLI

```sh
GOOGLE_APPLICATION_CREDENTIALS="service_account.json" npx @nanogiants/firegration --migrations=./migrations
```

#### Library

```ts
// index.js
import { runMigrations } from "@nanogiants/firegration";

runMigrations({
  migrations: "./migrations",
});
```

```sh
GOOGLE_APPLICATION_CREDENTIALS="service_account.json" node index.js
```

### CLI Parameters

```sh
Usage: @nanogiants/firegration [options]

Options:
  --migrations <path>              Path to migrations folder
  --migrationsCollection <string>  Name of migrations collection (default: "firegration")
  --databaseId <string>            Id of firestore database to use
  --tsconfig <path>                Path to tsconfig file
  -V, --version                    output the version number
  -h, --help                       display help for command
```

## Examples

You can find examples of how to use Firegration in the [examples](./examples) folder.