# Pre-Commit Hooks Guide

## 🎯 **Overview**

This project includes a comprehensive pre-commit hook system designed to prevent common development issues, including duplicate component files, import conflicts, and code quality problems. The hook runs automatically before each commit to ensure code quality and prevent conflicts.

## 🔧 **What the Hook Checks**

### **1. Duplicate Component Files** 🔍
- **Purpose**: Prevents files with the same name in different directories
- **Exclusions**: 
  - Next.js framework files (`route.ts`, `page.tsx`, `layout.tsx`, etc.)
  - Barrel exports (`index.ts`)
  - API routes (`/api/` directory)
- **Example**: Detects if you have `MenuItem.tsx` in both `src/components/` and `src/app/`

### **2. Files with Trailing Spaces** 📁
- **Purpose**: Detects files with spaces in their names
- **Example**: Flags `file.txt ` (with trailing space)
- **Fix**: Rename files to remove trailing spaces

### **3. Import Issues** 🔗
- **Purpose**: Checks for potentially missing imports
- **Scope**: Only checks staged files
- **Example**: Warns about imports that reference non-existent files

### **4. TypeScript Errors** 📝
- **Purpose**: Runs TypeScript compiler on staged files
- **Scope**: Only checks staged TypeScript files
- **Requirement**: Requires `npx` to be available

### **5. Console.log Statements** 🚫
- **Purpose**: Warns about console.log in production code
- **Exclusions**: Test files, debug files, spec files
- **Scope**: Only checks staged files

### **6. Large Files** 📦
- **Purpose**: Detects files larger than 1MB
- **Recommendation**: Suggests using Git LFS for large files
- **Scope**: Only checks staged files

## 📁 **File Structure**

```
.git/hooks/
├── pre-commit                 # Main pre-commit hook (executable)
└── pre-commit.backup          # Backup of previous hook (if existed)

scripts/
├── pre-commit-hook.sh         # Standalone hook script
└── setup-pre-commit-hooks.sh  # Setup script
```

## 🚀 **Installation & Setup**

### **Automatic Setup**
```bash
# Run the setup script
./scripts/setup-pre-commit-hooks.sh
```

### **Manual Setup**
```bash
# Copy the hook script
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit
```

### **Verification**
```bash
# Test the hook manually
.git/hooks/pre-commit

# Check if it's executable
ls -la .git/hooks/pre-commit
```

## 💻 **Usage**

### **Normal Commit**
```bash
git add .
git commit -m "Your commit message"
# Hook runs automatically
```

### **Bypass Hook (Not Recommended)**
```bash
git commit --no-verify -m "Your commit message"
# Skips all pre-commit checks
```

### **Manual Testing**
```bash
# Run hook manually to test
.git/hooks/pre-commit
```

## 🎨 **Hook Output Examples**

### **✅ Successful Check**
```
🔍 Running pre-commit checks...
🔍 Checking for duplicate component files...
✅ No duplicate component files found
🔍 Checking for files with trailing spaces in names...
✅ No files with trailing spaces in names found
🔍 Checking for common import issues...
✅ No obvious import issues found
🔍 Checking for TypeScript errors...
✅ No TypeScript errors found in staged files
🔍 Checking for console.log statements...
✅ No console.log statements found in production code
🔍 Checking for large files...
✅ No large files detected

✅ All pre-commit checks passed! 🎉
Proceeding with commit...
```

### **❌ Failed Check**
```
🔍 Running pre-commit checks...
🔍 Checking for duplicate component files...
❌ ERROR: Duplicate component file detected: MenuItem.tsx
   Found in: src/components/MenuItem.tsx, src/app/MenuItem.tsx
   💡 Tip: Consider consolidating these files or using different names
🔍 Checking for files with trailing spaces in names...
✅ No files with trailing spaces in names found
...

❌ ERROR: Pre-commit checks failed! ❌
Commit blocked. Please fix the issues above and try again.

💡 Tips:
   • Fix duplicate files by consolidating or renaming them
   • Remove trailing spaces from file names
   • Fix TypeScript errors with 'npx tsc --noEmit'
   • Remove console.log statements from production code
   • Use 'git commit --no-verify' to bypass checks (not recommended)
```

## 🔧 **Configuration**

### **Customizing Checks**

You can modify the hook by editing `.git/hooks/pre-commit`:

```bash
# Disable a specific check by commenting it out
# check_duplicate_components || exit_code=1
check_trailing_spaces || exit_code=1
check_import_issues || exit_code=1
```

### **Adding New Checks**

Add new functions to the hook:

```bash
# Add to .git/hooks/pre-commit
check_custom_validation() {
    echo -e "${BLUE}🔍 Running custom validation...${NC}"
    # Your custom logic here
    return 0
}

# Add to main() function
check_custom_validation || exit_code=1
```

## 🐛 **Troubleshooting**

### **Hook Not Running**
```bash
# Check if hook exists and is executable
ls -la .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit
```

### **Permission Denied**
```bash
# Fix permissions
chmod +x .git/hooks/pre-commit
```

### **Bash Version Issues**
The hook requires bash 3.2+ and is compatible with macOS and Linux.

### **TypeScript Check Failing**
```bash
# Install TypeScript if missing
npm install -g typescript

# Or use npx
npx tsc --version
```

## 📋 **Best Practices**

### **For Developers**
1. **Don't bypass hooks** unless absolutely necessary
2. **Fix issues** rather than using `--no-verify`
3. **Test locally** before pushing
4. **Keep hooks updated** with project changes

### **For Teams**
1. **Share hook setup** in team documentation
2. **Include in onboarding** process
3. **Update hooks** when adding new checks
4. **Document customizations** for the team

## 🔄 **Maintenance**

### **Updating Hooks**
```bash
# Backup current hook
cp .git/hooks/pre-commit .git/hooks/pre-commit.backup

# Update from script
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### **Removing Hooks**
```bash
# Remove the hook
rm .git/hooks/pre-commit

# Or disable by renaming
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
```

## 🎯 **Benefits**

### **Prevents Issues**
- ✅ Duplicate component files
- ✅ Import conflicts
- ✅ TypeScript errors
- ✅ Console.log in production
- ✅ Large files in repository

### **Improves Code Quality**
- ✅ Consistent file naming
- ✅ Clean imports
- ✅ Type safety
- ✅ Production-ready code

### **Saves Time**
- ✅ Catches issues early
- ✅ Prevents broken builds
- ✅ Reduces debugging time
- ✅ Maintains code standards

## 📚 **Related Documentation**

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Pre-commit Best Practices](https://pre-commit.com/)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

## 🆘 **Support**

If you encounter issues with the pre-commit hooks:

1. **Check the output** for specific error messages
2. **Verify setup** using the setup script
3. **Test manually** with `.git/hooks/pre-commit`
4. **Check permissions** and bash version
5. **Review documentation** for troubleshooting steps

---

**Remember**: The pre-commit hook is your friend! It helps maintain code quality and prevents common issues. Work with it, not against it! 🚀
