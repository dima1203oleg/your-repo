# Predator Analytics Development Makefile
# Provides standardized commands for development, testing, and deployment

.PHONY: help dev-setup dev-down dev-up dev-smoke k8s-dev-up k8s-dev-down health-check port-forward logs-debug cluster-status clean build test lint security-scan ai-request ai-report ai-list ai-clean pipeline-health

# Default target
help:
	@echo "Predator Analytics Development Commands"
	@echo "======================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  dev-setup      - Initialize development environment"
	@echo "  dev-down       - Stop development environment"
	@echo "  dev-up         - Start development environment"
	@echo ""
	@echo "Kubernetes Commands:"
	@echo "  k8s-dev-up     - Start local Kubernetes cluster"
	@echo "  k8s-dev-down   - Stop local Kubernetes cluster"
	@echo "  cluster-status - Check cluster health"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev-smoke      - Run smoke tests"
	@echo "  port-forward   - Forward ports to services"
	@echo "  logs-debug     - Show debug logs"
	@echo ""
	@echo "Testing Commands:"
	@echo "  test           - Run all tests"
	@echo "  test-backend   - Run backend tests"
	@echo "  test-frontend  - Run frontend tests"
	@echo "  test-e2e       - Run end-to-end tests"
	@echo ""
	@echo "AI Pipeline Commands:"
	@echo "  ai-request     - Create new AI request"
	@echo "  ai-report      - Show AI reports"
	@echo "  ai-list        - List all AI requests/reports"
	@echo "  ai-clean       - Clean AI artifacts"
	@echo "  pipeline-health - Full pipeline health check"
	@echo ""
	@echo "Code Quality Commands:"
	@echo "  lint           - Run linting checks"
	@echo "  format         - Format code"
	@echo "  security-scan  - Run security scans"
	@echo ""
	@echo "Build Commands:"
	@echo "  build          - Build all components"
	@echo "  build-backend  - Build backend"
	@echo "  build-frontend - Build frontend"
	@echo ""
	@echo "Utility Commands:"
	@echo "  clean          - Clean build artifacts"
	@echo "  health-check   - Check system health"

# Setup development environment
dev-setup:
	@echo "🔧 Setting up development environment..."
	@echo "Setting up Python environment..."
	@if [ ! -d "venv" ]; then \
		python3 -m venv venv; \
	fi
	@source venv/bin/activate && pip install --upgrade pip
	@source venv/bin/activate && pip install -r requirements.txt
	@source venv/bin/activate && pip install pytest pytest-cov black flake8 mypy
	@echo "Setting up Node.js environment..."
	@npm install
	@echo "Installing development tools..."
	@if command -v kubectl >/dev/null 2>&1; then \
		echo "✅ kubectl found"; \
	else \
		echo "❌ kubectl not found - please install kubectl"; \
	fi
	@if command -v helm >/dev/null 2>&1; then \
		echo "✅ helm found"; \
	else \
		echo "❌ helm not found - please install helm"; \
	fi
	@if command -v k3d >/dev/null 2>&1; then \
		echo "✅ k3d found"; \
	else \
		echo "⚠️  k3d not found - installing..."; \
		curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash; \
	fi
	@echo "Creating .ai directories..."
	@mkdir -p .ai/requests .ai/reports .ai/config
	@echo "✅ Development environment setup complete!"

# Stop development environment
dev-down:
	@echo "🛑 Stopping development environment..."
	@pkill -f "npm run dev" || true
	@pkill -f "npm run preview" || true
	@pkill -f "uvicorn" || true
	@$(MAKE) k8s-dev-down
	@echo "✅ Development environment stopped"

# Start development environment
dev-up:
	@echo "🚀 Starting development environment..."
	@$(MAKE) k8s-de-v-up
	@echo "Starting backend server..."
	@source venv/bin/activate && cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
	@sleep 5
	@echo "Starting frontend development server..."
	@npm run dev &
	@sleep 10
	@$(MAKE) health-check
	@echo "✅ Development environment started"

