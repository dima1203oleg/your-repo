# GitHub Copilot Instructions for Predator Analytics

## 🎯 Development Environment Setup

### Quick Start Commands
```bash
# Setup development environment
make dev-setup

# Start local Kubernetes cluster
make k8s-dev-up

# Run smoke tests
make dev-smoke

# Stop cluster
make k8s-dev-down

# View logs
make logs-dev

# Port forwarding
make port-forward
```

### Development Workflow
1. **Create feature branch**: `git checkout -b feature/your-feature-name`
2. **Make changes** in your preferred editor (VS Code, Cursor, Windsurf, PyCharm)
3. **Run local tests**: `npm run test && pytest backend/tests/`
4. **Optional AI request**: Create `.ai/requests/manual-*.yaml` for CI execution
5. **Commit and push**: `git push origin feature/your-feature-name`
6. **Open PR**: Create PR to `develop` branch
7. **Monitor CI**: Watch GitHub Actions progress
8. **Review and merge**: After CI passes and review complete

## 🤖 Working with .ai/requests

### Creating Manual AI Requests
```yaml
# .ai/requests/manual-your-feature.yaml
metadata:
  id: "manual-your-feature-$(date +%Y-%m-%d)"
  created_by: "human-developer"
  target_env: "dev-local"
  
spec:
  scenario: "integration-test"
  commands:
    - "helm upgrade --install platform-dev-local infra/helm/platform --values infra/helm/platform/values-dev.yaml"
    - "npm run build"
    - "npm run preview &"
    - "sleep 30"
    - "npx playwright test tests/integration/your-feature.spec.ts"
    - "curl -f http://localhost:3000/api/v1/your-endpoint"
    - "kubectl logs -n predator-dev deployment/predator-backend --tail=50"
  
  success_criteria:
    - "playwright: 0 failures"
    - "api: 200 OK response"
    - "k8s: no error logs"
  
  timeout: "15m"
```

### Reading AI Reports
```bash
# View latest AI reports
ls -la .ai/reports/

# Read specific report
cat .ai/reports/manual-your-feature-2025-12-01-result.yaml

# Check report status
yq e '.status' .ai/reports/manual-your-feature-2025-12-01-result.yaml
```

## 🖥️ Local Development Commands

### Backend Development
```bash
# Start backend server
cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run backend tests
pytest backend/tests/ --cov=backend --cov-report=html

# Check linting
black backend/
flake8 backend/
mypy backend/

# Install dependencies
pip install -r requirements.txt
```

### Frontend Development
```bash
# Start frontend dev server
npm run dev

# Run frontend tests
npm run test

# Build for production
npm run build

# Check linting
npm run lint
npm run type-check

# Install dependencies
npm install
```

### E2E Testing
```bash
# Run Playwright tests
npx playwright test

# Run specific test file
npx playwright test tests/integration/your-feature.spec.ts

# Run with UI (debug mode)
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## 🚀 Kubernetes Development

### CI / Playwright Runbook

See the integration runbook for self-hosted runner setup, Playwright Chromium troubleshooting, and CI diagnostics:

- docs/devops/06_integration_runbook.md


### Local Cluster Management
```bash
# Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces

# Access services
kubectl port-forward svc/predator-backend 8000:8000 -n predator-dev
kubectl port-forward svc/predator-frontend 3000:3000 -n predator-dev

# View logs
kubectl logs -n predator-dev deployment/predator-backend -f
kubectl logs -n predator-dev deployment/predator-frontend -f

# Debug pods
kubectl exec -it deployment/predator-backend -n predator-dev -- bash
```

### Helm Operations
```bash
# Install/upgrade platform
helm upgrade --install platform-dev-local infra/helm/platform \
  --values infra/helm/platform/values-dev.yaml \
  --namespace predator-dev \
  --create-namespace

# Check Helm releases
helm list -n predator-dev

# Debug Helm templates
helm template platform-dev-local infra/helm/platform \
  --values infra/helm/platform/values-dev.yaml

# Uninstall
helm uninstall platform-dev-local -n predator-dev
```

## 📊 Monitoring and Debugging

### Access Monitoring Tools
```bash
# Grafana (if deployed)
kubectl port-forward svc/grafana 3001:3000 -n monitoring
# URL: http://localhost:3001

# Prometheus (if deployed)
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# URL: http://localhost:9090

# ArgoCD (if deployed)
kubectl port-forward svc/argocd-server 8080:8080 -n argocd
# URL: http://localhost:8080
# Username: admin
# Password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Debugging Commands
```bash
# Check pod health
kubectl get pods -n predator-dev -o wide

# Describe pod issues
kubectl describe pod <pod-name> -n predator-dev

# Check events
kubectl get events -n predator-dev --sort-by=.metadata.creationTimestamp

# Resource usage
kubectl top nodes
kubectl top pods -n predator-dev

# Network debugging
kubectl exec -it deployment/predator-backend -n predator-dev -- netstat -tulpn
```

