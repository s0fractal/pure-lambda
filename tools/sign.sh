#!/bin/bash
# Sign artifacts and traces with ed25519

set -e

# Generate or load key
KEY_FILE="${KEY_FILE:-identity/keys/ed25519.key}"
if [ ! -f "$KEY_FILE" ]; then
    echo "Generating new ed25519 keypair..."
    mkdir -p "$(dirname "$KEY_FILE")"
    openssl genpkey -algorithm ed25519 -out "$KEY_FILE"
fi

# Extract public key for DID
PUBKEY=$(openssl pkey -in "$KEY_FILE" -pubout -outform DER | tail -c 32 | base58)
DID="did:pl:$PUBKEY"

# Sign content
sign_content() {
    local content="$1"
    local hash=$(echo -n "$content" | blake3sum | cut -d' ' -f1)
    local sig=$(echo -n "$hash" | openssl pkeyutl -sign -inkey "$KEY_FILE" | base64)
    
    echo "{\"did\":\"$DID\",\"sig\":\"$sig\",\"timestamp\":$(date +%s)}"
}

# Main
if [ $# -eq 0 ]; then
    echo "Usage: $0 <file-to-sign>"
    echo "       $0 --did     # Show DID"
    echo "       $0 --verify <file> <signature.json>"
    exit 1
fi

case "$1" in
    --did)
        echo "$DID"
        ;;
    --verify)
        FILE="$2"
        SIG_FILE="$3"
        # Verification logic here
        echo "Verification not yet implemented"
        ;;
    *)
        FILE="$1"
        if [ ! -f "$FILE" ]; then
            echo "Error: File $FILE not found"
            exit 1
        fi
        
        CONTENT=$(cat "$FILE")
        SIGNATURE=$(sign_content "$CONTENT")
        
        # Output signature
        echo "$SIGNATURE" > "${FILE}.sig"
        echo "Signed $FILE -> ${FILE}.sig"
        echo "DID: $DID"
        ;;
esac