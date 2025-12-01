# AI Studio Integration Pipeline

## 🎯 Overview

This document describes the complete integration between Gemini AI Studio and the Predator Analytics DevOps pipeline, enabling AI agents to participate fully in the software development lifecycle while maintaining security, governance, and reliability.

## 🔄 AI Studio Workflow

### Connection Setup
```yaml
# AI Studio Configuration
ai_studio_integration:
  github_connection:
    repository: "your-org/Predator-Analytics"
    access_token: "${GITHUB_AI_STUDIO_TOKEN}"
    permissions: ["repo", "pull_request", "workflow"]
    default_branch: "develop"
    
  branch_strategy:
    pattern: "ai/<short-desc>-<date>"
    example: "ai/live-metrics-smoke-2025-12-01"
    auto_merge: false  # Always requires human review
    
  execution_limits:
    max_concurrent_requests: 3
    timeout_per_request: "30m"
    allowed_target_envs: ["dev-local"]
```

### AI Agent Instructions
```python
# AI Studio System Prompt
"""
You are an AI development agent working on the Predator Analytics project.

## Your Capabilities:
1. Read and analyze the entire codebase
2. Create and modify files
3. Execute Git operations (branch, commit, push)
4. Create Pull Requests
5. Generate .ai/requests for real testing
6. Analyze test results and create fixes

## Your Workflow:
1. ALWAYS create a branch with pattern: ai/<feature>-<date>
2. Make necessary code changes
3. Create .ai/requests/*.yaml for testing
4. Commit and push changes
5. Open Pull Request to develop branch
6. Wait for CI/CD results
7. If tests fail, analyze results and create fixes
8. Repeat until all tests pass
9. Request human review for merge

## Critical Rules:
- NEVER simulate test results - always use real execution
- ALWAYS create .ai/requests for any testing needs
- NEVER merge without human approval
- ALWAYS analyze failures and provide fixes
- ALWAYS follow security and coding standards

## Testing Strategy:
- Create smoke tests for new features
- Include integration tests for API changes
- Add E2E tests for UI changes
- Validate performance for critical paths
- Test security implications

## Code Quality:
- Follow existing code patterns
- Add appropriate error handling
- Include logging and monitoring
- Update documentation
- Consider backwards compatibility
"""
```

## 📋 .ai/requests Structure

### Request Schema
```yaml
# .ai/requests/schema.yaml
metadata:
  id: string                    # Unique identifier
  created_by: string            # "gemini-studio" or "human-developer"
  target_env: string            # Currently only "dev-local"
  created_at: timestamp         # ISO 8601 format
  
spec:
  scenario: string              # "smoke-test", "integration-test", "performance-test"
  commands: array               # List of commands to execute
  success_criteria: array       # Success conditions
  timeout: string              # Maximum execution time
  retry_policy: object          # Retry configuration
  
artifacts:                      # Optional artifacts to collect
  logs: boolean
  metrics: boolean
  screenshots: boolean
  reports: array
```

### Example Requests

#### Smoke Test Request
```yaml
# .ai/requests/live-dashboard-smoke.yaml
metadata:
  id: "live-dashboard-smoke-2025-12-01"
  created_by: "gemini-studio"
  target_env: "dev-local"
  created_at: "2025-12-01T10:00:00Z"
  
spec:
  scenario: "smoke-test"
  description: "Verify live dashboard functionality"
  
  commands:
    - "helm upgrade --install platform-dev-local infra/helm/platform --values infra/helm/platform/values-dev.yaml"
    - "npm run build"
    - "npm run preview &"
    - "sleep 30"  # Wait for startup
    - "npx playwright test tests/smoke/live-dashboard.spec.ts --project=chromium"
    - "curl -f http://localhost:3000/api/v1/metrics/live"
    - "curl -f http://localhost:3000/healthz"
    - "kubectl get pods -n predator-dev -o wide"
    - "kubectl logs -n predator-dev deployment/predator-backend --tail=20"
  
  success_criteria:
    - "playwright: 0 failures"
    - "api: 200 OK response for /api/v1/metrics/live"
    - "api: 200 OK response for /healthz"
    - "k8s: all pods ready"
    - "logs: no error messages"
  
  timeout: "15m"
  
  retry_policy:
    max_retries: 2
    backoff: "exponential"
    
  artifacts:
    logs: true
    metrics: true
    screenshots: true
    reports: ["playwright", "k8s-status"]
```

