---
title: "Gimbal HQ"
description: "Governance for cloud fleets: patching, CVEs, file integrity and Ansible for Ubuntu and Amazon Linux, without SSH"
icon: "shield-lock"
demo: "https://gimbal-hq.com"
image: "/images/projects/gimbal.jpg"
featured: true
weight: 6
cardTags: ["Security", "DevOps", "SaaS"]
tech:
  - "Go"
  - "PostgreSQL"
  - "mTLS / PKI"
  - "Kubernetes"
  - "Cloudflare Workers & R2"
  - "React"
  - "Ansible"
  - "AWS"
---

## Overview

Gimbal HQ keeps policy and enforcement pointed in the same direction while infrastructure moves around it. It started as an AWS management platform and now includes a **fleet module** for Ubuntu and Amazon Linux servers: a small agent on each host that reports what is installed, patches it, tracks the vulnerabilities that matter, and watches critical files for changes.

It is multi-tenant from the ground up, with a separate database, certificate authority and storage bucket per customer, and it reaches hosts over an outbound mutual-TLS connection, so there is no SSH, no open ports and no bastion.

I wrote a detailed article on the design: [Configuration and Vulnerability Management for Server Fleets: Why It Matters and How I Built Gimbal](/wiki/security/gimbal-fleet-config-and-vulnerability-management/).

## Key Features

### Patch Management
- Software inventory and pending updates for every host, with security advisories (USN, ALAS) highlighted
- Group and filter by AWS account, VPC, tags and OS
- Patch one host or a whole fleet; pick individual packages or roll one package out everywhere it is pending
- Signed APT and YUM repositories, agent self-update with canary rollout

### Vulnerability Management
- Daily sync of Ubuntu and Amazon Linux advisories, NVD, FIRST EPSS and the CISA Known Exploited Vulnerabilities catalog
- Pending updates cross-referenced to CVEs, sorted known-exploited first
- One click from a CVE to a patch job for exactly the affected hosts and fixing packages

### File Integrity Monitoring
- Tripwire-style baselines stored off the host as git-like Merkle trees, with real-time detection through fanotify
- Accept a change into the baseline, or revert it from stored content or by reinstalling the owning package
- Secrets such as `shadow` and SSH keys are encrypted on the host before upload, so they can be restored after ransomware or a rootkit without ever being readable in the console

### Configuration Management
- AWX-style projects: playbooks from GitHub (via a GitHub App), templates and live run output
- The server runs Ansible and reaches hosts through the agent's existing encrypted connection instead of SSH
- Runner containers sized to each run's parallelism, with per-plan limits

### Trust and Access
- Hosts join only after approval, each with its own certificate; revocation is permanent and immediate
- Least-privilege agent: an unprivileged daemon plus a root helper with a fixed set of actions, limited by an install profile on the host
- Single sign-on through Gimbal ID with per-app roles from [OpenRBAC](/portfolio/openrbac/) manifests, TOTP for break-glass accounts, and a full audit trail
- Trends page that charts patch levels, CVEs and integrity changes over time, with CSV export

## Status

In early access. The fleet module runs in production on Kubernetes, deployed entirely from committed manifests and GitHub Actions.
