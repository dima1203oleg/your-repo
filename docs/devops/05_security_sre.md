# Security & SRE Framework

## 🛡️ Security Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supply Chain  │    │   Runtime       │    │   Network       │
│                 │    │                 │    │                 │
│ • SBOM          │    │ • Falco         │    │ • Istio mTLS    │
│ • Cosign        │    │ • OPA           │    │ • Network Policy│
│ • Trivy         │    │ • Kyverno       │    │ • Ingress Auth  │
│ • Notary        │    │ • PSP           │    │ • VPC Isolation │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Secrets       │    │   Monitoring    │    │   Compliance    │
│                 │    │                 │    │                 │
│ • Vault         │    │ • Prometheus    │    │ • Audit Logs    │
│ • External Sec  │    │ • Grafana       │    │ • Policy Reports│
│ • K8s Secrets   │    │ • Loki          │    │ • SOC2          │
│ • IAM           │    │ • Tempo         │    │ • GDPR          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 Supply Chain Security

### Container Image Security
```yaml
# .github/workflows/security-supply-chain.yml
name: Security Supply Chain
on:
  push:
    branches: [develop, main]
  workflow_dispatch:

jobs:
  sbom-generation:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [backend, frontend, agents]
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ghcr.io/${{ github.repository }}/${{ matrix.component }}:${{ github.sha }}
          format: spdx-json
          output-file: sbom-${{ matrix.component }}.spdx.json
          
      - name: Upload SBOM to Dependency Track
        run: |
          curl -X POST "${{ secrets.DEPENDENCY_TRACK_URL }}/api/v1/bom/upload" \
            -H "X-ApiKey: ${{ secrets.DEPENDENCY_TRACK_API_KEY }}" \
            -H "Content-Type: multipart/form-data" \
            -F "project=predator-analytics-${{ matrix.component }}" \
            -F "bom=@sbom-${{ matrix.component }}.spdx.json"
            
  image-signing:
    runs-on: ubuntu-latest
    needs: sbom-generation
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
        
      - name: Sign all images
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          for component in backend frontend agents; do
            IMAGE="ghcr.io/${{ github.repository }}/${component}:${{ github.sha }}"
            
            # Sign with keyless
            cosign sign --yes $IMAGE
            
            # Add SBOM attestation
            cosign attest --yes --keyless $IMAGE \
              --predicate sbom-${component}.spdx.json \
              --type spdxjson
              
            # Add SLSA provenance
            cosign attest --yes --keyless $IMAGE \
              --predicate https://raw.githubusercontent.com/sigstore/cosign/main/spec/attestations/predicates/slsa/v1.json \
              --type slsaprovenance
          done
          
  vulnerability-scanning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-backend.sarif'
          
      - name: Run Trivy on all components
        run: |
          for component in backend frontend agents; do
            IMAGE="ghcr.io/${{ github.repository }}/${component}:${{ github.sha }}"
            trivy image --format json --output "trivy-${component}.json" "$IMAGE"
            
            # Fail on critical vulnerabilities
            CRITICAL_COUNT=$(jq '.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' "trivy-${component}.json" | wc -l)
            if [[ $CRITICAL_COUNT -gt 0 ]]; then
              echo "❌ Found $CRITICAL_COUNT critical vulnerabilities in $component"
              exit 1
            fi
          done
          
      - name: Upload security reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: |
            trivy-*.json
            trivy-*.sarif
          retention-days: 30
```

### Policy as Code
```yaml
# infra/kyverno/policies/security.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-security-context
  annotations:
    policies.kyverno.io/title: Require Security Context
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Enforce
  rules:
  - name: require-non-root-user
    match:
      any:
      - resources:
          kinds:
          - Pod
          - Deployment
          - StatefulSet
    validate:
      message: "Containers must run as non-root user"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: ">0"
  - name: require-readonly-filesystem
    match:
      any:
      - resources:
          kinds:
          - Pod
          - Deployment
          - StatefulSet
    validate:
      message: "Containers must have read-only filesystem"
      pattern:
        spec:
          securityContext:
            readOnlyRootFilesystem: true
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
  annotations:
    policies.kyverno.io/title: Require Resource Limits
    policies.kyverno.io/category: Resource Management
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Enforce
  rules:
  - name: require-cpu-memory-limits
    match:
      any:
      - resources:
          kinds:
          - Pod
          - Deployment
          - StatefulSet
    validate:
      message: "Containers must have CPU and memory limits defined"
      pattern:
        spec:
          containers:
          - resources:
              limits:
                memory: "?*"
                cpu: "?*"
              requests:
                memory: "?*"
                cpu: "?*"
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
  annotations:
    policies.kyverno.io/title: Disallow Privileged Containers
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: critical
spec:
  validationFailureAction: Enforce
  rules:
  - name: disallow-privileged
    match:
      any:
      - resources:
          kinds:
          - Pod
          - Deployment
          - StatefulSet
    validate:
      message: "Privileged containers are not allowed"
      pattern:
        spec:
          containers:
          - securityContext:
              privileged: "false"
              allowPrivilegeEscalation: false
```

