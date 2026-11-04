# Credential checks before sharing

Use Node 24 from the repository root:

```sh
pnpm secrets:check
pnpm secrets:history
pnpm build
node scripts/check-secrets.mjs --history --build
```

The checker prints file paths, line numbers and rule names. Matched values are always redacted. It exits nonzero when a candidate needs review or a file was skipped.

## Coverage

- Current tracked files plus untracked, non-ignored files.
- Suspicious private/runtime paths even when someone has already tracked them.
- With `--history`, blobs reachable from all locally fetched refs. Fetch remote branches and tags before a release check.
- With `--build`, root browser build output/source maps and the generated hosted server bundle.
- Recognized credential formats, private-key markers, bearer/JWT literals and high-entropy credential assignments.
- Exact matches against recognized local environment values/wrapping secrets when those local files exist.

The code never tests credentials against a service. No provider calls are required for the scan.

## Reviewed fixtures

Six long descriptive literals in injected settings, routing and MCP tests were reviewed independently. They are synthetic sentinels, not provider credentials. `scripts/secret-fixtures.json` permits only the exact SHA-256 fingerprint in its exact file. Identical historical content can use the same exception; another value or another file cannot.

A test filename alone is never a reason to ignore a warning. Do not add broad directory exceptions.

## Limits

No detector proves that every possible secret is absent. This checker does not decode arbitrary archives, run OCR on images/videos, inspect deleted remote refs, or audit GitHub issues, Actions logs or external provider settings. It reports large files and symlinks that it cannot inspect. Exact local-value matching covers only the recognized local files, not every credential on the machine.

The focused source review checked settings storage/redaction, connection loading, public build boundaries and selected export paths. It was not a full application penetration test. User-entered secrets in prompts, documents and media can still be exported or sent as ordinary content.

Keep GitHub secret scanning and push protection enabled where available. Their availability/settings must be verified by the repository owner; local checks are an additional layer.

## Release packaging

Real environment files, private configuration directories, runtime databases, key files and generated artifacts are ignored. The legacy assembler also rejects those paths recursively. Inside this monorepo it exits without creating a nested release. Existing root documentation and ignore files are preserved.

Ignore rules do not remove a file already in Git history. If a real secret is discovered, rotate/revoke it first, check usage, and coordinate any history cleanup. Do not push the secret in a report or a temporary fix commit.
