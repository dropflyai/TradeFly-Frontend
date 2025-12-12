#!/usr/bin/env python3
from supabase import create_client

SUPABASE_URL = "https://nplgxhthjwwyywbnvxzt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGd4aHRoand3eXl3Ym52eHp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE5MjE3MSwiZXhwIjoyMDc5NzY4MTcxfQ.qGhvTBRJ1Q49JvCOQ5Gb5IciFhsNFzEiEYQQ5wDZj9I"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Try to query user_profiles to see if columns exist
try:
    result = supabase.table('user_profiles').select('notification_email, notification_browser').limit(1).execute()
    print("✅ Columns exist! Migration was successful.")
    print(f"Sample data: {result.data}")
except Exception as e:
    print(f"❌ Columns don't exist yet: {e}")
