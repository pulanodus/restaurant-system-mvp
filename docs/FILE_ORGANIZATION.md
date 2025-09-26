# File Organization Guidelines

This document establishes the standard organization system for all project files to maintain a clean and logical structure.

## 📁 Documentation Structure

### Root Directory
- **Keep clean**: Only essential project files should be in the root
- **Allowed in root**: `package.json`, `README.md`, `next.config.ts`, `tsconfig.json`, etc.
- **Never in root**: Documentation files (`.md`), SQL scripts (`.sql`), utility scripts (`.js`)

### Documentation Files (`.md`)
All markdown documentation must be placed in the `docs/` directory according to their purpose:

#### `docs/getting-started/`
- Installation guides
- Configuration setup
- Environment setup
- Initial project setup

#### `docs/development/`
- Development guides and best practices
- Debugging documentation
- Error handling guides
- Session management
- Import optimization
- Development scripts (`.js` files)

#### `docs/database/`
- Database setup and configuration
- Migration documentation
- Row-level security
- **Subdirectories:**
  - `migrations/` - SQL migration scripts
  - `scripts/` - Database utility scripts

#### `docs/admin-setup/`
- Admin panel setup
- Cleanup procedures
- Daily reset commands
- **Subdirectories:**
  - `cleanup/` - Cleanup SQL scripts and documentation

#### `docs/api/`
- API endpoint documentation
- API usage guides

#### `docs/deployment/`
- Deployment guides
- Production checklists
- Monitoring setup

#### `docs/testing/`
- Testing best practices
- Implementation guides
- Test utilities

#### `docs/live-dashboard/`
- Live dashboard documentation

#### `docs/qr-codes/`
- QR code generation and management

## 📄 SQL Files (`.sql`)

### Database Migrations
- **Location**: `docs/database/migrations/`
- **Purpose**: Schema changes, data migrations, structural updates
- **Examples**: `apply_migration.sql`, `manual_migration.sql`, `fix_orders_status_comprehensive.sql`

### Database Scripts
- **Location**: `docs/database/scripts/`
- **Purpose**: Utility scripts for database operations
- **Examples**: `create_cart_items.sql`

### Cleanup Scripts
- **Location**: `docs/admin-setup/cleanup/`
- **Purpose**: Data cleanup, maintenance operations
- **Examples**: `cleanup_database.sql`, `cleanup_orders_only.sql`, `cleanup_safe.sql`, `quick_cleanup.sql`

## 🔧 JavaScript Files (`.js`)

### Development Scripts
- **Location**: `docs/development/scripts/`
- **Purpose**: Development utilities, testing scripts
- **Examples**: `clear-payment-notification.js`, `test-daily-reset.js`

### Production Scripts
- **Location**: `scripts/` (root level)
- **Purpose**: Production utilities, setup scripts
- **Examples**: `generate-table-qr-codes.js`, `setup-admin-user.js`

## 📋 File Naming Conventions

### Documentation Files
- Use kebab-case: `daily-reset-commands.md`
- Be descriptive: `auto-cleanup-setup.md`
- Include purpose: `fix-orders-status-comprehensive.sql`

### SQL Files
- Use snake_case: `cleanup_database.sql`
- Include operation type: `apply_migration.sql`, `create_cart_items.sql`
- Be specific: `cleanup_orders_only.sql`

### JavaScript Files
- Use kebab-case: `clear-payment-notification.js`
- Include purpose: `test-daily-reset.js`

## 🚫 What NOT to Put in Root Directory

- ❌ Documentation files (`.md`)
- ❌ SQL scripts (`.sql`)
- ❌ Utility JavaScript files (`.js`)
- ❌ Configuration files that belong in specific directories
- ❌ Temporary or test files

## ✅ What SHOULD Be in Root Directory

- ✅ `package.json`, `package-lock.json`
- ✅ `next.config.ts`, `tsconfig.json`
- ✅ `README.md` (main project README)
- ✅ `.env.example`, `.gitignore`
- ✅ `postcss.config.mjs`
- ✅ Production scripts in `scripts/` directory

## 📝 Creating New Files

When creating new files, follow this decision tree:

1. **Is it documentation?** → Place in appropriate `docs/` subdirectory
2. **Is it a SQL script?** → Determine purpose:
   - Migration → `docs/database/migrations/`
   - Cleanup → `docs/admin-setup/cleanup/`
   - Utility → `docs/database/scripts/`
3. **Is it a JavaScript utility?** → Determine purpose:
   - Development/Testing → `docs/development/scripts/`
   - Production → `scripts/`
4. **Is it configuration?** → Place in appropriate config directory or root if essential

## 🔄 Maintenance

- **Regular cleanup**: Review root directory monthly
- **Documentation updates**: Update this guide when adding new categories
- **Consistency checks**: Ensure all team members follow these guidelines

## 📚 Related Documentation

- [Main Documentation Index](./README.md)
- [Database Documentation](./database/README.md)
- [Development Guidelines](./development/README.md)
- [Admin Setup Documentation](./admin-setup/README.md)
