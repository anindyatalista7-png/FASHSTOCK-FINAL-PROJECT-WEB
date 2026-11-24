SELECT current_database() AS database_aktif;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'sessions', 'categories', 'products', 'transactions')
ORDER BY table_name, ordinal_position;
