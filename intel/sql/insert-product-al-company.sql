INSERT INTO product_al_company (product_id, al_company_id)
VALUES ($1, $2) RETURNING *;