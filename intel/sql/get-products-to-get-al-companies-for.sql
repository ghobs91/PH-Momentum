SELECT * FROM products
WHERE
  NOT EXISTS (
    SELECT id FROM product_al_company
    WHERE products.id = product_al_company.product_id
  )
;