
# README: Автоматизація Розгортання Predator Analytics v18.4

## 1. Опис Архітектури

Система реалізує схему автоматизованого розгортання:
**Google AI Studio → GitHub → GitHub Actions → ArgoCD → k3s**

Підтримуються три середовища:
*   **Mac M3 (Dev):** Локальне середовище на ARM64.
*   **NVIDIA Server (Prod):** Основний сервер з GPU (AMD64) для AI-інференсу.
*   **Oracle Free Tier (Canary):** Хмарний бекап та канарковий реліз на Ampere A1 (ARM64).

### Принципи
*   **G-01 (GitOps):** Git є єдиним джерелом правди. Всі зміни в інфраструктуру вносяться через коміти, а не через `kubectl`.
*   **G-02 (Two-Way Sync):** Зміни, зроблені в AI Studio, автоматично потрапляють в Git і деплояться. Зміни, зроблені розробниками в VS Code, синхронізуються назад в AI Studio.

## 2. Потрібні Секрети (GitHub Actions)

Додайте ці секрети в репозиторій (`Settings > Secrets > Actions`):

*   `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_REGION` — для Oracle Cloud.
*   `OCI_PRIVATE_KEY` — вміст приватного ключа API.
*   `GH_PAT` — Personal Access Token для доступу до GHCR (Packages).
*   `ARGOCD_ADMIN_TOKEN` — (Опціонально) для перевірки статусу ArgoCD в пайплайні.

## 3. Кроки Запуску

1.  **Створіть GitHub репозиторій** і залийте цей код.
2.  **Інфраструктура (Oracle):**
    ```bash
    cd terraform/oracle
    # Створіть terraform.tfvars зі своїми даними
    terraform init && terraform apply
    ```
3.  **Bootstrap Кластерів:**
    Запустіть `scripts/bootstrap.sh` на кожній машині.
    ```bash
    # На Master
    ./scripts/bootstrap.sh --mode master
    # На Worker
    ./scripts/bootstrap.sh --mode worker --server-url <URL> --token <TOKEN>
    ```
4.  **ArgoCD:**
    Застосуйте маніфести Application з папки `k8s/argocd/` для відповідних кластерів.

## 4. Використання

*   **Sync from AI Studio:** Запустіть `scripts/sync_from_ai_studio.sh`, щоб відправити зміни в продакшн.
*   **Sync to AI Studio:** Запустіть `scripts/sync_to_ai_studio.sh`, щоб створити архів для завантаження в AI контекст.

## Running locally (frontend + mock backend)

If you're developing locally and don't have a backend running, a lightweight mock backend is provided in `mock-backend/`.

- Start the mock backend (it listens on port 8001 by default):

```bash
# Run the CommonJS entry (project uses `type: "module"` so use .cjs)
PORT=8001 node mock-backend/server.cjs &
```

- Start the frontend dev server (Vite). The project defaults to calling the mock backend on port 8001 in development.

```bash
npm run dev
```

If you prefer to force a direct API URL in dev instead of relying on the proxy, set the environment variable before starting Vite:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
npm run dev
```

Convenience: start mock-backend and Vite dev together

```bash
# runs mock backend on 8001 and vite dev in parallel
npm run dev:local
```

### Production / CI: avoid baking dev URLs into the bundle (recommended)

Important: production builds must not embed local endpoints such as `http://localhost:8001` or placeholder tokens. To enable safe runtime configuration during deployment we support two methods:

* Inject a small runtime config object before `index.html` loads. IMPORTANT: the runtime `NEXT_PUBLIC_API_URL` should be the API root (do NOT include a trailing `/api/v1` segment) because the app code and some services append `/api/v1` when making calls.

    Example (correct):

    ```html
    <script>window.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'https://api.example.com' }</script>
    ```

    Example (incorrect - double prefixing leads to 404s):

    ```html
    <script>window.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1' }</script>
    ```

* Or add a meta tag into your served `index.html`:

    ```html
    <meta name="api-base-url" content="https://api.example.com" />
    ```

When deployed, run the verification script after build in your CI pipeline to ensure no local/internal strings are present in the distributable:

```bash
# build then verify the dist/ folder doesn't contain localhost strings
npm run build:verify
```

CI Tip: Add `npm run build:verify` as the step after your `npm run build` to gate the release on a clean bundle.

## 5. Ризики та Зауваження

* **Multi-Arch:** Переконайтеся, що Docker buildx налаштований для збірки `linux/arm64` та `linux/amd64`.
* **Ресурси:** На Oracle Free Tier (24GB RAM) запускайте тільки легкі сервіси (Backend, UI). Важкі AI моделі повинні працювати на NVIDIA сервері.
* **Безпека:** Всі API ключі мають зберігатися в HashiCorp Vault (інтегровано через ExternalSecrets), а не в коді.
