#!/usr/bin/env node

/**
 * File Organization Checker
 * Scans the project for misplaced files and suggests correct locations
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// File organization rules
const ORGANIZATION_RULES = {
  md: {
    allowedInRoot: ['README.md'],
    defaultLocation: 'docs/',
    suggestions: {
      'setup': 'docs/getting-started/',
      'install': 'docs/getting-started/',
      'config': 'docs/getting-started/',
      'cleanup': 'docs/admin-setup/cleanup/',
      'admin': 'docs/admin-setup/',
      'reset': 'docs/admin-setup/',
      'api': 'docs/api/',
      'database': 'docs/database/',
      'migration': 'docs/database/migrations/',
      'deploy': 'docs/deployment/',
      'test': 'docs/testing/',
      'dev': 'docs/development/',
      'debug': 'docs/development/',
      'error': 'docs/development/'
    }
  },
  sql: {
    allowedInRoot: [],
    defaultLocation: 'docs/database/',
    suggestions: {
      'migration': 'docs/database/migrations/',
      'migrate': 'docs/database/migrations/',
      'fix': 'docs/database/migrations/',
      'apply': 'docs/database/migrations/',
      'cleanup': 'docs/admin-setup/cleanup/',
      'clean': 'docs/admin-setup/cleanup/',
      'reset': 'docs/admin-setup/cleanup/'
    }
  },
  js: {
    allowedInRoot: [],
    defaultLocation: 'scripts/',
    suggestions: {
      'test': 'docs/development/scripts/',
      'dev': 'docs/development/scripts/',
      'debug': 'docs/development/scripts/',
      'clear': 'docs/development/scripts/'
    }
  }
};

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getSuggestedLocation(filename, extension) {
  const rules = ORGANIZATION_RULES[extension];
  if (!rules) return null;

  const name = filename.toLowerCase();
  
  // Check for specific suggestions
  for (const [keyword, location] of Object.entries(rules.suggestions)) {
    if (name.includes(keyword)) {
      return location;
    }
  }
  
  return rules.defaultLocation;
}

function isFileInCorrectLocation(filePath, filename, extension) {
  const rules = ORGANIZATION_RULES[extension];
  if (!rules) return true; // Unknown extensions are allowed

  // Check if it's allowed in root
  if (rules.allowedInRoot.includes(filename)) {
    return true;
  }

  // Allow files in their current correct locations
  if (filePath.startsWith('docs/')) {
    return true; // All files in docs/ are considered correctly placed
  }

  // Allow Supabase migrations in their standard location
  if (filePath.startsWith('supabase/migrations/')) {
    return true;
  }

  // Allow source code files in src/
  if (filePath.startsWith('src/')) {
    return true;
  }

  // Allow scripts in scripts/ directory
  if (filePath.startsWith('scripts/')) {
    return true;
  }

  // Only flag files that are clearly misplaced (in root or wrong directories)
  if (filePath.includes('/') && !filePath.startsWith('docs/') && !filePath.startsWith('supabase/') && !filePath.startsWith('src/') && !filePath.startsWith('scripts/')) {
    return false;
  }

  // Check if it's in the correct directory structure
  const suggestedLocation = getSuggestedLocation(filename, extension);
  return filePath.startsWith(suggestedLocation);
}

function scanDirectory(dir, relativePath = '') {
  const results = {
    violations: [],
    total: 0,
    correct: 0
  };

  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativeItemPath = path.join(relativePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other system directories
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
          continue;
        }
        
        // Recursively scan subdirectories
        const subResults = scanDirectory(fullPath, relativeItemPath);
        results.violations.push(...subResults.violations);
        results.total += subResults.total;
        results.correct += subResults.correct;
      } else {
        const extension = getFileExtension(item);
        
        if (ORGANIZATION_RULES[extension]) {
          results.total++;
          
          if (isFileInCorrectLocation(relativeItemPath, item, extension)) {
            results.correct++;
          } else {
            const suggestedLocation = getSuggestedLocation(item, extension);
            results.violations.push({
              file: relativeItemPath,
              filename: item,
              extension,
              suggestedLocation
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error scanning directory ${dir}: ${error.message}${colors.reset}`);
  }

  return results;
}

function printResults(results) {
  console.log(`${colors.bold}📁 File Organization Check Results${colors.reset}\n`);
  
  if (results.violations.length === 0) {
    console.log(`${colors.green}✅ All files are properly organized!${colors.reset}`);
    console.log(`${colors.blue}📊 Total files checked: ${results.total}${colors.reset}`);
    return;
  }

  console.log(`${colors.red}❌ Found ${results.violations.length} file organization violation(s):${colors.reset}\n`);
  
  results.violations.forEach((violation, index) => {
    console.log(`${colors.yellow}${index + 1}. ${violation.file}${colors.reset}`);
    console.log(`   ${colors.blue}Suggested location: ${violation.suggestedLocation}${violation.filename}${colors.reset}`);
    console.log(`   ${colors.blue}Type: ${violation.extension.toUpperCase()} file${colors.reset}\n`);
  });

  console.log(`${colors.bold}📖 Documentation:${colors.reset}`);
  console.log(`   - File Organization Guidelines: docs/FILE_ORGANIZATION.md`);
  console.log(`   - Quick Reference: docs/QUICK_FILE_PLACEMENT_GUIDE.md`);
  console.log(`   - Automated Creation: npm run create-doc <filename> [extension]`);
  
  console.log(`\n${colors.bold}🔧 Fix Commands:${colors.reset}`);
  results.violations.forEach((violation) => {
    const newPath = `${violation.suggestedLocation}${violation.filename}`;
    console.log(`   mv ${violation.file} ${newPath}`);
  });
}

function main() {
  const projectRoot = process.cwd();
  console.log(`${colors.bold}🔍 Scanning project for file organization violations...${colors.reset}\n`);
  
  const results = scanDirectory(projectRoot);
  printResults(results);
  
  // Exit with error code if violations found
  if (results.violations.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, getSuggestedLocation, isFileInCorrectLocation };
