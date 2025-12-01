# Predator platform helm chart - secret management

This chart expects secrets to be provided by a secrets backend rather than hard-coded in values files.

Recommended approaches:

1. HashiCorp Vault + ExternalSecrets (preferred)
   - Install ExternalSecrets operator in your cluster (see docs/devops/03_clusters_and_argocd.md)
   - Create ExternalSecret manifest(s) that fetch secrets from Vault and write K8s `Secret` named `predator-secrets` in the target namespace.

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