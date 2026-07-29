# Book Exchange

Book Exchange is an Expo/React Native application backed by a local Express API
and PostgreSQL database. The mobile bundle contains no database credentials and
does not connect directly to PostgreSQL.

## Local setup

Requirements:

- Node.js 20 or newer
- PostgreSQL 17
- pgAdmin 4 (optional database GUI)
- Xcode with an iOS Simulator, or Android Studio with an Android emulator

Install and prepare the project:

```bash
npm install
brew services start postgresql@17
npm run db:setup
```

`db:setup` creates only the `book_exchange_local` database, applies
`server/db/schema.sql`, inserts development seed data, and creates an ignored
`.env.local` with a random JWT secret. It does not modify other local databases.

Start the API and app together:

```bash
npm run dev:all
```

Or run the iOS Simulator directly in a second terminal:

```bash
npm run dev:api
npx expo start --ios
```

Development login:

```text
demo@bookexchange.local
DemoPass123!
```

## pgAdmin connection

Open pgAdmin with `open -a "pgAdmin 4"`, then register a server using:

| Field | Value |
|---|---|
| Name | Book Exchange Local |
| Host | `127.0.0.1` |
| Port | `5432` |
| Maintenance database | `book_exchange_local` |
| Username | Your macOS account name (`$USER`) |
| Password | Leave blank if your local Homebrew PostgreSQL uses trust authentication |

pgAdmin is the GUI client; PostgreSQL remains the database server. The setup
script creates the database even when pgAdmin has not yet been initialized.

## Environment

Copy `.env.example` only when a custom configuration is needed. `.env.local`
is ignored by Git and must remain local. The mobile app may receive only
`EXPO_PUBLIC_API_URL`; Google Books and Stripe secrets belong to the API.

For an Android emulator, the app automatically uses `http://10.0.2.2:4000`.
Physical devices need `EXPO_PUBLIC_API_URL` set to the development computer's
LAN address.

## Checks

```bash
npm run typecheck
npx expo install --check
curl http://127.0.0.1:4000/health
```

Resetting the development database is intentionally gated:

```bash
CONFIRM_DB_RESET=book_exchange_local npm run db:reset
npm run db:setup
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the project boundaries and
[SECURITY_UI_AUDIT.md](./SECURITY_UI_AUDIT.md) for the current audit.
