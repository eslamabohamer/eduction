SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
AND table_schema = 'public'
AND table_name IN ('users', 'students', 'activity_logs');
