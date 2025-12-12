#!/bin/bash

# Read credentials from backend .env
SUPABASE_URL="https://nplgxhthjwwyywbnvxzt.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGd4aHRoand3eXl3Ym52eHp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE5MjE3MSwiZXhwIjoyMDc5NzY4MTcxfQ.qGhvTBRJ1Q49JvCOQ5Gb5IciFhsNFzEiEYQQ5wDZj9I"

# Run the SQL migration
echo "Running SQL migration..."
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @- << 'SQL'
{
  "query": "ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true; ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS notification_browser BOOLEAN DEFAULT true;"
}
SQL

echo ""
echo "✅ Migration completed!"
