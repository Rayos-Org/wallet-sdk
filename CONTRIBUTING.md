# Contributing to wallet-sdk

Thank you for your interest in contributing! We welcome bug reports, feature requests, documentation improvements, and code contributions.

Please take a moment to read this guide before opening an issue or PR.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Code](#submitting-code)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Releasing](#releasing)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold these standards. Please report unacceptable behavior to the maintainers.

---

## Getting Started

1. **Fork** the repo on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/wallet-sdk.git
   cd wallet-sdk
   ```
3. **Install** dependencies:
   ```bash
   pnpm install
   ```
4. **Set up** your `.env`:
   ```bash
   cp .env.example .env
   # Fill in contract addresses (see docs/GETTING_STARTED.md)
   ```
5. **Run** tests to confirm everything works:
   ```bash
   pnpm test
   ```

---

## How to Contribute

### Reporting Bugs

Use the [Bug Report template](https://github.com/Rayos-Org/wallet-sdk/issues/new?template=bug_report.yml).

Before opening a new issue:
- Search existing issues to avoid duplicates
- Include a **minimal reproduction** if possible
- Specify your environment (Node version, OS, browser)

### Suggesting Features

Use the [Feature Request template](https://github.com/Rayos-Org/wallet-sdk/issues/new?template=feature_request.yml).

Good feature requests include:
- The **problem** you are solving (not just the solution)
- How it fits the SDK's scope — remember, if an app needs to reach into `contracts/generated` directly, that is a signal the SDK's public API is missing something
- Whether you are willing to implement it

### Submitting Code

1. Open an issue first for any **non-trivial change** to align on approach
2. Create a **feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes
4. Run the full quality suite:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
5. Add a **changeset** for your change:
   ```bash
   pnpm changeset
   ```
6. Push and open a PR

---

## Development Workflow

```bash
# Run tests in watch mode
pnpm exec vitest

# Type-check without building
pnpm typecheck

# Lint the codebase
pnpm lint

# Build ESM + CJS + types
pnpm build

# Regenerate contract bindings from testnet
bash scripts/regenerate-bindings.sh
```

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|---|---|
| `feat:` | New feature or public API addition |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Tooling, deps, config — no production code |
| `refactor:` | Code restructure without behavior change |
| `test:` | Adding or updating tests |
| `ci:` | CI/CD workflow changes |

**Examples:**
```
feat: add getSessionKey method to SessionManager
fix: relay client does not retry on 503 errors
docs: expand StorageAdapter example in API_REFERENCE
chore: upgrade @stellar/stellar-sdk to 18.x
```

---

## Pull Request Guidelines

- **One PR per concern** — keep PRs small and focused
- **Link to the issue** your PR resolves (`Closes #123`)
- **Add tests** for any new behavior
- **Update docs** in `docs/` if the public API changes
- **Do not edit** files in `src/contracts/generated/` — these are auto-generated
- All CI checks (lint, typecheck, tests, build) must pass before merge
- At least **one maintainer approval** is required to merge

---

## Releasing

Releases are managed by [Changesets](https://github.com/changesets/changesets).

1. Contributors add a changeset in their PR: `pnpm changeset`
2. On merge to `main`, the Changesets bot opens a **Version PR**
3. Merging the Version PR triggers the release workflow:
   - Bumps `package.json` version
   - Generates `CHANGELOG.md` entries
   - Publishes to npm as `@rayos/wallet-sdk`
   - Creates a GitHub Release and git tag

Maintainers should **not** manually bump the version — let Changesets handle it.

---

## Questions?

Open a [Discussion](https://github.com/Rayos-Org/wallet-sdk/discussions) on GitHub for questions that are not bugs or feature requests.
