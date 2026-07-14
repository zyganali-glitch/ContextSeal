-- Rollback keeps the original field authoritative
select * exclude (contact_email) from {{ ref('gold_customers_compat') }};
