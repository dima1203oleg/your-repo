# CI/CD Pipeline Flows & GitHub Actions

## 🔄 Pipeline Overview

```
Push to GitHub
       │
       ▼
┌─────────────────┐
│  ci-basic.yml   │ ← Lint, Unit Tests, Quick Checks
│  ci-build.yml   │ ← Docker Build, Security Scan
│  ci-ai-runner   │ ← Execute .ai/requests (if present)
│  ci-helm.yml    │ ← Helm Validation
│  cd-update.yml  │ ← Update image tags
│  ci-feedback.yml│ ← Send results to AI Studio
└─────────────────┘
       │
       ▼
┌─────────────────┐
│   ArgoCD CD     │ ← GitOps Deploy to Clusters
│                 │ ← dev-local (auto)
│                 │ ← lab-gpu (auto)
│                 │ ← prod-oracle (manual)
└─────────────────┘
```

## 📋 Workflow Matrix

| Workflow | Trigger | Runner | Purpose | Environment |
|----------|---------|--------|---------|-------------|
| `ci-basic.yml` | Push/PR to any branch | ubuntu-latest | Lint + unit tests | All |
| `ci-build-and-scan.yml` | Push/PR to any branch | ubuntu-latest | Build + security | All |
| `ci-ai-request-runner.yml` | .ai/requests changes | self-hosted-mac | Execute AI requests | dev-local |
| `ci-helm-validate.yml` | Push/PR to main/develop | ubuntu-latest | Helm validation | All |
| `cd-image-tag-update.yml` | Build success | ubuntu-latest | Update image tags | All |
| `ci-ai-feedback.yml` | .ai/reports changes | ubuntu-latest | Send to AI Studio | All |

## 🔧 Workflow Definitions

