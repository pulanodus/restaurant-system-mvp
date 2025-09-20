/**
 * Custom ESLint rule for import standards
 * Enforces consistent import patterns across the codebase
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce consistent import patterns',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      useAliasImport: 'Use alias import (@/) instead of relative import (../)',
      useRelativeForSameDir: 'Use relative import (./) for same-directory files',
      invalidImportPath: 'Invalid import path structure',
    },
  },

  create(context) {
    const _sourceCode = context.getSourceCode();
    const filename = context.getFilename();

    // Check if file is in src directory
    if (!filename.includes('/src/')) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        
        // Skip external imports
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          return;
        }

        // Rule 1: Use @/ for project imports (not same directory)
        if (importPath.startsWith('../')) {
          context.report({
            node: node.source,
            messageId: 'useAliasImport',
            fix(fixer) {
              // Convert relative path to alias path
              const relativePath = importPath.replace('../', '');
              const aliasPath = `@/${relativePath}`;
              return fixer.replaceText(node.source, `'${aliasPath}'`);
            },
          });
        }

        // Rule 2: Use ./ for same directory imports
        if (importPath.startsWith('@/') && !importPath.includes('/')) {
          const currentDir = filename.substring(0, filename.lastIndexOf('/'));
          const importFile = `${currentDir}/${importPath.replace('@/', '')}`;
          
          // Check if the imported file exists in the same directory
          if (importFile.endsWith('.ts') || importFile.endsWith('.tsx')) {
            context.report({
              node: node.source,
              messageId: 'useRelativeForSameDir',
              fix(fixer) {
                const relativePath = `./${importPath.replace('@/', '')}`;
                return fixer.replaceText(node.source, `'${relativePath}'`);
              },
            });
          }
        }

        // Rule 3: Validate import path structure
        if (importPath.startsWith('@/')) {
          const pathParts = importPath.split('/');
          
          // Ensure proper path structure
          if (pathParts.length < 3) {
            context.report({
              node: node.source,
              messageId: 'invalidImportPath',
            });
          }
        }
      },
    };
  },
};
