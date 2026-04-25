-- Refresh PostgREST schema cache (fixes "Could not find column ... in the schema cache" after migrations)
NOTIFY pgrst, 'reload schema';
