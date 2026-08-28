# T-Shirt Store API — Production Architecture 

1. Diagram 
![Diagram](architecture.png)
2. Rationale 
- Queue (BullMQ): "BullMQ is the right default because it runs on the Redis instance you likely already have, integrates natively, and handles complex job lifecycle features (like delays, retries, and priorities) out of the box. Rabbit and Kafka are used for multiple independent services that must communicate async, e.g. streaming." Switch condition: "if we scale to multiple services, or need cross-service events."
- Deploy shape: "Separate [API and worker], worker scales independently. Postgres and Redis managed separately." Migrations: "add new column first, remove old one after deploy" (expand-contract). Rollback: "migration stays since it was additive" — only the code gets rolled back.
- Monitoring: "I would take stock consistency, this matters for stocking decisions. SKU race, for user experience, to show what exactly happened. And the layer of authorization with CASL."

3. Known risks 
- Partial failure: "Order is paid but stock wasn't reduced" → risk: "overselling, we could sell more than we have" → fix: "idempotency key on the order id."
- Top OWASP risks: 
  - role check on product creation (BFLA — Broken Function Level Authorization), - session not revoked on password reset (Broken Authentication)
  - SKU race condition (inconsistent error handling — ⚠️ note: not "double variants," the DB's UNIQUE constraint already blocks that; the real issue is a raw 500 instead of a clean 409 under concurrency).
- E2E/regression gap: "Without e2e testing I cannot catch if one user has access to create products."
- Connection pooling: "Per-instance limiting is best [for now], I need to focus on preventing overselling though. I would use PgBouncer after my limit of 10 replicas."