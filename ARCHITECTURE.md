# Architecture

The project now separates the mobile delivery layer from business services,
external infrastructure, and the local backend.

```text
app/                              Expo Router screens and navigation
src/
  domain/                         Framework-independent domain models
  application/services/           Use-case and application services
  infrastructure/local-api/       HTTP, auth, storage, and realtime adapter
  presentation/
    components/                   Shared visual components
    hooks/                        Presentation-facing hooks
    providers/                    App-wide React state providers
    theme/                        Semantic design tokens
  shared/config/                  Runtime and integration configuration
server/
  db/                             PostgreSQL schema and development seed
  scripts/                        Safe setup/reset automation
  src/                            Express API, authorization, SQL, and WebSockets
```

## Dependency direction

Mobile routes may use presentation components/hooks and application services.
Application code may use domain models and an infrastructure interface.
Infrastructure code owns network and persistence details. The server is a
separate process and never imports mobile presentation code.

The current `dataClient` is a migration adapter. It offers a familiar fluent
query interface so the existing screens can move away from the former hosted
backend without a risky all-at-once rewrite. New features should use focused,
typed repositories or application services rather than adding more generic
queries to screens.

## Runtime boundaries

- Expo talks only to the local API.
- Express authenticates requests, validates allowed resources and fields, and
  owns all database access.
- PostgreSQL is bound to the local development environment and stores application
  data in `book_exchange_local`.
- Google Books and Stripe secrets are read only by the server.
- WebSocket events containing private records are filtered to their owners or
  conversation participants.

## Next structural milestone

Several routes are still large because this refactor prioritized safely
replacing the backend. The next clean-architecture pass should split `browse`,
`add`, `chat`, and `profile` into feature folders with:

```text
src/features/<feature>/
  application/
  domain/
  infrastructure/
  presentation/
```

Each feature should expose a small public entry point, with route files limited
to navigation parameters and screen composition.
