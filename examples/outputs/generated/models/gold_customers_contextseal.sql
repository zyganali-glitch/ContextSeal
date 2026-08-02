-- ContextSeal safe expansion: keep the old field during consumer migration
select
  customer_id,
  customer_email,
  updated_at,
  customer_email as contact_email
from {{ ref('gold_customers') }}
