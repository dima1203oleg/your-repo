# Predator platform helm chart - secret management

This chart expects secrets to be provided by a secrets backend rather than hard-coded in values files.

Recommended approaches:

1. HashiCorp Vault + ExternalSecrets (preferred)
   - Install ExternalSecrets operator in your cluster (see docs/devops/03_clusters_and_argocd.md)
   - Create ExternalSecret manifest(s) that fetch secrets from Vault and write K8s `Secret` named `predator-secrets` in the target namespace.
    - Install the ExternalSecrets operator (external-secrets) and create a ClusterSecretStore/SecretStore that connects to Vault.
       Example manifests live under `infra/helm/platform/examples/` (ClusterSecretStore: `clustersecretstore-vault.yaml`, example ExternalSecret: `external-secret-predator.yaml`).

2. Pre-create Kubernetes Secret (quick local dev option)
   - Create a pre-populated Kubernetes Secret with the keys used by the chart:
     - `database-url` (e.g. postgresql://user:pass@postgresql:5432/db)
     - `redis-url` (e.g. redis://:pass@redis-master:6379/0)
     - `postgres-password` (for chart subcharts that expect this key)
     - `redis-password` (for redis subchart)
     - `grafana-admin-password`

   Example:

   kubectl create secret generic predator-secrets \
     --from-literal=database-url='postgresql://predator:SECRET@postgresql:5432/predator_analytics' \
     --from-literal=redis-url='redis://:SECRET@redis-master:6379/0' \
     --from-literal=postgres-password='SECRET' \
     --from-literal=redis-password='SECRET' \
     --from-literal=grafana-admin-password='SECRET' \
     -n pa-dev

3. CI / GitHub Actions
   - Use your CI to populate a Secret in the target cluster before ArgoCD sync (e.g. job step that runs `kubectl create secret generic predator-secrets --from-literal=... -n pa-dev`).

Why this change?
- Storing plaintext secrets in git is insecure and breaks best practices for secrets management.
- The chart supports `existingSecret` / `existingSecretPasswordKey` patterns and ExternalSecrets integration; prefer those.

If you need help creating ExternalSecret manifests for Vault in this repo, I can add an example `infra/helm/platform/examples/external-secret-predator.yaml` next.

Note about ArgoCD Projects & Secret creation
-------------------------------------------------
Some ArgoCD Projects may explicitly forbid creation of Kubernetes `Secret` resources (for example `namespaceResourceBlacklist` contains `kind: Secret`). When an ArgoCD Project blocks Secrets, the chart must not attempt to create `predator-secrets` during a sync because ArgoCD will reject that resource.

Recommended approaches when ArgoCD blocks Secrets:

- Use the supplied GitHub Actions workflow `.github/workflows/create-predator-secret.yml` to populate the `predator-secrets` in the target namespace *before* ArgoCD tries to apply the Helm release.
- Install ExternalSecrets + ClusterSecretStore (Vault) and deploy `ExternalSecret` objects; ExternalSecrets operator (running in-cluster) will create the K8s Secret outside ArgoCD's repo manifests and bypass project-level blacklist.
- Alternatively, patch the AppProject policy to allow Secret creation in non-production dev projects — only do this if acceptable policy-wise.

The chart ships with an opt-in dev-mode that can create a local `predator-secrets` secret for convenience, but this option is intentionally disabled by default for ArgoCD-driven deployments. Check `values-dev-local.yaml` and your ArgoCD Project rules before enabling.

Recommended quick install (ExternalSecrets operator)
-------------------------------------------------
- Install ExternalSecrets Helm chart or operator in your cluster, for example:

   helm repo add external-secrets https://external-secrets.github.io/kubernetes-external-secrets
   helm repo update
   helm upgrade --install external-secrets external-secrets/kubernetes-external-secrets -n external-secrets --create-namespace --set controller.create=true

After installing the operator, create the `ClusterSecretStore` (e.g. `clustersecretstore-vault.yaml`) and then create `ExternalSecret` objects in target namespaces (examples included).

Example: pa-dev (ExternalSecret)
--------------------------------
We include a ready-to-apply example for the `pa-dev` namespace that maps secrets from Vault into the `predator-secrets` K8s Secret. See `infra/helm/platform/examples/external-secret-predator-pa-dev.yaml`.

CI workflow notes
-----------------
We provide a CI workflow `.github/workflows/create-predator-secret.yml` as a safe, non-git approach to populate `predator-secrets` in the target cluster *before* ArgoCD syncs.

   - Add these GitHub secrets to the repository:
      - KUBE_CONFIG_DATA (base64-encoded kubeconfig with write access to pa-dev + argocd namespace)
      - PREDATOR_DATABASE_URL
      - PREDATOR_REDIS_URL
      - PREDATOR_POSTGRES_PASSWORD
      - PREDATOR_REDIS_PASSWORD
      - PREDATOR_GRAFANA_ADMIN_PASSWORD
   - Optional: if you'd like the workflow to trigger an ArgoCD sync using the argocd CLI from the runner, provide:
      - ARGOCD_SERVER
      - ARGOCD_AUTH_TOKEN

The workflow will:
   1. Create/overwrite `predator-secrets` in `pa-dev` from the repo secrets.
   2. Poll until the Secret is present.
   3. Annotate the ArgoCD Application `pa-platform-dev-local` to trigger a repo-server refresh.
   4. Optionally call `argocd app sync` if ARGOCD_SERVER/ARGOCD_AUTH_TOKEN are provided.

Developer convenience: dev-only secret creation
---------------------------------------------
If you are running a local dev cluster and prefer the chart to create a non-production `predator-secrets`
Secret for you, the chart now supports an opt-in dev helper: set `devmode.createPredatorSecrets=true` in
the values file for that environment (for example `values-dev-local.yaml`) and provide the non-production
values under `devmode.predatorSecrets`. This is intentionally disabled by default and is not recommended
for CI or production clusters — prefer ExternalSecrets or pre-created Secrets in those environments.