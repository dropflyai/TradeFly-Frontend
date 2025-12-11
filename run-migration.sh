#!/bin/bash
# Auto-run Supabase migrations using psql
# Usage: ./run-migration.sh migration-file.sql

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Supabase connection details
SUPABASE_HOST="db.nplgxhthjwwyywbnvxzt.supabase.co"
SUPABASE_USER="postgres"
SUPABASE_DB="postgres"

# Check if migration file provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No migration file specified${NC}"
    echo "Usage: ./run-migration.sh migration-file.sql"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Running migration: $(basename $MIGRATION_FILE)${NC}"

# Check if we have the password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_DB_PASSWORD not set in environment${NC}"
    echo "Please enter Supabase database password:"
    read -s SUPABASE_DB_PASSWORD
    echo
fi

# Run the migration
echo -e "${YELLOW}📊 Executing SQL...${NC}"

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$SUPABASE_HOST" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    -f "$MIGRATION_FILE" \
    2>&1 | tee /tmp/migration-output.log

# Check if successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed. Check output above.${NC}"
    exit 1
fi