### 1. Basic CI Workflow
```yaml
# .github/workflows/ci-basic.yml
name: CI Basic Checks
on:
  push:
    branches: [feature/*, ai/*, develop, main]
  pull_request:
    branches: [develop, main]
  workflow_dispatch:

env:
  NODE_VERSION: "20"
  PYTHON_VERSION: "3.11"

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.changes.outputs.backend }}
      frontend: ${{ steps.changes.outputs.frontend }}
      agents: ${{ steps.changes.outputs.agents }}
      infra: ${{ steps.changes.outputs.infra }}
      docs: ${{ steps.changes.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            backend:
              - 'backend/**'
              - 'requirements.txt'
            frontend:
              - 'frontend/**'
              - 'package.json'
              - 'vite.config.ts'
            agents:
              - 'agents/**'
            infra:
              - 'infra/**'
            docs:
              - 'docs/**'

  lint-backend:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
          
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install black flake8 mypy pytest pytest-cov
          
      - name: Run Black
        run: black --check backend/ --diff
        
      - name: Run Flake8
        run: flake8 backend/ --max-line-length=100 --ignore=E203,W503
        
      - name: Run MyPy
        run: mypy backend/ --ignore-missing-imports
        
      - name: Run Unit Tests
        run: |
          pytest backend/tests/unit/ \
            --cov=backend \
            --cov-report=xml \
            --cov-report=html \
            --junit-xml=junit-backend.xml
            
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          flags: backend
          name: backend-coverage

  lint-frontend:
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: package-lock.json
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run ESLint
        run: npm run lint -- --format=github
        
      - name: Run Prettier
        run: npm run format:check
        
      - name: Run TypeScript Check
        run: npm run type-check
        
      - name: Run Unit Tests
        run: |
          npm run test:unit \
            -- --coverage \
            --reporter=junit \
            --reporter=html \
            --outputFile=junit-frontend.xml
            
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: frontend
          name: frontend-coverage

  lint-agents:
    needs: detect-changes
    if: needs.detect-changes.outputs.agents == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
          
      - name: Install dependencies
        run: |
          cd agents
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install black flake8 mypy pytest pytest-cov
          
      - name: Run Linting
        run: |
          cd agents
          black --check . --diff
          flake8 . --max-line-length=100
          mypy . --ignore-missing-imports
          
      - name: Run Tests
        run: |
          cd agents
          pytest tests/ \
            --cov=agents \
            --cov-report=xml \
            --junit-xml=junit-agents.xml

  security-scan:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true' || needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  notify-results:
    needs: [lint-backend, lint-frontend, lint-agents, security-scan]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#ci-cd'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### 2. Build and Security Scan
```yaml
# .github/workflows/ci-build-and-scan.yml
name: CI Build and Security Scan
on:
  push:
    branches: [feature/*, ai/*, develop, main]
  pull_request:
    branches: [develop, main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: predator-analytics

jobs:
  build-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [backend, frontend, agents]
        include:
          - component: backend
            dockerfile: backend/Dockerfile
            context: backend/
          - component: frontend
            dockerfile: frontend/Dockerfile
            context: frontend/
          - component: agents
            dockerfile: agents/Dockerfile
            context: agents/
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}/${{ matrix.component }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
            
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.dockerfile }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.REGISTRY }}/${{ github.repository }}/${{ matrix.component }}:${{ steps.meta.outputs.version }}
          format: spdx-json
          output-file: sbom-${{ matrix.component }}.spdx.json
          
      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom-${{ matrix.component }}
          path: sbom-${{ matrix.component }}.spdx.json
          
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ github.repository }}/${{ matrix.component }}:${{ steps.meta.outputs.version }}
          format: 'sarif'
          output: 'trivy-${{ matrix.component }}.sarif'
          
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-${{ matrix.component }}.sarif'

  sign-images:
    needs: build-matrix
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && (github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main')
    steps:
      - uses: actions/checkout@v4
      
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
        
      - name: Sign images
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          for component in backend frontend agents; do
            IMAGE="${{ env.REGISTRY }}/${{ github.repository }}/${component}:${{ github.sha }}"
            cosign sign --yes $IMAGE
          done

  generate-attestation:
    needs: build-matrix
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
        
      - name: Generate attestation
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          for component in backend frontend agents; do
            IMAGE="${{ env.REGISTRY }}/${{ github.repository }}/${component}:${{ github.sha }}"
            cosign attest --yes --keyless $IMAGE --predicate https://raw.githubusercontent.com/sigstore/cosign/main/spec/attestations/predicates/slsa/v1.json
          done
```

### 3. AI Request Runner
```yaml
# .github/workflows/ci-ai-request-runner.yml
name: CI AI Request Runner
on:
  push:
    paths:
      - '.ai/requests/**/*.yaml'
  pull_request:
    paths:
      - '.ai/requests/**/*.yaml'
  workflow_dispatch:
    inputs:
      request_id:
        description: 'Specific AI request ID to run'
        required: false
        type: string

jobs:
  find-requests:
    runs-on: ubuntu-latest
    outputs:
      requests: ${{ steps.find.outputs.requests }}
      matrix: ${{ steps.find.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Find AI requests
        id: find
        run: |
          if [[ -n "${{ github.event.inputs.request_id }}" ]]; then
            # Specific request from workflow dispatch
            REQUEST_FILE=$(find .ai/requests -name "*${{ github.event.inputs.request_id }}*.yaml" | head -1)
            if [[ -z "$REQUEST_FILE" ]]; then
              echo "No request found with ID: ${{ github.event.inputs.request_id }}"
              exit 1
            fi
            echo "requests=[\"$REQUEST_FILE\"]" >> $GITHUB_OUTPUT
            echo "matrix=[\"$(basename "$REQUEST_FILE" .yaml)\"]" >> $GITHUB_OUTPUT
          else
            # All requests in this commit
            REQUESTS=$(find .ai/requests -name "*.yaml" -not -path "*/.*" | jq -R . | jq -s .)
            MATRIX=$(find .ai/requests -name "*.yaml" -not -path "*/.*" -exec basename {} .yaml \; | jq -R . | jq -s .)
            echo "requests=$REQUESTS" >> $GITHUB_OUTPUT
            echo "matrix=$MATRIX" >> $GITHUB_OUTPUT
          fi

  execute-requests:
    needs: find-requests
    runs-on: [self-hosted, macos]
    if: needs.find-requests.outputs.requests != '[]'
    strategy:
      matrix:
        request_file: ${{ fromJson(needs.find-requests.outputs.requests) }}
        request_name: ${{ fromJson(needs.find-requests.outputs.matrix) }}
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Parse AI request
        id: parse
        run: |
          REQUEST_FILE="${{ matrix.request_file }}"
          REQUEST_ID=$(yq e '.metadata.id' "$REQUEST_FILE")
          TARGET_ENV=$(yq e '.metadata.target_env' "$REQUEST_FILE")
          TIMEOUT=$(yq e '.spec.timeout // "10m"' "$REQUEST_FILE")
          
          echo "request_id=$REQUEST_ID" >> $GITHUB_OUTPUT
          echo "target_env=$TARGET_ENV" >> $GITHUB_OUTPUT
          echo "timeout=$TIMEOUT" >> $GITHUB_OUTPUT
          
          # Validate target environment
          if [[ "$TARGET_ENV" != "dev-local" ]]; then
            echo "❌ Only dev-local environment is supported for AI requests"
            exit 1
          fi
          
      - name: Setup dev cluster
        run: |
          # Ensure k3d cluster exists and is running
          if ! k3d cluster list | grep -q "pa-dev"; then
            echo "🚀 Starting dev cluster..."
            make k8s-dev-up
          else
            echo "✅ Dev cluster already running"
          fi
          
          # Verify cluster health
          if ! kubectl get nodes | grep -q "Ready"; then
            echo "❌ Cluster nodes not ready"
            exit 1
          fi
          
      - name: Create report directory
        run: |
          mkdir -p .ai/reports
          REPORT_FILE=".ai/reports/${{ steps.parse.outputs.request_id }}-result.yaml"
          
          # Create initial report
          cat > "$REPORT_FILE" << EOF
          metadata:
            request_id: "${{ steps.parse.outputs.request_id }}"
            executed_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            target_env: "${{ steps.parse.outputs.target_env }}"
            git_sha: "${{ github.sha }}"
            git_branch: "${{ github.ref_name }}"
            workflow_run: "${{ github.run_id }}"
          status: "running"
          results: {}
          artifacts: {}
          EOF
          
      - name: Execute commands
        run: |
          REQUEST_FILE="${{ matrix.request_file }}"
          REPORT_FILE=".ai/reports/${{ steps.parse.outputs.request_id }}-result.yaml"
          TIMEOUT="${{ steps.parse.outputs.timeout }}"
          
          # Extract commands
          yq e '.spec.commands[]' "$REQUEST_FILE" > /tmp/commands.txt
          
          # Execute each command with timeout
          COMMAND_INDEX=0
          while IFS= read -r cmd; do
            echo "🔧 Executing [$COMMAND_INDEX]: $cmd"
            
            # Run command with timeout
            if timeout "$TIMEOUT" bash -c "$cmd"; then
              echo "✅ Command succeeded: $cmd"
              yq e ".results.command_$COMMAND_INDEX = {status: \"success\", command: \"$cmd\"}" -i "$REPORT_FILE"
            else
              EXIT_CODE=$?
              echo "❌ Command failed (exit code $EXIT_CODE): $cmd"
              yq e ".results.command_$COMMAND_INDEX = {status: \"failed\", command: \"$cmd\", exit_code: $EXIT_CODE}" -i "$REPORT_FILE"
              yq e '.status = "failed"' -i "$REPORT_FILE"
              exit $EXIT_CODE
            fi
            
            COMMAND_INDEX=$((COMMAND_INDEX + 1))
          done < /tmp/commands.txt
          
          # Mark as success
          yq e '.status = "success"' -i "$REPORT_FILE"
          yq e ".completed_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" -i "$REPORT_FILE"
          
      - name: Collect artifacts
        run: |
          REPORT_FILE=".ai/reports/${{ steps.parse.outputs.request_id }}-result.yaml"
          
          # Collect k8s logs
          if kubectl get pods -n predator-dev &>/dev/null; then
            kubectl logs -n predator-dev --all-containers=true --since=1h > /tmp/k8s-logs.txt
            yq e '.artifacts.k8s_logs = "/tmp/k8s-logs.txt"' -i "$REPORT_FILE"
          fi
          
          # Collect cluster status
          kubectl get pods --all-namespaces -o wide > /tmp/cluster-status.txt
          yq e '.artifacts.cluster_status = "/tmp/cluster-status.txt"' -i "$REPORT_FILE"
          
          # Add URLs for local services
          yq e '.artifacts.frontend_url = "http://localhost:3000"' -i "$REPORT_FILE"
          yq e '.artifacts.backend_url = "http://localhost:8000"' -i "$REPORT_FILE"
          yq e '.artifacts.argocd_url = "http://localhost:8080"' -i "$REPORT_FILE"
          
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: ai-report-${{ steps.parse.outputs.request_id }}
          path: |
            .ai/reports/${{ steps.parse.outputs.request_id }}-result.yaml
            /tmp/k8s-logs.txt
            /tmp/cluster-status.txt
          retention-days: 30
          
      - name: Commit report
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .ai/reports/
          git commit -m "AI: Add execution report for ${{ steps.parse.outputs.request_id }}" || true
          git push

  notify-completion:
    needs: [find-requests, execute-requests]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Notify AI Studio
        run: |
          # This would trigger ci-ai-feedback.yml workflow
          echo "Triggering AI feedback workflow..."
          curl -X POST \
            -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/${{ github.repository }}/dispatches \
            -d '{"event_type":"ai-report-ready","client_payload":{"run_id":"${{ github.run_id }}"}}'
```

### 4. Helm Validation
```yaml
# .github/workflows/ci-helm-validate.yml
name: CI Helm Validation
on:
  push:
    branches: [develop, main]
    paths:
      - 'infra/helm/**'
  pull_request:
    branches: [develop, main]
    paths:
      - 'infra/helm/**'
  workflow_dispatch:

jobs:
  helm-lint:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        chart: [platform, backend, frontend, agents, monitoring]
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.13.0'
          
      - name: Add Helm repos
        run: |
          helm repo add bitnami https://charts.bitnami.com/bitnami
          helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
          helm repo update
          
      - name: Helm lint
        run: |
          cd infra/helm/${{ matrix.chart }}
          helm lint .
          
      - name: Helm template (dev)
        run: |
          cd infra/helm/${{ matrix.chart }}
          helm template ${{ matrix.chart }}-dev . \
            --values values-dev.yaml \
            --values values-override.yaml \
            --namespace predator-dev \
            --dry-run
          
      - name: Helm template (lab)
        run: |
          cd infra/helm/${{ matrix.chart }}
          helm template ${{ matrix.chart }}-lab . \
            --values values-lab.yaml \
            --values values-gpu.yaml \
            --namespace predator-lab \
            --dry-run
          
      - name: Helm template (prod)
        run: |
          cd infra/helm/${{ matrix.chart }}
          helm template ${{ matrix.chart }}-prod . \
            --values values-prod.yaml \
            --values values-oracle.yaml \
            --namespace predator-prod \
            --dry-run

  kubeconform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.13.0'
          
      - name: Install kubeconform
        run: |
          wget https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
          tar xzf kubeconform-linux-amd64.tar.gz
          sudo mv kubeconform /usr/local/bin/
          
      - name: Validate manifests
        run: |
          for chart in platform backend frontend agents monitoring; do
            echo "🔍 Validating $chart chart..."
            cd infra/helm/$chart
            
            # Dev environment
            helm template $chart-dev . --values values-dev.yaml | \
              kubeconform -strict -summary -kubernetes-version 1.28
              
            # Lab environment  
            helm template $chart-lab . --values values-lab.yaml | \
              kubeconform -strict -summary -kubernetes-version 1.28
              
            # Prod environment
            helm template $chart-prod . --values values-prod.yaml | \
              kubeconform -strict -summary -kubernetes-version 1.28
              
            cd - > /dev/null
          done

  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.13.0'
          
      - name: Install conftest
        run: |
          wget https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz
          tar xzf conftest_Linux_x86_64.tar.gz
          sudo mv conftest /usr/local/bin/
          
      - name: Run policy tests
        run: |
          # Test policies against generated manifests
          for chart in platform backend frontend agents; do
            echo "🔍 Testing policies for $chart..."
            cd infra/helm/$chart
            
            helm template $chart . --values values-prod.yaml | \
              conftest test -p ../../policy -
              
            cd - > /dev/null
          done
```

### 5. Image Tag Update
```yaml
# .github/workflows/cd-image-tag-update.yml
name: CD Image Tag Update
on:
  workflow_run:
    workflows: ["CI Build and Security Scan"]
    types:
      - completed
    branches: [develop, main]
  workflow_dispatch:

jobs:
  update-image-tags:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Get workflow run info
        id: workflow
        run: |
          if [[ "${{ github.event_name }}" == "workflow_run" ]]; then
            SHA="${{ github.event.workflow_run.head_sha }}"
            BRANCH="${{ github.event.workflow_run.head_branch }}"
          else
            SHA="${{ github.sha }}"
            BRANCH="${{ github.ref_name }}"
          fi
          
          echo "sha=$SHA" >> $GITHUB_OUTPUT
          echo "branch=$BRANCH" >> $GITHUB_OUTPUT
          
      - name: Update Helm values
        run: |
          SHA="${{ steps.workflow.outputs.sha }}"
          BRANCH="${{ steps.workflow.outputs.branch }}"
          
          # Determine target values files based on branch
          if [[ "$BRANCH" == "develop" ]]; then
            VALUES_FILES=(
              "infra/helm/platform/values-lab.yaml"
              "infra/helm/backend/values-lab.yaml"
              "infra/helm/frontend/values-lab.yaml"
              "infra/helm/agents/values-lab.yaml"
            )
          elif [[ "$BRANCH" == "main" ]]; then
            VALUES_FILES=(
              "infra/helm/platform/values-prod.yaml"
              "infra/helm/backend/values-prod.yaml"
              "infra/helm/frontend/values-prod.yaml"
              "infra/helm/agents/values-prod.yaml"
            )
          else
            echo "❌ Not updating image tags for branch: $BRANCH"
            exit 0
          fi
          
          # Update each values file
          for VALUES_FILE in "${VALUES_FILES[@]}"; do
            echo "🔄 Updating $VALUES_FILE..."
            
            if [[ -f "$VALUES_FILE" ]]; then
              # Update image tags for all components
              yq e ".global.imageTag = \"$SHA\"" -i "$VALUES_FILE"
              yq e ".backend.image.tag = \"$SHA\"" -i "$VALUES_FILE"
              yq e ".frontend.image.tag = \"$SHA\"" -i "$VALUES_FILE"
              yq e ".agents.image.tag = \"$SHA\"" -i "$VALUES_FILE"
            else
              echo "⚠️ Values file not found: $VALUES_FILE"
            fi
          done
          
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "ops: Update image tags for ${{ steps.workflow.outputs.sha }}"
          title: "ops: Update image tags for ${{ steps.workflow.outputs.sha }}"
          body: |
            ## Image Tag Update
            
            This PR automatically updates Helm chart image tags after successful build.
            
            **Build SHA:** `${{ steps.workflow.outputs.sha }}`
            **Target Branch:** `${{ steps.workflow.outputs.branch }}`
            
            ### Changes
            - Updated image tags in Helm values files
            - Tags set to build SHA for reproducible deployments
            
            ### Next Steps
            1. Review the changes
            2. Merge to trigger ArgoCD deployment
            3. Monitor deployment status in ArgoCD
            
            ---
            🤖 *Generated by GitHub Actions*
          branch: ops/update-images-${{ steps.workflow.outputs.sha }}
          delete-branch: true
          labels: |
            ops
            automated
            image-update
```

### 6. AI Feedback
```yaml
# .github/workflows/ci-ai-feedback.yml
name: CI AI Feedback
on:
  repository_dispatch:
    types: [ai-report-ready]
  push:
    paths:
      - '.ai/reports/**/*.yaml'
  workflow_dispatch:

jobs:
  process-ai-feedback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Find new reports
        id: reports
        run: |
          # Find reports created in the last hour
          REPORTS=$(find .ai/reports -name "*.yaml" -newermt "1 hour ago" | jq -R . | jq -s .)
          echo "reports=$REPORTS" >> $GITHUB_OUTPUT
          
      - name: Process each report
        if: steps.reports.outputs.reports != '[]'
        strategy:
          matrix:
            report_file: ${{ fromJson(steps.reports.outputs.reports) }}
        steps:
          - name: Parse report
            id: parse
            run: |
              REPORT_FILE="${{ matrix.report_file }}"
              REQUEST_ID=$(yq e '.metadata.request_id' "$REPORT_FILE")
              STATUS=$(yq e '.status' "$REPORT_FILE")
              TARGET_ENV=$(yq e '.metadata.target_env' "$REPORT_FILE")
              
              echo "request_id=$REQUEST_ID" >> $GITHUB_OUTPUT
              echo "status=$STATUS" >> $GITHUB_OUTPUT
              echo "target_env=$TARGET_ENV" >> $GITHUB_OUTPUT
              
          - name: Generate summary
            id: summary
            run: |
              REPORT_FILE="${{ matrix.report_file }}"
              STATUS="${{ steps.parse.outputs.status }}"
              REQUEST_ID="${{ steps.parse.outputs.request_id }}"
              
              # Generate human-readable summary
              SUMMARY="## AI Request Report: $REQUEST_ID\n\n"
              SUMMARY+="**Status:** $STATUS\n"
              SUMMARY+="**Environment:** ${{ steps.parse.outputs.target_env }}\n"
              SUMMARY+="**Timestamp:** $(yq e '.metadata.executed_at' "$REPORT_FILE")\n\n"
              
              if [[ "$STATUS" == "success" ]]; then
                SUMMARY+="✅ All commands executed successfully\n\n"
                SUMMARY+="### Results\n"
                yq e '.results | to_entries | .[] | "- **" + .key + "**: " + .value.status' "$REPORT_FILE" >> /tmp/results.txt
                SUMMARY+=$(cat /tmp/results.txt)
              else
                SUMMARY+="❌ Some commands failed\n\n"
                SUMMARY+="### Failed Commands\n"
                yq e '.results | to_entries | .[] | select(.value.status == "failed") | "- **" + .key + "**: " + .value.command + " (exit: " + (.value.exit_code | tostring) + ")"' "$REPORT_FILE" >> /tmp/failures.txt
                SUMMARY+=$(cat /tmp/failures.txt)
              fi
              
              echo "summary<<EOF" >> $GITHUB_OUTPUT
              echo -e "$SUMMARY" >> $GITHUB_OUTPUT
              echo "EOF" >> $GITHUB_OUTPUT
              
          - name: Send to AI Studio
            if: steps.parse.outputs.status != ''
            run: |
              # Send webhook to AI Studio
              PAYLOAD=$(cat <<EOF
              {
                "request_id": "${{ steps.parse.outputs.request_id }}",
                "status": "${{ steps.parse.outputs.status }}",
                "environment": "${{ steps.parse.outputs.target_env }}",
                "summary": "${{ steps.summary.outputs.summary }}",
                "artifacts": {
                  "report_url": "https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}",
                  "workflow_url": "https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                }
              }
              EOF
              )
              
              curl -X POST "${{ secrets.AI_STUDIO_WEBHOOK_URL }}" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer ${{ secrets.AI_STUDIO_TOKEN }}" \
                -d "$PAYLOAD"
                
          - name: Notify Slack
            uses: 8398a7/action-slack@v3
            with:
              status: ${{ steps.parse.outputs.status == 'success' && 'success' || 'failure' }}
              channel: '#ai-requests'
              text: |
                AI Request ${{ steps.parse.outputs.request_id }} completed with status: ${{ steps.parse.outputs.status }}
                Environment: ${{ steps.parse.outputs.target_env }}
                Report: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}
            env:
              SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## 🔄 Pipeline Flow Diagrams

### Development Flow
```
feature/* or ai/* branch push
         │
         ▼
┌─────────────────┐
│   ci-basic.yml  │ ← Lint + Unit Tests (2-3 min)
│   ci-build.yml  │ ← Docker Build + Security (3-5 min)
│ ci-ai-runner    │ ← Execute AI requests (if present, 5-15 min)
│ ci-helm.yml     │ ← Helm validation (1-2 min)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ PR to develop  │ ← Manual review + merge
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ cd-update.yml   │ ← Update image tags in Helm values
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ ArgoCD-lab      │ ← Auto-sync to lab-gpu cluster
└─────────────────┘
```

### Production Flow
```
develop → main PR
         │
         ▼
┌─────────────────┐
│   ci-basic.yml  │ ← Full CI pipeline
│   ci-build.yml  │ ← Build + security scan
│ ci-helm.yml     │ ← Helm validation
│ cd-update.yml   │ ← Update prod image tags
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Merge to main │ ← Manual approval required
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ ArgoCD-prod     │ ← Manual sync with canary rollout
│                 │ ← 10% → 30% → 100% promotion
└─────────────────┘
```

## 📊 Performance Metrics

### CI/CD Pipeline Metrics
```yaml
# SLO targets for CI/CD pipeline
pipeline_slos:
  ci_basic_duration:
    target: "5m"
    warning: "8m"
    critical: "10m"
    
  ci_build_duration:
    target: "8m"
    warning: "12m"
    critical: "15m"
    
  ai_request_duration:
    target: "15m"
    warning: "20m"
    critical: "30m"
    
  pr_merge_to_deploy:
    target: "10m"
    warning: "15m"
    critical: "20m"
    
  prod_canary_duration:
    target: "30m"
    warning: "45m"
    critical: "60m"
```

### Monitoring Dashboard
```yaml
# Grafana dashboard panels
ci_cd_dashboard:
  - title: "CI Pipeline Duration"
    type: "graph"
    query: "github_actions_workflow_duration{workflow!=\"ci-ai-request-runner\"}"
    
  - title: "AI Request Success Rate"
    type: "stat"
    query: "rate(ai_requests_success_total[1h]) / rate(ai_requests_total[1h])"
    
  - title: "Deployment Frequency"
    type: "stat"
    query: "increase(argocd_app_sync_total[1d])"
    
  - title: "Build Success Rate"
    type: "stat"
    query: "rate(github_actions_workflow_success_total[1h]) / rate(github_actions_workflow_total[1h])"
    
  - title: "Security Scan Results"
    type: "table"
    query: "trivy_vulnerability_count{severity=\"CRITICAL\"}"
```

## 🚨 Error Handling & Recovery

### Common Failure Scenarios
```yaml
failure_scenarios:
  lint_failures:
    detection: "ci-basic.yml fails on lint checks"
    action: "Developer fixes code locally"
    recovery: "Push new commit"
    
  build_failures:
    detection: "ci-build-and-scan.yml fails on Docker build"
    action: "Check Dockerfile and dependencies"
    recovery: "Fix Dockerfile, rebuild"
    
  security_vulnerabilities:
    detection: "Trivy finds critical vulnerabilities"
    action: "Update base images or dependencies"
    recovery: "Security patch, rebuild"
    
  ai_request_failures:
    detection: "ci-ai-request-runner.yml fails"
    action: "Check cluster status and request syntax"
    recovery: "Fix request, retry"
    
  helm_validation_failures:
    detection: "ci-helm-validate.yml fails"
    action: "Check Helm chart syntax and values"
    recovery: "Fix chart, validate"
    
  deployment_failures:
    detection: "ArgoCD sync fails"
    action: "Check manifests and cluster state"
    recovery: "Fix manifests, manual sync"
```

### Recovery Procedures
```bash
# Manual recovery commands
make ci-retry              # Retry failed CI jobs
make cluster-health-check  # Comprehensive cluster check
make argocd-hard-refresh   # Force ArgoCD refresh
make rollback-deployment   # Rollback failed deployment
make logs-debug           # Get all relevant logs
```

## 📋 Success Criteria

### CI Pipeline
- ✅ All lint checks pass
- ✅ Unit tests with >80% coverage
- ✅ Security scanning with no critical vulnerabilities
- ✅ Docker images built and signed
- ✅ Helm charts validated
- ✅ AI requests execute successfully

### CD Pipeline
- ✅ Image tags updated automatically
- ✅ ArgoCD deployments succeed
- ✅ Canary rollouts complete successfully
- ✅ Health checks pass
- ✅ Monitoring and alerting active

### Integration
- ✅ AI Studio receives feedback
- ✅ Slack notifications sent
- ✅ Metrics collected in Prometheus
- ✅ Documentation updated automatically
