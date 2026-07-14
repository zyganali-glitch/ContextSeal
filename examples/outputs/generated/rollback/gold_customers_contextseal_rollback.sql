-- Roll back the generated expansion while the original field remains authoritative.
select * exclude (contact_email) from {{ ref('gold_customers_contextseal') }};
