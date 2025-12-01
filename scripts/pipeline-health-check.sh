#!/bin/bash

# Predator Analytics Pipeline Health Check
# Перевіряє стан всього DevOps & AI-Dev пайплайну

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Check if required tools are installed
check_tools() {
    print_status "INFO" "Перевірка необхідних інструментів..."
    
    local tools=("git" "kubectl" "helm" "docker" "make" "python3" "node" "npm")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            print_status "OK" "$tool встановлено"
        else
            print_status "ERROR" "$tool не знайдено"
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        print_status "OK" "Всі необхідні інструменти встановлено"
        return 0
    else
        print_status "ERROR" "Відсутні інструменти: ${missing_tools[*]}"
        return 1
    fi
}

# Check Git repository status
check_git_status() {
    print_status "INFO" "Перевірка Git репозиторію..."
    
    if [ ! -d ".git" ]; then
        print_status "ERROR" "Це не Git репозиторій"
        return 1
    fi
    
    # Check if we have uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_status "WARN" "Є незакомічені зміни"
        git status --short
    else
        print_status "OK" "Немає незакомічених змін"
    fi
    
    # Check if we're on the right branch
    local current_branch=$(git branch --show-current)
    print_status "INFO" "Поточна гілка: $current_branch"
    
    # Check if remote is configured
    if git remote get-url origin >/dev/null 2>&1; then
        print_status "OK" "Git remote налаштовано"
    else
        print_status "WARN" "Git remote не налаштовано"
    fi
}

# Check Kubernetes cluster
check_k8s_cluster() {
    print_status "INFO" "Перевірка Kubernetes кластера..."
    
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_status "ERROR" "Не вдалося підключитися до кластера"
        return 1
    fi
    
    print_status "OK" "Підключено до кластера"
    
    # Check cluster nodes
    local node_count=$(kubectl get nodes --no-headers | wc -l)
    print_status "INFO" "Кількість нод: $node_count"
    
    # Check if nodes are ready
    local ready_nodes=$(kubectl get nodes --no-headers | grep " Ready" | wc -l)
    if [ "$ready_nodes" -eq "$node_count" ]; then
        print_status "OK" "Всі ноди готові"
    else
        print_status "WARN" "Деякі ноди не готові: $ready_nodes/$node_count"
    fi
    
    # Check namespaces
    local namespaces=("pa-dev" "pa-lab" "pa-prod" "argocd" "monitoring")
    for ns in "${namespaces[@]}"; do
        if kubectl get namespace "$ns" >/dev/null 2>&1; then
            print_status "OK" "Namespace $ns існує"
        else
            print_status "WARN" "Namespace $ns не знайдено"
        fi
    done
}

# Check ArgoCD
check_argocd() {
    print_status "INFO" "Перевірка ArgoCD..."
    
    # Check ArgoCD namespace
    if ! kubectl get namespace argocd >/dev/null 2>&1; then
        print_status "WARN" "ArgoCD namespace не знайдено"
        return 1
    fi
    
    # Check ArgoCD server
    if kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server >/dev/null 2>&1; then
        local argocd_pods=$(kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server --no-headers | grep "Running" | wc -l)
        if [ "$argocd_pods" -gt 0 ]; then
            print_status "OK" "ArgoCD server працює ($argocd_pods pods)"
        else
            print_status "ERROR" "ArgoCD server не працює"
        fi
    else
        print_status "WARN" "ArgoCD server не знайдено"
    fi
    
    # Check ArgoCD applications
    if command -v argocd >/dev/null 2>&1; then
        local app_count=$(argocd app list --no-headers 2>/dev/null | wc -l || echo "0")
        print_status "INFO" "Кількість ArgoCD додатків: $app_count"
    else
        print_status "WARN" "ArgoCD CLI не встановлено"
    fi
}

