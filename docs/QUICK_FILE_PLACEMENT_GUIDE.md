# Quick File Placement Guide

Use this quick reference when creating new files to ensure proper organization.

## 🚀 Quick Decision Tree

### New Documentation File (`.md`)?
- **Setup/Installation** → `docs/getting-started/`
- **Development guides** → `docs/development/`
- **Database info** → `docs/database/`
- **Admin procedures** → `docs/admin-setup/`
- **API docs** → `docs/api/`
- **Deployment** → `docs/deployment/`
- **Testing** → `docs/testing/`

### New SQL File (`.sql`)?
- **Database migration** → `docs/database/migrations/`
- **Cleanup script** → `docs/admin-setup/cleanup/`
- **Database utility** → `docs/database/scripts/`

### New JavaScript File (`.js`)?
- **Development/Testing script** → `docs/development/scripts/`
- **Production utility** → `scripts/` (root level)

## ⚠️ Common Mistakes to Avoid

- ❌ Don't put `.md` files in root directory
- ❌ Don't put `.sql` files in root directory  
- ❌ Don't put utility `.js` files in root directory
- ❌ Don't create new directories without checking existing structure first

## ✅ Always Check

1. Does a similar file already exist?
2. Is there an appropriate existing directory?
3. Does the file name follow naming conventions?
4. Have I updated any references to moved files?

## 📖 Full Guidelines

For complete details, see [File Organization Guidelines](./FILE_ORGANIZATION.md)