### Network Security
```yaml
# infra/network-policies/security.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: predator-deny-all
  namespace: predator-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: predator-backend-policy
  namespace: predator-prod
spec:
  podSelector:
    matchLabels:
      app: predator-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: predator-frontend
    ports:
    - protocol: TCP
      port: 8000
  - from:
    - namespaceSelector:
        matchLabels:
          name: istio-system
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: predator-postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: predator-redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS outbound
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: predator-frontend-policy
  namespace: predator-prod
spec:
  podSelector:
    matchLabels:
      app: predator-frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: predator-backend
    ports:
    - protocol: TCP
      port: 8000
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS outbound
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

## 🔍 Runtime Security

### Falco Rules
```yaml
# infra/falco/rules/predator-security.yaml
- rule: Unexpected Process in Predator Container
  desc: Detect unexpected processes running in Predator containers
  condition: >
    spawned_process and
    container.name starts_with "predator" and
    not proc.name in (node, npm, python, uvicorn, bash, sh, cat, ls, ps, grep, awk, sed, curl, wget)
  output: >
    Unexpected process detected (user=%user.name command=%proc.cmdline 
    container=%container.name container_id=%container.id image=%container.image.repository)
  priority: WARNING
  tags: [process, container, predator]
- rule: Sensitive File Access in Predator
  desc: Detect access to sensitive files in Predator containers
  condition: >
    open_read and
    container.name starts_with "predator" and
    fd.name in (/etc/passwd, /etc/shadow, /etc/hosts, /proc/mounts, /etc/kubernetes)
  output: >
    Sensitive file accessed (user=%user.name file=%fd.name 
    container=%container.name container_id=%container.id)
  priority: WARNING
  tags: [file, container, predator]
- rule: Network Connection to Unexpected Host
  desc: Detect network connections to unexpected external hosts
  condition: >
    outbound and
    container.name starts_with "predator" and
    not fd.sip.ip in (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
    and not fd.sip.name in (github.com, registry.npmjs.org, pypi.org, kubernetes.default.svc)
  output: >
    Unexpected network connection (user=%user.name cmd=%proc.cmdline 
    connection=%fd.name container=%container.name)
  priority: WARNING
  tags: [network, container, predator]
```

### OPA Policies
```rego
# infra/opa/policies/predator.rego
package predator.security

# Deny containers running as root
deny[reason] {
    input.kind == "Pod"
    input.spec.containers[_].securityContext.runAsUser == 0
    reason := "Container running as root user"
}

# Deny privileged containers
deny[reason] {
    input.kind == "Pod"
    input.spec.containers[_].securityContext.privileged == true
    reason := "Privileged container not allowed"
}

# Require resource limits
deny[reason] {
    input.kind == "Pod"
    container := input.spec.containers[_]
    not container.resources.limits.memory
    reason := "Memory limits required"
}

deny[reason] {
    input.kind == "Pod"
    container := input.spec.containers[_]
    not container.resources.limits.cpu
    reason := "CPU limits required"
}

# Allow only approved image registries
deny[reason] {
    input.kind == "Pod"
    image := input.spec.containers[_].image
    not startswith(image, "ghcr.io/your-org/predator-")
    not startswith(image, "docker.io/library/")
    reason := "Only approved image registries allowed"
}
```

## 🔐 Secrets Management

### HashiCorp Vault Integration
```yaml
# infra/vault/config.hcl
ui = true

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1
}

storage "consul" {
  address = "consul.default.svc.cluster.local:8500"
  path = "vault/"
}

api_addr = "http://vault.default.svc.cluster.local:8200"
cluster_addr = "http://vault.default.svc.cluster.local:8201"

