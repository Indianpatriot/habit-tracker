# Generate a strong MongoDB root password without URI-reserved characters
resource "random_password" "mongo_password" {
  length  = 24
  special = false
}

# Generate a >= 32 character JWT signing secret required by the Express server
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

# Store MongoDB password securely in SSM Parameter Store (never output in Terraform)
resource "aws_ssm_parameter" "mongo_password" {
  name        = "/${var.project_name}/${var.environment}/mongo_password"
  description = "MongoDB root password for ${var.project_name} (${var.environment})"
  type        = "SecureString"
  value       = random_password.mongo_password.result
}

# Store JWT secret securely in SSM Parameter Store (never output in Terraform)
resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/${var.environment}/jwt_secret"
  description = "JWT signing secret for ${var.project_name} (${var.environment})"
  type        = "SecureString"
  value       = random_password.jwt_secret.result
}

