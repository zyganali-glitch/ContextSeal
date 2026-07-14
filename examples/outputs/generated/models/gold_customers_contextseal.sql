-- ContextSeal safe expansion: keep the old field during consumer migration
select
  *,
  customer_email as contact_email
from {{ ref('gold_customers') }}
