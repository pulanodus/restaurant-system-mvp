/**
 * ESLint Rule: File Organization
 * Ensures files are placed in correct directories according to project guidelines
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce file organization guidelines',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      misplacedFile: 'File "{{filename}}" should be placed in "{{suggestedLocation}}" according to file organization guidelines. See docs/FILE_ORGANIZATION.md',
      misplacedDoc: 'Documentation file "{{filename}}" should be in docs/ directory. Suggested: {{suggestedLocation}}',
      misplacedSql: 'SQL file "{{filename}}" should be in docs/database/ directory. Suggested: {{suggestedLocation}}',
      misplacedJs: 'JavaScript utility "{{filename}}" should be in scripts/ or docs/development/scripts/ directory. Suggested: {{suggestedLocation}}',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const projectRoot = process.cwd();
    const relativePath = filename.replace(projectRoot + '/', '');
    const basename = relativePath.split('/').pop();
    const extension = basename.split('.').pop();

    // Skip if file is in correct location or is a system file
    if (isInCorrectLocation(relativePath, basename, extension)) {
      return {};
    }

    // Determine suggested location
    const suggestedLocation = getSuggestedLocation(basename, extension);

    return {
      Program(node) {
        if (extension === 'md' && !relativePath.startsWith('docs/') && basename !== 'README.md') {
          context.report({
            node,
            messageId: 'misplacedDoc',
            data: {
              filename: basename,
              suggestedLocation: suggestedLocation,
            },
          });
        } else if (extension === 'sql' && !relativePath.startsWith('docs/') && !relativePath.startsWith('supabase/')) {
          context.report({
            node,
            messageId: 'misplacedSql',
            data: {
              filename: basename,
              suggestedLocation: suggestedLocation,
            },
          });
        } else if (extension === 'js' && !relativePath.startsWith('scripts/') && !relativePath.startsWith('src/') && !relativePath.startsWith('docs/')) {
          context.report({
            node,
            messageId: 'misplacedJs',
            data: {
              filename: basename,
              suggestedLocation: suggestedLocation,
            },
          });
        }
      },
    };
  },
};

function isInCorrectLocation(relativePath, basename, extension) {
  // Allow system files in root
  const allowedRootFiles = [
    'README.md', 'package.json', 'package-lock.json', 'next.config.ts', 
    'tsconfig.json', 'postcss.config.mjs', '.env.example', '.gitignore'
  ];

  if (allowedRootFiles.includes(basename)) {
    return true;
  }

  // Check if file is already in correct location
  switch (extension) {
    case 'md':
      return relativePath.startsWith('docs/');
    case 'sql':
      return relativePath.startsWith('docs/') || relativePath.startsWith('supabase/');
    case 'js':
      return relativePath.startsWith('scripts/') || relativePath.startsWith('src/') || relativePath.startsWith('docs/');
    default:
      return true;
  }
}

function getSuggestedLocation(basename, extension) {
  const name = basename.toLowerCase();

  switch (extension) {
    case 'md':
      if (name.includes('setup') || name.includes('install') || name.includes('config')) {
        return 'docs/getting-started/';
      }
      if (name.includes('cleanup') || name.includes('admin') || name.includes('reset')) {
        return 'docs/admin-setup/';
      }
      if (name.includes('api') || name.includes('endpoint')) {
        return 'docs/api/';
      }
      if (name.includes('database') || name.includes('migration')) {
        return 'docs/database/';
      }
      if (name.includes('deploy') || name.includes('production')) {
        return 'docs/deployment/';
      }
      if (name.includes('test')) {
        return 'docs/testing/';
      }
      return 'docs/development/';

    case 'sql':
      if (name.includes('migration') || name.includes('migrate') || name.includes('fix')) {
        return 'docs/database/migrations/';
      }
      if (name.includes('cleanup') || name.includes('clean')) {
        return 'docs/admin-setup/cleanup/';
      }
      return 'docs/database/scripts/';

    case 'js':
      if (name.includes('test') || name.includes('dev') || name.includes('debug')) {
        return 'docs/development/scripts/';
      }
      return 'scripts/';

    default:
      return 'docs/development/';
  }
}
