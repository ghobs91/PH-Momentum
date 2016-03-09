WITH upsert AS (
  UPDATE product_counts SET
    votes_count = $2,
    comments_count = $3
  WHERE id = $1
  RETURNING *
)

INSERT INTO product_counts (id, votes_count, comments_count)
SELECT $1, $2, $3
WHERE NOT EXISTS (
  SELECT 1 FROM upsert
);