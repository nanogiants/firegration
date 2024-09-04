# FireMigrations

FireMigrations is a simple migration tool for Firestore. It allows you to define your migrations in code and run them in a specific order.

## Usage

```sh
GOOGLE_APPLICATION_CREDENTIALS="service_account.json" npm run migrate -- --migrations=./migrations --databaseId=development
```
