variable "region" {
  description = "AWS region to deploy all resources into"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name (e.g. prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "instance_type" {
  description = "EC2 instance type for hosting the backend and MongoDB containers"
  type        = string
  default     = "t3.micro"
}

variable "ebs_volume_size_gb" {
  description = "Size in GiB of the encrypted gp3 root EBS volume"
  type        = number
  default     = 20
}

variable "project_name" {
  description = "Project identifier used for resource naming and tagging"
  type        = string
  default     = "habit-tracker"
}

variable "alert_email" {
  description = "Email address to receive AWS Budgets cost alerts"
  type        = string
}

variable "allowed_admin_cidr" {
  description = "Optional CIDR block for admin access; empty string disables SSH completely (SSM Session Manager is used instead)"
  type        = string
  default     = ""
}
