# Licensing

License decision approved by the project owner on **3 November 2026**.

## Component map

| Scope | License | Authoritative text |
| --- | --- | --- |
| Project-owned application and shared suite code, including FluxFoto, FluxDesign, FluxVideo, FluxMotion, FluxEffects, Flux3D, FluxLab and FluxAgents | AGPL-3.0-only | [Root LICENSE](../LICENSE) |
| The standalone FluxExchange package in `FluxExchange/` | Apache-2.0 | [FluxExchange/LICENSE](../FluxExchange/LICENSE) |
| Third-party dependencies, fonts, vendor material and assets with their own notices | Their respective licenses | Keep the original notices and review distribution obligations |

The root license is the default for project-owned repository material outside the FluxExchange exception and separately identified third-party material. Package manifests record the applicable SPDX identifier. License text copyright notices refer to the license authors; ownership of project contributions stays with their respective rights holders.

The choice is **AGPL-3.0-only**, not an automatic grant to use a future AGPL version. FluxExchange uses Apache-2.0. This document summarizes the policy; the license texts govern.

## Why this choice

AGPL supports a reciprocal application ecosystem. Distribution obligations apply to covered versions; its additional network provision requires a modified version to offer its corresponding source to users interacting with it remotely.

Apache permits broader reuse of the independent exchange implementation, including in proprietary tools, subject to its license, notice and other requirements. FluxExchange currently has no runtime package dependencies and does not import the app implementations. Keep that boundary independent; do not copy AGPL-only application code into the Apache package without the necessary rights and review.

Using Apache components inside an AGPL application does not make the whole application Apache-licensed. Review changes that alter the boundary or combine third-party works.

## Commercial use and optional services

Both licenses allow commercial use. Other people may operate competing services while complying with the relevant license. AGPL is not a ban on hosting competitors, a requirement to contribute directly to this repository, or a guarantee of business revenue.

FluxCreate can offer optional hosting, AI usage, support and integrations. Software rights, hosted-service terms and provider charges are separate. No paid offering or credit package is launched by adopting these licenses.

A commercial dual-license offer would require sufficient rights to all code involved. No alternative proprietary license, automatic copyright assignment or dual-license program is established here.

## Projects, generated content and branding

Merely editing a photograph, layout, scene or video with FluxCreate does not make that work AGPL-licensed. Output that includes or adapts covered software may require separate analysis; do not promise every possible output is exempt. Users remain responsible for their inputs, model-provider terms and third-party material.

The software licenses do not automatically grant unrestricted use of FluxCreate names or logos. Use names to describe compatibility accurately and avoid implying endorsement. A separate trademark policy remains release preparation work.

## Contributions

Submit only work you have the right to contribute. Project-owned contributions should use the license of the component they modify; disclose any separately licensed material and retain its notices. See [CONTRIBUTING.md](../CONTRIBUTING.md).

There is no adopted copyright-assignment agreement, mandatory DCO workflow or separate CLA. Do not assume that an issue, a donation or an AI-generated answer transfers rights.

This change does not revoke rights previously granted under another license, and it does not authorize relicensing third-party code.

## Publication gates

The license choice is adopted; dependency compatibility, asset provenance, copyright ownership and distribution notices still need release review. Repository visibility and production authentication remain separate decisions.

Keep fonts, artwork, templates, audio/video examples and downloaded media out of public release unless their distribution rights are recorded. An installed package or a generated asset is not automatically approved for redistribution.

## License text sources

The standard texts were copied unchanged from the SPDX license-list data:
- [AGPL-3.0-only](https://github.com/spdx/license-list-data/blob/main/text/AGPL-3.0-only.txt)
- [Apache-2.0](https://github.com/spdx/license-list-data/blob/main/text/Apache-2.0.txt)

Original license references: [GNU AGPL](https://www.gnu.org/licenses/agpl-3.0.html), [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
