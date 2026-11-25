# AWS-managed prefix list containing CloudFront origin-facing IP ranges
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# Security group permitting HTTP port 80 ONLY from CloudFront, with zero SSH access
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-${var.environment}-ec2-sg"
  description = "Allow HTTP from CloudFront origin-facing prefix list only; no SSH"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from CloudFront origin-facing IPs only"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    description = "Allow outbound traffic for ECR image pulls, OS updates, and SSM"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-ec2-sg"
  }
}

