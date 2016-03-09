CREATE TABLE products (
  id INT8 PRIMARY KEY,
  name TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ,
  day DATE,
  discussion_url TEXT,
  redirect_url TEXT,
  product_url TEXT,
  screenshot_url JSON,
  "current_user" JSON,
  maker_inside JSON,
  "user" JSON
);

CREATE TABLE product_url_fetch_attempted (
  id INT8 PRIMARY KEY REFERENCES products(id)
);

CREATE TABLE product_counts (
  id INT8 PRIMARY KEY REFERENCES products(id),
  comments_count INT8,
  votes_count INT8
);

CREATE TABLE al_companies (
  id INT8 PRIMARY KEY,
  data json
);

CREATE TABLE al_company_stakeholders (
  id SERIAL PRIMARY KEY,
  al_company_id INT8 REFERENCES al_companies(id), -- NULL IF NOT FOUND ON ANGEL LIST
  data json,
  twitter_handle TEXT
);

CREATE TABLE product_al_company (
  id SERIAL PRIMARY KEY,
  product_id INT8 REFERENCES products(id),
  al_company_id INT8 REFERENCES al_companies(id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  product_id INT8 REFERENCES products(id),
  num_votes INT8
);

-- TODO MAKE INDEXES!