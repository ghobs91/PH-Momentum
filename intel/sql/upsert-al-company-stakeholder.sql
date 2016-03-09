WITH upsert AS (
  UPDATE al_company_stakeholders SET
    data = $2,
    twitter_handle = $3
  WHERE al_company_id = $1
  RETURNING *
)

INSERT INTO al_company_stakeholders (al_company_id, data, twitter_handle)
SELECT $1, $2, $3
WHERE NOT EXISTS (
  SELECT 1 FROM upsert
)

RETURNING *;