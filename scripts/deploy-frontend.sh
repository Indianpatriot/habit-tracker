#!/usr/bin/env bash
set -euo pipefail

# Build the React SPA static bundle, sync to private S3, and invalidate CloudFront cache.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"
CLIENT_DIR="${ROOT_DIR}/client"

for cmd in aws npm terraform; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required tool '$cmd' is not installed or not in PATH." >&2
    exit 1
  fi
done

if [[ ! -d "$CLIENT_DIR" ]]; then
  echo "ERROR: Client directory not found at $CLIENT_DIR" >&2
  exit 1
fi

echo "==> Reading Terraform outputs..."
S3_BUCKET="$(terraform -chdir="$INFRA_DIR" output -raw s3_bucket_name)"
DISTRIBUTION_ID="$(terraform -chdir="$INFRA_DIR" output -raw cloudfront_distribution_id)"

if [[ -z "$S3_BUCKET" || -z "$DISTRIBUTION_ID" ]]; then
  echo "ERROR: Missing Terraform outputs. Run 'terraform apply' in infra/ first." >&2
  exit 1
fi

echo "==> Installing dependencies and building frontend (relative /api base)..."
cd "$CLIENT_DIR"
npm ci
npm run build

if [[ ! -d "${CLIENT_DIR}/dist" ]]; then
  echo "ERROR: Build output directory ${CLIENT_DIR}/dist not found." >&2
  exit 1
fi

echo "==> Syncing static files to s3://${S3_BUCKET}..."
aws s3 sync "${CLIENT_DIR}/dist" "s3://${S3_BUCKET}" --delete

echo "==> Creating CloudFront invalidation for /* ..."
INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text)"

echo "==> Frontend deployed. CloudFront invalidation ID: $INVALIDATION_ID"
