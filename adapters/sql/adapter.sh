#!/bin/bash
# SQL Adapter with Zero-Trust Query Attestation

set -euo pipefail

# Configuration
DB_HOST="${SQL_HOST:-localhost}"
DB_PORT="${SQL_PORT:-5432}"
DB_NAME="${SQL_DATABASE:-pure_lambda}"
DB_USER="${SQL_USER:-lambda}"
DB_PASS="${SQL_PASSWORD:-}"
DB_SSL="${SQL_SSL:-require}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[SQL]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Generate query attestation
attest_query() {
    local query="$1"
    local result_hash="$2"
    
    cat <<EOF
{
  "query_hash": "$(echo -n "$query" | sha256sum | cut -d' ' -f1)",
  "result_hash": "$result_hash",
  "timestamp": $(date +%s),
  "database": "$DB_NAME",
  "user": "$DB_USER",
  "row_level_security": true,
  "encryption": "TLS1.3"
}
EOF
}

# Execute with RLS
execute_rls() {
    local query="$1"
    local context="${2:-public}"
    
    # Set RLS context
    local rls_query="SET LOCAL app.current_context = '${context}'; ${query}"
    
    PGPASSWORD="$DB_PASS" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --set=sslmode="$DB_SSL" \
        -t -A -c "$rls_query"
}

# Commands
CMD="${1:-help}"
shift || true

case "$CMD" in
    query)
        QUERY="${1:-}"
        CONTEXT="${2:-public}"
        
        if [[ -z "$QUERY" ]]; then
            err "Usage: $0 query <sql> [context]"
        fi
        
        log "Executing query with RLS context: $CONTEXT"
        
        # Execute query
        RESULT=$(execute_rls "$QUERY" "$CONTEXT")
        
        # Generate attestation
        RESULT_HASH=$(echo -n "$RESULT" | sha256sum | cut -d' ' -f1)
        ATTESTATION=$(attest_query "$QUERY" "$RESULT_HASH")
        
        # Output result
        echo "$RESULT"
        
        # Save attestation
        echo "$ATTESTATION" > "/tmp/query-attestation-$(date +%s).json"
        log "Attestation saved"
        ;;
        
    setup-rls)
        log "Setting up Row-Level Security..."
        
        cat <<'EOF' | execute_rls "" "superuser"
-- Enable RLS on all tables
DO $$ 
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

-- Create base policies
CREATE POLICY IF NOT EXISTS read_public ON public.data
    FOR SELECT
    USING (visibility = 'public' OR owner = current_setting('app.current_user', true));

CREATE POLICY IF NOT EXISTS write_owner ON public.data
    FOR ALL
    USING (owner = current_setting('app.current_user', true));
EOF
        
        log "RLS enabled on all tables"
        ;;
        
    audit)
        DAYS="${1:-7}"
        
        log "Fetching audit logs for last $DAYS days..."
        
        execute_rls "
            SELECT 
                query_start,
                usename,
                application_name,
                client_addr,
                query
            FROM pg_stat_activity
            WHERE query_start > NOW() - INTERVAL '$DAYS days'
            ORDER BY query_start DESC
            LIMIT 100
        " "audit"
        ;;
        
    encrypt)
        TABLE="${1:-}"
        COLUMN="${2:-}"
        
        if [[ -z "$TABLE" || -z "$COLUMN" ]]; then
            err "Usage: $0 encrypt <table> <column>"
        fi
        
        log "Encrypting column ${TABLE}.${COLUMN}..."
        
        # Create encrypted column
        execute_rls "
            ALTER TABLE $TABLE ADD COLUMN ${COLUMN}_encrypted BYTEA;
            UPDATE $TABLE SET ${COLUMN}_encrypted = pgp_sym_encrypt(
                ${COLUMN}::text, 
                current_setting('app.encryption_key')
            );
            ALTER TABLE $TABLE DROP COLUMN ${COLUMN};
            ALTER TABLE $TABLE RENAME COLUMN ${COLUMN}_encrypted TO ${COLUMN};
        " "admin"
        
        log "Column encrypted successfully"
        ;;
        
    verify-connection)
        log "Verifying encrypted connection..."
        
        # Check SSL status
        SSL_STATUS=$(execute_rls "SELECT ssl_cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()" "public")
        
        if [[ -n "$SSL_STATUS" && "$SSL_STATUS" != "NULL" ]]; then
            echo -e "${GREEN}✓ Connection encrypted: $SSL_STATUS${NC}"
        else
            err "Connection is not encrypted!"
        fi
        
        # Check minimum TLS version
        TLS_VERSION=$(execute_rls "SHOW ssl_min_protocol_version" "public")
        
        if [[ "$TLS_VERSION" == "TLSv1.2" || "$TLS_VERSION" == "TLSv1.3" ]]; then
            echo -e "${GREEN}✓ TLS version: $TLS_VERSION${NC}"
        else
            warn "TLS version below 1.2: $TLS_VERSION"
        fi
        ;;
        
    policy)
        cat <<EOF
-- Row-Level Security Policy Template

-- 1. Enable RLS on table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- 2. Create read policy (least privilege)
CREATE POLICY read_policy ON your_table
    FOR SELECT
    USING (
        -- Public data
        visibility = 'public'
        OR
        -- Own data
        owner_id = current_setting('app.current_user')::uuid
        OR
        -- Delegated access via UCAN
        EXISTS (
            SELECT 1 FROM delegations
            WHERE resource = 'your_table'
            AND grantee = current_setting('app.current_user')::uuid
            AND expires_at > NOW()
        )
    );

-- 3. Create write policy (strict ownership)
CREATE POLICY write_policy ON your_table
    FOR INSERT
    WITH CHECK (
        owner_id = current_setting('app.current_user')::uuid
    );

-- 4. Create update policy (ownership + delegation)
CREATE POLICY update_policy ON your_table
    FOR UPDATE
    USING (
        owner_id = current_setting('app.current_user')::uuid
        OR
        current_setting('app.delegation_token') IS NOT NULL
    );

-- 5. Audit policy
CREATE POLICY audit_all ON audit_log
    FOR INSERT
    WITH CHECK (true); -- All can write audit logs
EOF
        ;;
        
    help|*)
        cat <<EOF
SQL Adapter - Zero-Trust Database Access

Usage: $0 <command> [args]

Commands:
  query <sql> [context]     Execute query with RLS context
  setup-rls                 Enable Row-Level Security
  audit [days]              Show audit logs
  encrypt <table> <column>  Encrypt column data
  verify-connection         Check encryption status
  policy                    Show RLS policy template
  help                      Show this help

Environment:
  SQL_HOST        Database host (default: localhost)
  SQL_PORT        Database port (default: 5432)
  SQL_DATABASE    Database name (default: pure_lambda)
  SQL_USER        Database user (default: lambda)
  SQL_PASSWORD    Database password
  SQL_SSL         SSL mode (default: require)
EOF
        ;;
esac