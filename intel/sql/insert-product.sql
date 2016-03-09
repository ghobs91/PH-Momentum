INSERT INTO products (
  id,
  name,
  tagline,
  created_at,
  day,
  discussion_url,
  redirect_url,
  product_url,
  screenshot_url,
  "current_user",
  maker_inside,
  "user"
) SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
WHERE NOT EXISTS (
  SELECT id FROM products WHERE id = $1
)