SELECT products.*, product_counts.votes_count, product_counts.comments_count, n.num_votes AS notifications_sent_for_num_votes FROM products
LEFT JOIN product_counts ON products.id = product_counts.id
LEFT JOIN (
  SELECT product_id, num_votes FROM notifications GROUP BY product_id, num_votes ORDER BY num_votes DESC
) AS n ON products.id = n.product_id
WHERE created_at > (((now() AT TIME ZONE 'America/Los_Angeles')::date - interval '1 day')::date AT TIME ZONE 'America/Los_Angeles')::timestamptz
;