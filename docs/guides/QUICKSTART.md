# ⚡ KitchenXpert - Quick Start Guide

Get up and running with KitchenXpert in 5 minutes!

## 🚀 Installation (3 steps)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/kitchenxpert/kitchenxpert.git
cd kitchenxpert

# Install dependencies
pnpm install

# Copy environment file
cp config/env/env.example .env
```

### Step 2: Start Services

```bash
# Option A: Using Docker (Recommended)
pnpm docker:dev

# Option B: Local Development
# Start databases first (PostgreSQL, MongoDB, Redis)
pnpm db:migrate
pnpm db:seed

# Start all services
pnpm dev
```

### Step 3: Verify Installation

Open your browser:
- Frontend: http://localhost:3000
- API: http://localhost:4000
- Partner Portal: http://localhost:3001

## 🔑 Your First API Call

### 1. Register a User

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@kitchenxpert.com",
    "password": "Demo123!",
    "name": "Demo User"
  }'
```

### 2. Get Catalog Products

```bash
curl -X GET http://localhost:4000/api/v1/catalog/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🎯 What's Next?

- 📚 [Complete Documentation](docs/)
- 🔧 [Installation Guide](INSTALLATION.md)
- 🤝 [Contributing](CONTRIBUTING.md)
- 🔐 [API Docs](docs/api/api-overview.md)

---

**Last Updated**: 2026-01-10