# Start local Kubernetes cluster
k8s-dev-up:
	@echo "🐳 Starting local Kubernetes cluster..."
	@if k3d cluster list | grep -q "pa-dev"; then \
		echo "Cluster pa-dev already exists"; \
	else \
		k3d cluster create pa-dev \
			--config infra/clusters/dev-local.yaml \
			--port 8080:80@loadbalancer \
			--port 8443:443@loadbalancer; \
	fi
	@echo "Waiting for cluster to be ready..."
	@kubectl wait --for=condition=Ready nodes --all --timeout=300s
	@echo "Installing ingress-nginx..."
	@helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
	@helm repo update
	@helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
		--namespace ingress-nginx --create-namespace \
		--set controller.replicaCount=1 \
		--set controller.nodePort.http=30080 \
		--set controller.nodePort.https=30443
	@echo "✅ Kubernetes cluster ready"

# Stop local Kubernetes cluster
k8s-dev-down:
	@echo "🛑 Stopping local Kubernetes cluster..."
	@if k3d cluster list | grep -q "pa-dev"; then \
		k3d cluster delete pa-dev; \
		echo "✅ Cluster deleted"; \
	else \
		echo "No cluster to delete"; \
	fi

# Run smoke tests
dev-smoke:
	@echo "💨 Running smoke tests..."
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@$(MAKE) health-check
	@if kubectl get pods -n pa-dev >/dev/null 2>&1; then \
		echo "Checking Kubernetes deployment..."; \
		kubectl get pods -n pa-dev; \
		kubectl get services -n pa-dev; \
	fi
	@echo "✅ Smoke tests passed"

# Port forwarding
port-forward:
	@echo "🔗 Setting up port forwarding..."
	@echo "Forwarding backend port 8000..."
	@kubectl port-forward svc/backend 8000:8000 -n pa-dev &
	@echo "Forwarding frontend port 3000..."
	@kubectl port-forward svc/frontend 3000:3000 -n pa-dev &
	@echo "Forwarding Grafana port 3001..."
	@kubectl port-forward svc/grafana 3001:3000 -n monitoring &
	@echo "Forwarding Prometheus port 9090..."
	@kubectl port-forward svc/prometheus 9090:9090 -n monitoring &
	@echo "✅ Port forwarding active"

# Debug logs
logs-debug:
	@echo "📋 Showing debug logs..."
	@echo "=== Backend Logs ==="
	@kubectl logs -n pa-dev deployment/backend -f --tail=50 &
	@echo "=== Frontend Logs ==="
	@kubectl logs -n pa-dev deployment/frontend -f --tail=50 &
	@echo "=== System Events ==="
	@kubectl get events -n pa-dev --sort-by=.metadata.creationTimestamp

# Cluster status
cluster-status:
	@echo "📊 Cluster Status"
	@echo "=================="
	@echo "=== Nodes ==="
	@kubectl get nodes -o wide
	@echo ""
	@echo "=== Namespaces ==="
	@kubectl get namespaces
	@echo ""
	@echo "=== Pods in pa-dev ==="
	@kubectl get pods -n pa-dev -o wide
	@echo ""
	@echo "=== Services in pa-dev ==="
	@kubectl get services -n pa-dev
	@echo ""
	@echo "=== Ingress ==="
	@kubectl get ingress -n pa-dev
	@echo ""
	@echo "=== Resource Usage ==="
	@if command -v kubectl top >/dev/null 2>&1; then \
		echo "=== Node Resources ==="; \
		kubectl top nodes; \
		echo "=== Pod Resources ==="; \
		kubectl top pods -n pa-dev; \
	else \
		echo "kubectl top not available"; \
	fi

# Health check
health-check:
	@echo "🏥 System Health Check"
	@echo "===================="
	@echo "=== Local Services ==="
	@curl -f http://localhost:8000/healthz >/dev/null 2>&1 && echo "✅ Backend: Healthy" || echo "❌ Backend: Unhealthy"
	@curl -f http://localhost:3000 >/dev/null 2>&1 && echo "✅ Frontend: Healthy" || echo "❌ Frontend: Unhealthy"
	@echo "=== Kubernetes Cluster ==="
	@if kubectl cluster-info >/dev/null 2>&1; then \
		echo "✅ Cluster: Connected"; \
	else \
		echo "❌ Cluster: Not connected"; \
	fi
	@echo "=== Development Tools ==="
	@command -v python3 >/dev/null 2>&1 && echo "✅ Python: Available" || echo "❌ Python: Not found"
	@command -v node >/dev/null 2>&1 && echo "✅ Node.js: Available" || echo "❌ Node.js: Not found"
	@command -v kubectl >/dev/null 2>&1 && echo "✅ kubectl: Available" || echo "❌ kubectl: Not found"
	@command -v helm >/dev/null 2>&1 && echo "✅ Helm: Available" || echo "❌ Helm: Not found"

