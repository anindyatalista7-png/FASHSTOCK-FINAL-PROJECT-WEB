SELECT current_database() AS database_aktif;
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema IN ('public','fashstock_web') AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;
SELECT id, name, company_name, email, role, status
FROM fashstock_web.users WHERE role = 'supplier' ORDER BY id;
