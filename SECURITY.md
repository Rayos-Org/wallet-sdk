# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `1.x` (latest) | ✅ |
| `< 1.0` | ❌ |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

If you discover a security vulnerability in `@rayos/wallet-sdk`, please report it responsibly by:

1. **Email:** security@rayos-org.dev *(or your team email)*
2. **GitHub Private Vulnerability Reporting:** [Report here](https://github.com/Rayos-Org/wallet-sdk/security/advisories/new)

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any potential mitigations you are aware of
- Your GitHub handle (for credit in the advisory)

---

## Response Timeline

| Step | Timeline |
|---|---|
| Acknowledgement | Within **48 hours** |
| Initial assessment | Within **5 business days** |
| Patch + advisory | Within **30 days** (depending on severity) |

---

## Scope

The following are **in scope** for security reports:

- Private key / passkey material leakage through the SDK
- Session key bypass or forgery
- Relay client accepting malformed/unsigned responses
- Dependency vulnerabilities with direct exploitability

The following are **out of scope:**

- Vulnerabilities in the Stellar Protocol itself
- Vulnerabilities in `wallet-contracts` — report those in that repo
- Theoretical vulnerabilities without a realistic attack path
- Issues in dev-only dependencies (e.g., `vitest`, `tsup`)

---

## Disclosure Policy

We follow **Coordinated Vulnerability Disclosure (CVD)**:

1. Reporter submits privately
2. We confirm and investigate
3. We develop a patch
4. We notify major downstream consumers (`web-dashboard`, `mobile-app`) before publishing
5. We publish a GitHub Security Advisory and release a patched version
6. Reporter is credited (unless they prefer anonymity)
