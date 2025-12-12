# AUTOMATION PLAYBOOK

**Purpose:** Comprehensive reference for ALL automation solutions. Read this BEFORE claiming "I can't automate X."

**Last Updated:** 2025-12-11

---

## Table of Contents
1. [Supabase Database Operations](#supabase-database-operations)
2. [Vercel Deployments](#vercel-deployments)
3. [AWS EC2 Management](#aws-ec2-management)
4. [GitHub Operations](#github-operations)
5. [iOS App Store Automation](#ios-app-store-automation)
6. [Testing & Verification](#testing--verification)
7. [Error Monitoring & Log Checking](#error-monitoring--log-checking) **← NEW**
8. [Environment Management](#environment-management)

---

## Supabase Database Operations

### Running Migrations (THE ONE I KEEP FORGETTING)

**NEVER say "I can't run migrations" - YES YOU CAN via psql command-line!**

#### Method 1: Direct psql Command
```bash
PGPASSWORD='YOUR_DB_PASSWORD' psql \
  -h db.YOUR_PROJECT_ID.supabase.co \
  -U postgres \
  -d postgres \
  -f migration.sql
```

#### Method 2: Using Environment Variables
```bash
# Store credentials in .env first
export SUPABASE_DB_PASSWORD="YOUR_DB_PASSWORD"
export SUPABASE_HOST="db.YOUR_PROJECT_ID.supabase.co"

# Then run migration
PGPASSWORD=$SUPABASE_DB_PASSWORD psql \
  -h $SUPABASE_HOST \
  -U postgres \
  -d postgres \
  -f migration.sql
```

#### Method 3: Using Script (Preferred)
Create `scripts/database/run-migration.sh`:
```bash
#!/bin/bash
set -e

source ../../credentials/.env

if [ -z "$1" ]; then
    echo "Error: No migration file specified"
    echo "Usage: ./run-migration.sh path/to/migration.sql"
    exit 1
fi

MIGRATION_FILE="$1"

echo "Running migration: $MIGRATION_FILE"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$SUPABASE_HOST" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    -f "$MIGRATION_FILE"

echo "Migration completed successfully"
```

Usage:
```bash
chmod +x scripts/database/run-migration.sh
./scripts/database/run-migration.sh migrations/001_create_users.sql
```

### Schema Verification Before Migration

**ALWAYS verify schema before running INSERT/UPDATE migrations:**

```sql
-- Check what columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'YOUR_TABLE_NAME'
ORDER BY ordinal_position;
```

### Checking Auth Users
```bash
PGPASSWORD=$SUPABASE_DB_PASSWORD psql \
  -h $SUPABASE_HOST \
  -U postgres \
  -d postgres \
  -c "SELECT id, email FROM auth.users;"
```

### Checking User Profiles
```bash
PGPASSWORD=$SUPABASE_DB_PASSWORD psql \
  -h $SUPABASE_HOST \
  -U postgres \
  -d postgres \
  -c "SELECT * FROM public.user_profiles;"
```

---

## Vercel Deployments

### Automated Deployment (Don't Ask User to Deploy Manually)

#### Method 1: Using Vercel Token
```bash
VERCEL_TOKEN="YOUR_TOKEN" npx vercel --prod --yes
```

#### Method 2: Using Vercel CLI (If Logged In)
```bash
npx vercel --prod --yes
```

#### Method 3: Push to GitHub (If Auto-Deploy Configured)
```bash
git add .
git commit -m "Deploy changes"
git push origin main
```

### Vercel Environment Variables
```bash
# List environment variables
npx vercel env ls

# Add environment variable
npx vercel env add SUPABASE_URL production

# Pull environment variables locally
npx vercel env pull .env.local
```

### Vercel Logs
```bash
# View deployment logs
npx vercel logs YOUR_DEPLOYMENT_URL

# Stream logs in real-time
npx vercel logs --follow
```

---

## AWS EC2 Management

### Starting/Stopping Instances
```bash
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
export AWS_DEFAULT_REGION="us-east-2"

# Start instance
aws ec2 start-instances --instance-ids i-YOUR_INSTANCE_ID

# Stop instance
aws ec2 stop-instances --instance-ids i-YOUR_INSTANCE_ID

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids i-YOUR_INSTANCE_ID
```

### Running Commands on EC2 via SSM
```bash
# Send command
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "i-YOUR_INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /path/to/app && git pull && pm2 restart all"]' \
  --query 'Command.CommandId' \
  --output text)

# Get command output
aws ssm get-command-invocation \
  --command-id "$COMMAND_ID" \
  --instance-id "i-YOUR_INSTANCE_ID" \
  --query 'StandardOutputContent' \
  --output text
```

### Deploying to EC2
Create `scripts/deployment/deploy-to-ec2.sh`:
```bash
#!/bin/bash
set -e

source ../../credentials/.env

INSTANCE_ID="$AWS_EC2_INSTANCE_ID"
APP_PATH="/home/ubuntu/app"

echo "Deploying to EC2 instance: $INSTANCE_ID"

# Send deployment commands
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'cd $APP_PATH',
    'git pull origin main',
    'npm install',
    'npm run build',
    'pm2 restart all'
  ]" \
  --query 'Command.CommandId' \
  --output text)

echo "Command sent: $COMMAND_ID"
echo "Waiting for completion..."

# Wait and get output
sleep 10
aws ssm get-command-invocation \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID"
```

---

## GitHub Operations

### Creating and Pushing Commits
```bash
git add .
git commit -m "$(cat <<'EOF'
Your commit message here

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push origin main
```

### Creating Pull Requests
```bash
# Create PR using GitHub CLI
gh pr create \
  --title "Your PR Title" \
  --body "$(cat <<'EOF'
## Summary
- Bullet points of changes

## Test Plan
- How to test

Generated with Claude Code
EOF
)"
```

### Checking GitHub Actions Status
```bash
# List recent workflow runs
gh run list --limit 5

# View specific run
gh run view RUN_ID

# Watch run in real-time
gh run watch RUN_ID
```

---

## iOS App Store Automation

### Building and Deploying with Fastlane
```bash
# Navigate to iOS directory
cd ios

# Build and upload to TestFlight
bundle exec fastlane beta

# Or if using system Ruby
/opt/homebrew/opt/ruby/bin/bundle exec fastlane beta
```

### Incrementing Build Number
```bash
cd ios

# Get current version
agvtool what-version

# Increment build number
agvtool next-version -all
```

### Managing Provisioning Profiles
```bash
# List installed profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Install profile (save with UUID filename)
cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/PROFILE_UUID.mobileprovision
```

---

## Testing & Verification

### Playwright Testing (MUST DO BEFORE CLAIMING SUCCESS)

Create `scripts/automation/test-deployment.py`:
```python
#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright

async def test_deployment(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to URL
        response = await page.goto(url, wait_until="networkidle")

        # Check status
        print(f"Status: {response.status}")
        print(f"URL: {page.url}")
        print(f"Title: {await page.title()}")

        # Take screenshot
        await page.screenshot(path="/tmp/deployment-test.png")

        await browser.close()

        return response.status == 200

if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    success = asyncio.run(test_deployment(url))
    sys.exit(0 if success else 1)
```

Usage:
```bash
python3 scripts/automation/test-deployment.py https://www.yourapp.com
```

### Health Check Endpoints
```bash
# Check API health
curl -s http://localhost:8000/api/health | python3 -m json.tool

# Check with timeout
timeout 10 curl -s http://localhost:8000/api/health
```

---

## Error Monitoring & Log Checking

**CRITICAL:** Instead of user copy/pasting errors, I can check them DIRECTLY.

### Check Frontend Console Errors (No Copy/Paste Needed!)

**Problem:** User shouldn't have to copy/paste console errors

**Solution:** Use Playwright to automatically capture ALL console errors

```bash
cd scripts/automation
python3 check-frontend-errors.py https://www.tradeflyai.com
```

**What it does:**
- Loads page with Playwright
- Captures ALL console errors, warnings, page errors
- Detects failed network requests (404s, 500s, etc.)
- Takes screenshot for reference
- Shows complete error report without user intervention

**Output Example:**
```
🔴 CONSOLE ERRORS (3):
  [1] Failed to load resource: the server responded with a status of 404
      Location: https://www.tradeflyai.com/api/signals
  [2] Uncaught TypeError: Cannot read property 'map' of undefined
      Location: app.js:42
...
```

**Script Location:** `scripts/automation/check-frontend-errors.py`

---

### Check Backend Logs (No Copy/Paste Needed!)

**Problem:** User shouldn't have to copy/paste backend log errors

**Solution:** Automatically search log files for errors and warnings

```bash
cd scripts/automation
./check-backend-logs.sh

# Or check specific log file
./check-backend-logs.sh /path/to/app.log
```

**What it does:**
- Searches common log locations (*.log, logs/*.log, etc.)
- Counts errors and warnings
- Shows last 10 errors (most recent)
- Shows last 5 warnings
- Displays last 5 log lines for context

**Output Example:**
```
🔴 ERRORS (12):
  > [ERROR] Database connection failed: ECONNREFUSED
  > [ERROR] API endpoint /api/signals returned 500
...

⚠️  WARNINGS (3):
  > [WARN] Deprecated function used in auth.js:45
...
```

**Script Location:** `scripts/automation/check-backend-logs.sh`

---

### Check Vercel Deployment Logs (No Copy/Paste Needed!)

**Problem:** User shouldn't have to navigate to Vercel dashboard

**Solution:** Automatically fetch deployment status and logs via CLI

```bash
cd scripts/automation
./check-vercel-deployment.sh
```

**What it does:**
- Gets latest Vercel deployment URL
- Checks HTTP status (should be 200)
- Fetches recent deployment logs
- Searches logs for errors
- Reports any issues found

**Output Example:**
```
✅ Latest: https://project-abc123.vercel.app
✅ Deployment is live (HTTP 200)

📋 Recent deployment logs:
  [Build] Installing dependencies...
  [Build] Build complete
  [Deploy] Deployment ready

✅ No errors in deployment logs
```

**Script Location:** `scripts/automation/check-vercel-deployment.sh`

---

### Full System Health Check (Run Everything!)

**Problem:** Need to check multiple things manually

**Solution:** One script that runs ALL checks

```bash
cd scripts/automation
./full-system-check.sh https://www.tradeflyai.com
```

**What it does:**
- Runs frontend error check
- Runs deployment test
- Runs backend log check
- Runs Vercel deployment check
- Gives overall pass/fail summary

**Output Example:**
```
╔════════════════════════════════════════╗
║     FULL SYSTEM HEALTH CHECK          ║
╚════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running: Frontend Console Errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASSED: Frontend Console Errors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running: Backend Log Errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASSED: Backend Log Errors

╔════════════════════════════════════════╗
║           FINAL SUMMARY                ║
╚════════════════════════════════════════╝

Checks passed: 4
Checks failed: 0
Pass rate: 100%

╔════════════════════════════════════════╗
║   ✅ ALL CHECKS PASSED!                ║
╚════════════════════════════════════════╝
```

**Script Location:** `scripts/automation/full-system-check.sh`

---

### IMPORTANT: When to Use These

**Instead of asking user for error messages:**

❌ **WRONG:** "Can you copy the console error and paste it here?"

✅ **RIGHT:**
```bash
# Run error check directly
python3 scripts/automation/check-frontend-errors.py https://www.tradeflyai.com

# See all errors immediately
```

**Instead of asking user to check logs:**

❌ **WRONG:** "Can you check the backend logs for errors?"

✅ **RIGHT:**
```bash
# Check logs directly
./scripts/automation/check-backend-logs.sh

# See all errors immediately
```

**Instead of manual verification:**

❌ **WRONG:** Deploy → Tell user "it's working" → Hope it works

✅ **RIGHT:**
```bash
# Deploy
./scripts/deployment/deploy-to-vercel.sh --prod

# THEN verify
./scripts/automation/full-system-check.sh https://www.tradeflyai.com

# ONLY claim success if checks pass
```

---

## Environment Management

### Loading Environment Variables
```bash
# Method 1: Export from .env file
export $(grep -v '^#' credentials/.env | xargs)

# Method 2: Source .env file
set -a
source credentials/.env
set +a

# Method 3: Use with specific command
env $(cat credentials/.env | xargs) npm run dev
```

### Credential File Template
Create `credentials/.env.template`:
```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DB_PASSWORD=your_db_password
SUPABASE_HOST=db.YOUR_PROJECT_ID.supabase.co
SUPABASE_USER=postgres
SUPABASE_DB=postgres

# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-2
AWS_EC2_INSTANCE_ID=i-your_instance_id

# GitHub
GITHUB_TOKEN=your_github_token

# API Keys
POLYGON_API_KEY=your_polygon_key
OPENAI_API_KEY=your_openai_key
```

---

## Automation Scripts Directory Structure

```
scripts/
├── automation/
│   ├── test-deployment.py          # Playwright testing
│   ├── verify-build.sh             # Build verification
│   └── health-check.sh             # Service health checks
├── deployment/
│   ├── deploy-to-vercel.sh         # Vercel deployment
│   ├── deploy-to-ec2.sh            # EC2 deployment
│   └── deploy-ios.sh               # iOS TestFlight deployment
└── database/
    ├── run-migration.sh            # Run SQL migrations
    ├── backup-db.sh                # Database backups
    └── seed-db.sh                  # Seed test data
```

---

## Key Reminders

1. **NEVER say "I can't automate X"** - Check this playbook first
2. **Supabase migrations:** Use psql command-line, credentials are in `.env`
3. **Vercel deployments:** Use CLI with token, don't ask user to deploy manually
4. **Testing:** ALWAYS verify with Playwright before claiming success
5. **Credentials:** ALL keys/tokens stored in `credentials/` directory
6. **Scripts:** ALL automation scripts in `scripts/` directory with execute permissions

---

## Adding New Automation

When you discover a new automation solution:

1. Document it in this playbook under appropriate section
2. Create reusable script in `scripts/` directory
3. Update DEBUGGING-LOG.md with the problem it solves
4. Test the automation before documenting
5. Include example usage and output

**Format:**
```markdown
### Task Name

**Problem:** What manual task this automates

**Solution:**
```bash
# Command or script
```

**Usage:**
```bash
# Example with actual values
```

**Expected Output:**
```
Sample output here
```
```

---

## Credential Locations Reference

**CRITICAL:** Before asking "where is X credential?", check these locations:

1. `credentials/.env` - Primary credential storage
2. `credentials/services/supabase.env` - Supabase-specific
3. `credentials/services/vercel.env` - Vercel-specific
4. `credentials/services/aws.env` - AWS-specific
5. Backend `.env` files (for reference only, copy to template)

**Workflow:**
- User provides credential → Save to `credentials/.env` immediately
- Update `.env.template` with placeholder
- Document in DEBUGGING-LOG.md when credential was added
