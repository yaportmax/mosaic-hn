# Security policy

Report security vulnerabilities privately through GitHub Security Advisories for `yaportmax/mosaic-hn`. Do not open a public issue containing exploit details or private user data.

Security-sensitive areas include:

- Theme registry URL resolution and SHA-256 verification.
- Theme package parsing, size limits, validation, and atomic installation.
- External-link handling.
- Import/export validation.
- SQLite migrations and transaction boundaries.
- Any change that introduces a network destination or platform permission.

Supported security fixes target the latest released major version. The project intentionally rejects downloaded executable plug-ins; community themes are declarative JSON only.
