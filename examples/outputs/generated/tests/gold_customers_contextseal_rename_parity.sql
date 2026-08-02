-- ContextSeal rename parity test: returns rows only when compatibility values diverge
select
  customer_email as source_value,
  contact_email as compatibility_value
from {{ ref('gold_customers_contextseal') }}
where customer_email is distinct from contact_email
