#!/usr/bin/env bash
set -euo pipefail

# Deploy the Express backend container to ECR and restart it on EC2 via SSM Run Command.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"

for cmd in aws docker terraform; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required tool '$cmd' is not installed or not in PATH." >&2
    exit 1
  fi
done

if [[ ! -d "$INFRA_DIR" ]]; then
  echo "ERROR: Terraform directory not found at $INFRA_DIR" >&2
  exit 1
fi

echo "==> Reading Terraform outputs..."
ECR_URL="$(terraform -chdir="$INFRA_DIR" output -raw ecr_repository_url)"
INSTANCE_ID="$(terraform -chdir="$INFRA_DIR" output -raw ec2_instance_id)"
CF_DOMAIN="$(terraform -chdir="$INFRA_DIR" output -raw cloudfront_domain_name)"

if [[ -z "$ECR_URL" || -z "$INSTANCE_ID" ]]; then
  echo "ERROR: Missing Terraform outputs. Run 'terraform apply' in infra/ first." >&2
  exit 1
fi

ECR_REGISTRY="${ECR_URL%%/*}"
AWS_REGION="${AWS_REGION:-$(echo "$ECR_URL" | cut -d. -f4)}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "==> Logging in to ECR ($AWS_REGION)..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "==> Building backend Docker image..."
docker build -t "${ECR_URL}:${IMAGE_TAG}" "${ROOT_DIR}/server"

echo "==> Pushing image to ECR..."
docker push "${ECR_URL}:${IMAGE_TAG}"

echo "==> Restarting backend container on EC2 ($INSTANCE_ID) via SSM Run Command..."
COMMAND_ID="$(aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Deploy habit-tracker backend ${IMAGE_TAG}" \
  --parameters "commands=[
    \"set -euo pipefail\",
    \"cd /opt/habit-tracker\",
    \"sed -i '/^CLIENT_ORIGIN=/d' .env\",
    \"echo 'CLIENT_ORIGIN=https://${CF_DOMAIN}' >> .env\",
    \"aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}\",
    \"docker compose pull backend\",
    \"docker compose up -d --remove-orphans\"
  ]" \
  --query "Command.CommandId" \
  --output text)"

echo "==> SSM Command sent: $COMMAND_ID"
echo "==> Waiting for command completion..."
aws ssm wait command-executed \
  --region "$AWS_REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID"

STATUS="$(aws ssm get-command-invocation \
  --region "$AWS_REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query "Status" \
  --output text)"

echo "==> Backend deployment finished with SSM status: $STATUS"

