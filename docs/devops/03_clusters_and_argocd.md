# Clusters & ArgoCD Architecture

## 🏗️ Multi-Cluster Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   dev-local     │    │   lab-gpu       │    │   prod-oracle   │
│                 │    │                 │    │                 │
│ Platform: M3    │    │ Platform: GPU   │    │ Platform: OKE   │
│ Type: k3d       │    │ Type: k3s       │    │ Type: OKE/k3s   │
│ Nodes: 1        │    │ Nodes: 3-5      │    │ Nodes: 5+       │
│ Storage: local  │    │ Storage: SSD    │    │ Storage: Block  │
│ ArgoCD: dev     │    │ ArgoCD: lab     │    │ ArgoCD: prod    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub Repo     │    │ GitHub Repo     │    │ GitHub Repo     │
│ (feature/*,ai/*)│    │ (develop)       │    │ (main)          │
│                 │    │                 │    │                 │
│ Auto-sync       │    │ Auto-sync       │    │ Manual-sync     │
│ Fast feedback   │    │ Staging tests   │    │ Canary deploy   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🖥️ Cluster 1: dev-local (MacBook M3)

### Infrastructure Specification
```yaml
# infra/clusters/dev-local.yaml
apiVersion: k3d.io/v1alpha4
kind: Simple
metadata:
  name: pa-dev
servers: 1
agents: 0
kubeAPI:
  hostIP: "127.0.0.1"
  hostPort: "6443"
image:
  k3s: "rancher/k3s:v1.28.3-k3s1"
ports:
  - port: 80:80
    nodeFilters: ["server:0"]
  - port: 443:443
    nodeFilters: ["server:0"]
  - port: 3000:3000  # Frontend
    nodeFilters: ["server:0"]
  - port: 8000:8000  # Backend
    nodeFilters: ["server:0"]
registries:
  create: true
  host: "localhost:5000"
  hostPort: "5000"
options:
  k3s:
    extraArgs:
      - "--disable=traefik"
      - "--disable=servicelb"
      - "--disable=metrics-server"
```

### ArgoCD-dev Configuration
```yaml
# infra/argocd/dev/install.yaml
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: argocd-dev
  namespace: argocd
spec:
  server:
    route:
      enabled: true
    insecure: true
  config:
    repositories:
      - type: git
        url: https://github.com/your-org/Predator-Analytics.git
        name: predator-analytics
  rbac:
    defaultPolicy: 'role:readonly'
    policy: |
      p, role:admin, applications, *, */*, allow
      p, role:admin, clusters, *, *, allow
      p, role:developer, applications, *, predator-dev/*, allow
    scopes: '[groups]'
```

### ApplicationSet for dev-local
```yaml
# infra/argocd/dev/applicationset-dev.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: predator-dev-appset
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/your-org/Predator-Analytics.git
      revision: HEAD
      directories:
      - path: infra/helm/platform
  template:
    metadata:
      name: 'predator-dev-{{path.basename}}'
      namespace: argocd
    spec:
      project: predator-dev
      source:
        repoURL: https://github.com/your-org/Predator-Analytics.git
        targetRevision: '{{branch}}'
        path: '{{path}}'
        helm:
          valueFiles:
          - values-dev.yaml
          - values-{{branch}}.yaml
      destination:
        server: https://kubernetes.default.svc
        namespace: predator-dev
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

### Branch-based Apps
```yaml
# infra/argocd/dev/branch-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: predator-dev-branches
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/your-org/Predator-Analytics.git
      revision: HEAD
      gitParameter:
        branch: "{{branch}}"
  - list:
      elements:
      - cluster: dev-local
        url: https://kubernetes.default.svc
  template:
    metadata:
      name: 'predator-{{branch}}'
      namespace: argocd
    spec:
      project: predator-dev
      source:
        repoURL: https://github.com/your-org/Predator-Analytics.git
        targetRevision: '{{branch}}'
        path: infra/helm/platform
        helm:
          valueFiles:
          - values-dev.yaml
          - values-branch-override.yaml
      destination:
        server: '{{url}}'
        namespace: 'predator-{{branch}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

## 🚀 Cluster 2: lab-gpu (NVIDIA Server)

### Infrastructure Specification
```yaml
# infra/clusters/lab-gpu.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: K3sControlPlane
metadata:
  name: pa-lab-gpu-control-plane
  namespace: default
spec:
  replicas: 1
  version: v1.28.3+k3s1
  nodeDrainTimeout: 10s
  etcd:
    disable: false
  serverConfig:
    flannel-backend: "vxlan"
    cluster-cidr: "10.42.0.0/16"
    service-cidr: "10.43.0.0/16"
    cluster-dns: "10.43.0.10"
    disable:
    - traefik
    - servicelb
    - metrics-server
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: K3sMachineTemplate
metadata:
  name: pa-lab-gpu-worker-template
  namespace: default
spec:
  template:
    spec:
      template:
        spec:
          providerID: "k3s://{{.NodeName}}"
          version: v1.28.3+k3s1
          nodeConfig:
            kubelet-arg:
            - "node-labels=gpu=true"
            - "node-labels=worker=true"
```

### GPU Node Configuration
```yaml
# infra/clusters/lab-gpu-nodes.yaml
apiVersion: v1
kind: Node
metadata:
  name: gpu-worker-1
  labels:
    gpu: "true"
    worker: "true"
    nvidia.com/gpu: "true"
spec:
  taints:
  - key: nvidia.com/gpu
    value: "true"
    effect: NoSchedule
---
apiVersion: v1
kind: Node
metadata:
  name: gpu-worker-2
  labels:
    gpu: "true"
    worker: "true"
    nvidia.com/gpu: "true"
spec:
  taints:
  - key: nvidia.com/gpu
    value: "true"
    effect: NoSchedule
```

### NVIDIA GPU Operator
```yaml
# infra/helm/gpu-operator/values-lab.yaml
nvidia:
  driver:
    enabled: true
    version: "535.104.05"
  toolkit:
    enabled: true
    version: "v1.13.5"
  devicePlugin:
    enabled: true
    version: "v0.14.0"
  migManager:
    enabled: true
  gfd:
    enabled: true
  k8sDriverManager:
    enabled: true
  operator:
    defaultRuntime: "containerd"
    runtimeClassName: "nvidia"
```

### ArgoCD-lab Configuration
```yaml
# infra/argocd/lab/install.yaml
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: argocd-lab
  namespace: argocd
spec:
  server:
    grpc:
      host: argocd-lab-grpc
      port: 8081
    web:
      host: argocd-lab
      port: 8080
    insecure: false
    tls:
      selfSigned: true
  config:
    repositories:
      - type: git
        url: https://github.com/your-org/Predator-Analytics.git
        name: predator-analytics
  notifications:
    enabled: true
    services:
    - name: slack
      host: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Lab Applications
```yaml
# infra/argocd/lab/applications.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: predator-platform-lab
  namespace: argocd
spec:
  project: predator-lab
  source:
    repoURL: https://github.com/your-org/Predator-Analytics.git
    targetRevision: develop
    path: infra/helm/platform
    helm:
      valueFiles:
      - values-lab.yaml
      - values-gpu.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: predator-lab
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    - RespectIgnoreDifferences=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## ☁️ Cluster 3: prod-oracle (Oracle Cloud)

### Oracle Infrastructure (Terraform)
```hcl
# terraform/oracle/main.tf
terraform {
  required_providers {
    oci = {
      source  = "oracle-terraform-provider/oci"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "oci" {
  region = var.oci_region
}

# VCN Configuration
resource "oci_core_vcn" "predator_vcn" {
  cidr_block     = "10.0.0.0/16"
  compartment_id = var.compartment_id
  display_name   = "predator-vcn"
  dns_label      = "predator"
}

# Subnets
resource "oci_core_subnet" "public_subnet" {
  vcn_id         = oci_core_vcn.predator_vcn.id
  cidr_block     = "10.0.1.0/24"
  compartment_id = var.compartment_id
  display_name   = "predator-public"
  dns_label      = "public"
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_subnet" "private_subnet" {
  vcn_id         = oci_core_vcn.predator_vcn.id
  cidr_block     = "10.0.2.0/24"
  compartment_id = var.compartment_id
  display_name   = "predator-private"
  dns_label      = "private"
  prohibit_public_ip_on_vnic = true
}

# OKE Cluster
resource "oci_containerengine_cluster" "predator_cluster" {
  compartment_id     = var.compartment_id
  kubernetes_version = "v1.28.2"
  name               = "predator-oracle-prod"
  vcn_id             = oci_core_vcn.predator_vcn.id
  
  options {
    service_lb_subnet_ids = [oci_core_subnet.public_subnet.id]
    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/12"
    }
    admission_controller_options {
      is_pod_security_policy_enabled = false
    }
  }
}

# Node Pool
resource "oci_containerengine_node_pool" "predator_nodes" {
  cluster_id         = oci_containerengine_cluster.predator_cluster.id
  compartment_id     = var.compartment_id
  kubernetes_version = "v1.28.2"
  name               = "predator-nodepool"
  node_shape         = "VM.Standard3.Flex"
  
  node_config_details {
    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id          = oci_core_subnet.private_subnet.id
    }
    size = 3
  }
  
  node_shape_config {
    ocpus         = 4
    memory_in_gbs = 32
  }
  
  initial_node_labels {
    key   = "role"
    value = "worker"
  }
  
  ssh_public_keys = [var.ssh_public_key]
}

# Load Balancer
resource "oci_load_balancer_load_balancer" "predator_lb" {
  compartment_id = var.compartment_id
  display_name   = "predator-lb"
  shape          = "flexible"
  subnet_ids     = [oci_core_subnet.public_subnet.id]
  
  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 100
  }
}
```

### ArgoCD-prod Configuration
```yaml
# infra/argocd/prod/install.yaml
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: argocd-prod
  namespace: argocd
spec:
  server:
    host: argocd.predator.com
    grpc:
      host: argocd-grpc.predator.com
      port: 443
    web:
      host: argocd.predator.com
      port: 443
    insecure: false
    tls:
      selfSigned: false
  config:
    repositories:
      - type: git
        url: https://github.com/your-org/Predator-Analytics.git
        name: predator-analytics
  notifications:
    enabled: true
    services:
    - name: slack
      host: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
    - name: pagerduty
      host: https://events.pagerduty.com/v2/enqueue
  rbac:
    policy: |
      p, role:admin, applications, *, */*, allow
      p, role:admin, clusters, *, *, allow
      p, role:readonly, applications, *, predator-prod/*, allow
      p, role:ci-cd, applications, sync, predator-prod/*, allow
    groups:
    - name: admins
      roles:
      - role:admin
    - name: ci-cd
      roles:
      - role:ci-cd
```

### Production Applications with Rollouts
```yaml
# infra/argocd/prod/applications.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: predator-platform-prod
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  project: predator-prod
  source:
    repoURL: https://github.com/your-org/Predator-Analytics.git
    targetRevision: main
    path: infra/helm/platform
    helm:
      valueFiles:
      - values-prod.yaml
      - values-oracle.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: predator-prod
  syncPolicy:
    automated:
      prune: false
      selfHeal: false
    syncOptions:
    - CreateNamespace=true
    - RespectIgnoreDifferences=true
    retry:
      limit: 10
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 10m
  ignoreDifferences:
  - group: argoproj.io
    kind: Rollout
    jsonPointers:
    - /status
```

### Argo Rollouts for Canary Deployments
```yaml
# infra/helm/platform/templates/rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: predator-backend
  namespace: {{ .Release.Namespace }}
spec:
  replicas: {{ .Values.backend.replicas }}
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 30
      - pause: {duration: 10m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 100
      canaryService: predator-backend-canary
      stableService: predator-backend-stable
      trafficRouting:
        istio:
          virtualService:
            name: predator-vs
            routes:
            - primary
          destinationRule:
            name: predator-dr
            canarySubsetName: canary
            stableSubsetName: stable
      analysis:
        templates:
        - templateName: success-rate
        - templateName: latency
        args:
        - name: service-name
          value: predator-backend
        startingStep: 2
        interval: 5m
  selector:
    matchLabels:
      app: predator-backend
  template:
    metadata:
      labels:
        app: predator-backend
    spec:
      containers:
      - name: backend
        image: "{{ .Values.global.imageRegistry }}/predator-backend:{{ .Values.global.imageTag }}"
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## 📊 ArgoCD Projects & RBAC

### Project Definitions
```yaml
# infra/argocd/projects.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: predator-dev
  namespace: argocd
spec:
  description: "Predator Analytics Development Environment"
  sourceRepos:
  - https://github.com/your-org/Predator-Analytics.git
  destinations:
  - namespace: predator-dev
    server: https://kubernetes.default.svc
  - namespace: 'predator-*'
    server: https://kubernetes.default.svc
  clusterResourceWhitelist:
  - group: ''
    kind: Namespace
  - group: 'apps'
    kind: Deployment
  - group: 'apps'
    kind: Service
  roles:
  - name: developer
    description: "Developer access for dev environment"
    policies:
    - p, role:developer, applications, sync, predator-dev/*, allow
    - p, role:developer, applications, action, predator-dev/*, allow
    groups:
    - github:developers
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: predator-lab
  namespace: argocd
spec:
  description: "Predator Analytics Lab/GPU Environment"
  sourceRepos:
  - https://github.com/your-org/Predator-Analytics.git
  destinations:
  - namespace: predator-lab
    server: https://kubernetes.default.svc
  clusterResourceWhitelist:
  - group: ''
    kind: Namespace
  - group: 'apps'
    kind: Deployment
  - group: 'apps'
    kind: StatefulSet
  - group: 'batch'
    kind: Job
  roles:
  - name: lab-developer
    description: "Lab/GPU environment access"
    policies:
    - p, role:lab-developer, applications, sync, predator-lab/*, allow
    - p, role:lab-developer, applications, action, predator-lab/*, allow
    groups:
    - github:lab-team
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: predator-prod
  namespace: argocd
spec:
  description: "Predator Analytics Production Environment"
  sourceRepos:
  - https://github.com/your-org/Predator-Analytics.git
  destinations:
  - namespace: predator-prod
    server: https://kubernetes.default.svc
  clusterResourceWhitelist:
  - group: ''
    kind: Namespace
  - group: 'apps'
    kind: Deployment
  - group: 'apps'
    kind: StatefulSet
  - group: 'batch'
    kind: Job
  - group: 'argoproj.io'
    kind: Rollout
  orphanedResources:
    warn: true
  roles:
  - name: ops-team
    description: "Production operations team"
    policies:
    - p, role:ops-team, applications, sync, predator-prod/*, allow
    - p, role:ops-team, applications, action, predator-prod/*, allow
    - p, role:ops-team, applications, override, predator-prod/*, allow
    groups:
    - github:ops-team
  - name: readonly
    description: "Read-only production access"
    policies:
    - p, role:readonly, applications, get, predator-prod/*, allow
    groups:
    - github:all-users
```

## 🔧 Cluster Setup Scripts

### dev-local Setup
```bash
#!/bin/bash
# scripts/setup-dev-local.sh

echo "🚀 Setting up dev-local cluster..."

# Create k3d cluster
k3d cluster create pa-dev \
  --config infra/clusters/dev-local.yaml \
  --wait

# Install ingress-nginx
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --values infra/helm/ingress-nginx/values-dev.yaml

# Install ArgoCD-dev
helm repo add argo https://argoproj.github.io/argo-helm
helm upgrade --install argocd-dev argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --values infra/argocd/dev/values.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get ArgoCD password
echo "🔑 ArgoCD initial password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

echo "✅ dev-local cluster ready!"
```

### lab-gpu Setup
```bash
#!/bin/bash
# scripts/setup-lab-gpu.sh

echo "🚀 Setting up lab-gpu cluster..."

# Install k3s with GPU support
curl -sfL https://get.k3s.io | sh -s - \
  --disable traefik \
  --disable servicelb \
  --kube-apiserver-arg "feature-gates=DevicePlugins=true"

# Install NVIDIA GPU Operator
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm upgrade --install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --values infra/helm/gpu-operator/values-lab.yaml

# Install KEDA for autoscaling
helm repo add kedacore https://kedacore.github.io/charts
helm upgrade --install keda kedacore/keda \
  --namespace keda \
  --create-namespace

# Install ArgoCD-lab
helm upgrade --install argocd-lab argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --values infra/argocd/lab/values.yaml

echo "✅ lab-gpu cluster ready!"
```

### prod-oracle Setup
```bash
#!/bin/bash
# scripts/setup-prod-oracle.sh

echo "🚀 Setting up prod-oracle cluster..."

# Apply Terraform infrastructure
cd terraform/oracle
terraform init
terraform plan -out=tfplan
terraform apply tfplan
cd ../..

# Get OKE credentials
oci ce cluster create-kubeconfig --cluster-id $(oci ce cluster list --compartment-id $COMPARTMENT_ID --query "data[0].id" --raw-output) --file $HOME/.kube/config-oracle --region $OCI_REGION
export KUBECONFIG=$HOME/.kube/config-oracle

# Install Istio service mesh
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm upgrade --install istio-base istio/base \
  --namespace istio-system \
  --create-namespace
helm upgrade --install istiod istio/istiod \
  --namespace istio-system \
  --values infra/helm/istio/values-prod.yaml

# Install ArgoCD-prod
helm upgrade --install argocd-prod argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --values infra/argocd/prod/values.yaml

# Setup external secrets
helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace

echo "✅ prod-oracle cluster ready!"
```

## 📈 Monitoring & Observability

### Cluster Health Checks
```yaml
# infra/argocd/health-checks.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-health
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/Predator-Analytics.git
    targetRevision: HEAD
    path: infra/monitoring/health-checks
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

### Health Check Resources
```yaml
# infra/monitoring/health-checks/cluster-health.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-health-checks
  namespace: monitoring
data:
  checks.yaml: |
    health_checks:
      api_server:
        command: "kubectl get --raw='/healthz'"
        expected: "ok"
      nodes_ready:
        command: "kubectl get nodes --no-headers | awk '{print $2}' | grep -v Ready"
        expected: ""
      pod_restart_count:
        command: "kubectl get pods --all-namespaces --no-headers | awk '{print $4}' | awk -F: '{sum+=$2} END {print sum}'"
        threshold: 10
      storage_usage:
        command: "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'"
        threshold: 80
```

## 🚨 Alerting Rules

### Prometheus Alert Rules
```yaml
# infra/monitoring/prometheus/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: predator-cluster-alerts
  namespace: monitoring
spec:
  groups:
  - name: cluster.rules
    rules:
    - alert: ClusterNodeDown
      expr: up{job="node-exporter"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Cluster node {{ $labels.instance }} is down"
        description: "Node {{ $labels.instance }} has been down for more than 5 minutes"
        
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} is crash looping"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is restarting frequently"
        
    - alert: ArgoCDSyncFailed
      expr: argocd_app_sync_status{phase="Failed"} == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "ArgoCD app {{ $labels.name }} sync failed"
        description: "Application {{ $labels.name }} failed to sync for more than 10 minutes"
```

## 📋 Success Criteria

### dev-local
- ✅ k3d cluster with 1 node
- ✅ ArgoCD-dev with auto-sync for feature/ai branches
- ✅ Port mapping for local development
- ✅ Fast deployment cycles (< 2 minutes)

### lab-gpu
- ✅ k3s cluster with GPU nodes
- ✅ NVIDIA GPU Operator installed
- ✅ ArgoCD-lab with develop branch sync
- ✅ KEDA autoscaling for ML workloads

### prod-oracle
- ✅ OKE cluster with proper networking
- ✅ Istio service mesh
- ✅ ArgoCD-prod with manual sync + rollouts
- ✅ External secrets + monitoring stack
- ✅ High availability (3+ nodes)
