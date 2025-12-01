# AI-Dev Pipeline Detailed Scenarios

## 🎯 Development Environments

### Environment A: Gemini AI Studio

#### Setup Requirements
```yaml
# AI Studio Configuration
github_integration:
  access_token: "${GITHUB_AI_STUDIO_TOKEN}"
  permissions: ["repo", "pull_request", "workflow"]
  default_branch: "develop"
  
branch_convention:
  pattern: "ai/<short-desc>-<date>"
  example: "ai/live-metrics-smoke-2025-12-01"
  
ai_instructions: |
  "For any real test execution, deployment, or verification:
   1. Create .ai/requests/*.yaml with target_env and commands
   2. Commit + push changes
   3. Open Pull Request with tags: from:gemini, ai-request
   4. NEVER simulate results - always use real cluster execution"
```

#### AI Studio Workflow
```
1. AI Studio pulls latest develop
   ↓
2. Agent analyzes task: "Add live-dashboard endpoint + smoke test"
   ↓
3. Creates branch: ai/live-dashboard-2025-12-01
   ↓
4. Makes code changes:
   - backend: /api/v1/metrics/live endpoint
   - frontend: LiveDashboard component
   - tests: Playwright smoke tests
   ↓
5. Creates .ai/requests/live-dashboard-smoke.yaml
   ↓
6. Commits + pushes to GitHub
   ↓
7. Opens PR: ai/live-dashboard-2025-12-01 → develop
   ↓
8. GitHub Actions execute CI + AI request runner
   ↓
9. Results sent to AI Studio via webhook
   ↓
10. If failed: AI analyzes logs, creates patch, repeats
    If success: PR approved, merge to develop
```

### Environment B: Local Mac Development

#### Setup Requirements
```bash
# Development Environment Setup
make dev-setup
# Installs:
# - Python 3.11+ (FastAPI, pytest)
# - Node 20+ (pnpm, Vite, Playwright)
# - kubectl, helm, k9s
# - docker/k3d/minikube
# - VS Code extensions (Copilot, Docker, Kubernetes)
```

#### Local Development Workflow
```
1. Clone repo: git clone git@github.com:org/Predator-Analytics.git
   ↓
2. Create branch: git checkout -b feature/new-etl-pipeline
   ↓
3. Development in VS Code/Cursor/Windsurf/PyCharm
   ↓
4. Local testing:
   - Backend: pytest backend/tests/
   - Frontend: npm run test && npm run build
   - E2E: make k8s-dev-up && npm run preview
   ↓
5. Optional: Create .ai/requests/manual-new-etl.yaml
   ↓
6. Commit + push: git push origin feature/new-etl-pipeline
   ↓
7. Open PR: feature/new-etl-pipeline → develop
   ↓
8. GitHub Actions execute full CI pipeline
   ↓
9. Manual review + merge → deploy to lab-gpu
```

## 🔄 Unified CI/CD Pipeline

### GitHub Actions Workflow Matrix

```yaml
# .github/workflows/ci-basic.yml
name: CI Basic Checks
on:
  push:
    branches: [feature/*, ai/*, develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Python Lint
        run: |
          pip install black flake8 mypy pytest
          black --check backend/
          flake8 backend/
          mypy backend/
          
  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node Lint
        run: |
          npm ci
          npm run lint
          npm run type-check
          
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [backend, frontend, agents]
    steps:
      - uses: actions/checkout@v4
      - name: Run Unit Tests
        run: |
          # Component-specific test commands
          if [ "${{ matrix.component }}" = "backend" ]; then
            pytest backend/tests/unit/ --cov=backend
          elif [ "${{ matrix.component }}" = "frontend" ]; then
            npm run test:unit
          elif [ "${{ matrix.component }}" = "agents" ]; then
            pytest agents/tests/ --cov=agents
          fi
```

### AI Request Runner Workflow

