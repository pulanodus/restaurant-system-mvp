#!/usr/bin/env node

/**
 * Automated Documentation File Creator
 * Creates documentation files in the correct location based on type and content
 */

const fs = require('fs');
const path = require('path');

// File type mappings
const FILE_TYPE_MAPPINGS = {
  // Documentation types
  'setup': 'docs/getting-started/',
  'install': 'docs/getting-started/',
  'config': 'docs/getting-started/',
  'environment': 'docs/getting-started/',
  
  'cleanup': 'docs/admin-setup/cleanup/',
  'admin': 'docs/admin-setup/',
  'reset': 'docs/admin-setup/',
  
  'api': 'docs/api/',
  'endpoint': 'docs/api/',
  
  'database': 'docs/database/',
  'migration': 'docs/database/migrations/',
  'sql': 'docs/database/',
  
  'deploy': 'docs/deployment/',
  'production': 'docs/deployment/',
  'monitoring': 'docs/deployment/',
  
  'test': 'docs/testing/',
  'testing': 'docs/testing/',
  
  'dev': 'docs/development/',
  'debug': 'docs/development/',
  'error': 'docs/development/',
  'session': 'docs/development/',
  
  'qr': 'docs/qr-codes/',
  'dashboard': 'docs/live-dashboard/'
};

// SQL file mappings
const SQL_TYPE_MAPPINGS = {
  'migration': 'docs/database/migrations/',
  'migrate': 'docs/database/migrations/',
  'fix': 'docs/database/migrations/',
  'apply': 'docs/database/migrations/',
  'cleanup': 'docs/admin-setup/cleanup/',
  'clean': 'docs/admin-setup/cleanup/',
  'reset': 'docs/admin-setup/cleanup/',
  'default': 'docs/database/scripts/'
};

// JS file mappings
const JS_TYPE_MAPPINGS = {
  'test': 'docs/development/scripts/',
  'dev': 'docs/development/scripts/',
  'debug': 'docs/development/scripts/',
  'clear': 'docs/development/scripts/',
  'default': 'scripts/'
};

function determineLocation(filename, extension) {
  const name = filename.toLowerCase();
  
  switch (extension) {
    case 'md':
      for (const [keyword, location] of Object.entries(FILE_TYPE_MAPPINGS)) {
        if (name.includes(keyword)) {
          return location;
        }
      }
      return 'docs/development/'; // default for docs
      
    case 'sql':
      for (const [keyword, location] of Object.entries(SQL_TYPE_MAPPINGS)) {
        if (name.includes(keyword)) {
          return location;
        }
      }
      return SQL_TYPE_MAPPINGS.default;
      
    case 'js':
      for (const [keyword, location] of Object.entries(JS_TYPE_MAPPINGS)) {
        if (name.includes(keyword)) {
          return location;
        }
      }
      return JS_TYPE_MAPPINGS.default;
      
    default:
      return 'docs/development/';
  }
}

function createFileTemplate(filename, extension, location) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  
  switch (extension) {
    case 'md':
      return `# ${filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Overview
${filename.replace(/[-_]/g, ' ')} documentation.

## Usage
Add usage instructions here.

## Related Documentation
- [File Organization Guidelines](../FILE_ORGANIZATION.md)
- [Quick File Placement Guide](../QUICK_FILE_PLACEMENT_GUIDE.md)

---
*Created: ${date}*
*Location: ${location}*
`;

    case 'sql':
      return `-- ${filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
-- Description: Add description here
-- Date: ${date}
-- Location: ${location}

-- TODO: Add your SQL statements here
`;

    case 'js':
      return `#!/usr/bin/env node

/**
 * ${filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
 * Description: Add description here
 * Date: ${date}
 * Location: ${location}
 */

// TODO: Add your script logic here
console.log('Script executed successfully');
`;

    default:
      return `# ${filename}\n\nCreated: ${date}\nLocation: ${location}`;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📁 Automated File Creator

Usage:
  node scripts/create-doc.js <filename> [extension]

Examples:
  node scripts/create-doc.js cleanup-procedures md
  node scripts/create-doc.js apply-migration sql
  node scripts/create-doc.js test-daily-reset js

The script will automatically determine the correct location based on the filename.
    `);
    process.exit(1);
  }
  
  const filename = args[0];
  const extension = args[1] || 'md';
  const fullFilename = `${filename}.${extension}`;
  
  const location = determineLocation(filename, extension);
  const fullPath = path.join(process.cwd(), location, fullFilename);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
  
  // Check if file already exists
  if (fs.existsSync(fullPath)) {
    console.log(`❌ File already exists: ${fullPath}`);
    process.exit(1);
  }
  
  // Create the file
  const template = createFileTemplate(filename, extension, location);
  fs.writeFileSync(fullPath, template);
  
  console.log(`✅ Created file: ${fullPath}`);
  console.log(`📖 Location determined by: ${filename} → ${location}`);
  console.log(`🔧 Template applied for: .${extension} files`);
}

if (require.main === module) {
  main();
}

module.exports = { determineLocation, createFileTemplate };
