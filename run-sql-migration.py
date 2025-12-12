#!/usr/bin/env python3
"""
Run SQL migration using Supabase Python client
"""
import sys
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://nplgxhthjwwyywbnvxzt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGd4aHRoand3eXl3Ym52eHp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE5MjE3MSwiZXhwIjoyMDc5NzY4MTcxfQ.qGhvTBRJ1Q49JvCOQ5Gb5IciFhsNFzEiEYQQ5wDZj9I"

# SQL to run
SQL = """
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_browser BOOLEAN DEFAULT true;
"""

print("🔄 Running SQL migration...")

try:
    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Execute SQL via RPC
    result = supabase.rpc('exec_sql', {'query': SQL}).execute()

    print("✅ Migration completed successfully!")
    print(f"Result: {result}")

except Exception as e:
    print(f"❌ Migration failed: {e}")
    sys.exit(1)
