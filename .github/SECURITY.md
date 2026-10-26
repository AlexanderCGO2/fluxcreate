# Reporting security issues

FluxCreate is an early project preparing for a public release. There is no supported long-term security-maintenance version or guaranteed response time yet.

## Private reporting

While this repository remains private, authorized collaborators can contact its owner through the existing private collaboration channel. Do not put raw keys, session cookies, private user media or unnecessary exploit details in issue attachments.

Before making the repository public, the maintainer must enable and verify GitHub private vulnerability reporting. Once enabled, use **Security -> Report a vulnerability**:

https://github.com/AlexanderCGO2/fluxcreate/security/advisories/new

That route is a planned reporting channel, not a claim that it is currently enabled. If it is unavailable, request a private contact route without publishing the sensitive details.

## What to include

Provide the affected commit, component, prerequisites, expected control and a minimal reproduction using synthetic data. Describe the impact and relevant deployment settings. Redact all credential values.

If you discover an exposed credential, tell the owner its type and location. Do not test it against a provider. The owner should revoke or rotate it, review its usage, and then clean affected files/history.

## Scope and limits

Credential checks and mocked tests do not certify the entire application as secure. Browser storage is local to an origin; hosted deployment authentication does not supply full application accounts, tenant ownership or durable job isolation. Follow the hosting documentation and keep shared billable connections behind access control.

This document describes reporting logistics. It does not define scanner exclusions, suppress findings, or establish an accepted-risk policy.
