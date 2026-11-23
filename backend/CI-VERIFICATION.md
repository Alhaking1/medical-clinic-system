# 🚀 CI/CD Pipeline Verification

## 1. Workflow Architecture (`.github/workflows/ci.yml`)
The continuous integration pipeline is configured with two decoupled safety jobs:
1. **`test` Job:**
   - Environments: Ubuntu Latest / Node.js 20 LTS
   - Commands: `npm ci`, `npm test` (executing all 15 security and functional test cases in band), `npm audit --audit-level=high`
2. **`security` Job:**
   - Static analysis and production dependency review: `npm audit --production`
   - Snyk vulnerability check: `npx snyk test --severity-threshold=high`

---

## 2. Trigger Events
- Pushes to `main` and `develop`
- Pull requests targeting `main` and `develop`
