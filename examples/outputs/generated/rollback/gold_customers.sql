-- Rollback keeps the original field authoritative
select
  customer_id,
  customer_email,
  updated_at
from {{ ref('gold_customers_contextseal') }}
