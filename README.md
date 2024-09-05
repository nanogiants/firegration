# Firegrations

Firegrations is a simple migration tool for Firestore. It allows you to define your migrations in code and run them in a specific order.

## Installation

```sh
npm install firegration
```

You also need Firebase Credentials to run the migrations. Simply set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable when running the migrations.

## Usage

### Write your migrations

You can write your migrations in a folder of your choice in Typescript. Each migration should be a separate file that exports a function that takes a Firestore instance as an argument. The naming scheme must satisfy the following regex: `v{semver}__{description}`.

You can either export a default anonymous function or export a named function `migrate`:

```ts
// migrations/v1.0.0__migration1.ts
import { MigrationParameters } from "firegration";
export default async function ({ firestore }: MigrationParameters) {
  // Your migration code here
}
```

````ts
// migrations/v1.0.1__migration2.ts
import { MigrationParameters } from "firegration";
export async function migrate({ firestore }: MigrationParameters) {
  // Your migration code here
}
```

### Parameters

```sh
Usage: firegration [options]

Options:
  --migrations <path>    Path to migrations folder
  --databaseId <string>  Id of firestore database to use
  -h, --help             display help for command
```

### Run your migrations

```sh
GOOGLE_APPLICATION_CREDENTIALS="service_account.json" npx firegration --migrations=./migrations --databaseId=development
````
