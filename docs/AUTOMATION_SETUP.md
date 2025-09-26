# File Organization Automation Setup

This guide explains how to set up and use the automated file organization system.

## 🚀 Quick Setup

### 1. Enable Git Hooks
```bash
npm run setup-hooks
```

### 2. Test the System
```bash
# Check current file organization
npm run check-organization

# Create a new documentation file
npm run create-doc cleanup-procedures md

# Create a new SQL migration
npm run create-doc apply-migration sql
```

## 🛠️ Available Tools

### 1. Git Pre-commit Hook
**Location**: `.githooks/pre-commit`
**Purpose**: Automatically checks file placement before commits

**Features**:
- ✅ Blocks commits with misplaced files
- ✅ Suggests correct locations
- ✅ Provides helpful error messages
- ✅ Can be bypassed with `--no-verify` (not recommended)

### 2. VS Code Snippets
**Location**: `.vscode/file-organization.code-snippets`
**Purpose**: Quick file creation with proper templates

**Usage**:
- Type `doc` + Tab → Creates documentation template
- Type `sql-migration` + Tab → Creates SQL migration template
- Type `sql-cleanup` + Tab → Creates SQL cleanup template
- Type `dev-script` + Tab → Creates development script template

### 3. Automated File Creator
**Location**: `scripts/create-doc.js`
**Purpose**: Creates files in correct locations automatically

**Usage**:
```bash
# Create documentation
npm run create-doc my-new-guide md

# Create SQL migration
npm run create-doc fix-orders-table sql

# Create development script
npm run create-doc test-cleanup js
```

### 4. File Organization Checker
**Location**: `scripts/check-file-organization.js`
**Purpose**: Scans project for misplaced files

**Usage**:
```bash
npm run check-organization
```

### 5. ESLint Rule (Optional)
**Location**: `lib/eslint-rules/file-organization.js`
**Purpose**: IDE integration for file organization checking

## 📋 File Placement Rules

### Documentation Files (`.md`)
- **Setup/Installation** → `docs/getting-started/`
- **Admin/Cleanup** → `docs/admin-setup/`
- **API Documentation** → `docs/api/`
- **Database Info** → `docs/database/`
- **Development Guides** → `docs/development/`
- **Deployment** → `docs/deployment/`
- **Testing** → `docs/testing/`

### SQL Files (`.sql`)
- **Migrations** → `docs/database/migrations/`
- **Cleanup Scripts** → `docs/admin-setup/cleanup/`
- **Database Utilities** → `docs/database/scripts/`

### JavaScript Files (`.js`)
- **Development/Testing** → `docs/development/scripts/`
- **Production Utilities** → `scripts/`

## 🔧 Customization

### Adding New File Types
Edit `scripts/create-doc.js` and add new mappings to the `FILE_TYPE_MAPPINGS` object.

### Modifying Rules
Update the `ORGANIZATION_RULES` in `scripts/check-file-organization.js`.

### Custom Templates
Modify the `createFileTemplate` function in `scripts/create-doc.js`.

## 🚨 Troubleshooting

### Git Hook Not Working
```bash
# Re-enable hooks
npm run setup-hooks

# Check hook permissions
ls -la .githooks/pre-commit
```

### VS Code Snippets Not Appearing
1. Reload VS Code window
2. Check if `.vscode/file-organization.code-snippets` exists
3. Try typing the snippet prefix (e.g., `doc`)

### Scripts Not Executable
```bash
chmod +x scripts/*.js
```

## 📚 Related Documentation

- [File Organization Guidelines](./FILE_ORGANIZATION.md)
- [Quick File Placement Guide](./QUICK_FILE_PLACEMENT_GUIDE.md)
- [Main Documentation Index](./README.md)

## 🎯 Best Practices

1. **Always use the automation tools** when creating new files
2. **Run `npm run check-organization`** before committing
3. **Follow the suggested locations** from the tools
4. **Update documentation** when adding new file types
5. **Test the system** regularly to ensure it's working

## 🔄 Maintenance

- **Monthly**: Run `npm run check-organization` to audit the project
- **When adding new file types**: Update the automation scripts
- **When changing structure**: Update the rules and documentation
