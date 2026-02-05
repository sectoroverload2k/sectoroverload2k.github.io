---
title: "AWS Infrastructure Discovery & Terraform Generator"
date: 2026-02-05
draft: false
tags: ["terraform", "aws", "infrastructure-as-code", "devops", "automation"]
categories: ["Projects", "DevOps"]
description: "A toolkit for discovering existing AWS infrastructure and automatically generating Terraform configurations with proper resource references."
featured_image: ""
---

## The Problem: Infrastructure Chaos

In many organizations, cloud infrastructure evolves organically. Resources get created through the AWS console, CLI commands run in terminals, and CloudFormation stacks deployed by different team members over months
 or years. The result? **Infrastructure drift** and **tribal knowledge**.

### Common Pain Points

- **No single source of truth** - Nobody knows exactly what's deployed or why
- **Manual changes** - "Quick fixes" in the console that never get documented
- **Inconsistent configurations** - Similar resources configured differently across environments
- **Onboarding difficulty** - New team members can't understand the infrastructure
- **Audit nightmares** - Security and compliance reviews become archaeological expeditions
- **Disaster recovery gaps** - Can you rebuild your infrastructure from scratch?

### The Real Cost

When infrastructure isn't codified:

- A single engineer leaving takes critical knowledge with them
- Debugging production issues requires clicking through dozens of console screens
- Security vulnerabilities hide in forgotten resources
- Cost optimization becomes guesswork
- Changes are risky because nobody understands the dependencies

---

## The Solution: Infrastructure as Code

**Infrastructure as Code (IaC)** treats infrastructure the same way we treat application code:

- **Version controlled** - Every change is tracked in Git
- **Peer reviewed** - Changes go through pull requests
- **Testable** - Validate configurations before applying
- **Repeatable** - Deploy identical environments consistently
- **Self-documenting** - The code IS the documentation

### Why Terraform?

Terraform has become the industry standard for IaC because it's:

- **Cloud agnostic** - Works with AWS, Azure, GCP, and hundreds of providers
- **Declarative** - Describe the desired state, not the steps to get there
- **Stateful** - Tracks what's deployed and manages the full lifecycle
- **Modular** - Reusable components and patterns

---

## The Challenge: Adopting IaC for Existing Infrastructure

Here's the catch - most organizations don't start with a blank slate. They have **years of existing infrastructure** that needs to be brought under Terraform management.

The traditional approach:

1. Manually inspect each resource in the AWS console
2. Write Terraform code by hand
3. Run `terraform import` for each resource
4. Debug the differences between your code and reality
5. Repeat hundreds of times

This process is:
- **Time-consuming** - Days or weeks per environment
- **Error-prone** - Easy to miss resources or misconfigure them
- **Tedious** - Soul-crushing repetitive work

---

## My Solution: Automated Discovery & Generation

I built a toolkit that automates this entire process:

### 1. Infrastructure Discovery Script

A bash script that exports all AWS resources in a VPC to JSON files:

```bash
./discover-infrastructure.sh <profile> <region> <vpc-id>
```

**What it discovers:**
- VPCs, subnets, route tables, gateways
- Security groups and their rules
- EC2 instances, EBS volumes, network interfaces
- Load balancers and target groups
- RDS instances, ElastiCache clusters
- EFS file systems, S3 buckets
- Lambda functions, IAM profiles
- And more...

**Output:** A comprehensive JSON snapshot of your infrastructure in the `aws-exports/` directory.

### 2. Terraform Generator

A Python script that transforms those JSON exports into production-ready Terraform:

```bash
./generate-terraform.py --profile <profile> --exports-dir aws-exports
```

**What it generates:**

| File | Contents |
|------|----------|
| `providers.tf` | AWS provider configuration |
| `variables.tf` | Input variables with sensible defaults |
| `vpc.tf` | VPC, subnets, route tables, gateways |
| `security-groups.tf` | Security groups with individual rule resources |
| `ec2.tf` | EC2 instances with EBS and IAM configurations |
| `eip.tf` | Elastic IPs and associations |
| `outputs.tf` | Useful outputs for other modules |
| `import.sh` | Ready-to-run import commands |

### Key Features

**Automatic Resource References**

The generator doesn't just output hardcoded IDs. It creates proper Terraform references:

```hcl
# Instead of this:
resource "aws_instance" "web" {
  subnet_id              = "subnet-abc123"
  vpc_security_group_ids = ["sg-def456"]
}

# It generates this:
resource "aws_instance" "web" {
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
}
```

This means your Terraform code is:
- **Self-contained** - No magic strings
- **Refactorable** - Rename resources without breaking references
- **Dependency-aware** - Terraform understands the relationships

**Intelligent Naming**

Resources are named based on their AWS Name tags, sanitized for Terraform:
- `"My Web Server"` becomes `my_web_server`
- Handles special characters, spaces, and edge cases

**Complete Import Script**

No more manually crafting import commands. The generator creates a ready-to-run script:

```bash
./import.sh
# Imports all resources in the correct order
```

**Security Group Rules as Separate Resources**

Instead of inline rules (which can't be imported), it generates individual rule resources:

```hcl
resource "aws_vpc_security_group_ingress_rule" "web_https" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS traffic"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}
```

---

## The Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AWS Console   │     │  JSON Exports   │     │   Terraform     │
│   (existing)    │────▶│  (aws-exports/) │────▶│   (.tf files)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   discover-              Raw data              generate-
   infrastructure.sh      snapshot              terraform.py
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  terraform      │
                                               │  import + plan  │
                                               └─────────────────┘
```

### Step-by-Step

1. **Discover** - Run the discovery script against your AWS environment
2. **Generate** - Transform exports into Terraform configurations
3. **Review** - Inspect the generated code, adjust as needed
4. **Import** - Run the import script to populate Terraform state
5. **Validate** - Run `terraform plan` to verify zero drift
6. **Iterate** - Make changes through Terraform going forward

---

## Results

After running these tools on a typical environment:

- **Hours saved**: What took days now takes minutes
- **Resources captured**: 50+ resource types discovered automatically
- **References resolved**: All cross-resource dependencies mapped
- **Import commands**: Generated automatically, no manual crafting

---

## Lessons Learned

Building these tools taught me several things:

1. **AWS APIs are inconsistent** - Every service has different conventions
2. **Edge cases abound** - Default security groups, main route tables, and other special resources need special handling
3. **Terraform import has limitations** - Some resources (like route table associations) don't support import
4. **State management matters** - The import order can affect success

---

## Future Improvements

- Support for additional AWS services (EKS, Lambda layers, API Gateway)
- Multi-region discovery
- Drift detection and reporting
- Module generation for common patterns
- Support for Azure and GCP

---

## Technologies Used

- **Bash** - Discovery script for AWS CLI orchestration
- **Python** - Generator script for JSON parsing and code generation
- **Terraform** - Infrastructure as Code platform
- **AWS CLI** - API interactions and data export
- **jq** - JSON processing for filtering and transformation

---

## Get In Touch

Interested in bringing your infrastructure under code? Have questions about IaC adoption strategies? I'd love to chat about infrastructure automation, Terraform patterns, or cloud architecture.

