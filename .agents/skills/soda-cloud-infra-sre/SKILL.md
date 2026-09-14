---
name: soda-cloud-infra-sre
version: "1.0.0"
description: >-
  Cloud infrastructure, Site Reliability Engineering (SRE), Kubernetes (K8s) topology,
  Terraform / OpenTofu Infrastructure as Code (IaC), SRE Golden Signals monitoring,
  99.99% SLA / SLO / Error Budgets, distributed tracing (OpenTelemetry), and multi-region
  High Availability (HA). Use on goals provisioning cloud resources, creating K8s manifests,
  configuring CI/CD deployment pipelines, or setting up SRE observability. Triggers:
  cloud infra, sre, kubernetes, k8s, terraform, iac, opentelemetry, prometheus, grafana,
  slo, error budget, high availability. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Cloud infrastructure, Kubernetes & SRE observability

**Model:** Infrastructure Demand → **IaC Declarative Blueprint (Terraform) → Kubernetes Manifests & HPA → SRE Golden Signals Telemetry → Chaos & Disaster Verification**

This skill guarantees that all Soda OS deployments are **declaratively defined via Infrastructure as Code (IaC), containerized via Kubernetes, monitored across the 4 SRE Golden Signals, and architected for 99.99% High Availability**.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-deploy-staging](../soda-deploy-staging/SKILL.md) and [soda-incident-response](../soda-incident-response/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Infrastructure as Code (IaC) only** | Zero manual console clicking in cloud providers. Every server, database, VPC, and DNS record MUST be declared in Terraform / OpenTofu. |
| **Immutability & stateless containers** | Application workloads run as stateless containers (Pods). State is offloaded to managed HA database and object storage clusters. |
| **SRE 4 Golden Signals** | Monitor **Latency**, **Traffic**, **Errors**, and **Saturation** continuously with automated alerting on SLO breach. |
| **Error budgets drive velocity** | Feature releases continue at maximum velocity while Error Budget $> 0$; if Error Budget depletes ($< 0$), releases halt to prioritize stability. |
| **Human approves production infrastructure** | Applying Terraform plans or altering production cluster topology requires explicit human sign-off. |

## Where infrastructure artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Infrastructure blueprint** | `docs/03-architecture/cloud-infrastructure.md` | product |
| **Terraform / IaC modules** | `code/**/infra/terraform/` | product |
| **Kubernetes manifests / Helm** | `code/**/infra/k8s/` | product |
| **SRE SLO & Alerting rules** | `docs/03-architecture/slo-definitions.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal provisions cloud infrastructure, configures K8s clusters, or sets up SRE metrics | **Auto-run this skill during PLAN & EXECUTE.** Write Terraform modules, K8s manifests, and Prometheus/Grafana dashboards |
| User says **"cloud infra G-xxx"** / **"sre G-xxx"** | Produce or refine the cloud infrastructure and SRE specification for that goal |
| User says **"kubernetes"** / **"k8s manifests"** | Stage 2 — author Deployment, Service, Ingress, and HPA configurations |
| User says **"opentelemetry"** / **"golden signals"** | Stage 3 — configure OpenTelemetry SDK and Prometheus alerting rules |
| User says **"slo"** / **"error budget"** | Stage 4 — formulate SLO calculation and automated freeze thresholds |
| User says **"disaster recovery"** / **"multi-region"** | Stage 5 — verify active-active failover and automated health probes |

---

## The cloud infrastructure & SRE lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Declarative IaC topology (Terraform / OpenTofu) (PLAN)

Define isolated VPCs, subnets, managed Kubernetes (EKS/GKE/Civo), and PostgreSQL clusters:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "soda-os-prod-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
}
```

**Deliverable:** Terraform modules in `code/**/infra/terraform/`.  
**Gate:** `terraform plan` executes cleanly with zero syntax or provider errors.

### Stage 2 — Kubernetes workloads, resources & auto-scaling (PLAN → EXECUTE)

1. Author K8s manifests: `Deployment`, `Service`, `HorizontalPodAutoscaler` (HPA), and `NetworkPolicy`.
2. Hard CPU/Memory limits to prevent noisy-neighbor container starvation:
   - Requests: `cpu: 250m`, `memory: 512Mi`
   - Limits: `cpu: 1000m`, `memory: 1024Mi`
3. HPA scales dynamically from 2 to 10 replicas when average CPU $> 70\%$.

**Deliverable:** Kubernetes manifests in `code/**/infra/k8s/`.  
**Gate:** Health probes (`livenessProbe`, `readinessProbe`) respond within $< 2\text{s}$.

### Stage 3 — SRE 4 Golden Signals & OpenTelemetry tracing (EXECUTE)

Instrument workloads with OpenTelemetry:

| Golden Signal | Metric Definition | Target SLO |
| :--- | :--- | :--- |
| **Latency** | Time taken to serve HTTP/gRPC requests | p95 $< 100\text{ms}$, p99 $< 250\text{ms}$ |
| **Traffic** | Total incoming requests per second (RPS) | Scalable from 100 to 10,000 RPS |
| **Errors** | Rate of requests failing with $5\text{xx}$ HTTP status | Error rate $< 0.05\%$ ($99.95\%$ success) |
| **Saturation** | Memory and CPU consumption percentage | Average cluster saturation $\le 65\%$ |

**Deliverable:** Prometheus recording rules and Grafana dashboard JSON.  
**Gate:** Alert fires within $< 60\text{s}$ upon synthetic error rate injection.

### Stage 4 — Multi-Region HA & automated failover (EXECUTE)

1. Active-Active multi-region deployment with Anycast DNS / Cloudflare load balancing.
2. Cross-region asynchronous database replication.
3. Automated health checks rerouting traffic in $< 30\text{s}$ if a region experiences an outage.

**Deliverable:** Multi-region failover architecture document.  
**Gate:** Chaos simulation (killing primary region) maintains uninterrupted uptime.

### Stage 5 — Production readiness & security review (REVIEW)

- [ ] Containers run as non-root users (`securityContext.runAsNonRoot: true`).
- [ ] Secrets injected exclusively via external secrets manager (AWS Secrets Manager / Vault), never in environment variables.
- [ ] Automated daily vulnerability container scanning (Trivy / Snyk) reports zero High/Critical CVEs.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Author modular, reusable Terraform modules and declarative K8s manifests | Execute destructive `terraform apply` or `kubectl delete` commands on production without human approval |
| Establish quantitative SRE Golden Signal dashboards and alerting thresholds | Deploy containers without explicit memory/CPU limits or readiness probes |
| Configure automated multi-region active-active failover topologies | Store cloud provider access keys or credentials in source code or manifests |

---

## Related

- [soda-deploy-staging](../soda-deploy-staging/SKILL.md) — Staging deployment automation
- [soda-incident-response](../soda-incident-response/SKILL.md) — Production incident triage
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Cloud security hardening
