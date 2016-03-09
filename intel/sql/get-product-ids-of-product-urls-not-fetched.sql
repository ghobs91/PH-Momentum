SELECT id FROM products
WHERE
  NOT EXISTS (
    SELECT product_url_fetch_attempted.id FROM product_url_fetch_attempted
    WHERE products.id = product_url_fetch_attempted.id
  )
;