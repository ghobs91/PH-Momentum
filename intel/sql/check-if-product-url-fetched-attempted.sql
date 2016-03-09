SELECT id FROM product_url_fetch_attempted
WHERE id = $1
LIMIT 1;