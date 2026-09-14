# TIP-GIS — spatial analysis kernel

- **ID:** DT17-GIS; **role:** Builder; **priority:** P0.
- **Dependencies:** source-core.js normalizes project-native coordinates into RFC 7946 WGS84 footprints with source/height metadata; the UI consumes AnalysisClient.
- **Task:** vendor the stable Turf 7.4.0 browser bundle and license; implement a reusable indexed query engine, isolated Worker and asynchronous request client. Area and corridor queries return exact polygonal selection, clipped overlap area and unique union area, identities, sources and modeled/surveyed height categories.
- **Acceptance:** holes and concave edges respected; edge contact included; duplicate source identities conservatively grouped; illustrative buildings excluded; buffers measured in meters and A/B/C clearly analytical; finite valid geometry required; outside/partial coverage explicit; provenance retained; stale/cancel requests and Worker failures reported; meaningful offline tests pass.
- **Constraints:** no invented plans, no survey accuracy claim, no cross-provider identity inference, no remote runtime dependencies. Turf spherical area/length and projected-buffer approximations disclosed. Broad queries must refuse rather than silently truncate if a processing bound is exceeded.
- **Verification:** Node fixtures for geometry and client lifecycle; performance on actual HCMC data when adapter becomes available; root performs browser integration QA.
- **Approval:** implementation authorized by the user's request to build the proposed shared core. Reversible implementation checkpoint waived by Contractor; source/measurement limits remain explicit.

Contractor follow-up: add optional `init({type:'rtr-raw-json/1.0',bytes:ArrayBuffer})` verified ingestion. Transfer bytes into Worker, require expected source SHA-256, hash original bytes and parse JSON away from the map thread. Hash/crypto/JSON errors fail closed; legacy parsed mode remains explicit unverified. Independently verify the actual mapped Nguyễn Huệ source road 341504312 as well as the original straight-line fixture.