```yaml
# .github/workflows/ci-ai-request-runner.yml
name: AI Request Runner
on:
  push:
    paths:
      - '.ai/requests/**/*.yaml'
  pull_request:
    paths:
      - '.ai/requests/**/*.yaml'

jobs:
  execute-ai-requests:
    runs-on: [self-hosted, macos] # Mac runner for local cluster
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Dev Cluster
        run: |
          # Ensure k3d cluster is running
          if ! k3d cluster list | grep -q "pa-dev"; then
            make k8s-dev-up
          fi
          
      - name: Find AI Requests
        id: find-requests
        run: |
          requests=$(find .ai/requests -name "*.yaml" -not -path "*/.*" | jq -R . | jq -s .)
          echo "requests=$requests" >> $GITHUB_OUTPUT
          
      - name: Execute Each Request
        uses: matrix-strategy@v1
        with:
          matrix: ${{ steps.find-requests.outputs.requests }}
        steps:
          - name: Parse Request
            id: parse-request
            run: |
              request_file="${{ matrix }}"
              request_id=$(yq e '.metadata.id' "$request_file")
              target_env=$(yq e '.metadata.target_env' "$request_file")
              echo "request_id=$request_id" >> $GITHUB_OUTPUT
              echo "target_env=$target_env" >> $GITHUB_OUTPUT
              
          - name: Execute Commands
            run: |
              request_file="${{ matrix }}"
              report_file=".ai/reports/${{ steps.parse-request.outputs.request_id }}-result.yaml"
              
              # Create initial report
                cat > "$report_file" << EOF
                  metadata:
                request_id: "${{ steps.parse-request.outputs.request_id }}"
                executed_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
                target_env: "${{ steps.parse-request.outputs.target_env }}"
              status: "running"
              results: {}
              artifacts: {}
              EOF
              
              # Execute commands from request
              commands=$(yq e '.spec.commands[]' "$request_file")
              while IFS= read -r cmd; do
                echo "Executing: $cmd"
                if eval "$cmd"; then
                  echo "✓ $cmd succeeded"
                else
                  echo "✗ $cmd failed"
                  # Update report status to failed
                  yq e '.status = "failed"' -i "$report_file"
                  exit 1
                fi
              done <<< "$commands"
              
              # Mark as success
              yq e '.status = "success"' -i "$report_file"
              
          - name: Upload Report
            uses: actions/upload-artifact@v3
            with:
              name: ai-report-${{ steps.parse-request.outputs.request_id }}
              path: .ai/reports/${{ steps.parse-request.outputs.request_id }}-result.yaml
              
      - name: Commit AI Reports
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .ai/reports/
          git commit -m "AI: Add execution reports for $(date +%Y-%m-%d)" || true
          git push
```

### Notes about the current implementation (real-backend, SSE, and tests)

- real-backend/server.js now supports persistent jobs and writes artifacts to disk under `real-backend/data/artifacts/<jobId>` before marking jobs as COMPLETED.
- The repo includes an SSE streaming endpoint at `/api/v1/infra/tests/:jobId/stream` and endpoints to start jobs (`POST /api/v1/infra/tests/run`) and fetch artifacts. CI and local smoke tests use these endpoints for deterministic E2E flows.
- Frontend API client `services/api.ts` normalizes backend response wrappers (it returns `res.data?.data ?? res.data`) and provides a reconnecting EventSource wrapper for SSE with backoff and polling fallback.
- `views/InfraView.tsx` in the frontend is wired to the real backend; it consumes SSE logs and reads artifacts via the API endpoints.
- Playwright test updates: `tests/playwright/runner.spec.js` and `tests/playwright/debug_manual.js` were adapted to support the built static bundle served via `scripts/serve-with-proxy.js` (static server on port 3003 proxies `/api` to `127.0.0.1:8001`). Tests now run reliably under Firefox locally; Chromium launch is known to be flaky in some local Mac environments — CI is the authoritative runner for Chromium.

These notes should be used by AI Studio agents and developers writing `.ai/requests` so that smoke tests and Playwright runs target the proper endpoints and collect artifacts for `.ai/reports`.

## 🚀 End-to-End Scenarios

### Scenario A: AI Studio Complete Flow

