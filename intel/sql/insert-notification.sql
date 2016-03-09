INSERT INTO notifications (product_id, num_votes)
SELECT $1, $2
WHERE NOT EXISTS (
  SELECT 1 FROM notifications WHERE product_id = $1 AND num_votes = $2
)