#### Performance Test Request
```yaml
# .ai/requests/performance-load.yaml
metadata:
  id: "performance-load-2025-12-01"
  created_by: "gemini-studio"
  target_env: "dev-local"
  created_at: "2025-12-01T11:00:00Z"
  
spec:
  scenario: "performance-test"
  description: "Load test API endpoints"
  
  commands:
    - "helm upgrade --install platform-dev-local infra/helm/platform --values infra/helm/platform/values-dev.yaml"
    - "npm run build"
    - "npm run preview &"
    - "sleep 30"
    - "k6 run tests/performance/api-load.js"
    - "curl -s http://localhost:3000/metrics | grep 'http_request_duration_seconds'"
    - "kubectl top pods -n predator-dev"
    - "kubectl get nodes -o wide"
  
  success_criteria:
    - "k6: error rate < 1%"
    - "k6: 95th percentile < 500ms"
    - "k8s: CPU < 80%"
    - "k8s: Memory < 80%"
  
  timeout: "20m"
  
  artifacts:
    metrics: true
    reports: ["k6-report", "resource-usage"]
```

#### Security Test Request
```yaml
# .ai/requests/security-scan.yaml
metadata:
  id: "security-scan-2025-12-01"
  created_by: "gemini-studio"
  target_env: "dev-local"
  created_at: "2025-12-01T12:00:00Z"
  
spec:
  scenario: "security-test"
  description: "Security vulnerability scan"
  
  commands:
    - "trivy image --format json --output trivy-scan.json ghcr.io/your-org/predator-backend:latest"
    - "nmap -p 3000,8000 localhost"
    - "curl -k https://localhost:3000/api/v1/users"  # Test for HTTPS enforcement
    - "sqlmap -u 'http://localhost:8000/api/v1/data?id=1' --batch"  # SQL injection test
    - "nikto -h http://localhost:3000"
    - "kubectl auth can-i --list --as=system:anonymous"
  
  success_criteria:
    - "trivy: no critical vulnerabilities"
    - "nmap: only expected ports open"
    - "sqlmap: no SQL injection vulnerabilities"
    - "nikto: no high-risk findings"
  
  timeout: "25m"
  
  artifacts:
    reports: ["trivy-report", "nmap-report", "security-scan"]
```

## 📊 .ai/reports Structure

### Report Schema
```yaml
# .ai/reports/schema.yaml
metadata:
  request_id: string           # Links to original request
  executed_at: timestamp       # When execution started
  completed_at: timestamp      # When execution completed
  target_env: string          # Execution environment
  git_sha: string             # Git commit SHA
  git_branch: string           # Git branch
  workflow_run: string         # GitHub Actions run ID
  
status: string                 # "running", "success", "failed", "timeout"
duration: string               # Total execution time
  
results: object                 # Detailed results per command
  command_0: object
    status: string             # "success" or "failed"
    command: string            # Command executed
    output: string             # Command output
    error: string              # Error message (if failed)
    duration: string           # Command duration
    
artifacts: object              # Collected artifacts
  playwright_report: string    # URL to Playwright report
  k8s_logs: string             # Path to Kubernetes logs
  cluster_status: string       # Path to cluster status
  metrics_file: string         # Path to metrics data
  screenshots: array           # List of screenshot paths
  
summary: object                 # Human-readable summary
  total_commands: integer
  successful_commands: integer
  failed_commands: integer
  key_findings: array
  recommendations: array
```

