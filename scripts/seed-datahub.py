"""Load ContextSeal's synthetic retail graph into a disposable local DataHub."""

import json
import warnings

warnings.simplefilter("ignore")

from datahub.sdk import DataHubClient, Dataset


ASSETS = [
    {"key": "customers", "platform": "snowflake", "name": "retail.gold.customers", "display_name": "gold_customers", "description": "Tier-1 customer contact dataset used by the ContextSeal local demonstration.", "schema": [("customer_id", "varchar", "Stable customer identifier"), ("customer_email", "varchar", "Personal email address"), ("updated_at", "timestamp", "Last source update")], "owners": ["customer-data"], "tags": ["PII", "Tier1"], "upstream": None},
    {"key": "segments_job", "platform": "airflow", "name": "customer_360.build_segments", "display_name": "build_segments", "description": "Airflow-produced segment build output.", "schema": [("customer_id", "varchar"), ("segment", "varchar")], "owners": ["growth-data"], "tags": ["Tier1"], "upstream": "customers"},
    {"key": "segments", "platform": "snowflake", "name": "retail.analytics.customer_segments", "display_name": "customer_segments", "description": "Customer segments consumed by analytics and ML.", "schema": [("customer_id", "varchar"), ("segment", "varchar")], "owners": ["growth-data"], "tags": ["Tier1"], "upstream": "segments_job"},
    {"key": "health_dashboard", "platform": "looker", "name": "executive_customer_health", "display_name": "Executive Customer Health", "description": "Executive customer-health reporting surface.", "schema": [("customer_id", "varchar"), ("health_score", "double")], "owners": ["customer-success"], "tags": ["Executive"], "upstream": "segments"},
    {"key": "churn_model", "platform": "mlflow", "name": "churn_prediction", "display_name": "churn_prediction", "description": "Production churn prediction feature surface.", "schema": [("customer_id", "varchar"), ("churn_probability", "double")], "owners": ["ml-platform"], "tags": ["Production"], "upstream": "segments"},
    {"key": "retention_dashboard", "platform": "powerbi", "name": "retention_campaign", "display_name": "Retention Campaign", "description": "Retention campaign reporting surface powered by churn scores.", "schema": [("customer_id", "varchar"), ("campaign", "varchar")], "owners": ["marketing-analytics"], "tags": ["Campaign"], "upstream": "churn_model"},
]


def main() -> None:
    client = DataHubClient.from_env()
    entities = {}
    for item in ASSETS:
        entity = Dataset(
            platform=item["platform"], name=item["name"], env="PROD",
            display_name=item["display_name"], description=item["description"],
            schema=item["schema"],
            owners=[f"urn:li:corpuser:{owner}" for owner in item["owners"]],
            tags=[f"urn:li:tag:{tag}" for tag in item["tags"]],
            custom_properties={"contextseal_fixture": "true", "evidence_boundary": "synthetic-local"},
        )
        if item["upstream"]:
            entity.set_upstreams([str(entities[item["upstream"]].urn)])
        client.entities.upsert(entity)
        entities[item["key"]] = entity

    print(json.dumps({
        "status": "PASS",
        "evidenceBoundary": "Synthetic local DataHub metadata; no production data.",
        "assets": len(entities),
        "targetUrn": str(entities["customers"].urn),
        "urns": {key: str(entity.urn) for key, entity in entities.items()},
    }, indent=2))


if __name__ == "__main__":
    main()
