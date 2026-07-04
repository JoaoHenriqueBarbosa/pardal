# Security Policy

## Supported Versions

Pardal is an early-stage project (`0.1.x`). Security fixes are applied to the latest published release only.

| Version | Supported |
| --- | --- |
| latest `0.1.x` | :white_check_mark: |
| older | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it **privately**. Do not open a public GitHub issue.

Email **joaohenriquebarbosa21@gmail.com** with the details. We aim to acknowledge your report within **72 hours**.

Please include, where possible:

- A description of the vulnerability and its impact.
- Steps to reproduce, or a minimal proof of concept.
- The affected version(s) and runtime (Node/Bun/browser).
- Any suggested remediation.

## Process

1. **Report received** — you email the address above with the details.
2. **Acknowledgement** — we confirm receipt within 72 hours.
3. **Assessment** — we reproduce the issue and determine its severity and scope.
4. **Fix** — we develop and test a fix, and prepare a patched release.
5. **Disclosure** — we publish the fix and, with your consent, credit you for the report.

## Scope

Reports that fall within scope include, but are not limited to:

- **Injection or unsafe input handling** — for example, malformed text, Markdown, image data, or configuration that leads to unsafe rendering behavior or unexpected code paths.
- **Data or credential exposure** — any way the library could leak sensitive information passed to it or present in the host environment.
- **Dependency vulnerabilities** — issues stemming from the peer/optional dependencies Pardal relies on (`pdfkit`, `sharp`) or from how Pardal invokes them.

Please note that Pardal's emoji feature fetches PNG assets over the network from a public source at render time, and the demo apps fetch a sample image from a remote URL. Reports concerning the handling of such remotely-fetched content are in scope.

Thank you for helping keep Pardal and its users safe.