#### Step 1 - AI Studio Initialization
```python
# AI Studio Agent Prompt
"""
Task: Add live-dashboard endpoint with smoke testing

Requirements:
1. Backend: GET /api/v1/metrics/live returning real-time metrics
2. Frontend: LiveDashboard component with auto-refresh
3. Tests: Playwright smoke test for dashboard functionality
4. AI Request: Create .ai/requests/live-dashboard-smoke.yaml

Constraints:
- Use existing FastAPI backend structure
- Follow React component patterns
- Ensure tests run on dev-local cluster
- Create proper error handling
"""

# AI Studio generates:
# 1. Branch: ai/live-dashboard-2025-12-01
# 2. Code changes in backend/, frontend/, tests/
# 3. .ai/requests/live-dashboard-smoke.yaml
# 4. Commit + PR to develop
```

#### Step 2 - CI Pipeline Execution
```bash
# GitHub Actions automatically triggers:
# 1. ci-basic.yml - Lint + unit tests
# 2. ci-build-and-scan.yml - Docker build + security scan
# 3. ci-ai-request-runner.yml - Execute smoke tests on Mac

# Self-hosted Mac runner executes:
make k8s-dev-up  # Ensure cluster running
helm upgrade --install platform-dev-local infra/helm/platform \
  --values infra/helm/platform/values-dev.yaml \
  --set image.tag=${{ github.sha }}

npm run preview &
npx playwright test --project=chromium
curl -f http://localhost:3000/api/v1/metrics/live
kubectl get pods -n predator-dev
```

#### Step 3 - Results Processing
```yaml
# .ai/reports/live-dashboard-smoke-result.yaml generated:
metadata:
  request_id: "live-dashboard-smoke-2025-12-01"
  executed_at: "2025-12-01T10:30:00Z"
  target_env: "dev-local"
  
status: "success"

results:
  playwright:
    passed: 15
    failed: 0
    duration: "2m 30s"
    tests:
      - name: "dashboard-loads"
        status: "passed"
        duration: "1.2s"
      - name: "live-metrics-update"
        status: "passed"
        duration: "0.8s"
        
  api_checks:
    - endpoint: "/api/v1/metrics/live"
      status: 200
      response_time: "120ms"
      validation: "response_schema_valid"
      
  k8s_health:
    namespace: "predator-dev"
    ready_pods: "8/8"
    failed_pods: 0
    deployments: "3/3 ready"

artifacts:
  playwright_report: "https://actions.github.io/pr/123/playwright"
  grafana_dashboard: "http://grafana.local/d/live-dashboard"
  argocd_app: "http://argocd.local/applications/pa-dev-live-dashboard"
  helm_release: "platform-dev-local v1.2.3"
```

#### Step 4 - AI Studio Feedback Loop
```python
# AI Studio receives webhook with results
def process_ai_feedback(webhook_data):
    report = webhook_data['report']
    
    if report['status'] == 'success':
        # AI Studio creates follow-up task
        create_task("Prepare PR for merge to develop")
        notify_user("✅ Smoke tests passed. Ready for review.")
        
    elif report['status'] == 'failed':
        # AI Studio analyzes failures
        failed_steps = analyze_failures(report['results'])
        
        # AI Studio generates fixes
        for step in failed_steps:
            fix = generate_fix(step['error'], step['context'])
            apply_fix(fix)
            
        # Create new commit and repeat
        commit_and_push("AI: Fix smoke test failures")
        trigger_new_run()
```

### Scenario B: Local Development with AI Integration

#### Step 1 - Local Development
```bash
# Developer workflow
git checkout -b feature/advanced-analytics
# Code changes...
npm run test:unit
pytest backend/tests/unit/
make k8s-dev-up && npm run preview  # Quick local test
```

#### Step 2 - Create AI Request (Optional)
```yaml
# .ai/requests/manual-advanced-analytics.yaml
metadata:
  id: "manual-advanced-analytics-2025-12-01"
  created_by: "human-developer"
  target_env: "dev-local"
  
spec:
  scenario: "integration-test"
  commands:
    - "helm upgrade --install platform-dev-local infra/helm/platform --values infra/helm/platform/values-dev.yaml"
    - "npm run build"
    - "npm run preview &"
    - "sleep 30"  # Wait for startup
    - "npx playwright test tests/integration/advanced-analytics.spec.ts"
    - "curl -f http://localhost:3000/api/v1/analytics/advanced"
    - "kubectl logs -n predator-dev deployment/predator-backend --tail=50"
  
  success_criteria:
    - "playwright: 0 failures"
    - "api: 200 OK response"
    - "k8s: no error logs"
  
  timeout: "15m"
```

