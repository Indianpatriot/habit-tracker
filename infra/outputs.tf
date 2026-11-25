output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name for accessing the app over HTTPS"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidations in deploy-frontend.sh)"
  value       = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  description = "Private S3 bucket name for static frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing backend Docker images"
  value       = aws_ecr_repository.backend.repository_url
}

output "ec2_instance_id" {
  description = "EC2 instance ID for SSM Session Manager and Run Command deployments"
  value       = aws_instance.app.id
}
