---
title: "ShotBotz"
description: "Website screenshot service for multiple viewports and device sizes"
date: 2025-01-02
draft: false
icon: "camera"
demo: "https://shotbotz.com"
tech:
  - "Headless Chrome"
  - "API"
  - "Multi-Viewport"
  - "Device Emulation"
  - "AWS Lambda"
---

## Overview

ShotBotz is a developer-focused screenshot service designed to capture websites across multiple viewports and device screen sizes. Originally built to provide vision capabilities to Triton Agency AI bots, it's now available as a standalone service for developers and automation workflows.

## Key Features

### Multi-Viewport Capture
- Desktop (1920x1080, 1440x900, 1280x720)
- Tablet (iPad, Android tablets)
- Mobile (iPhone, Android phones)
- Custom viewport dimensions

### Device Emulation
- Accurate device pixel ratios
- Touch event simulation
- User agent string matching
- Responsive breakpoint testing

### Developer API
- RESTful API endpoints
- Batch screenshot requests
- Webhook callbacks
- Multiple output formats (PNG, JPEG, WebP)

## Use Cases

- **AI Vision** - Provide visual context to AI agents
- **QA Testing** - Automated visual regression testing
- **Documentation** - Generate screenshots for docs
- **Monitoring** - Track visual changes over time
- **Social Previews** - Generate Open Graph images

## Technical Architecture

Built on serverless infrastructure for scalability and cost efficiency:

- Headless Chrome for accurate rendering
- AWS Lambda for on-demand execution
- S3 for screenshot storage
- CloudFront for fast delivery
