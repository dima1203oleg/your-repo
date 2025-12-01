# DevOps & AI-Dev Pipeline Overview

## 🎯 Mission Statement

Single source of truth – GitHub repository `Predator-Analytics/`.  
Unified DevOps pipeline for all code sources (AI Studio ↔ Mac ↔ GPU ↔ Oracle) with GitOps-only deployments.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Studio     │    │   Mac Local     │    │   GitHub Repo   │
│                 │    │   (VS Code)     │    │                 │
│ • Code/Edit     │───▶│ • Code/Edit     │───▶│ • Single Source │
│ • .ai/requests  │    │ • Feature/      │    │ • GitOps Truth  │
│ • PR Creation   │    │ • Manual PRs    │    │ • CI/CD Trigger │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub Actions  │    │   Container Reg  │    │   ArgoCD CD     │
│                 │    │                 │    │                 │
│ • CI/Build      │───▶│ • Docker Images │───▶│ • GitOps Sync   │
│ • Security Scan │    │ • SBOM/Sign     │    │ • Multi-Cluster │
│ • AI Request    │    │ • Version Tags  │    │ • Rollouts      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       ▼                              ▼                              ▼
        ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
        │   dev-local     │              │   lab-gpu       │              │   prod-oracle   │
        │                 │              │                 │              │                 │
        │ • MacBook M3    │              │ • NVIDIA Server │              │ • Oracle Cloud  │
        │ • k3d/minikube  │              │ • k3s/k8s       │              │ • OKE/k3s       │
        │ • ArgoCD-dev    │              │ • ArgoCD-lab    │              │ • ArgoCD-prod   │
        │ • Smoke Tests   │              │ • GPU Workloads │              │ • Canary Deploys│
        └─────────────────┘              └─────────────────┘              └─────────────────┘
```

## 🔄 GitOps Flow

### Branch Strategy
```
feature/* ──┐
ai/* ───────┼──▶ develop ──▶ main
            │              │
            │              ▼
            │         prod-oracle
            │              (OKE)
            ▼
      dev-local
      (MacBook)
```

### Environment Mapping
| Branch | Environment | Cluster | ArgoCD | Sync Mode |
|--------|-------------|---------|--------|-----------|
| `feature/*`, `ai/*` | dev-local | pa-dev | ArgoCD-dev | Auto |
| `develop` | lab-gpu | pa-lab-gpu | ArgoCD-lab | Auto |
| `main` | prod-oracle | pa-oracle-prod | ArgoCD-prod | Manual |

## 🤖 AI-DevOps Integration

### .ai/requests Structure
```yaml
# .ai/requests/live-dashboard-smoke.yaml
metadata:
  id: "live-dashboard-smoke-2025-12-01"
  created_by: "gemini-studio"
  target_env: "dev-local"
  
spec:
  scenario: "smoke-test"
  commands:
    - "npm run preview"
    - "npx playwright test --project=chromium"
    - "curl -f http://localhost:3000/api/v1/metrics/system"
    - "kubectl get pods -n predator-dev"
  
  success_criteria:
    - "playwright: 0 failures"
    - "api: 200 OK response"
    - "k8s: all pods ready"
  
  timeout: "10m"
```

### .ai/reports Structure
```yaml
# .ai/reports/live-dashboard-smoke-result.yaml
metadata:
  request_id: "live-dashboard-smoke-2025-12-01"
  executed_at: "2025-12-01T10:30:00Z"
  target_env: "dev-local"
  
status: "success" # | failed | timeout

results:
  playwright:
    passed: 15
    failed: 0
    duration: "2m 30s"
  api_checks:
    - endpoint: "/api/v1/metrics/system"
      status: 200
      response_time: "120ms"
  k8s_health:
    ready_pods: "8/8"
    failed_pods: 0

artifacts:
  playwright_report: "https://actions.github.io/pr/123/playwright"
  grafana_dashboard: "http://grafana.local/d/live-dashboard"
  argocd_app: "http://argocd.local/applications/pa-dev-live-dashboard"
```

## 🛠️ Core Components

### CI/CD Pipeline
1. **ci-basic.yml** - Lint, unit tests, quick checks
2. **ci-build-and-scan.yml** - Docker build, Trivy scan, SBOM, Cosign
3. **ci-ai-request-runner.yml** - Execute .ai/requests on self-hosted runners
4. **ci-helm-validate.yml** - Helm lint, template, kubeconform
5. **cd-image-tag-update.yml** - Update image tags in Helm values
6. **ci-ai-feedback.yml** - Send results back to AI Studio

### GitOps Stack
- **ArgoCD** - GitOps deployment engine
- **Argo Rollouts** - Canary deployments
- **Helm** - Package management
- **Kustomize** - Configuration overlay

### Security & Observability
- **Trivy + SBOM + Cosign** - Supply chain security
- **Kyverno/OPA** - Policy as code
- **Vault + External Secrets** - Secret management
- **Prometheus/Grafana/Loki/Tempo** - Monitoring stack
- **Istio/Linkerd** - Service mesh
- **Falco + LitmusChaos** - Runtime security & chaos testing

## 🚀 Deployment Scenarios

### Scenario A: AI Studio Development
1. AI Studio creates branch `ai/live-dashboard-2025-12-01`
2. Edits code + creates `.ai/requests/live-dashboard-smoke.yaml`
3. Push + PR to `develop`
4. GitHub Actions run CI + AI request on Mac runner
5. Results sent back to AI Studio
6. If successful → merge to `develop` → auto-deploy to `lab-gpu`

### Scenario B: Local Mac Development
1. Create branch `feature/new-etl-pipeline`
2. Code + test locally
3. Push + PR to `develop`
4. GitHub Actions run CI
5. Manual or automated `.ai/requests` execution
6. Merge → deploy through GitOps pipeline

## 📋 Next Steps

1. **Repository Structure** - Set up `.ai/`, `infra/helm/`, `.github/workflows/`
2. **CI/CD Workflows** - Implement GitHub Actions
3. **ArgoCD Setup** - Configure ApplicationSets for 3 clusters
4. **Security Policies** - Implement Kyverno/OPA policies
5. **Documentation** - Complete detailed guides for each component