# Enable Kubernetes auth method
auth "kubernetes" {
  type = "kubernetes"
}
```

### External Secrets Operator
```yaml
# infra/external-secrets/predator-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: predator-prod
spec:
  provider:
    vault:
      server: "http://vault.default.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "predator-app"
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: predator-database-credentials
  namespace: predator-prod
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: predator-db-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: predator/database
      property: username
  - secretKey: password
    remoteRef:
      key: predator/database
      property: password
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: predator-api-keys
  namespace: predator-prod
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: predator-api-keys
    creationPolicy: Owner
  data:
  - secretKey: openai_api_key
    remoteRef:
      key: predator/api-keys
      property: openai
  - secretKey: slack_webhook_url
    remoteRef:
      key: predator/api-keys
      property: slack
```

## 📊 Monitoring & Observability

### Prometheus Security Metrics
```yaml
# infra/monitoring/prometheus/security-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: predator-security-alerts
  namespace: monitoring
spec:
  groups:
  - name: security.rules
    rules:
    - alert: HighFailedLoginRate
      expr: rate(http_requests_total{status="401",job="predator-backend"}[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
        service: predator-backend
      annotations:
        summary: "High failed login rate detected"
        description: "Failed login rate is {{ $value }} requests/second"
        
    - alert: SuspiciousProcessActivity
      expr: rate(falco_events_total{rule="Unexpected Process in Predator Container"}[5m]) > 0
      for: 0m
      labels:
        severity: critical
        service: predator-security
      annotations:
        summary: "Suspicious process activity detected"
        description: "Unexpected process running in Predator container"
        
    - alert: UnauthorizedNetworkAccess
      expr: rate(falco_events_total{rule="Network Connection to Unexpected Host"}[5m]) > 0
      for: 0m
      labels:
        severity: warning
        service: predator-security
      annotations:
        summary: "Unauthorized network access detected"
        description: "Container connecting to unexpected external host"
        
    - alert: ContainerRunningAsRoot
      expr: kube_pod_container_status_running{container!="istio-proxy"} and on(pod) kube_pod_info{container_image_id!=""} * on(pod) group_left() kube_pod_security_context{run_as_user="0"}
      for: 0m
      labels:
        severity: critical
        service: predator-security
      annotations:
        summary: "Container running as root user"
        description: "Pod {{ $labels.pod }} has container running as root"
        
    - alert: PodSecurityPolicyViolation
      expr: kube_pod_status_phase{phase="Failed"} == 1
      for: 5m
      labels:
        severity: warning
        service: predator-security
      annotations:
        summary: "Pod security policy violation"
        description: "Pod {{ $labels.pod }} failed due to security policy"
```

### Security Dashboard
```yaml
# infra/grafana/dashboards/security-dashboard.json
{
  "dashboard": {
    "title": "Predator Analytics Security",
    "panels": [
      {
        "title": "Security Events",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(falco_events_total[5m])",
            "legendFormat": "Events/sec"
          }
        ]
      },
      {
        "title": "Failed Authentication",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=\"401\"}[5m])",
            "legendFormat": "Failed Logins"
          }
        ]
      },
      {
        "title": "Vulnerability Count",
        "type": "stat",
        "targets": [
          {
            "expr": "trivy_vulnerability_count",
            "legendFormat": "{{severity}}"
          }
        ]
      },
      {
        "title": "Network Connections",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(container_network_transmit_bytes_total[5m])",
            "legendFormat": "{{pod}}"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Incident Response

### Alert Escalation Policy
```yaml
# infra/alertmanager/escalation.yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
    continue: true
  - match:
      severity: warning
    receiver: 'warning-alerts'
    continue: true
  - match:
      service: predator-security
    receiver: 'security-team'

receivers:
- name: 'default'
  slack_configs:
  - api_url: '{{ secret "slack_webhook_url" }}'
    channel: '#alerts'
    title: 'Predator Analytics Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'critical-alerts'
  slack_configs:
  - api_url: '{{ secret "slack_webhook_url" }}'
    channel: '#critical-alerts'
    title: '🚨 CRITICAL ALERT'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
  webhook_configs:
  - url: '{{ secret "pagerduty_webhook_url" }}'
    send_resolved: true

- name: 'warning-alerts'
  slack_configs:
  - api_url: '{{ secret "slack_webhook_url" }}'
    channel: '#warnings'
    title: '⚠️ Warning Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'security-team'
  slack_configs:
  - api_url: '{{ secret "slack_webhook_url" }}'
    channel: '#security'
    title: '🔒 Security Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
  email_configs:
  - to: 'security-team@company.com'
    subject: 'Predator Security Alert'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
```

### Incident Response Playbooks
```yaml
# infra/playbooks/security-incident.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-playbooks
  namespace: monitoring
data:
  suspicious-process.yml: |
    name: Suspicious Process Detected
    severity: high
    playbook:
      - step: "Isolate affected container"
        action: "kubectl exec -it <pod> -- /bin/bash"
        description: "Access container to investigate"
        
      - step: "Gather forensic data"
        action: "kubectl logs <pod> --since=1h > incident-logs.txt"
        description: "Collect container logs"
        
      - step: "Check network connections"
        action: "kubectl exec -it <pod> -- netstat -tulpn"
        description: "List network connections"
        
      - step: "Scan for malware"
        action: "kubectl exec -it <pod> -- clamscan -r /"
        description: "Run malware scan"
        
      - step: "Quarantine container"
        action: "kubectl cordon <node>"
        description: "Isolate affected node"
        
      - step: "Notify security team"
        action: "Send alert to security team"
        description: "Escalate to security team"
        
  data-exfiltration.yml: |
    name: Potential Data Exfiltration
    severity: critical
    playbook:
      - step: "Block outbound traffic"
        action: "kubectl apply -f network-policy-block.yaml"
        description: "Block all outbound traffic"
        
      - step: "Identify affected data"
        action: "kubectl exec -it <pod> -- find /data -type f -mtime -1"
        description: "Find recently modified files"
        
      - step: "Preserve evidence"
        action: "kubectl cp <pod>:/data /tmp/evidence/"
        description: "Copy data for forensic analysis"
        
      - step: "Disable service accounts"
        action: "kubectl delete serviceaccount <service-account>"
        description: "Revoke compromised credentials"
        
      - step: "Rotate secrets"
        action: "vault kv rotate secret/predator/database"
        description: "Rotate all affected secrets"
        
      - step: "Forensic analysis"
        action: "Engage security team for deep analysis"
        description: "Professional forensic investigation"
```

## 🔄 Chaos Engineering

### LitmusChaos Experiments
```yaml
# infra/chaos/pod-delete.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: predator-pod-delete
  namespace: predator-prod
spec:
  appInfo:
    appns: predator-prod
    applabel: "app=predator-backend"
    appkind: deployment
  engineState: "active"
  annotationCheck: "false"
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: CHAOS_INTERVAL
          value: "15"
        - name: FORCE
          value: "true"
---
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: predator-network-latency
  namespace: predator-prod
spec:
  appInfo:
    appns: predator-prod
    applabel: "app=predator-backend"
    appkind: deployment
  engineState: "active"
  annotationCheck: "false"
  chaosServiceAccount: litmus-admin
  experiments:
  - name: network-latency
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "120"
        - name: LATENCY
          value: "200ms"
        - name: JITTER
          value: "50ms"
        - name: TARGET_CONTAINER
          value: "predator-backend"
```

### Disaster Recovery
```yaml
# infra/backup/velero-config.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: predator-backups
    prefix: ""
  config:
    region: us-west-2
    profile: default
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: predator-daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
    - predator-prod
    - predator-lab
    storageLocation: default
    volumeSnapshotLocations:
    - default
    ttl: "720h"  # 30 days
---
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: predator-disaster-recovery
  namespace: velero
spec:
  backupName: predator-daily-backup-20231201
  includedNamespaces:
  - predator-prod
  restorePVs: true
  preserveNodePorts: true
```

## 📋 Compliance & Auditing

### Audit Logging
```yaml
# infra/audit/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  namespaces: ["predator-prod", "predator-lab"]
  resources:
  - group: ""
    resources: ["secrets", "configmaps", "serviceaccounts"]
  - group: "apps"
    resources: ["deployments", "statefulsets", "daemonsets"]
- level: Request
  namespaces: ["predator-prod", "predator-lab"]
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["create", "delete", "update", "patch"]
- level: RequestResponse
  namespaces: ["predator-prod", "predator-lab"]
  resources:
  - group: "external-secrets.io"
    resources: ["externalsecrets"]
- level: None
  users: ["system:kube-proxy"]
  resources:
  - group: ""
    resources: ["events"]
```

### Compliance Reports
```yaml
# infra/compliance/soc2-report.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: compliance-reports
  namespace: monitoring
data:
  soc2-controls.yml: |
    controls:
      A1.1:
        name: "Access Controls"
        description: "Logical access controls and restrictions"
        implemented_by:
          - "RBAC policies"
          - "Network policies"
          - "Service mesh mTLS"
          
      A1.2:
        name: "System and Data Integrity"
        description: "Integrity of system and data"
        implemented_by:
          - "Image signing with Cosign"
          - "SBOM generation"
          - "Vulnerability scanning"
          
      A2.1:
        name: "Risk Assessment"
        description: "Risk assessment processes"
        implemented_by:
          - "Falco runtime security"
          - "OPA policy enforcement"
          - "Chaos engineering"
          
      A2.2:
        name: "System Monitoring"
        description: "System monitoring and alerting"
        implemented_by:
          - "Prometheus metrics"
          - "Grafana dashboards"
          - "AlertManager notifications"
          
      A6.1:
        name: "Audit Logs"
        description: "Audit logging and monitoring"
        implemented_by:
          - "Kubernetes audit policy"
          - "Loki log aggregation"
          - "Audit trail in Vault"
          
      A6.2:
        name: "Physical Access"
        description: "Physical access controls"
        implemented_by:
          - "Cloud provider physical security"
          - "Data center access controls"
          - "Biometric authentication"
          
      A8.1:
        name: "Data Backup"
        description: "Data backup and recovery"
        implemented_by:
          - "Velero backups"
          - "Cross-region replication"
          - "Disaster recovery procedures"
          
      A8.2:
        name: "Incident Response"
        description: "Incident response procedures"
        implemented_by:
          - "AlertManager escalation"
          - "Incident response playbooks"
          - "Post-incident reviews"
```

## 📊 SRE Metrics & SLIs

### Service Level Indicators
```yaml
# infra/sli/sli-definitions.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sli-definitions
  namespace: monitoring
data:
  availability.yml: |
    name: "Service Availability"
    description: "Percentage of successful requests"
    query: |
      (
        sum(rate(http_requests_total{job="predator-backend",code!~"5.."}[5m]))
        /
        sum(rate(http_requests_total{job="predator-backend"}[5m]))
      ) * 100
    unit: "percent"
    good_threshold: 99.9
    warning_threshold: 99.0
    
  latency.yml: |
    name: "Request Latency"
    description: "95th percentile request duration"
    query: |
      histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket{job="predator-backend"}[5m]))
        by (le)
      )
    unit: "seconds"
    good_threshold: 0.5
    warning_threshold: 1.0
    
  error_rate.yml: |
    name: "Error Rate"
    description: "Percentage of 5xx responses"
    query: |
      (
        sum(rate(http_requests_total{job="predator-backend",code=~"5.."}[5m]))
        /
        sum(rate(http_requests_total{job="predator-backend"}[5m]))
      ) * 100
    unit: "percent"
    good_threshold: 0.1
    warning_threshold: 1.0
    
  throughput.yml: |
    name: "Request Throughput"
    description: "Requests per second"
    query: |
      sum(rate(http_requests_total{job="predator-backend"}[5m]))
    unit: "rps"
    good_threshold: 100
    warning_threshold: 50
```

### Error Budget Policy
```yaml
# infra/slo/error-budget-policy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: error-budget-policy
  namespace: monitoring
data:
  policy.yml: |
    # 99.9% availability = 43.2 minutes downtime per month
    monthly_error_budget: "43.2m"
    
    # Burn rate alerts
    burn_rate_alerts:
      slow_burn:
        threshold: 2.0  # 2x normal burn rate
        window: "6h"
        action: "Notify team"
        
      fast_burn:
        threshold: 10.0  # 10x normal burn rate
        window: "1h"
        action: "Page on-call"
        
      critical_burn:
        threshold: 50.0  # 50x normal burn rate
        window: "5m"
        action: "Emergency response"
        
    # Deployment policy
    deployment_policy:
      max_error_budget_consumption_per_release: "5%"
      rollback_threshold: "1%"
      canary_duration: "30m"
      
    # Incident response
    incident_response:
      mttr_target: "30m"
      postmortem_required: true
      blameless_postmortem: true
```

## 📋 Success Criteria

### Security
- ✅ All images signed and verified
- ✅ No critical vulnerabilities in production
- ✅ Runtime security monitoring active
- ✅ Network policies enforced
- ✅ Secrets managed via Vault
- ✅ Audit logs collected and analyzed

### SRE
- ✅ 99.9% availability SLA met
- ✅ Latency < 500ms (95th percentile)
- ✅ Error rate < 0.1%
- ✅ Error budget consumption monitored
- ✅ Automated incident response
- ✅ Regular chaos engineering tests

### Compliance
- ✅ SOC2 controls implemented
- ✅ GDPR compliance verified
- ✅ Audit trails complete
- ✅ Regular security assessments
- ✅ Penetration testing performed
- ✅ Documentation up to date
