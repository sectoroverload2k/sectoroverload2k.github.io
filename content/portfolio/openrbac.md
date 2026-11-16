---
title: "OpenRBAC"
description: "An open standard for apps to publish the permissions they understand, so identity providers can grant them"
icon: "shield-check"
demo: "https://openrbac.com"
image: "/images/projects/openrbac.jpg"
weight: 7
cardTags: ["Open Standard", "Identity", "Authorization"]
tech:
  - "OAuth 2.0 / OIDC"
  - "SAML 2.0"
  - "JSON Schema"
  - "RFC 9728"
  - "OpenID AuthZEN"
---

## Overview

OpenRBAC is an open specification I wrote and maintain. An application publishes one small JSON file, `/.well-known/openrbac.json`, describing the actions it can authorize, how they group, and the roles it suggests. An identity provider fetches that file when the app is connected, shows administrators real checkboxes instead of free-text scopes, and puts exactly the granted actions in the token.

It came out of building multi-tenant SaaS products where every app had its own idea of "admin" and "editor", and the identity provider had no way to know what any of them meant.

## Key Features

- **One static file** — a few required fields; an app can adopt it in an afternoon
- **Suggested roles with patterns** — `device.*`, `*.read`, `@group`, expanded by the IdP so tokens only carry concrete action ids
- **Personas** — roles say which team they are for (operator, security, auditor…), so an organization maps its groups once and new apps propose matching roles
- **Safe change management** — new actions are never granted silently; changed roles are shown to admins as a diff
- **Dangerous actions** — destructive permissions are flagged so IdPs ask for confirmation before granting them
- **Push registration** — apps that cannot host a file can push the manifest to the IdP instead

## Built on Existing Standards

OpenRBAC deliberately reuses existing building blocks rather than inventing a new protocol: discovery follows RFC 9728 (OAuth Protected Resource Metadata), delivery uses ordinary OIDC claims and SAML attributes, runtime checks can use OpenID AuthZEN, and the idea of app-declared actions comes from UMA 2.0.

## Status

Version 0.1 is a public draft under the Apache 2.0 license, implemented end to end in my own products: [Gimbal](https://gimbal-hq.com) publishes a manifest as an application, and Gimbal ID implements the identity provider side. The spec, JSON Schema and examples are on [GitHub](https://github.com/OpenRBAC/spec).