### Example Report
```yaml
# .ai/reports/live-dashboard-smoke-2025-12-01-result.yaml
metadata:
  request_id: "live-dashboard-smoke-2025-12-01"
  executed_at: "2025-12-01T10:30:00Z"
  completed_at: "2025-12-01T10:45:23Z"
  target_env: "dev-local"
  git_sha: "abc123def456"
  git_branch: "ai/live-dashboard-2025-12-01"
  workflow_run: "123456789"
  
status: "success"
duration: "15m 23s"

results:
  command_0:
    status: "success"
    command: "helm upgrade --install platform-dev-local infra/helm/platform --values infra/helm/platform/values-dev.yaml"
    output: "Release 'platform-dev-local' has been upgraded."
    duration: "2m 15s"
    
  command_1:
    status: "success"
    command: "npm run build"
    output: "Build completed successfully."
    duration: "1m 30s"
    
  command_2:
    status: "success"
    command: "npm run preview &"
    output: "Preview server started on port 3000."
    duration: "5s"
    
  command_3:
    status: "success"
    command: "sleep 30"
    output: ""
    duration: "30s"
    
  command_4:
    status: "success"
    command: "npx playwright test tests/smoke/live-dashboard.spec.ts --project=chromium"
    output: "15 tests passed, 0 failed."
    duration: "2m 45s"
    
  command_5:
    status: "success"
    command: "curl -f http://localhost:3000/api/v1/metrics/live"
    output: '{"timestamp": "2025-12-01T10:38:00Z", "cpu": "45%", "memory": "62%"}'
    duration: "120ms"
    
  command_6:
    status: "success"
    command: "curl -f http://localhost:3000/healthz"
    output: "OK"
    duration: "85ms"
    
  command_7:
    status: "success"
    command: "kubectl get pods -n predator-dev -o wide"
    output: "8/8 pods running"
    duration: "2s"
    
  command_8:
    status: "success"
    command: "kubectl logs -n predator-dev deployment/predator-backend --tail=20"
    output: "No error messages found"
    duration: "3s"

artifacts:
  playwright_report: "https://actions.github.io/run/123456789/playwright"
  k8s_logs: "/tmp/k8s-logs.txt"
  cluster_status: "/tmp/cluster-status.txt"
  metrics_file: "/tmp/metrics.json"
  screenshots: ["/tmp/dashboard-1.png", "/tmp/dashboard-2.png"]

summary:
  total_commands: 9
  successful_commands: 9
  failed_commands: 0
  key_findings:
    - "Live dashboard API endpoint working correctly"
    - "All Playwright smoke tests passing"
    - "Kubernetes cluster healthy"
    - "No error messages in logs"
  recommendations:
    - "Ready for merge to develop branch"
    - "Consider adding performance monitoring"
    - "Document API response schema"
```

## 🔄 AI Studio Integration Flow

### Complete Development Cycle
```
1. AI Studio Analysis
   ↓
2. Branch Creation: ai/feature-2025-12-01
   ↓
3. Code Implementation
   ↓
4. .ai/requests Creation
   ↓
5. Commit + Push
   ↓
6. Pull Request to develop
   ↓
7. GitHub Actions CI/CD
   ↓
8. AI Request Execution
   ↓
9. Results Processing
   ↓
10. Feedback to AI Studio
   ↓
11. Fix Iteration (if needed)
   ↓
12. Human Review + Merge
```

