# Contributing to KitchenXpert

First off, thank you for considering contributing to KitchenXpert! It's people like you that make KitchenXpert such a great tool.

Last Updated: 2026-01-10

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by the [KitchenXpert Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@kitchenxpert.com.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/kitchenxpert/kitchenxpert/issues) to avoid duplicates.

**When submitting a bug report, include:**

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details**:
  - OS version
  - Node.js version
  - Browser version (for frontend issues)
- **Error messages** and stack traces
- **Additional context**

**Use this template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows 11, macOS 13, Ubuntu 22.04]
 - Node.js: [e.g. v20.10.0]
 - Browser: [e.g. Chrome 120, Firefox 121]
 - Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

We love to receive enhancement suggestions! Before creating enhancement suggestions, please check the [existing feature requests](https://github.com/kitchenxpert/kitchenxpert/issues?q=is%3Aissue+label%3Aenhancement).

**When suggesting an enhancement, include:**

- **Clear title and description**
- **Use case** - why is this enhancement needed?
- **Expected behavior** - how should it work?
- **Mockups or examples** (if applicable)
- **Alternative solutions** you've considered

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues perfect for newcomers
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

### Pull Requests

We actively welcome your pull requests! See the [Pull Request Process](#pull-request-process) section below.

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/kitchenxpert.git
cd kitchenxpert

# Add upstream remote
git remote add upstream https://github.com/kitchenxpert/kitchenxpert.git
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for AI service
cd services/ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
cd ../..
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env.development

# Update .env.development with your local settings
```

### 4. Setup Databases

```bash
# Start databases using Docker (recommended)
docker-compose up -d postgres mongodb redis

# Or install and run them locally (see INSTALLATION.md)

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 5. Start Development Server

```bash
# Start all services in watch mode
npm run dev

# Or start services individually:
npm run dev:backend   # API server
npm run dev:frontend  # React dev server
npm run dev:ai        # AI service
```

### 6. Verify Setup

```bash
# Run tests
npm test

# Check code quality
npm run lint

# Access the application
# Frontend: http://localhost:5173
# API: http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

## Code Standards

### TypeScript/JavaScript

We use **ESLint** and **Prettier** for code quality and formatting.

**Configuration:**
- ESLint: `.eslintrc.json`
- Prettier: `.prettierrc.json`
- TypeScript: `tsconfig.json`

**Key rules:**
- Use TypeScript for all new code
- Follow Airbnb style guide
- Use explicit types (avoid `any`)
- Prefer `const` over `let`
- Use functional components and hooks in React
- Maximum line length: 100 characters
- Indent: 2 spaces
- Quotes: Single quotes
- Semicolons: Required
- Trailing commas: ES5 style

**Run linting:**
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

### Python

We use **Black**, **isort**, and **flake8** for Python code.

**Configuration:**
- Black: `pyproject.toml`
- isort: `pyproject.toml`
- flake8: `.flake8`

**Key rules:**
- Maximum line length: 100 characters
- Type hints required
- Docstrings required (Google style)
- PEP 8 compliance

**Run linting:**
```bash
cd services/ai-service

# Format code
black .
isort .

# Check for issues
flake8 .
mypy .
```

### File Naming Conventions

- **React components**: PascalCase (e.g., `KitchenDesigner.tsx`)
- **Utilities/helpers**: camelCase (e.g., `apiClient.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Types/interfaces**: PascalCase (e.g., `types.ts`)

### Code Organization

```
src/
├── components/       # React components
│   ├── common/      # Shared components
│   └── features/    # Feature-specific components
├── hooks/           # Custom React hooks
├── services/        # API clients and services
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── constants/       # Constants and configuration
├── styles/          # Global styles
└── __tests__/       # Test files
```

## Git Workflow

We follow a **feature branch workflow** with **conventional commits**.

### Branch Naming

```bash
# Format: type/short-description

# Examples:
feature/ai-design-optimization
bugfix/catalog-search-error
hotfix/security-vulnerability
docs/api-documentation
refactor/authentication-service
test/e2e-kitchen-designer
```

### Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes (dependencies, etc.)
- `revert`: Revert previous commit

**Examples:**
```bash
feat(api): add kitchen design export endpoint

fix(frontend): resolve 3D rendering crash on mobile devices

docs(readme): update installation instructions

refactor(auth): simplify JWT token validation

test(catalog): add unit tests for product search
```

### Workflow Steps

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   ```bash
   # Make your changes
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push changes**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create pull request**
   - Go to GitHub and create a PR from your branch to `main`
   - Fill out the PR template completely

## Pull Request Process

### Before Submitting

- [ ] Code follows our style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No linting errors
- [ ] No console warnings/errors
- [ ] Changelog updated (if needed)

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Screenshots (if applicable)
Add screenshots here

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged

## Additional Notes
Any additional information
```

### PR Size Guidelines

- **Small PR**: < 200 lines changed (preferred)
- **Medium PR**: 200-500 lines changed
- **Large PR**: > 500 lines changed (break into smaller PRs if possible)

Large PRs are harder to review and may take longer to merge.

## Code Review Guidelines

### For Authors

- Respond to all comments
- Be open to feedback
- Explain your decisions
- Update PR based on feedback
- Request re-review after changes
- Be patient and respectful

### For Reviewers

- Be constructive and specific
- Explain the "why" behind suggestions
- Approve PRs that improve the codebase
- Use GitHub's suggestion feature
- Test the changes locally if needed
- Review within 2 business days

### Review Checklist

- [ ] Code quality and readability
- [ ] Follows project standards
- [ ] Tests are adequate
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations
- [ ] Error handling is proper
- [ ] No unnecessary dependencies

## Testing Requirements

All contributions must include appropriate tests.

### Test Coverage

- **Minimum coverage**: 80%
- **Target coverage**: 85%+
- **Critical paths**: 95%+

### Test Types

**Unit Tests** (required for all functions)
```typescript
// Example Jest test
describe('calculateKitchenArea', () => {
  it('should calculate area correctly', () => {
    const result = calculateKitchenArea(4000, 3000);
    expect(result).toBe(12000000);
  });

  it('should handle zero dimensions', () => {
    const result = calculateKitchenArea(0, 0);
    expect(result).toBe(0);
  });
});
```

**Integration Tests** (for API endpoints)
```typescript
describe('POST /api/v1/kitchen/designs', () => {
  it('should create a new design', async () => {
    const response = await request(app)
      .post('/api/v1/kitchen/designs')
      .set('Authorization', `Bearer ${token}`)
      .send(designData);

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

**E2E Tests** (for critical user flows)
```typescript
// Example Cypress test
describe('Kitchen Design Flow', () => {
  it('should create and save a design', () => {
    cy.visit('/designer');
    cy.get('[data-testid="new-design"]').click();
    cy.get('[data-testid="design-name"]').type('My Kitchen');
    cy.get('[data-testid="save-design"]').click();
    cy.contains('Design saved successfully').should('be.visible');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts

# Run E2E tests
npm run test:e2e
```

## Documentation

### When to Update Documentation

- Adding new features
- Changing API endpoints
- Modifying configuration
- Changing environment variables
- Updating dependencies
- Fixing bugs that affect usage

### Documentation Types

1. **Code Comments**
   - Complex logic
   - Business rules
   - "Why" not "what"
   - JSDoc for public APIs

2. **API Documentation**
   - OpenAPI/Swagger specs
   - Endpoint descriptions
   - Request/response examples

3. **User Documentation**
   - User guides
   - Tutorials
   - FAQs

4. **Developer Documentation**
   - Architecture docs
   - Setup guides
   - Contributing guide

### Documentation Standards

- Use Markdown format
- Include code examples
- Add screenshots where helpful
- Keep it concise and clear
- Update table of contents
- Add "Last Updated" date

## Community

### Getting Help

- **Discord**: https://discord.gg/kitchenxpert
- **GitHub Discussions**: https://github.com/kitchenxpert/kitchenxpert/discussions
- **Stack Overflow**: Tag questions with `kitchenxpert`
- **Email**: dev@kitchenxpert.com

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat and support
- **Twitter**: [@kitchenxpert](https://twitter.com/kitchenxpert)

### Recognition

Contributors are recognized in:
- README.md
- Release notes
- Contributors page
- Annual contributor list

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask! We're here to help:
- Open a [GitHub Discussion](https://github.com/kitchenxpert/kitchenxpert/discussions)
- Join our [Discord](https://discord.gg/kitchenxpert)
- Email us at dev@kitchenxpert.com

Thank you for contributing to KitchenXpert!
