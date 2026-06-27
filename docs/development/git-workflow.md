# Git Workflow

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Branching Strategy](#branching-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Conventional Commits](#conventional-commits)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Merge Strategies](#merge-strategies)
- [Branch Protection Rules](#branch-protection-rules)
- [Release Process](#release-process)
- [Hotfix Process](#hotfix-process)
- [Best Practices](#best-practices)

## Overview

KitchenXpert follows a **Git Flow** workflow with modifications for modern CI/CD
practices. This ensures clean history, easy collaboration, and safe production
deployments.

### Workflow Visualization

```
main (production)
  │
  ├─────────────── v1.0.0 ────── v1.1.0 ──────>
  │                 │              │
  │                 │              │
develop             │              │
  │                 │              │
  ├── feature/A ────┘              │
  │                                │
  ├── feature/B ───────────────────┘
  │
  ├── bugfix/C ─────┘
  │
  │
hotfix/urgent
  │
  └─> main + develop
```

## Branching Strategy

### Main Branches

#### `main`

- **Purpose**: Production-ready code
- **Protection**: Highly protected, requires reviews
- **Deployment**: Auto-deploys to production (with approval)
- **Commits**: Only from releases, hotfixes, or merges from develop
- **Lifespan**: Permanent

```bash
# main branch should never be committed to directly
# Only merge from develop or hotfix branches
```

#### `develop`

- **Purpose**: Integration branch for features
- **Protection**: Protected, requires reviews
- **Deployment**: Auto-deploys to staging
- **Commits**: Only from feature, bugfix branches
- **Lifespan**: Permanent

```bash
# develop is the default branch for new features
git checkout develop
git pull origin develop
```

### Supporting Branches

#### Feature Branches

- **Naming**: `feature/description-of-feature`
- **Branch from**: `develop`
- **Merge back to**: `develop`
- **Lifespan**: Until feature is complete and merged

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/user-statistics

# Work on feature
git add .
git commit -m "feat(api): add user statistics endpoint"

# Push to remote
git push origin feature/user-statistics

# Create PR to develop
gh pr create --base develop
```

#### Bugfix Branches

- **Naming**: `bugfix/description-of-bug`
- **Branch from**: `develop`
- **Merge back to**: `develop`
- **Lifespan**: Until bug is fixed and merged

```bash
# Create bugfix branch
git checkout develop
git pull origin develop
git checkout -b bugfix/login-redirect-issue

# Fix the bug
git add .
git commit -m "fix(auth): correct login redirect URL"

# Push and create PR
git push origin bugfix/login-redirect-issue
gh pr create --base develop
```

#### Hotfix Branches

- **Naming**: `hotfix/description-of-critical-fix`
- **Branch from**: `main`
- **Merge back to**: `main` AND `develop`
- **Lifespan**: Until critical fix is deployed

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/security-vulnerability

# Fix the critical issue
git add .
git commit -m "fix(security): patch XSS vulnerability"

# Push and create PRs to both main and develop
git push origin hotfix/security-vulnerability
gh pr create --base main --title "Hotfix: Security vulnerability"
gh pr create --base develop --title "Merge hotfix: Security vulnerability"
```

#### Release Branches

- **Naming**: `release/v1.2.0`
- **Branch from**: `develop`
- **Merge back to**: `main` AND `develop`
- **Lifespan**: Until release is complete

```bash
# Create release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Finalize release (version bumps, changelog, etc.)
npm version 1.2.0
git add .
git commit -m "chore(release): prepare v1.2.0"

# Push and create PRs
git push origin release/v1.2.0
gh pr create --base main
gh pr create --base develop
```

#### Documentation Branches

- **Naming**: `docs/description-of-docs`
- **Branch from**: `develop`
- **Merge back to**: `develop`
- **Lifespan**: Until documentation is complete

```bash
# Create docs branch
git checkout -b docs/api-documentation

# Update docs
git add docs/
git commit -m "docs(api): add authentication examples"

# Push and create PR
git push origin docs/api-documentation
gh pr create --base develop
```

#### Refactor Branches

- **Naming**: `refactor/description-of-refactor`
- **Branch from**: `develop`
- **Merge back to**: `develop`
- **Lifespan**: Until refactoring is complete

```bash
# Create refactor branch
git checkout -b refactor/user-service-cleanup

# Refactor code
git add .
git commit -m "refactor(services): simplify user service methods"

# Push and create PR
git push origin refactor/user-service-cleanup
gh pr create --base develop
```

## Branch Naming Conventions

### Format

```
<type>/<short-description>
```

### Types

| Type        | Description               | Example                          |
| ----------- | ------------------------- | -------------------------------- |
| `feature/`  | New feature development   | `feature/3d-model-export`        |
| `bugfix/`   | Bug fixes                 | `bugfix/catalog-filter-crash`    |
| `hotfix/`   | Critical production fixes | `hotfix/payment-gateway-timeout` |
| `docs/`     | Documentation only        | `docs/deployment-guide`          |
| `refactor/` | Code refactoring          | `refactor/database-queries`      |
| `test/`     | Test additions/fixes      | `test/e2e-design-flow`           |
| `chore/`    | Maintenance tasks         | `chore/update-dependencies`      |
| `perf/`     | Performance improvements  | `perf/optimize-3d-rendering`     |

### Naming Rules

1. **Use lowercase** - `feature/user-stats` not `Feature/User-Stats`
2. **Use hyphens** - `feature/user-stats` not `feature/user_stats`
3. **Be descriptive** - `feature/user-statistics-dashboard` not `feature/stats`
4. **Keep it short** - Max 50 characters
5. **No special characters** - Only letters, numbers, hyphens, slashes

### Examples

**Good:**

```
feature/ai-design-recommendations
bugfix/3d-texture-loading
hotfix/critical-security-patch
docs/api-authentication
refactor/product-service
```

**Bad:**

```
new-feature          # Missing type prefix
Feature/MyFeature    # Wrong case
bugfix_issue_123     # Wrong separator
f/x                  # Too vague
feature/this-is-a-very-long-branch-name-that-describes-everything  # Too long
```

## Conventional Commits

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Description        | Example                                     |
| ---------- | ------------------ | ------------------------------------------- |
| `feat`     | New feature        | `feat(api): add user statistics endpoint`   |
| `fix`      | Bug fix            | `fix(auth): resolve token expiration issue` |
| `docs`     | Documentation      | `docs(api): add authentication examples`    |
| `style`    | Code style changes | `style(frontend): format with prettier`     |
| `refactor` | Code refactoring   | `refactor(services): simplify user service` |
| `test`     | Add/update tests   | `test(api): add user endpoint tests`        |
| `chore`    | Maintenance        | `chore(deps): update dependencies`          |
| `perf`     | Performance        | `perf(3d): optimize texture loading`        |
| `ci`       | CI/CD changes      | `ci(actions): add deployment workflow`      |
| `build`    | Build system       | `build(vite): update build config`          |
| `revert`   | Revert commit      | `revert: feat(api): add statistics`         |

### Scopes

Common scopes in KitchenXpert:

- `api` - Backend API
- `frontend` - Frontend application
- `3d-engine` - 3D rendering engine
- `partner-portal` - Partner portal
- `ai` - AI modules
- `catalog` - Product catalog
- `auth` - Authentication
- `database` - Database changes
- `security` - Security-related
- `deps` - Dependencies

### Subject Line Rules

1. **Use imperative mood** - "add" not "added" or "adds"
2. **Don't capitalize first letter** - "add feature" not "Add feature"
3. **No period at the end** - "add feature" not "add feature."
4. **Max 72 characters**
5. **Be specific** - What does it do?

### Body (Optional)

- Explain **what** and **why**, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (Optional)

- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

### Examples

#### Simple Commit

```bash
git commit -m "feat(api): add user statistics endpoint"
```

#### Commit with Body

```bash
git commit -m "feat(api): add user statistics endpoint

Add new endpoint to retrieve user statistics including
design count, favorite count, and member since date.
Includes authentication and authorization checks.

Closes #123"
```

#### Breaking Change

```bash
git commit -m "feat(api): redesign authentication flow

BREAKING CHANGE: authentication now uses JWT instead of sessions.
Clients must update to send Bearer tokens in Authorization header."
```

#### Multiple Changes

```bash
git commit -m "feat(api): add user statistics endpoint

- Add GET /api/v1/users/:userId/statistics endpoint
- Include design, favorite, and order counts
- Add member since date
- Implement authentication and authorization
- Add integration tests with 100% coverage

Closes #123"
```

#### Fix Commit

```bash
git commit -m "fix(auth): resolve token expiration issue

Token expiration was not being checked correctly,
allowing expired tokens to be used. Added proper
expiration validation in middleware.

Fixes #456"
```

#### Refactor Commit

```bash
git commit -m "refactor(services): simplify user service methods

Consolidate duplicate code in user service and improve
method naming for better clarity. No functional changes."
```

### Commit Message Validation

We use commit-lint to enforce conventional commits:

```javascript
// .commitlintrc.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'frontend',
        '3d-engine',
        'partner-portal',
        'ai',
        'catalog',
        'auth',
        'database',
        'security',
        'deps',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
  },
};
```

## Pull Request Process

### Creating a Pull Request

#### 1. Prepare Your Branch

```bash
# Ensure branch is up to date
git checkout develop
git pull origin develop

# Rebase your feature branch
git checkout feature/user-statistics
git rebase develop

# Resolve any conflicts
# Run tests
pnpm test

# Push to remote (force push if rebased)
git push origin feature/user-statistics --force-with-lease
```

#### 2. Create PR via GitHub

```bash
# Using GitHub CLI
gh pr create \
  --base develop \
  --title "feat(api): add user statistics endpoint" \
  --body "$(cat <<EOF
## Description
Adds endpoint to retrieve user statistics including design count, favorite count, and membership date.

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #123

## Changes Made
- Added GET /api/v1/users/:userId/statistics endpoint
- Implemented UserService.getStatistics method
- Added authentication and authorization
- Added integration tests with 100% coverage

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing completed

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Tests added/updated
- [x] Documentation updated
- [x] No new warnings
EOF
)"
```

#### 3. PR Template

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to
      not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issue

Closes #

## Changes Made

-
-

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
```

### PR Size Guidelines

**Optimal PR size:**

- **Small**: < 200 lines changed (ideal)
- **Medium**: 200-500 lines changed (acceptable)
- **Large**: 500-1000 lines changed (needs justification)
- **Too large**: > 1000 lines (split into multiple PRs)

**Tips for smaller PRs:**

- Break features into smaller chunks
- Separate refactoring from feature work
- Split frontend and backend changes if possible
- Use feature flags for incremental releases

## Code Review Guidelines

### For Authors

#### Before Requesting Review

1. **Self-review** - Review your own code first
2. **Run tests** - Ensure all tests pass
3. **Update docs** - Documentation reflects changes
4. **Clean commits** - Squash WIP commits if needed
5. **Add context** - Good PR description

#### Responding to Feedback

```bash
# Make requested changes
# Commit with clear message
git add .
git commit -m "refactor: address code review feedback"

# Push to update PR
git push origin feature/user-statistics

# Reply to review comments
# Mark conversations as resolved
```

### For Reviewers

#### What to Look For

**Functionality:**

- Does the code work as intended?
- Are edge cases handled?
- Are there potential bugs?

**Code Quality:**

- Is the code readable and maintainable?
- Are names descriptive?
- Is there unnecessary complexity?

**Tests:**

- Are there adequate tests?
- Do tests cover edge cases?
- Are tests maintainable?

**Performance:**

- Are there performance concerns?
- Any N+1 queries?
- Unnecessary re-renders?

**Security:**

- Are inputs validated?
- Is authentication/authorization correct?
- Any security vulnerabilities?

#### Review Etiquette

**Good feedback:**

```
❌ This is wrong.
✅ Consider using a Map here for O(1) lookups instead of filtering the array, which is O(n).

❌ Bad naming.
✅ The name `getData` is too generic. How about `fetchUserStatistics` to be more specific?

❌ This won't work.
✅ This might fail when userId is null. Consider adding validation at the start of the function.
```

**Review comments categories:**

- **Required:** Must be addressed before merge
- **Suggestion:** Optional improvement
- **Question:** Need clarification
- **Praise:** Acknowledge good work

### Review SLA

- **First review**: Within 1 business day
- **Follow-up review**: Within 1 business day
- **Urgent fixes**: Same day
- **Documentation**: Within 2 business days

## Merge Strategies

### Squash and Merge (Default)

**Use for:** Most feature branches

**Benefits:**

- Clean, linear history
- One commit per feature
- Easy to revert

```bash
# GitHub will squash all commits into one
# Commit message format:
feat(api): add user statistics endpoint (#123)

* feat(api): add endpoint
* test(api): add tests
* docs(api): update documentation
```

### Rebase and Merge

**Use for:** Clean commit history already exists

**Benefits:**

- Preserves individual commits
- Linear history
- Good for tracking incremental changes

```bash
# Requires clean commits before merging
git rebase develop
git push --force-with-lease
```

### Merge Commit

**Use for:** Release branches, hotfixes

**Benefits:**

- Preserves branch history
- Shows when features were merged
- Easy to see feature scope

```bash
# Creates merge commit
git merge --no-ff release/v1.2.0
```

## Branch Protection Rules

### `main` Branch

- ✅ Require pull request before merging
- ✅ Require 2 approvals
- ✅ Require status checks to pass
  - CI tests
  - Linting
  - Type checking
  - Security scan
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ✅ Require signed commits
- ✅ Include administrators
- ✅ Restrict who can push (only release managers)

### `develop` Branch

- ✅ Require pull request before merging
- ✅ Require 1 approval
- ✅ Require status checks to pass
  - CI tests
  - Linting
  - Type checking
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ❌ Require signed commits (optional)
- ❌ Include administrators
- ❌ Restrict who can push

### Feature Branches

- ❌ No protection rules
- Developers free to force push
- Use for experimental work

## Release Process

### 1. Create Release Branch

```bash
# From develop
git checkout develop
git pull origin develop

# Create release branch
git checkout -b release/v1.2.0

# Bump version in package.json files
cd packages/backend && npm version 1.2.0
cd packages/frontend && npm version 1.2.0
cd packages/partner-portal && npm version 1.2.0

# Update CHANGELOG.md
# Commit changes
git add .
git commit -m "chore(release): prepare v1.2.0"

# Push release branch
git push origin release/v1.2.0
```

### 2. Test Release

```bash
# Deploy to staging
# Run full test suite
pnpm test

# Run E2E tests
pnpm test:e2e

# Manual QA testing
```

### 3. Merge to Main

```bash
# Create PR to main
gh pr create --base main --title "Release v1.2.0"

# After approval, merge (use merge commit)
# Tag the release
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

### 4. Merge Back to Develop

```bash
# Create PR to develop
gh pr create --base develop --title "Merge release v1.2.0 to develop"

# Merge to keep develop in sync
```

### 5. GitHub Release

```bash
# Create GitHub release
gh release create v1.2.0 \
  --title "v1.2.0" \
  --notes "$(cat CHANGELOG.md | sed -n '/## \[1.2.0\]/,/## \[1.1.0\]/p')"
```

## Hotfix Process

### 1. Create Hotfix Branch

```bash
# From main
git checkout main
git pull origin main

# Create hotfix branch
git checkout -b hotfix/critical-security-fix

# Make the fix
# Test thoroughly
pnpm test
```

### 2. Commit and Push

```bash
git add .
git commit -m "fix(security): patch XSS vulnerability"
git push origin hotfix/critical-security-fix
```

### 3. Create PRs

```bash
# PR to main (priority)
gh pr create --base main --title "Hotfix: Security vulnerability" --label "hotfix"

# PR to develop (keep in sync)
gh pr create --base develop --title "Merge hotfix: Security vulnerability"
```

### 4. Deploy and Tag

```bash
# After merge to main
git checkout main
git pull origin main

# Tag hotfix
git tag -a v1.2.1 -m "Hotfix: Security vulnerability"
git push origin v1.2.1

# Deploy to production immediately
```

## Best Practices

### Commit Frequency

- Commit **early and often**
- Each commit should be a **logical unit**
- Don't commit half-working code to shared branches
- Use WIP commits on feature branches, squash before PR

### Commit Size

**Good commit:**

- Single logical change
- All tests pass
- Code compiles/runs
- Can be reverted independently

**Bad commit:**

- Multiple unrelated changes
- Half-finished work
- Broken tests
- Mix of feature + refactor

### Branch Hygiene

```bash
# Regularly update from develop
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# Delete merged branches
git branch -d feature/completed-feature
git push origin --delete feature/completed-feature

# Prune deleted remote branches
git fetch --prune
```

### Interactive Rebase

```bash
# Clean up commits before PR
git rebase -i develop

# In editor:
# pick - keep commit
# squash - merge with previous
# reword - change message
# drop - remove commit

# Example:
pick 1234567 feat(api): add endpoint
squash 2345678 fix typo
squash 3456789 add tests
reword 4567890 update docs

# Results in clean history
```

### Stashing Changes

```bash
# Stash uncommitted changes
git stash save "WIP: working on feature X"

# List stashes
git stash list

# Apply stash
git stash apply stash@{0}

# Apply and drop
git stash pop

# Drop stash
git stash drop stash@{0}
```

### Cherry-picking

```bash
# Apply specific commit to current branch
git cherry-pick abc1234

# Cherry-pick range
git cherry-pick abc1234..def5678

# Cherry-pick without commit
git cherry-pick -n abc1234
```

## Related Documentation

- [Getting Started](./getting-started.md) - First-time contributor guide
- [Coding Standards](./coding-standards.md) - Code style guide
- [Pull Request Template](../.github/PULL_REQUEST_TEMPLATE.md)
- [Contributing Guide](../../CONTRIBUTING.md) - Contribution guidelines