### AI Studio Code Generation
```python
# AI Studio Agent Implementation
class PredatorAnalyticsAgent:
    def __init__(self, github_token, repo_url):
        self.github = GitHubAPI(github_token)
        self.repo_url = repo_url
        self.branch_pattern = "ai/{feature}-{date}"
        
    def develop_feature(self, task_description):
        """Main development workflow"""
        try:
            # 1. Analyze task and create plan
            plan = self.analyze_task(task_description)
            
            # 2. Create branch
            branch_name = self.create_branch()
            
            # 3. Implement code changes
            self.implement_changes(plan, branch_name)
            
            # 4. Create AI requests for testing
            self.create_ai_requests(plan, branch_name)
            
            # 5. Commit and push
            self.commit_and_push(branch_name)
            
            # 6. Create Pull Request
            pr = self.create_pull_request(branch_name)
            
            # 7. Monitor and handle feedback
            self.monitor_pr(pr)
            
            return pr
            
        except Exception as e:
            self.handle_error(e)
            
    def analyze_task(self, task_description):
        """Analyze task and create implementation plan"""
        # Use AI to analyze requirements
        # Generate implementation plan
        # Identify testing needs
        pass
        
    def create_branch(self):
        """Create AI branch with proper naming"""
        date = datetime.now().strftime("%Y-%m-%d")
        feature = self.extract_feature_name()
        branch_name = f"ai/{feature}-{date}"
        
        self.github.create_branch(branch_name, "develop")
        return branch_name
        
    def implement_changes(self, plan, branch_name):
        """Implement code changes based on plan"""
        for change in plan.changes:
            if change.type == "backend":
                self.modify_backend_file(change)
            elif change.type == "frontend":
                self.modify_frontend_file(change)
            elif change.type == "test":
                self.create_test_file(change)
                
    def create_ai_requests(self, plan, branch_name):
        """Create .ai/requests for testing"""
        requests = []
        
        # Create smoke test request
        smoke_request = self.create_smoke_test_request(plan)
        requests.append(smoke_request)
        
        # Create integration test request (if needed)
        if plan.requires_integration_testing:
            integration_request = self.create_integration_test_request(plan)
            requests.append(integration_request)
            
        # Create performance test request (if needed)
        if plan.requires_performance_testing:
            performance_request = self.create_performance_test_request(plan)
            requests.append(performance_request)
            
        return requests
        
    def commit_and_push(self, branch_name):
        """Commit changes and push to GitHub"""
        commit_message = f"AI: Implement {self.feature_name}\n\n{self.get_commit_details()}"
        self.github.commit_and_push(branch_name, commit_message)
        
    def create_pull_request(self, branch_name):
        """Create Pull Request to develop branch"""
        pr_body = self.generate_pr_description()
        pr = self.github.create_pull_request(
            title=f"AI: {self.feature_name}",
            body=pr_body,
            head=branch_name,
            base="develop",
            labels=["ai-generated", "needs-review"]
        )
        return pr
        
    def monitor_pr(self, pr):
        """Monitor PR and handle feedback"""
        while True:
            status = self.github.get_pr_status(pr.number)
            
            if status == "merged":
                print("✅ PR merged successfully")
                break
                
            elif status == "closed":
                print("❌ PR closed")
                break
                
            elif status == "ci_failed":
                # Analyze failure and create fix
                failure_report = self.analyze_ci_failure(pr)
                fix = self.generate_fix(failure_report)
                self.apply_fix(fix, pr.head.ref)
                
            time.sleep(60)  # Check every minute
```

### Error Handling and Recovery
```python
# AI Studio Error Handling
class ErrorHandler:
    def handle_ci_failure(self, failure_report):
        """Handle CI/CD failures"""
        if failure_report.type == "test_failure":
            return self.fix_test_failure(failure_report)
        elif failure_report.type == "build_failure":
            return self.fix_build_failure(failure_report)
        elif failure_report.type == "security_failure":
            return self.fix_security_failure(failure_report)
            
    def fix_test_failure(self, report):
        """Fix test failures"""
        # Analyze test logs
        # Identify root cause
        # Generate fix
        # Create new commit
        pass
        
    def fix_build_failure(self, report):
        """Fix build failures"""
        # Check build logs
        # Fix syntax errors
        # Update dependencies
        # Create new commit
        pass
        
    def fix_security_failure(self, report):
        """Fix security issues"""
        # Analyze security scan results
        # Update vulnerable dependencies
        # Fix security misconfigurations
        # Create new commit
        pass
```

## 📊 Monitoring AI Studio Performance

