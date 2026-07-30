# Security and UI/UX Audit

Audit date: 2026-07-29

## Executive summary

The app is suitable for local development and simulator testing after the
backend migration. It is not yet ready for an internet-facing production
deployment. The largest remaining production risks are transport/session
hardening, dependency modernization, incomplete account recovery, and broad UI
accessibility coverage.

## Security

### Improvements completed

- Removed the hosted backend SDK, edge functions, configuration, and direct
  database calls from the mobile app.
- Removed the Netlify configuration and redirect rule.
- Removed the tracked `.env`; local secrets now live in ignored `.env.local`
  with restrictive file permissions.
- Proxies Google Books through the server so the key is not embedded in the
  mobile bundle.
- Hashes passwords with bcrypt (cost 12) and signs expiring JWT sessions.
- Enforces the minimum signup age on both the client and API, and revalidates
  the account behind each protected session.
- Requires authentication and enforces record ownership for writes.
- Uses resource, field, filter, and RPC allowlists around the migration API.
- Uses parameterized PostgreSQL queries and database constraints.
- Hides birthdate and search history from public profile responses.
- Filters private realtime records to their owner or conversation participants;
  presence updates require an authenticated socket.
- Adds Helmet headers, body limits, per-route/global rate limiting, an explicit
  development CORS allowlist, and image type/size limits.
- Refuses the fallback JWT secret in production.
- Gates the database reset script to the exact development database name.

### Open findings

| Priority             | Finding                                                                                                                                                                                                                   | Recommendation                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 before production | Local API and WebSockets use plain HTTP/WS; JWTs are stored in AsyncStorage.                                                                                                                                              | Deploy behind HTTPS/WSS and move native credentials to Expo SecureStore or platform Keychain/Keystore.                                      |
| P0 before production | Secrets previously committed to `.env` remain in Git history.                                                                                                                                                             | Rotate the old Google Books key and any still-active backend credentials; purge repository history if it was shared.                        |
| P1                   | Expo SDK 52's production dependency tree currently reports 44 advisories: 5 moderate, 38 high, and 1 critical, primarily in bundled build/development tooling. The available automatic fix requires a major Expo upgrade. | Plan and test an Expo SDK upgrade instead of using `npm audit fix --force`. Re-audit the built artifact and runtime dependencies afterward. |
| P1                   | No email verification, password-reset flow, login lockout persistence, MFA, or account-deletion confirmation UI exists.                                                                                                   | Add verified recovery and destructive-action confirmation before real users are onboarded.                                                  |
| P1                   | Rate limits use in-memory state and uploads use local disk without malware/content scanning.                                                                                                                              | Use a shared rate-limit store and managed object storage with scanning for multi-instance production.                                       |
| P1                   | Stripe checkout has no completed webhook/subscription entitlement lifecycle in the local replacement.                                                                                                                     | Implement signed webhook verification and server-owned entitlement records before enabling payments.                                        |
| P2                   | The migration client and generic data API use broad compatibility types at their boundary.                                                                                                                                | Replace screen-level generic queries with schema-generated, typed repositories and use-case services.                                       |
| P2                   | Automated security, authorization, and regression tests are absent.                                                                                                                                                       | Add API integration tests for cross-user access, validation, token expiry, upload abuse, and private realtime events.                       |
| P2                   | Development seed credentials are documented and predictable.                                                                                                                                                              | Keep seed accounts development-only and prevent seed execution in production.                                                               |

## UI/UX

### Native interface score

| Category             |    Score | Notes                                                                                                                                                                                          |
| -------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility        |      1/4 | Primary navigation/auth actions now have labels and 48-point targets, but only 43 accessibility annotations cover 276 touchable usages. Dynamic Type and screen-reader flows need a full pass. |
| Adaptivity           |      1/4 | Major content uses lists, but several screens rely on fixed dimensions/manual safe-area padding and tablet layouts are not purpose-designed.                                                   |
| Theming              |      2/4 | Semantic tokens now cover the root, tabs, and home foundation, but 765 raw hex color usages and 252 local font sizes remain. The app is effectively dark-only.                                 |
| Performance          |      2/4 | Main feeds use virtualized lists and image caching hooks, but large route components and repeated screen-level queries make rendering and request behavior difficult to control.               |
| Platform conformance |      2/4 | Navigation, keyboard avoidance, native date/image controls, loading/empty/error states are present. Iconography and interaction patterns still mix web-like and native conventions.            |
| **Total**            | **8/20** | **Poor — functional, with a clear foundation but substantial consistency and accessibility debt.**                                                                                             |

### Improvements completed

- Introduced semantic color, typography, spacing, radius, and touch-target tokens.
- Simplified the root stack so Expo Router receives only valid screen children.
- Improved tab/home hierarchy, contrast, compact card sizing, and primary touch
  targets.
- Added accessibility roles/labels to primary navigation and authentication
  controls.
- Corrected signup success messaging for immediate local account creation.
- Removed settings toggles that did not persist or affect the application.
- Renamed the app and deep-link scheme consistently to Book Exchange.

### Recommended UI backlog

1. Split the four largest route files into focused feature screens, components,
   data hooks, and typed services.
2. Apply the semantic tokens across every screen and implement real system
   light/dark appearance before restoring a theme control.
3. Audit every interactive element with VoiceOver and TalkBack, including labels,
   hints, selected/disabled state, reading order, and 44–48 point targets.
4. Replace manual status-bar padding with safe-area primitives and test small
   phones, large phones, landscape, tablets, keyboard states, and 200% text.
5. Standardize list cards, empty/error/loading states, forms, and destructive
   confirmations as reusable components.
6. Reconsider the center “Add” tab as a primary action pattern and validate the
   five-tab information architecture with users.
7. Add skeleton/loading continuity, optimistic updates where safe, and a single
   request/cache strategy to reduce screen-level query duplication.