#### Step 3 - CI Execution
```bash
# GitHub Actions runs:
# 1. ci-basic.yml - All linting and unit tests
# 2. ci-build-and-scan.yml - Build and security scan
# 3. ci-ai-request-runner.yml - Execute manual AI request
# 4. ci-helm-validate.yml - Validate Helm charts

# If all pass:
# - Auto-create PR ops/update-images-{sha}
# - Update image tags in values files
# - Ready for merge to develop
```

## 🔧 Configuration Files

### AI Studio Integration Config
```yaml
# .ai/config/studio-integration.yaml
studio_config:
  github:
    repo: "Predator-Analytics"
    owner: "your-org"
    default_branch: "develop"
    
  branch_patterns:
    ai_branch: "ai/*"
    feature_branch: "feature/*"
    
  webhook_endpoints:
    results: "https://ai-studio.google.com/webhooks/predator-analytics"
    
  execution_limits:
    max_concurrent_requests: 3
    timeout_per_request: "30m"
    allowed_target_envs: ["dev-local"]
```

### Local Development Config
```yaml
# .ai/config/local-dev.yaml
local_config:
  cluster:
    name: "pa-dev"
    type: "k3d"
    ports:
      frontend: "3000:3000"
      backend: "8000:8000"
      
  testing:
    auto_run: false
    parallel_tests: true
    test_timeout: "10m"
    
  monitoring:
    grafana_url: "http://grafana.local:3001"
    prometheus_url: "http://prometheus.local:9090"
```

## 📊 Monitoring & Observability

### AI Request Metrics
```yaml
# Metrics collected for each AI request
ai_request_metrics:
  request_id: "unique-identifier"
  execution_time: "5m 23s"
  success_rate: "100%"
  resource_usage:
    cpu: "45%"
    memory: "2.1GB"
    storage: "150MB"
    
  test_results:
    total_tests: 25
    passed: 25
    failed: 0
    skipped: 0
    
  deployment_status:
    helm_release: "platform-dev-local"
    pods_ready: "8/8"
    services_up: "3/3"
```

### Environment Health Dashboard
```yaml
# Grafana dashboard panels
dashboard_panels:
  - title: "AI Request Success Rate"
    type: "stat"
    query: "rate(ai_requests_success_total[1h])"
    
  - title: "Cluster Resource Usage"
    type: "graph"
    query: "rate(container_cpu_usage_seconds_total[5m])"
    
  - title: "Deployment Frequency"
    type: "stat"
    query: "increase(argocd_app_sync_total[1d])"
    
  - title: "Test Execution Time"
    type: "heatmap"
    query: "histogram_quantile(0.95, test_duration_seconds_bucket)"
```

## 🚨 Error Handling & Recovery

### AI Request Failure Scenarios
```yaml
# Failure handling strategies
failure_scenarios:
  cluster_not_ready:
    action: "retry_with_cluster_setup"
    max_retries: 3
    backoff: "exponential"
    
  test_failures:
    action: "analyze_logs_and_suggest_fixes"
    auto_fix: true
    human_review_required: false
    
  deployment_errors:
    action: "rollback_and_notify"
    rollback_strategy: "helm_rollback"
    notification_channels: ["slack", "email"]
    
  timeout_exceeded:
    action: "extend_timeout_or_cancel"
    max_timeout: "60m"
    cancellation_policy: "graceful"
```

### Recovery Procedures
```bash
# Manual recovery commands
make k8s-dev-reset          # Reset local cluster
helm rollback platform-dev-local  # Rollback deployment
make logs-fetch             # Get all pod logs
make health-check           # Comprehensive health check
```

## 📋 Success Criteria

### AI Studio Integration
- ✅ AI can create branches and PRs
- ✅ AI requests execute on real clusters
- ✅ Results flow back to AI Studio
- ✅ Automated fix generation works

### Local Development
- ✅ Seamless GitOps workflow
- ✅ Local testing integration
- ✅ Optional AI request execution
- ✅ Fast feedback loops

### Pipeline Reliability
- ✅ All environments tested
- ✅ Security scanning integrated
- ✅ Rollback capabilities
- ✅ Monitoring and alerting
