# Reporting security issues

FluxCreate is an early project preparing for a public release. There is no supported long-term security-maintenance version or guaranteed response time yet.

## Private reporting

Email [build@flux-ai.co](mailto:build@flux-ai.co) with the subject **FluxCreate security report** for private routing. The project owner supplied this address; delivery and response time have not been verified by preparing this document. Start with a redacted description and arrange any sensitive evidence privately. Do not send raw keys, session cookies, private user media or unnecessary exploit details.

Maintain the private contact route above during preparation. When the repository becomes public, enable and verify GitHub private vulnerability reporting before broad promotion. Once enabled, use **Security -> Report a vulnerability**:

https://github.com/AlexanderCGO2/fluxcreate/security/advisories/new

That route is a planned reporting channel, not a claim that it is currently enabled. If it is unavailable, use the project email above without publishing sensitive details. Conduct concerns follow [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md); ordinary help follows [SUPPORT.md](../SUPPORT.md).

## What to include

Provide the affected commit, component, prerequisites, expected control and a minimal reproduction using synthetic data. Describe the impact and relevant deployment settings. Redact all credential values.

If you discover an exposed credential, tell the owner its type and location. Do not test it against a provider. The owner should revoke or rotate it, review its usage, and then clean affected files/history.

## Scope and limits

Credential checks and mocked tests do not certify the entire application as secure. Browser storage is local to an origin; hosted deployment authentication does not supply full application accounts, tenant ownership or durable job isolation. Follow the hosting documentation and keep shared billable connections behind access control.

This document describes reporting logistics. It does not define scanner exclusions, suppress findings, or establish an accepted-risk policy.
