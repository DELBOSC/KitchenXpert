# Getting Started for Developers

**Last Updated:** 2026-01-10

## Table of Contents

- [Welcome](#welcome)
- [First-Time Contributor Guide](#first-time-contributor-guide)
- [Codebase Overview](#codebase-overview)
- [Project Structure](#project-structure)
- [Understanding the Tech Stack](#understanding-the-tech-stack)
- [Making Your First Change](#making-your-first-change)
- [Running Tests](#running-tests)
- [Creating a Pull Request](#creating-a-pull-request)
- [Code Review Process](#code-review-process)
- [Development Workflow](#development-workflow)
- [Best Practices](#best-practices)

## Welcome

Welcome to the KitchenXpert development team! This guide will help you get
started contributing to the project, whether you're a new team member or an
open-source contributor.

### What is KitchenXpert?

KitchenXpert is a comprehensive kitchen design and planning platform that
combines:

- **3D Design Tools**: Interactive kitchen design using Three.js
- **AI-Powered Recommendations**: Smart appliance and layout suggestions
- **Product Catalog**: Extensive catalog of kitchen products from multiple
  manufacturers
- **Partner Integration**: Tools for manufacturers and retailers to manage their
  products

### Prerequisites

Before starting, ensure you've completed:

1. Development environment setup (see [Setup Guide](./setup.md))
2. Installed all required dependencies
3. Verified all services are running
4. Reviewed the [Architecture Overview](../architecture/overview.md)

## First-Time Contributor Guide

### Step 1: Understand the Project

#### Read Core Documentation

Start by reading these essential documents:

1. **README.md** - Project overview and quick start
2. **CONTRIBUTING.md** - Contribution guidelines
3. **docs/architecture/overview.md** - System architecture
4. **docs/api/overview.md** - API documentation
5. **This guide** - Development workflow

#### Explore the Codebase

```bash
# Clone the repository if you haven't already
git clone https://github.com/your-org/kitchenxpert.git
cd kitchenxpert

# Explore the directory structure
tree -L 2 -I 'node_modules|dist|build'

# Or use ls
ls -la packages/
ls -la config/
ls -la docs/
```

### Step 2: Set Up Your Development Environment

Follow the [Development Setup Guide](./setup.md) to:

1. Install all prerequisites (Node.js, pnpm, databases, Python)
2. Configure your IDE (VS Code recommended)
3. Set up environment variables
4. Initialize databases
5. Start all services

### Step 3: Run the Application

```bash
# Start all services
pnpm dev

# Verify everything is running
# Backend: http://localhost:3000/health
# Frontend: http://localhost:5173
# AI Service: http://localhost:8000/health
# Partner Portal: http://localhost:5174
```

### Step 4: Pick Your First Issue

Look for issues tagged with:

- `good-first-issue` - Perfect for newcomers
- `help-wanted` - Community contributions welcome
- `documentation` - Documentation improvements
- `bug` - Bug fixes (easier ones for beginners)

Browse issues:
https://github.com/your-org/kitchenxpert/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

### Step 5: Ask Questions

Don't hesitate to ask for help:

- **GitHub Discussions**: For general questions
- **Issue Comments**: For specific issue questions
- **Slack**: #kitchenxpert-dev channel (for team members)
- **PR Comments**: During code review

## Codebase Overview

### Monorepo Structure

KitchenXpert uses a **pnpm workspace** monorepo structure, with multiple
packages in a single repository:

```
kitchenxpert/
├── packages/           # Main application packages
├── catalog-providers/  # Catalog integration modules
├── config/            # Configuration files
├── docs/              # Documentation
└── scripts/           # Build and utility scripts
```

### Why Monorepo?

**Benefits:**

- **Shared dependencies**: Common packages used across projects
- **Atomic commits**: Change multiple packages in a single PR
- **Easier refactoring**: Cross-package changes are simpler
- **Consistent tooling**: Same linting, testing, build tools everywhere

**Workspace Management:**

- Managed by pnpm workspaces (see `pnpm-workspace.yaml`)
- Each package has its own `package.json`
- Shared dependencies hoisted to root `node_modules`

### Package Relationships

```
┌─────────────────┐
│    Frontend     │──────┐
│  (React + Vite) │      │
└─────────────────┘      │
                         ├──> Backend API
┌─────────────────┐      │    (Express + TypeScript)
│  Partner Portal │──────┘         │
│  (React + Vite) │                │
└─────────────────┘                ├──> PostgreSQL
                                   ├──> MongoDB
┌─────────────────┐                └──> Redis
│   3D Engine     │
│   (Three.js)    │──> Used by Frontend
└─────────────────┘

┌─────────────────┐
│   AI Modules    │
│  (Python/FastAPI)│──> Called by Backend
└─────────────────┘

┌─────────────────┐
│Catalog Providers│──> Data import tools
└─────────────────┘
```

## Project Structure

### Root Directory

```
kitchenxpert/
├── .github/                # GitHub Actions, issue templates
├── .vscode/                # VS Code workspace settings
├── catalog-providers/      # Product catalog importers
├── config/                 # All configuration files
│   ├── docker/             # Docker compose files
│   ├── linters/            # ESLint, Prettier configs
│   ├── testing/            # Jest, Playwright configs
│   └── typescript/         # TypeScript configs
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── architecture/       # Architecture docs
│   ├── database/           # Database schemas
│   ├── development/        # Development guides (this file)
│   └── user-guides/        # End-user guides
├── packages/               # Main packages
│   ├── backend/            # Express API
│   ├── frontend/           # React frontend
│   ├── 3d-engine/          # Three.js engine
│   ├── partner-portal/     # Partner dashboard
│   └── ai-modules/         # Python AI service
├── scripts/                # Build and utility scripts
├── .gitignore
├── package.json            # Root package.json
├── pnpm-lock.yaml          # Dependency lockfile
├── pnpm-workspace.yaml     # Workspace configuration
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

### Backend Package Structure

```
packages/backend/
├── src/
│   ├── api/                # API routes
│   │   ├── v1/             # API v1 routes
│   │   │   ├── auth/       # Authentication routes
│   │   │   ├── designs/    # Design routes
│   │   │   ├── products/   # Product catalog routes
│   │   │   ├── users/      # User routes
│   │   │   └── index.ts    # Route aggregation
│   │   └── middleware/     # Express middleware
│   ├── config/             # Configuration
│   ├── db/                 # Database clients & models
│   │   ├── prisma/         # Prisma schema & migrations
│   │   ├── mongodb/        # MongoDB models
│   │   └── redis/          # Redis client
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── design.service.ts
│   │   ├── product.service.ts
│   │   └── ai.service.ts   # AI service integration
│   ├── utils/              # Utility functions
│   ├── validators/         # Input validation schemas
│   ├── types/              # TypeScript type definitions
│   ├── index.ts            # Application entry point
│   └── server.ts           # Express server setup
├── tests/                  # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### Frontend Package Structure

```
packages/frontend/
├── public/                 # Static assets
├── src/
│   ├── api/                # API client functions
│   ├── assets/             # Images, fonts, etc.
│   ├── components/         # React components
│   │   ├── common/         # Shared components
│   │   ├── design/         # Design-related components
│   │   ├── products/       # Product components
│   │   └── layout/         # Layout components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   │   ├── Home.tsx
│   │   ├── Design.tsx
│   │   ├── Products.tsx
│   │   └── Profile.tsx
│   ├── routes/             # React Router setup
│   ├── store/              # State management (if using Redux/Zustand)
│   ├── styles/             # Global styles, Tailwind config
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Application entry
│   └── vite-env.d.ts       # Vite type definitions
├── tests/
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 3D Engine Package Structure

```
packages/3d-engine/
├── src/
│   ├── core/               # Core engine functionality
│   │   ├── Scene.ts        # Scene management
│   │   ├── Renderer.ts     # WebGL renderer
│   │   ├── Camera.ts       # Camera controls
│   │   └── Loader.ts       # Asset loader
│   ├── objects/            # 3D objects
│   │   ├── Kitchen.ts      # Kitchen container
│   │   ├── Appliance.ts    # Appliance models
│   │   ├── Cabinet.ts      # Cabinet models
│   │   └── Wall.ts         # Wall/floor/ceiling
│   ├── controls/           # User controls
│   │   ├── OrbitControls.ts
│   │   ├── DragControls.ts
│   │   └── SnapControls.ts
│   ├── materials/          # Material definitions
│   ├── lighting/           # Lighting setup
│   ├── helpers/            # Debug helpers
│   ├── types/              # TypeScript types
│   └── index.ts            # Public API
├── examples/               # Usage examples
├── tests/
└── package.json
```

### AI Modules Package Structure

```
packages/ai-modules/
├── app/
│   ├── api/                # FastAPI routes
│   │   ├── v1/
│   │   │   ├── design.py   # Design generation
│   │   │   ├── recommend.py # Recommendations
│   │   │   └── analyze.py  # Image analysis
│   │   └── deps.py         # Dependencies
│   ├── core/               # Core functionality
│   │   ├── config.py       # Configuration
│   │   └── security.py     # Security
│   ├── models/             # ML models
│   │   ├── design_model.py
│   │   ├── recommendation_model.py
│   │   └── image_model.py
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   ├── utils/              # Utilities
│   └── main.py             # Application entry
├── tests/
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

### Catalog Providers Structure

```
catalog-providers/
├── universal-importer/     # Generic import tool
│   ├── quick-import.ts     # CLI for quick imports
│   ├── catalog-templates/  # Product templates
│   └── validators/         # Data validation
├── bulk-import/            # Bulk import API
│   ├── api/
│   └── processors/
└── providers/              # Specific manufacturer integrations
    ├── whirlpool/
    ├── samsung/
    └── bosch/
```

## Understanding the Tech Stack

### Backend Technologies

| Technology      | Purpose              | Documentation                                                        |
| --------------- | -------------------- | -------------------------------------------------------------------- |
| Node.js 20      | Runtime environment  | [nodejs.org](https://nodejs.org)                                     |
| TypeScript 5    | Type-safe JavaScript | [typescriptlang.org](https://www.typescriptlang.org)                 |
| Express 4       | Web framework        | [expressjs.com](https://expressjs.com)                               |
| Prisma 5        | PostgreSQL ORM       | [prisma.io](https://www.prisma.io)                                   |
| Mongoose 8      | MongoDB ODM          | [mongoosejs.com](https://mongoosejs.com)                             |
| Redis (ioredis) | Caching & sessions   | [redis.io](https://redis.io)                                         |
| JWT             | Authentication       | [jwt.io](https://jwt.io)                                             |
| Zod             | Input validation     | [zod.dev](https://zod.dev)                                           |
| Winston         | Logging              | [github.com/winstonjs/winston](https://github.com/winstonjs/winston) |

### Frontend Technologies

| Technology     | Purpose          | Documentation                                                  |
| -------------- | ---------------- | -------------------------------------------------------------- |
| React 18       | UI framework     | [react.dev](https://react.dev)                                 |
| TypeScript 5   | Type safety      | [typescriptlang.org](https://www.typescriptlang.org)           |
| Vite 5         | Build tool       | [vitejs.dev](https://vitejs.dev)                               |
| React Router 6 | Routing          | [reactrouter.com](https://reactrouter.com)                     |
| TanStack Query | Data fetching    | [tanstack.com/query](https://tanstack.com/query)               |
| Tailwind CSS 3 | Styling          | [tailwindcss.com](https://tailwindcss.com)                     |
| Three.js       | 3D graphics      | [threejs.org](https://threejs.org)                             |
| Zustand        | State management | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |

### AI/ML Technologies

| Technology  | Purpose         | Documentation                                        |
| ----------- | --------------- | ---------------------------------------------------- |
| Python 3.11 | Runtime         | [python.org](https://www.python.org)                 |
| FastAPI     | API framework   | [fastapi.tiangolo.com](https://fastapi.tiangolo.com) |
| PyTorch     | ML framework    | [pytorch.org](https://pytorch.org)                   |
| TensorFlow  | ML framework    | [tensorflow.org](https://www.tensorflow.org)         |
| Pydantic    | Data validation | [docs.pydantic.dev](https://docs.pydantic.dev)       |

## Making Your First Change

### Workflow Overview

```
1. Create feature branch
2. Make changes
3. Write/update tests
4. Run tests locally
5. Commit with conventional commit message
6. Push to GitHub
7. Create pull request
8. Address code review feedback
9. Merge when approved
```

### Example: Adding a New API Endpoint

Let's add a simple endpoint to get user statistics.

#### Step 1: Create Feature Branch

```bash
# Ensure you're on develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/user-statistics
```

#### Step 2: Create the Route

Create `packages/backend/src/api/v1/users/statistics.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../middleware/auth';
import { UserService } from '../../../services/user.service';

const router = Router();

// GET /api/v1/users/:userId/statistics
router.get(
  '/:userId/statistics',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Ensure user can only access their own stats
      if (req.user.id !== userId && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const stats = await UserService.getStatistics(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

#### Step 3: Add Service Logic

Add to `packages/backend/src/services/user.service.ts`:

```typescript
export class UserService {
  // ... existing methods ...

  static async getStatistics(userId: string) {
    const [designCount, favoriteCount, orderCount] = await Promise.all([
      prisma.design.count({ where: { userId } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      designs: designCount,
      favorites: favoriteCount,
      orders: orderCount,
      memberSince: await this.getMemberSince(userId),
    };
  }

  private static async getMemberSince(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    return user?.createdAt;
  }
}
```

#### Step 4: Register the Route

Update `packages/backend/src/api/v1/users/index.ts`:

```typescript
import statisticsRouter from './statistics';

// ... existing code ...

router.use('/', statisticsRouter);

export default router;
```

#### Step 5: Write Tests

Create `packages/backend/tests/integration/users/statistics.test.ts`:

```typescript
import request from 'supertest';
import app from '../../../src/app';
import { createTestUser, getAuthToken } from '../../helpers';

describe('GET /api/v1/users/:userId/statistics', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user);
  });

  it('should return user statistics', async () => {
    const response = await request(app)
      .get(`/api/v1/users/${userId}/statistics`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('designs');
    expect(response.body.data).toHaveProperty('favorites');
    expect(response.body.data).toHaveProperty('orders');
    expect(response.body.data).toHaveProperty('memberSince');
  });

  it('should return 403 when accessing another user stats', async () => {
    await request(app)
      .get('/api/v1/users/other-user-id/statistics')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(403);
  });

  it('should return 401 without authentication', async () => {
    await request(app).get(`/api/v1/users/${userId}/statistics`).expect(401);
  });
});
```

#### Step 6: Run Tests

```bash
# Run tests
cd packages/backend
pnpm test statistics.test.ts

# Run all tests
pnpm test

# Check coverage
pnpm test:coverage
```

#### Step 7: Commit Changes

```bash
# Stage files
git add packages/backend/src/api/v1/users/statistics.ts
git add packages/backend/src/services/user.service.ts
git add packages/backend/tests/integration/users/statistics.test.ts

# Commit with conventional commit message
git commit -m "feat(api): add user statistics endpoint

- Add GET /api/v1/users/:userId/statistics endpoint
- Include design, favorite, and order counts
- Add member since date
- Include authentication and authorization
- Add integration tests with 100% coverage

Closes #123"
```

#### Step 8: Push and Create PR

```bash
# Push to GitHub
git push origin feature/user-statistics

# Create PR via GitHub CLI (or use web interface)
gh pr create --title "feat(api): add user statistics endpoint" --body "Adds endpoint for user statistics. Closes #123"
```

## Running Tests

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test user.test.ts

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e
```

### Testing Best Practices

1. **Write tests for all new code** - Aim for 80%+ coverage
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **Test edge cases** - Not just happy path
4. **Use descriptive test names** - Explain what is being tested
5. **Keep tests isolated** - No dependencies between tests
6. **Mock external services** - Don't hit real APIs in tests

See [Testing Guide](./testing.md) for more details.

## Creating a Pull Request

### PR Checklist

Before creating a PR, ensure:

- [ ] Code follows [coding standards](./coding-standards.md)
- [ ] All tests pass locally
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] No console.log or debugger statements
- [ ] TypeScript types are correct
- [ ] Commit messages follow conventional commits
- [ ] Branch is up to date with develop

### PR Template

When creating a PR, use this template:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issue

Closes #123

## Changes Made

- Added user statistics endpoint
- Updated user service with statistics method
- Added integration tests

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings
```

## Code Review Process

### What to Expect

1. **Automated Checks**: CI runs tests, linting, type checking
2. **Code Review**: At least one team member reviews your code
3. **Feedback**: Reviewers may request changes
4. **Iteration**: Make requested changes and push updates
5. **Approval**: Once approved, PR can be merged

### Review Timeline

- **Initial review**: Within 1-2 business days
- **Follow-up reviews**: Within 1 business day
- **Urgent fixes**: Same day

### Responding to Feedback

```bash
# Make requested changes
# Stage and commit
git add .
git commit -m "refactor: address code review feedback"

# Push to same branch
git push origin feature/user-statistics

# PR automatically updates
```

### Review Criteria

Reviewers check for:

- **Correctness**: Does the code work as intended?
- **Tests**: Are there adequate tests?
- **Code quality**: Is the code clean and maintainable?
- **Performance**: Are there performance concerns?
- **Security**: Are there security vulnerabilities?
- **Documentation**: Is the code well-documented?

## Development Workflow

### Daily Workflow

```bash
# Morning: Update your local develop branch
git checkout develop
git pull origin develop

# Create/switch to feature branch
git checkout feature/your-feature

# Rebase on latest develop (if branch exists)
git rebase develop

# Make changes, commit frequently
git add .
git commit -m "feat: implement feature X"

# Push changes
git push origin feature/your-feature

# Create PR when ready
gh pr create
```

### Working on Multiple Features

```bash
# Switch between features
git checkout feature/feature-a
# ... make changes ...
git commit -m "feat: progress on feature A"

git checkout feature/feature-b
# ... make changes ...
git commit -m "feat: progress on feature B"

# Stash changes if needed
git stash
git checkout other-branch
git stash pop
```

## Best Practices

### Code Quality

1. **Write self-documenting code** - Clear variable and function names
2. **Keep functions small** - Single responsibility principle
3. **DRY principle** - Don't repeat yourself
4. **YAGNI** - You aren't gonna need it (don't over-engineer)
5. **KISS** - Keep it simple, stupid

### Git Practices

1. **Commit frequently** - Small, logical commits
2. **Write meaningful commit messages** - Follow conventional commits
3. **Keep branches focused** - One feature/fix per branch
4. **Rebase before merging** - Keep history clean
5. **Delete merged branches** - Keep repository tidy

### Communication

1. **Ask questions early** - Don't struggle alone
2. **Document decisions** - Explain "why" in comments/docs
3. **Review others' code** - Learn and teach
4. **Participate in discussions** - Share knowledge
5. **Update documentation** - Keep docs in sync with code

## Next Steps

Now that you understand the basics:

1. **Pick your first issue** - Start with `good-first-issue`
2. **Read domain-specific docs** - API, Frontend, 3D Engine, etc.
3. **Review coding standards** - [Coding Standards](./coding-standards.md)
4. **Understand git workflow** - [Git Workflow](./git-workflow.md)
5. **Learn testing practices** - [Testing Guide](./testing.md)
6. **Join the community** - Slack, GitHub Discussions

## Getting Help

### Resources

- **Documentation**: Check docs/ directory first
- **Code Comments**: Read inline documentation
- **Tests**: Look at test files for usage examples
- **GitHub Issues**: Search for similar issues
- **Discussions**: Browse GitHub Discussions

### Contact

- **Slack**: #kitchenxpert-dev (team members)
- **GitHub Discussions**: For questions and discussions
- **Issue Comments**: For specific issue questions
- **Email**: dev@kitchenxpert.com (team leads)

## Related Documentation

- [Development Setup](./setup.md) - Environment setup
- [Coding Standards](./coding-standards.md) - Code style guide
- [Git Workflow](./git-workflow.md) - Branching and commits
- [Testing Guide](./testing.md) - Testing practices
- [API Documentation](../api/overview.md) - API reference
- [Architecture Overview](../architecture/overview.md) - System design
