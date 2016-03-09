SELECT id FROM al_companies
WHERE
  NOT EXISTS (
    SELECT al_company_stakeholders_fetch_attempted.id FROM al_company_stakeholders_fetch_attempted
    WHERE al_companies.id = al_company_stakeholders_fetch_attempted.id
  )
;