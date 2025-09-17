#!/usr/bin/env bash

# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pure Lambda Authors

set -euo pipefail

echo "[1/3] npm run gid:file"
npm run -s gid:file fixtures/tiles/sample.yaml > /dev/null

echo "[2/3] npm run ipld:car"
npm run -s ipld:car fixtures/tiles > /dev/null

echo "[3/3] CAR size"
node -e "console.log('CAR size:', require('fs').statSync('dist/operon.car').size)"

echo "Smoke OK"
