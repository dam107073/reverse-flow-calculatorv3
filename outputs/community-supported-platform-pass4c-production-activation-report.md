# Reverse Flow Community-Supported Platform

## Pass #4C/#4D — Preview Activation and Registration Routing

Date: July 24, 2026
Status: Preview activated and validated; Production remains inactive

## Outcome

The native support purchase architecture, backend purchase verification, Supporter registration, welcome-email automation, and Apple/Google lifecycle notification handling are implemented. Preview migrations 004 and 005 are applied. The stable Preview deployment is:

`https://reverese-flow-website-dam107073-reverse-flow-llc.vercel.app`

No Production migration, deployment, store upload, or submission was performed.

## Physical-device registration diagnosis

The iOS device build was version 1.3.3 build 3. Its copied web assets still referenced an obsolete immutable Preview deployment rather than the stable alias. The one-time Apple purchase reached the registration form, but the registration POST went to:

`https://reverese-flow-website-pkkuuucew-reverse-flow-llc.vercel.app/api/supporters/verify-purchase`

That deployment returned HTTP 404 without a Capacitor CORS header. WebKit surfaced the result as a network exception, so the current user-facing message correctly reported that the Supporter Directory could not be reached. The request did not execute the verification handler, Supabase RPC, Supporter registration, or welcome-email automation.

The fixed canonical configuration now contains only:

- Preview: `https://reverese-flow-website-dam107073-reverse-flow-llc.vercel.app`
- Production: `https://reverse-flow.app`

iOS Debug and Release builds package Preview; the explicit iOS Production configuration packages Production. Android Debug and Preview builds package Preview; Android Release packages Production.

## Purchase preservation and retry

The app does not finish the store transaction until backend verification and confirmed Supporter registration succeed. A failed registration therefore leaves the accepted Apple transaction recoverable and does not require another purchase. The safe retry is:

1. Install the repaired Preview build without starting another purchase.
2. Open the Support page.
3. Choose Restore Support Purchases.
4. Reuse the recovered verified purchase and submit the registration form.

Registration is idempotent by normalized email and verified source. Automatic welcome delivery remains single-send, while intentional admin resend remains available.

## Preview activation

- Migrations 004 and 005 are present in the Preview migration ledger.
- `supabase db push --linked --dry-run` reports the database is up to date.
- Stable Preview purchase-verification, status, and legacy-claim routes execute and return CORS-enabled API responses.
- Apple and Google notification routes are present and POST-only.
- A controlled registration RPC test succeeded inside a rolled-back transaction.
- A controlled Supporter status lookup succeeded.
- Google RTDN authentication and test-notification handling were previously validated in Preview.
- One welcome email was sent only to the allowlisted Preview address; sender, Reply-To, HTML, plain text, delivery recording, automatic suppression, and manual resend behavior were verified.
- The non-public, source-less Preview email fixture was removed after validation.

## Privacy-safe diagnostics

Native registration logs now record only the event name, backend host, platform, environment, HTTP status, normalized failure category, and success outcome. They never log a full email address, receipt, transaction identifier, purchase token, or credential.

Events:

- `supporter-registration-request-started`
- `supporter-registration-response`
- `supporter-registration-failed`
- `supporter-registration-retry-available`

## Validation

- Calculator suite: 98 passed, 0 failed.
- Complete website script suite: 32 scripts passed, 0 failed.
- Store notification tests: 8 passed, 0 failed.
- Capacitor iOS and Android sync: passed.
- iOS unsigned Release device build: passed.
- iOS unsigned Production device build: passed.
- Android Release and Preview bundle builds: passed.
- Packaged iOS Release and Android Preview assets contain the stable Preview alias.
- Packaged iOS Production and Android Release assets contain the Production host.
- Preview migration dry run: no pending migrations.
- Preview route smoke tests and rolled-back registration RPC: passed.

Known build warnings are limited to the existing Android `flatDir`/Gradle deprecation warnings and Xcode’s multiple-destination selection warning.

## Remaining manual action

Install the repaired iOS Preview build and use Restore Support Purchases to retry registration for the existing unfinished transaction. Do not tap the one-time purchase button again. Capture the new privacy-safe registration events and confirm the backend returns HTTP 200 before any Production activation.
