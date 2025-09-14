#!/bin/bash
# S3 Adapter with Zero-Trust Storage

set -euo pipefail

# Configuration
BUCKET="${S3_BUCKET:-pure-lambda-interchange}"
REGION="${AWS_REGION:-us-east-1}"
KMS_KEY="${KMS_KEY_ID:-alias/pure-lambda}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[S3]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Generate UCAN token
generate_ucan() {
    local resource="$1"
    local action="$2"
    local ttl="${3:-3600}"
    
    cat <<EOF
{
  "v": "0.9.0",
  "iss": "did:key:$(openssl rand -hex 32)",
  "aud": "did:key:pure-lambda-s3",
  "att": [{
    "with": "s3://${BUCKET}/${resource}",
    "can": "${action}"
  }],
  "exp": $(($(date +%s) + ttl)),
  "nnc": "$(openssl rand -hex 16)"
}
EOF
}

# Commands
CMD="${1:-help}"
shift || true

case "$CMD" in
    put)
        FILE="${1:-}"
        KEY="${2:-}"
        
        if [[ -z "$FILE" || -z "$KEY" ]]; then
            err "Usage: $0 put <file> <key>"
        fi
        
        if [[ ! -f "$FILE" ]]; then
            err "File not found: $FILE"
        fi
        
        log "Uploading $FILE to s3://${BUCKET}/${KEY}"
        
        # Generate content hash
        CONTENT_HASH=$(sha256sum "$FILE" | cut -d' ' -f1)
        
        # Upload with encryption
        aws s3 cp "$FILE" "s3://${BUCKET}/${KEY}" \
            --sse aws:kms \
            --sse-kms-key-id "$KMS_KEY" \
            --metadata "content-hash=${CONTENT_HASH}" \
            --metadata "uploaded-by=$(whoami)" \
            --metadata "uploaded-at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BUCKET" \
            --versioning-configuration Status=Enabled
        
        # Generate UCAN for access
        UCAN=$(generate_ucan "$KEY" "s3:read" 86400)
        echo "$UCAN" > "/tmp/${KEY//\//-}-ucan.json"
        
        log "UCAN token saved: /tmp/${KEY//\//-}-ucan.json"
        log "Content hash: $CONTENT_HASH"
        ;;
        
    get)
        KEY="${1:-}"
        OUTPUT="${2:--}"
        
        if [[ -z "$KEY" ]]; then
            err "Usage: $0 get <key> [output-file]"
        fi
        
        log "Downloading s3://${BUCKET}/${KEY}"
        
        # Download and verify
        if [[ "$OUTPUT" == "-" ]]; then
            aws s3 cp "s3://${BUCKET}/${KEY}" -
        else
            aws s3 cp "s3://${BUCKET}/${KEY}" "$OUTPUT"
            
            # Verify content hash
            EXPECTED_HASH=$(aws s3api head-object \
                --bucket "$BUCKET" \
                --key "$KEY" \
                --query 'Metadata."content-hash"' \
                --output text)
            
            if [[ -n "$EXPECTED_HASH" && "$EXPECTED_HASH" != "None" ]]; then
                ACTUAL_HASH=$(sha256sum "$OUTPUT" | cut -d' ' -f1)
                
                if [[ "$EXPECTED_HASH" == "$ACTUAL_HASH" ]]; then
                    echo -e "${GREEN}✓ Content hash verified${NC}"
                else
                    err "Content hash mismatch!"
                fi
            fi
        fi
        ;;
        
    replicate)
        KEY="${1:-}"
        TARGET_REGION="${2:-}"
        
        if [[ -z "$KEY" || -z "$TARGET_REGION" ]]; then
            err "Usage: $0 replicate <key> <target-region>"
        fi
        
        TARGET_BUCKET="${BUCKET}-${TARGET_REGION}"
        
        log "Replicating to ${TARGET_REGION}..."
        
        # Create target bucket if needed
        aws s3api create-bucket \
            --bucket "$TARGET_BUCKET" \
            --region "$TARGET_REGION" \
            --create-bucket-configuration "LocationConstraint=${TARGET_REGION}" 2>/dev/null || true
        
        # Copy with encryption
        aws s3 cp "s3://${BUCKET}/${KEY}" "s3://${TARGET_BUCKET}/${KEY}" \
            --sse aws:kms \
            --sse-kms-key-id "$KMS_KEY" \
            --copy-props metadata-directive
        
        log "Replicated to s3://${TARGET_BUCKET}/${KEY}"
        ;;
        
    audit)
        KEY="${1:-*}"
        
        log "Generating audit trail for: $KEY"
        
        # List versions
        aws s3api list-object-versions \
            --bucket "$BUCKET" \
            --prefix "${KEY%\*}" \
            --query 'Versions[].{Key:Key,VersionId:VersionId,LastModified:LastModified,Size:Size}' \
            --output table
        
        # Check access logs
        if aws s3api get-bucket-logging --bucket "$BUCKET" >/dev/null 2>&1; then
            log "Access logging is enabled"
        else
            warn "Access logging is not enabled"
        fi
        ;;
        
    policy)
        cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireEncryption",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "RequireUCAN",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*",
      "Condition": {
        "StringLike": {
          "s3:ExistingObjectTag/ucan": "*"
        }
      }
    }
  ]
}
EOF
        ;;
        
    help|*)
        cat <<EOF
S3 Adapter - Zero-Trust Object Storage

Usage: $0 <command> [args]

Commands:
  put <file> <key>              Upload file with encryption
  get <key> [output]            Download and verify file
  replicate <key> <region>      Cross-region replication
  audit [key-prefix]            Show audit trail
  policy                        Display bucket policy
  help                          Show this help

Environment:
  S3_BUCKET       S3 bucket name (default: pure-lambda-interchange)
  AWS_REGION      AWS region (default: us-east-1)
  KMS_KEY_ID      KMS key for encryption (default: alias/pure-lambda)
EOF
        ;;
esac