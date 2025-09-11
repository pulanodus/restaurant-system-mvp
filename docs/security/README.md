# Security Overview

This section contains all security-related documentation for the PulaNodus project.

## Guides
- [**Implementation Guide**](./implementation-guide.md) - How to implement security features.
- [**Audit & Compliance**](./audit-and-compliance.md) - Reports and compliance information.
- [**Environment Security**](./environment-security.md) - Managing secrets and environment variables.
- [**Checklist**](./checklist.md) - Pre-deployment security verification.

## Core Principles
- Row Level Security (RLS) is enabled on all database tables.
- Payment webhook verification is mandatory.
- Audit logging is required for all transactions.
- PIN-based access control is used for dine-in tables.