### AI Studio Metrics
```yaml
# AI Studio Performance Metrics
ai_studio_metrics:
  development:
    pr_creation_rate: "Number of PRs created per day"
    pr_merge_rate: "Percentage of PRs successfully merged"
    pr_merge_time: "Time from creation to merge"
    fix_iteration_count: "Number of fix iterations per PR"
    
  quality:
    code_quality_score: "Code quality metrics (lint, coverage)"
    test_success_rate: "Percentage of tests passing"
    security_score: "Security scan results"
    performance_score: "Performance test results"
    
  efficiency:
    development_time: "Time from task to PR"
    review_time: "Time for human review"
    deployment_time: "Time from merge to deployment"
    
  feedback:
    human_satisfaction: "Human reviewer satisfaction"
    bug_rate: "Bug rate in AI-generated code"
    maintenance_overhead: "Code maintenance requirements"
```

### AI Studio Dashboard
```yaml
# Grafana Dashboard for AI Studio
ai_studio_dashboard:
  panels:
    - title: "AI PR Creation Rate"
      query: "rate(github_pr_created{author='ai-studio'}[1d])"
      
    - title: "AI PR Success Rate"
      query: "rate(github_pr_merged{author='ai-studio'}[1d]) / rate(github_pr_created{author='ai-studio'}[1d])"
      
    - title: "AI Request Success Rate"
      query: "rate(ai_requests_success_total{created_by='gemini-studio'}[1h]) / rate(ai_requests_total{created_by='gemini-studio'}[1h])"
      
    - title: "Average Fix Iterations"
      query: "avg(ai_fix_iterations_per_pr{author='ai-studio'})"
      
    - title: "Code Quality Score"
      query: "avg(code_quality_score{author='ai-studio'})"
```

## 🚨 AI Studio Safety Measures

### Security Controls
```yaml
# AI Studio Security Controls
security_controls:
  access_control:
    github_permissions: ["repo", "pull_request", "workflow"]
    branch_restrictions: ["ai/*", "feature/*"]
    approval_requirements: ["human-review"]
    
  code_validation:
    security_scanning: "Required before merge"
    dependency_checking: "Automated vulnerability scanning"
    code_review: "Mandatory human review"
    
  execution_limits:
    max_concurrent_requests: 3
    timeout_per_request: "30m"
    resource_limits: "CPU, memory, storage quotas"
    
  audit_trail:
    all_actions_logged: true
    git_history_preserved: true
    decision_tracking: true
```

### Quality Gates
```yaml
# AI Studio Quality Gates
quality_gates:
  code_quality:
    lint_check: "Must pass"
    test_coverage: "> 80%"
    complexity_score: "< 10"
    
  testing:
    unit_tests: "Must pass"
    integration_tests: "Must pass"
    e2e_tests: "Must pass for UI changes"
    
  security:
    vulnerability_scan: "No critical vulnerabilities"
    security_policy: "Must pass Kyverno policies"
    
  performance:
    response_time: "< 500ms for API endpoints"
    resource_usage: "< 80% CPU/memory"
```

## 📋 Success Criteria

### Integration Success
- ✅ AI Studio can create branches and PRs
- ✅ AI requests execute on real clusters
- ✅ Results flow back to AI Studio
- ✅ Automated fix generation works
- ✅ Human review process maintained
- ✅ Security and quality gates enforced

### Development Efficiency
- ✅ Reduced development time for routine tasks
- ✅ Higher code consistency
- ✅ Improved test coverage
- ✅ Faster bug detection and fixing
- ✅ Better documentation generation

### Reliability and Safety
- ✅ No unauthorized deployments
- ✅ All changes audited
- ✅ Human oversight maintained
- ✅ Rollback capabilities preserved
- ✅ Security policies enforced

---

## 🚀 Quick Start for AI Studio

1. **Setup Connection**: Configure GitHub integration with proper permissions
2. **Define Instructions**: Load system prompt and development guidelines
3. **Create First Task**: Start with simple feature implementation
4. **Monitor Results**: Review AI-generated code and test results
5. **Iterate**: Refine instructions based on results
6. **Scale**: Expand to more complex tasks

## 📚 Additional Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [ArgoCD API Reference](https://argoproj.github.io/argo-cd/developer-api/)
- [Kubernetes API](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [Playwright API](https://playwright.dev/docs/api/class-test)
- [AI Studio Documentation](https://ai.google.dev/docs)

Happy AI-assisted development! 🤖✨
