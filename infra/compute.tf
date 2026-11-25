# Look up current AWS account ID for scoped IAM policies
data "aws_caller_identity" "current" {}

# Look up the latest Amazon Linux 2023 x86_64 AMI via AWS Systems Manager public parameter
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# IAM role assumed by the EC2 instance for SSM access, ECR pulls, and reading app secrets
resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

# Enable AWS Systems Manager Session Manager & Run Command without SSH keys or port 22
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Allow EC2 to authenticate to ECR and pull the backend container image
resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Least-privilege policy allowing EC2 to read only this app's SSM Parameter Store secrets
resource "aws_iam_role_policy" "ssm_secrets" {
  name = "${var.project_name}-${var.environment}-ssm-secrets"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      }
    ]
  })
}

# Instance profile binding the IAM role to the EC2 instance
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# Single EC2 host running Docker Compose (Express backend on port 80 + private MongoDB 7)
resource "aws_instance" "app" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true

  # Encrypted gp3 root EBS volume to protect MongoDB data at rest
  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_volume_size_gb
    encrypted             = true
    delete_on_termination = true
  }

  # Enforce IMDSv2 to mitigate SSRF credential theft
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    # Install Docker and Docker Compose v2 plugin
    dnf update -y
    dnf install -y docker
    systemctl enable --now docker
    usermod -aG docker ec2-user

    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    mkdir -p /opt/habit-tracker

    # Write production docker-compose.yml (MongoDB stays on internal bridge network only)
    cat <<'COMPOSE' > /opt/habit-tracker/docker-compose.yml
    services:
      mongo:
        image: mongo:7
        restart: unless-stopped
        environment:
          MONGO_INITDB_ROOT_USERNAME: habitadmin
          MONGO_INITDB_ROOT_PASSWORD: $${MONGO_PASSWORD}
          MONGO_INITDB_DATABASE: habitgraph
        volumes:
          - mongo_data:/data/db
        healthcheck:
          test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
          interval: 10s
          timeout: 5s
          retries: 5
          start_period: 15s

      backend:
        image: $${ECR_IMAGE}
        restart: unless-stopped
        ports:
          - "80:5000"
        environment:
          NODE_ENV: production
          PORT: 5000
          MONGO_URI: mongodb://habitadmin:$${MONGO_PASSWORD}@mongo:27017/habitgraph?authSource=admin
          JWT_SECRET: $${JWT_SECRET}
          CLIENT_ORIGIN: $${CLIENT_ORIGIN:-http://localhost}
        depends_on:
          mongo:
            condition: service_healthy

    volumes:
      mongo_data:
    COMPOSE

    # Fetch secrets from SSM Parameter Store and write .env with restricted permissions
    MONGO_PASSWORD=$(aws ssm get-parameter --region "${var.region}" --name "/${var.project_name}/${var.environment}/mongo_password" --with-decryption --query "Parameter.Value" --output text)
    JWT_SECRET=$(aws ssm get-parameter --region "${var.region}" --name "/${var.project_name}/${var.environment}/jwt_secret" --with-decryption --query "Parameter.Value" --output text)

    cat <<ENV > /opt/habit-tracker/.env
    MONGO_PASSWORD=$${MONGO_PASSWORD}
    JWT_SECRET=$${JWT_SECRET}
    ECR_IMAGE=${aws_ecr_repository.backend.repository_url}:latest
    CLIENT_ORIGIN=http://localhost
    ENV
    chmod 600 /opt/habit-tracker/.env

    # Start MongoDB immediately; backend starts once the first image is pushed to ECR
    cd /opt/habit-tracker
    docker compose up -d mongo
    aws ecr get-login-password --region "${var.region}" | docker login --username AWS --password-stdin "${aws_ecr_repository.backend.repository_url}" || true
    docker compose pull backend && docker compose up -d || true
  EOF

  tags = {
    Name = "${var.project_name}-${var.environment}-app"
  }
}

# Static Elastic IP so the CloudFront origin DNS remains stable across instance stops/starts
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-${var.environment}-eip"
  }
}