# Check AI pipeline directories
check_ai_pipeline() {
    print_status "INFO" "Перевірка AI pipeline..."
    
    local ai_dirs=(".ai/requests" ".ai/reports" ".ai/config")
    for dir in "${ai_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local file_count=$(find "$dir" -name "*.yaml" | wc -l)
            print_status "OK" "$dir існує ($file_count файлів)"
        else
            print_status "ERROR" "$dir не знайдено"
        fi
    done
    
    # Check AI configuration
    if [ -f ".ai/config/schema.yaml" ]; then
        print_status "OK" "AI schema конфігурація існує"
    else
        print_status "WARN" "AI schema конфігурація не знайдена"
    fi
    
    if [ -f ".ai/config/ai-studio-settings.yaml" ]; then
        print_status "OK" "AI Studio конфігурація існує"
    else
        print_status "WARN" "AI Studio конфігурація не знайдена"
    fi
}

# Check Docker and images
check_docker() {
    print_status "INFO" "Перевірка Docker..."
    
    if ! docker info >/dev/null 2>&1; then
        print_status "ERROR" "Docker не працює"
        return 1
    fi
    
    print_status "OK" "Docker працює"
    
    # Check if we can pull images
    local images=("ghcr.io/your-org/predator-backend:latest" "ghcr.io/your-org/predator-frontend:latest")
    for image in "${images[@]}"; do
        if docker pull "$image" >/dev/null 2>&1; then
            print_status "OK" "Image $image доступний"
        else
            print_status "WARN" "Image $image не доступний"
        fi
    done
}

# Check development environment
check_dev_env() {
    print_status "INFO" "Перевірка середовища розробки..."
    
    # Check Python virtual environment
    if [ -d "venv" ]; then
        print_status "OK" "Python virtual environment існує"
    else
        print_status "WARN" "Python virtual environment не знайдено"
    fi
    
    # Check Node modules
    if [ -d "node_modules" ]; then
        print_status "OK" "Node modules існують"
    else
        print_status "WARN" "Node modules не знайдено"
    fi
    
    # Check Makefile
    if [ -f "Makefile" ]; then
        print_status "OK" "Makefile існує"
        # Test some make commands
        if make help >/dev/null 2>&1; then
            print_status "OK" "Makefile працює"
        else
            print_status "ERROR" "Makefile має помилки"
        fi
    else
        print_status "ERROR" "Makefile не знайдено"
    fi
}

# Check GitHub workflows
check_workflows() {
    print_status "INFO" "Перевірка GitHub workflows..."
    
    local workflows=(".github/workflows/ci-basic.yml" ".github/workflows/ci-build-and-scan.yml" ".github/workflows/ci-ai-request-runner.yml")
    for workflow in "${workflows[@]}"; do
        if [ -f "$workflow" ]; then
            print_status "OK" "$workflow існує"
        else
            print_status "ERROR" "$workflow не знайдено"
        fi
    done
}

# Main health check
main() {
    print_status "INFO" "🏥 Predator Analytics Pipeline Health Check"
    print_status "INFO" "=========================================="
    echo ""
    
    local exit_code=0
    
    # Run all checks
    check_tools || exit_code=1
    echo ""
    
    check_git_status || exit_code=1
    echo ""
    
    check_k8s_cluster || exit_code=1
    echo ""
    
    check_argocd || exit_code=1
    echo ""
    
    check_ai_pipeline || exit_code=1
    echo ""
    
    check_docker || exit_code=1
    echo ""
    
    check_dev_env || exit_code=1
    echo ""
    
    check_workflows || exit_code=1
    echo ""
    
    # Summary
    if [ $exit_code -eq 0 ]; then
        print_status "OK" "🎉 Всі перевірки пройдено успішно!"
    else
        print_status "ERROR" "❌ Знайдено проблеми, які потребують уваги"
    fi
    
    echo ""
    print_status "INFO" "Для детальної діагностики використовуйте:"
    print_status "INFO" "  make cluster-status - статус кластера"
    print_status "INFO" "  make health-check - перевірка сервісів"
    print_status "INFO" "  make ai-list - список AI запитів"
    
    exit $exit_code
}

# Run main function
main "$@"
