SELECT * FROM al_company_stakeholders
INNER JOIN product_al_company ON al_company_stakeholders.al_company_id = product_al_company.al_company_id
INNER JOIN products ON product_al_company.product_id = products.id
WHERE products.id = $1;