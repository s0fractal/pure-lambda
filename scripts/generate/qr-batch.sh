#!/bin/bash
# Generate QR codes for good-first-seeds

set -e

echo "🔲 QR Code Batch Generator"
echo "================================"

# Ensure output directory
mkdir -p dist/qr-codes

# Generate QR for each seed
count=0
for seed_file in seeds/templates/*.json out/sweep/*.json; do
  if [ -f "$seed_file" ]; then
    name=$(basename "$seed_file" .json)

    # Skip if already generated
    if [ -f "dist/qr-codes/${name}.png" ]; then
      echo "  ⏩ Skipping ${name} (exists)"
      continue
    fi

    # Encode seed data
    seed_data=$(cat "$seed_file" | base64 | tr -d '\n')
    url="https://pure-lambda.org/otm/kiosk.html?seed=${seed_data:0:500}"  # Truncate for QR size

    # Generate QR (using Python if available, else skip)
    if command -v python3 &> /dev/null; then
      python3 -c "
import qrcode
qr = qrcode.QRCode(version=1, box_size=10, border=4)
qr.add_data('$url')
qr.make(fit=True)
img = qr.make_image(fill='black', back_color='white')
img.save('dist/qr-codes/${name}.png')
" 2>/dev/null && echo "  ✅ Generated ${name}.png" || echo "  ⚠️  Failed ${name}"
    else
      echo "  ⚠️  Python3 not available for QR generation"
      break
    fi

    count=$((count + 1))

    # Limit to 20 QRs
    if [ $count -ge 20 ]; then
      echo "  📋 Generated 20 QR codes (limit reached)"
      break
    fi
  fi
done

echo ""
echo "✅ QR codes saved to dist/qr-codes/"
echo "   Use for events/streams to boost contributions"