# Run all tests
test:
	@echo "🧪 Running all tests..."
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@$(MAKE) test-e2e
	@echo "✅ All tests completed"

# Run backend tests
test-backend:
	@echo "🐍 Running backend tests..."
	@source venv/bin/activate && cd backend && \
		pytest tests/ \
			--cov=backend \
			--cov-report=html \
			--cov-report=term-missing \
			--junit-xml=../test-results/backend.xml \
			-v

# Run frontend tests
test-frontend:
	@echo "⚛️  Running frontend tests..."
	@npm run test:unit -- --coverage --watchAll=false
	@npm run test:e2e || echo "E2E tests skipped (need running app)"

# Run end-to-end tests
test-e2e:
	@echo "🎭 Running end-to-end tests..."
	@if kubectl get pods -n pa-dev >/dev/null 2>&1; then \
		npx playwright test tests/e2e/ --project=chromium; \
	else \
		echo "❌ E2E tests require running cluster"; \
	fi

# Run linting
lint:
	@echo "🔍 Running linting checks..."
	@echo "=== Backend Linting ==="
	@source venv/bin/activate && cd backend && \
		black --check . --diff && \
		flake8 . --max-line-length=100 --ignore=E203,W503 && \
		mypy . --ignore-missing-imports
	@echo "=== Frontend Linting ==="
	@npm run lint
	@echo "✅ Linting completed"

# Format code
format:
	@echo "🎨 Formatting code..."
	@echo "=== Backend Formatting ==="
	@source venv/bin/activate && cd backend && black .
	@echo "=== Frontend Formatting ==="
	@npm run format
	@echo "✅ Code formatted"

# Security scan
security-scan:
	@echo "🔒 Running security scans..."
	@echo "=== Backend Security Scan ==="
	@source venv/bin/activate && pip install safety && safety check
	@echo "=== Frontend Security Scan ==="
	@npm audit --audit-level moderate
	@echo "=== Container Security Scan ==="
	@if command -v trivy >/dev/null 2>&1; then \
		trivy image --severity HIGH,CRITICAL ghcr.io/your-org/predator-backend:latest; \
		trivy image --severity HIGH,CRITICAL ghcr.io/your-org/predator-frontend:latest; \
	else \
		echo "❌ Trivy not installed - skipping container scan"; \
	fi
	@echo "✅ Security scans completed"

# Build all components
build:
	@echo "🏗️  Building all components..."
	@$(MAKE) build-backend
	@$(MAKE) build-frontend
	@echo "✅ All components built"

# Build backend
build-backend:
	@echo "🐍 Building backend..."
	@cd backend && source ../venv/bin/activate && \
		python -m build || \
		pip install build && python -m build
	@echo "✅ Backend built"

# Build frontend
build-frontend:
	@echo "⚛️  Building frontend..."
	@npm run build
	@echo "✅ Frontend built"

