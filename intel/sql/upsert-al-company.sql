WITH upsert AS (
  UPDATE al_companies SET
    data = $2
  WHERE id = $1
  RETURNING *
)

INSERT INTO al_companies (id, data)
SELECT $1, $2
WHERE NOT EXISTS (
  SELECT 1 FROM upsert
)

RETURNING *;