## 🔧 Common Development Tasks

### Adding New API Endpoint
1. **Backend**: Add route in `backend/app/api/v1/`
2. **Tests**: Add unit test in `backend/tests/unit/`
3. **Integration**: Add E2E test in `tests/integration/`
4. **Documentation**: Update API docs if needed
5. **AI Request**: Create smoke test in `.ai/requests/`

### Adding New Frontend Component
1. **Component**: Create in `frontend/src/components/`
2. **Tests**: Add unit test in `frontend/src/components/__tests__/`
3. **E2E**: Add integration test in `tests/e2e/`
4. **Stories**: Add Storybook story if applicable
5. **AI Request**: Create visual test in `.ai/requests/`

### Database Schema Changes
1. **Migration**: Create migration file in `backend/alembic/versions/`
2. **Tests**: Add migration test in `backend/tests/migrations/`
3. **Models**: Update SQLAlchemy models
4. **API**: Update API endpoints as needed
5. **AI Request**: Create data validation test

## 🚨 Troubleshooting

### Common Issues and Solutions

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Kill processes if needed
kill -9 <PID>
```

#### Cluster Issues
```bash
# Reset cluster
make k8s-dev-down
make k8s-dev-up

# Check cluster health
kubectl cluster-info
kubectl get componentstatuses
```

#### Build Failures
```bash
# Clear caches
npm cache clean --force
pip cache purge

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

pip uninstall -r requirements.txt -y
pip install -r requirements.txt
```

#### Test Failures
```bash
# Run specific failing test
pytest backend/tests/unit/test_specific.py::test_function -v

# Run with debug output
pytest backend/tests/unit/ -v -s

# Frontend debug test
npm run test -- --testNamePattern="specific test"
```

## 📋 Development Checklist

### Before Commit
- [ ] Code follows style guidelines (black, ESLint, Prettier)
- [ ] All unit tests pass locally
- [ ] Integration tests pass (if applicable)
- [ ] Documentation updated (API changes, new features)
- [ ] No sensitive data committed
- [ ] Dependencies updated if needed

### Before PR
- [ ] Local smoke tests pass: `make dev-smoke`
- [ ] Code reviewed by team member
- [ ] PR description includes:
  - What was changed
  - Why it was changed
  - How to test
  - Any breaking changes
- [ ] Appropriate labels applied
- [ ] Tests cover new functionality

### Before Merge
- [ ] CI pipeline passes
- [ ] Security scans pass
- [ ] Performance impact assessed
- [ ] Documentation complete
- [ ] Rollback plan documented

## 🎯 Best Practices

### Code Quality
- Write meaningful commit messages
- Keep functions small and focused
- Add comments for complex logic
- Use TypeScript for frontend
- Follow Python PEP 8 guidelines

### Testing
- Unit tests for all new functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests for bottlenecks
- Security tests for vulnerabilities

### Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Follow principle of least privilege
- Regular security audits

### Performance
- Profile code for bottlenecks
- Optimize database queries
- Use caching appropriately
- Monitor resource usage
- Set up alerts for anomalies

## 📚 Additional Resources

### Documentation
- [API Documentation](./docs/api/)
- [Architecture Overview](./docs/architecture/)
- [Deployment Guide](./docs/deployment/)
- [Security Guidelines](./docs/security/)

### Tools and Links
- [GitHub Actions](https://github.com/your-org/Predator-Analytics/actions)
- [ArgoCD Dashboard](http://argocd.local) (when deployed)
- [Grafana Dashboard](http://grafana.local) (when deployed)
- [Playwright Reports](./playwright-report/) (after tests)

### Getting Help
- Slack: `#predator-analytics-dev`
- Issues: [GitHub Issues](https://github.com/your-org/Predator-Analytics/issues)
- Documentation: [Confluence](https://your-org.atlassian.net/wiki/spaces/PREDATOR)

---

## 🚀 Quick Reference Commands

```bash
# Development
make dev-setup          # Initial setup
make k8s-dev-up         # Start cluster
make dev-smoke          # Run smoke tests
make logs-dev           # View logs
make port-forward       # Forward ports

# Testing
npm run test            # Frontend tests
pytest backend/tests/   # Backend tests
npx playwright test     # E2E tests

# Building
npm run build           # Frontend build
docker build -t predator-backend .  # Backend build

# Kubernetes
kubectl get pods        # List pods
kubectl logs <pod>      # View logs
kubectl describe <pod>  # Pod details

# Helm
helm template platform infra/helm/platform  # Preview
helm upgrade platform infra/helm/platform   # Deploy
helm rollback platform 1  # Rollback

# Debugging
make health-check       # System health
make logs-debug         # Debug logs
make cluster-status     # Cluster status
```

Happy coding! 🎉