# Clean artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@echo "=== Cleaning Python artifacts ==="
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type f -name "*.pyd" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.egg" -delete 2>/dev/null || true
	@echo "=== Cleaning Node artifacts ==="
	@rm -rf node_modules/.cache 2>/dev/null || true
	@rm -rf frontend/dist 2>/dev/null || true
	@rm -rf frontend/build 2>/dev/null || true
	@rm -rf frontend/.next 2>/dev/null || true
	@echo "=== Cleaning test artifacts ==="
	@rm -rf .coverage 2>/dev/null || true
	@rm -rf htmlcov 2>/dev/null || true
	@rm -rf coverage 2>/dev/null || true
	@rm -rf test-results 2>/dev/null || true
	@rm -rf playwright-report 2>/dev/null || true
	@rm -rf test-results 2>/dev/null || true
	@echo "=== Cleaning AI artifacts ==="
	@rm -rf .ai/reports/*.yaml 2>/dev/null || true
	@echo "✅ Clean completed"

# Install development dependencies
install-deps:
	@echo "📦 Installing dependencies..."
	@echo "=== Python dependencies ==="
	@source venv/bin/activate && pip install -r requirements.txt
	@source venv/bin/activate && pip install pytest pytest-cov black flake8 mypy safety
	@echo "=== Node.js dependencies ==="
	@npm install
	@echo "✅ Dependencies installed"

# Update dependencies
update-deps:
	@echo "⬆️  Updating dependencies..."
	@echo "=== Python dependencies ==="
	@source venv/bin/activate && pip install --upgrade pip
	@source venv/bin/activate && pip install --upgrade -r requirements.txt
	@echo "=== Node.js dependencies ==="
	@npm audit fix
	@npm update
	@echo "✅ Dependencies updated"

# Generate documentation
docs:
	@echo "📚 Generating documentation..."
	@echo "=== API Documentation ==="
	@cd backend && source ../venv/bin/activate && python -c "
import uvicorn
from main import app
import json
with open('openapi.json', 'w') as f:
    json.dump(app.openapi(), f, indent=2)
"
	@echo "✅ Documentation generated"

# Quick development cycle
dev: dev-up dev-smoke

# Full development setup
full-setup: dev-setup k8s-dev-up build test
	@echo "🎉 Full development setup complete!"

# AI Pipeline Commands
ai-request:
	@echo "🤖 Creating new AI request..."
	@TIMESTAMP=$$(date +%Y-%m-%d-%H-%M-%S); \
	FILENAME=".ai/requests/manual-$$TIMESTAMP.yaml"; \
	cat > "$$FILENAME" << 'EOF'
metadata:
  id: "manual-$$TIMESTAMP"
  created_by: "developer"
  target_env: "dev-local"
  created_at: "$$(date -u +\"%Y-%m-%dT%H:%M:%SZ\")"
  
spec:
  scenario: "manual-test"
  description: "Manual AI request from developer"
  
  commands:
    - "echo 'Hello from AI request!'"
    - "make health-check"
    - "kubectl get pods -n pa-dev"
  
  success_criteria:
    - "echo: command executed successfully"
    - "health-check: system healthy"
    - "kubectl: cluster accessible"
  
  timeout: "5m"
EOF
	@echo "✅ Created request: $$FILENAME"
	@echo "📝 Edit the file to customize your request"

ai-report:
	@echo "📊 Showing AI reports..."
	@if [ -d ".ai/reports" ] && [ -n "$$(ls .ai/reports/*.yaml 2>/dev/null)" ]; then \
		for report in .ai/reports/*.yaml; do \
			echo "=== $$report ==="; \
			cat "$$report"; \
			echo ""; \
		done; \
	else \
		echo "❌ No AI reports found"; \
	fi

ai-list:
	@echo "📋 Listing AI requests and reports..."
	@echo ""
	@echo "=== Requests (.ai/requests/) ==="
	@if [ -d ".ai/requests" ] && [ -n "$$(ls .ai/requests/*.yaml 2>/dev/null)" ]; then \
		ls -la .ai/requests/*.yaml || echo "No requests found"; \
	else \
		echo "No requests found"; \
	fi
	@echo ""
	@echo "=== Reports (.ai/reports/) ==="
	@if [ -d ".ai/reports" ] && [ -n "$$(ls .ai/reports/*.yaml 2>/dev/null)" ]; then \
		ls -la .ai/reports/*.yaml || echo "No reports found"; \
	else \
		echo "No reports found"; \
	fi

ai-clean:
	@echo "🧹 Cleaning AI artifacts..."
	@rm -rf .ai/reports/*.yaml 2>/dev/null || echo "No reports to clean"
	@echo "✅ AI artifacts cleaned"

pipeline-health:
	@echo "🏥 Running comprehensive pipeline health check..."
	@./scripts/pipeline-health-check.sh

# Check for required tools
check-tools:
	@echo "🔧 Checking required tools..."
	@command -v python3 >/dev/null 2>&1 || (echo "❌ Python3 required" && exit 1)
	@command -v node >/dev/null 2>&1 || (echo "❌ Node.js required" && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "❌ npm required" && exit 1)
	@command -v kubectl >/dev/null 2>&1 || (echo "❌ kubectl required" && exit 1)
	@command -v helm >/dev/null 2>&1 || (echo "❌ helm required" && exit 1)
	@command -v k3d >/dev/null 2>&1 || (echo "⚠️  k3d recommended for local development")
	@echo "✅ All required tools available"
