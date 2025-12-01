#!/bin/bash

# Predator Analytics DevContainer Post-Create Script
echo "🚀 Setting up Predator Analytics development environment..."

# Create Python virtual environment
if [ ! -d "/workspace/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv /workspace/venv
fi

# Activate virtual environment
source /workspace/venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install pytest pytest-cov black flake8 mypy safety

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .ai directories
echo "Creating .ai directories..."
mkdir -p .ai/requests .ai/reports .ai/config

# Set up kubectl and helm
echo "Setting up Kubernetes tools..."
kubectl version --client
helm version

# Install k3d if not present
if ! command -v k3d &> /dev/null; then
    echo "Installing k3d..."
    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
fi

# Set up Git hooks
echo "Setting up Git hooks..."
if [ -f ".git/hooks/pre-commit" ]; then
    echo "Pre-commit hook already exists"
else
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Python linting and formatting
source venv/bin/activate
black --check backend/ agents/ || { echo "Run 'make format' to fix formatting"; exit 1; }
flake8 backend/ agents/ || exit 1
mypy backend/ agents/ || exit 1

# Frontend linting
npm run lint || exit 1

echo "✅ Pre-commit checks passed"
EOF
    chmod +x .git/hooks/pre-commit
fi

# Create development aliases
echo "Creating development aliases..."
cat >> ~/.bashrc << 'EOF'

# Predator Analytics aliases
alias pa-dev-up='make k8s-dev-up'
alias pa-dev-down='make k8s-dev-down'
alias pa-smoke='make dev-smoke'
alias pa-test='make test'
alias pa-lint='make lint'
alias pa-format='make format'
alias pa-logs='make logs-debug'

# Kubernetes aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kga='kubectl get all'
alias kd='kubectl describe'
alias kl='kubectl logs'
EOF

# Set up environment variables
echo "Setting up environment variables..."
cat > .env << 'EOF'
# Development environment variables
DATABASE_URL=postgresql://predator:predator123@localhost:5432/predator_analytics
REDIS_URL=redis://:redis123@localhost:6379/0
LOG_LEVEL=DEBUG
ENVIRONMENT=development
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
EOF

# Create sample AI request
echo "Creating sample AI request..."
cat > .ai/requests/sample-smoke.yaml << 'EOF'
metadata:
  id: "sample-smoke-$(date +%Y-%m-%d)"
  created_by: "devcontainer"
  target_env: "dev-local"
  created_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  
spec:
  scenario: "smoke-test"
  description: "Sample smoke test from devcontainer"
  
  commands:
    - "echo 'Hello from devcontainer!'"
    - "python --version"
    - "node --version"
    - "kubectl version --client"
    - "helm version"
  
  success_criteria:
    - "echo: command executed successfully"
    - "python: version available"
    - "node: version available"
    - "kubectl: client available"
    - "helm: version available"
  
  timeout: "5m"
EOF

echo "✅ DevContainer setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  make dev-setup    - Full development setup"
echo "  make k8s-dev-up   - Start local cluster"
echo "  make dev-smoke    - Run smoke tests"
echo "  make test         - Run all tests"
echo "  make help         - Show all commands"
echo ""
echo "📚 Documentation:"
echo "  - COPILOT_INSTRUCTIONS.md - Developer guide"
echo "  - AI_STUDIO_PIPELINE.md - AI integration guide"
echo "  - docs/devops/ - Full DevOps documentation"
echo ""
echo "🚀 Happy coding!"
