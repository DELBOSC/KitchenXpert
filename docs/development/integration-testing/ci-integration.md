# CI Integration

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Test Matrix](#test-matrix)
- [Parallel Test Execution](#parallel-test-execution)
- [Coverage Reporting](#coverage-reporting)
- [Continuous Deployment](#continuous-deployment)
- [Best Practices](#best-practices)

## Overview

Continuous Integration (CI) automates testing and deployment for KitchenXpert. We use GitHub Actions to run tests on every push and pull request.

## GitHub Actions Workflows

### Main CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint TypeScript
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: kitchenxpert_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        run: pnpm prisma migrate deploy
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kitchenxpert_test

      - name: Run unit tests
        run: pnpm test:unit --coverage
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kitchenxpert_test
          MONGODB_URI: mongodb://localhost:27017/kitchenxpert_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: pnpm test:integration --coverage
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kitchenxpert_test
          MONGODB_URI: mongodb://localhost:27017/kitchenxpert_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/backend/coverage/coverage-final.json
          flags: backend

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test:coverage
        working-directory: packages/frontend

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/frontend/coverage/coverage-final.json
          flags: frontend

      - name: Build
        run: pnpm build
        working-directory: packages/frontend

  test-ai-modules:
    name: Test AI Modules
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
        working-directory: packages/ai-modules

      - name: Lint
        run: |
          flake8 app/
          black --check app/
        working-directory: packages/ai-modules

      - name: Type check
        run: mypy app/
        working-directory: packages/ai-modules

      - name: Run tests
        run: pytest --cov=app --cov-report=xml
        working-directory: packages/ai-modules

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/ai-modules/coverage.xml
          flags: ai-modules

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: kitchenxpert_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm playwright install --with-deps

      - name: Build application
        run: pnpm build

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kitchenxpert_test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Test Matrix

### Multi-Version Testing

```yaml
# .github/workflows/test-matrix.yml
name: Test Matrix

on:
  pull_request:
    branches: [main, develop]

jobs:
  test-matrix:
    name: Test on Node ${{ matrix.node }} and ${{ matrix.os }}
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        node: ['20', '21']
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test
```

### Database Version Matrix

```yaml
test-databases:
  name: Test with PostgreSQL ${{ matrix.postgres }}
  runs-on: ubuntu-latest

  strategy:
    matrix:
      postgres: ['14', '15', '16']

  services:
    postgres:
      image: postgres:${{ matrix.postgres }}
      env:
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432

  steps:
    - uses: actions/checkout@v3
    - name: Run tests
      run: pnpm test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
```

## Parallel Test Execution

### Sharding Tests

```yaml
e2e-tests-sharded:
  name: E2E Tests (Shard ${{ matrix.shardIndex }} of ${{ matrix.shardTotal }})
  runs-on: ubuntu-latest

  strategy:
    fail-fast: false
    matrix:
      shardIndex: [1, 2, 3, 4]
      shardTotal: [4]

  steps:
    - uses: actions/checkout@v3

    - uses: pnpm/action-setup@v2

    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install

    - name: Install Playwright
      run: pnpm playwright install --with-deps

    - name: Run E2E tests
      run: pnpm playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}

    - name: Upload blob report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: blob-report-${{ matrix.shardIndex }}
        path: blob-report
        retention-days: 1

  merge-reports:
    name: Merge E2E Reports
    if: always()
    needs: e2e-tests-sharded
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Download blob reports
        uses: actions/download-artifact@v3
        with:
          path: all-blob-reports
          pattern: blob-report-*

      - name: Merge reports
        run: pnpm playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v3
        with:
          name: html-report
          path: playwright-report
          retention-days: 30
```

## Coverage Reporting

### Codecov Integration

```yaml
# .github/workflows/coverage.yml
name: Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  coverage:
    name: Coverage Report
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Fetch all history for all branches and tags

      - uses: pnpm/action-setup@v2

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: |
            packages/backend/coverage/coverage-final.json
            packages/frontend/coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true
          verbose: true

      - name: Coverage Summary
        run: |
          echo "## Coverage Summary" >> $GITHUB_STEP_SUMMARY
          pnpm coverage:summary >> $GITHUB_STEP_SUMMARY
```

### Coverage Thresholds

```yaml
- name: Check coverage thresholds
  run: |
    pnpm test:coverage --coverageThreshold='{
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }'
```

## Continuous Deployment

### Deploy to Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  test:
    uses: ./.github/workflows/ci.yml

  deploy:
    name: Deploy to Staging
    needs: test
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push backend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/kitchenxpert-backend:$IMAGE_TAG \
            -f packages/backend/Dockerfile .
          docker push $ECR_REGISTRY/kitchenxpert-backend:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster kitchenxpert-staging \
            --service backend \
            --force-new-deployment

      - name: Run smoke tests
        run: |
          sleep 30 # Wait for deployment
          curl -f https://staging-api.kitchenxpert.com/health || exit 1

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Staging deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Staging deployment *${{ job.status }}*\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Deploy to Production

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    uses: ./.github/workflows/ci.yml

  deploy:
    name: Deploy to Production
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://kitchenxpert.com

    steps:
      - uses: actions/checkout@v3

      # Similar to staging but:
      # - Use production environment
      # - Require manual approval
      # - More comprehensive smoke tests
      # - Blue-green deployment
      # - Automatic rollback on failure
```

## Best Practices

### 1. Cache Dependencies

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

### 2. Fail Fast

```yaml
strategy:
  fail-fast: true # Stop all jobs if one fails
  matrix:
    node: ['20', '21']
```

### 3. Use Artifacts

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: |
      test-results/
      playwright-report/
    retention-days: 30
```

### 4. Set Timeouts

```yaml
jobs:
  test:
    timeout-minutes: 30 # Prevent hanging jobs
    steps:
      - name: Run tests
        timeout-minutes: 15 # Per-step timeout
        run: pnpm test
```

### 5. Use Environments

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: https://kitchenxpert.com
    # Requires manual approval and uses environment secrets
```

### 6. Conditional Execution

```yaml
- name: Run only on main branch
  if: github.ref == 'refs/heads/main'
  run: pnpm deploy

- name: Run only on pull requests
  if: github.event_name == 'pull_request'
  run: pnpm test:pr
```

### 7. Status Checks

```yaml
# Require these jobs to pass before merging
jobs:
  test-backend:
    # ... test job

  test-frontend:
    # ... test job

  all-tests-passed:
    name: All Tests Passed
    needs: [test-backend, test-frontend, test-ai-modules, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All tests passed!"

# Configure branch protection to require 'all-tests-passed'
```

### 8. Retry Failed Tests

```yaml
- name: Run tests with retries
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    command: pnpm test:e2e
```

## Related Documentation

- [Integration Testing Overview](./overview.md) - Testing strategy
- [E2E Testing](./e2e-testing.md) - End-to-end tests
- [Deployment Guide](../deployment.md) - Deployment process
- [Testing Guide](../testing.md) - General testing
