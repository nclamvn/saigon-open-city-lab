# Security and publication review

This repository is public. Review new source snapshots, response headers, notebooks and download receipts before committing them: copied public pages can contain website tokens even when the project has no credential of its own.

The 1 October 2026 audit found no confirmed project-owned API secret in the current tracked files or 27 reachable commits at `30608181e6d85c56a4fec4f3dccdb6cb89ca518d`. This is a bounded observation, not a guarantee about deleted/unreachable history, forks, external artifacts, token validity or permissions. No credential was tested against an external service.

Foreign website token values in retained research snapshots are replaced with `REDACTED`. The sanitation manifest records each original source fingerprint and current sanitized-copy fingerprint. Keep existing acquisition receipts as historical evidence and consult the manifest when a retained response differs from its acquisition digest. The Visual 14 snapshot inventory records the current local bytes. Checksums, layer IDs, public pagination cursors and public client identifiers are not project authentication secrets.

Earlier commits still contain the original copied values. Deleting a current value or merging a forward sanitation commit does not remove it from published history or other people's copies. History rewriting and credential-owner actions require a separate decision; do not attempt to revoke credentials belonging to third-party websites.

## Before sharing reusable code or data

- Review source URLs, licenses and attribution for the particular files being distributed. A public URL is not evidence of unrestricted reuse.
- HCMGIS permission remains unresolved as described in `research/vibecode-22-building-gap/README.md`. The retained high-rise snapshot and 87 derived height corrections are unchanged by token sanitation. Removing the raw snapshot alone would not remove its contributions from the scene and generated tiles.
- There is no project-wide root license. Retained third-party licenses do not establish a license for the original project code or all bundled assets. Select a project license only after the owner decides; preserve dataset and library notices separately.
- Inspect screenshots/videos and minimize unnecessary workstation paths or source contact fields. Sampled-frame inspection is not an exhaustive privacy clearance.

## Local secret checks

Use a trusted installed scanner and keep reports redacted. Review every finding: raw website tokens, public client identifiers and false positives need different handling. Scan both the working tree and reachable history. Do not validate suspected credentials by making service requests.

The `.gitignore` prevents common local environment and credential files from being added accidentally; it does not protect values embedded in HTML, JavaScript, notebooks or files already tracked by Git.
