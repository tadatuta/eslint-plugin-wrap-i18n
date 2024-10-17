'use strict';

const path = require('path');
const { I18N_IMPORT_REGEX } = require('../constants');

const DEFAULT_I18N_FUNC_NAME = 'i18n';
const russianCharsRegex = /[\u0400-\u04FF]/;

const getWrapper = (node, i18nFuncName) => {
  if (node.parent.type === 'JSXAttribute') {
    return {
      before: `{${i18nFuncName}(`,
      after: `)}`,
    };
  }

  switch (node.type) {
    case 'JSXText':
      return {
        before: `{${i18nFuncName}('`,
        after: `')}`,
      };
    case 'TemplateElement':
      return {
        before: '${' + i18nFuncName + "('",
        after: "')}",
      };
    default:
      return {
        before: `${i18nFuncName}(`,
        after: `)`,
      };
  }
};

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: `problem`,
    docs: {
      description: 'Warns for unwrapped strings',
    },
    messages: {
      unwrappedString: 'The string `{{str}}` is not wrapped in i18n call',
    },
    fixable: `code`,
  },

  create: (context) => {
    const importStr = `import { ${DEFAULT_I18N_FUNC_NAME} } from './i18n';`;
    const sourceCode = context.getSourceCode();
    const importDeclarations = sourceCode.ast.body.filter(
      (node) => node.type === 'ImportDeclaration',
    );
    const hasImportDeclarations = Boolean(importDeclarations.length);

    const importedI18NNames = [];

    if (hasImportDeclarations) {
      importDeclarations.forEach((node) => {
        // `node.source.value` is a string like `import { i18n } from './${dirname}.i18n'`
        if (!I18N_IMPORT_REGEX.test(node.source.value)) return;

        node.specifiers.forEach((specifier) => {
          if (specifier.imported) {
            importedI18NNames.push(specifier.imported.name);
          }
        });
      });
    }

    const isInsideI18NCall = (node) => {
      return node.type === 'CallExpression' && importedI18NNames.includes(node.callee.name);
    };

    const hasI18NWrapper = (node) => {
      const parent = node.parent;

      return (
        isInsideI18NCall(parent) ||
        (parent.type === 'Property' &&
          parent.key.name === 'context' &&
          isInsideI18NCall(parent.parent.parent))
      );
    };

    const onMatchNodeType = (node, raw) => {
      let trimmedValue = raw.trim();

      if (node.type === 'JSXText') {
        trimmedValue = trimmedValue.split('\n').map(s => s.trim()).join(' ');
      }

      context.report({
        node,
        messageId: 'unwrappedString',
        data: {
          str: ["'", '"', '`'].includes(trimmedValue[0]) ? trimmedValue.slice(1, -1) : trimmedValue,
        },
        fix: (fixer) => {
          const fixes = [];

          if (!importedI18NNames.length) {
            importedI18NNames.push(DEFAULT_I18N_FUNC_NAME);

            fixes.push(
              hasImportDeclarations
                ? fixer.insertTextAfter(
                    importDeclarations[importDeclarations.length - 1],
                    '\n' + importStr,
                  )
                : fixer.insertTextBefore(sourceCode.ast.body[0], importStr + '\n\n'),
            );
          }

          if (hasI18NWrapper(node)) {
            return fixes;
          }

          const wrapper = getWrapper(node, importedI18NNames[0]);
          const wrappedValue = wrapper.before + trimmedValue + wrapper.after;

          if (node.type === 'TemplateElement') {
            fixes.push(
              fixer.replaceText(
                node.parent,
                sourceCode.getText(node.parent).replace(raw.trim(), wrappedValue),
              ),
            );
          } else {
            fixes.push(fixer.replaceText(node, raw.replace(raw.trim(), wrappedValue)));
          }

          return fixes;
        },
      });
    };

    return {
      'Literal, JSXText': (node) => {
        if (
          typeof node.value === 'string' &&
          russianCharsRegex.exec(node.raw) &&
          !hasI18NWrapper(node)
        ) {
          return onMatchNodeType(node, node.raw);
        }
      },
      TemplateElement: (node) => {
        const val = node.value;

        if (val && val.raw && russianCharsRegex.exec(val.raw) && !hasI18NWrapper(node.parent)) {
          return onMatchNodeType(node, node.value.raw);
        }
      },
    };
  },
};
