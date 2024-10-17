'use strict';

const fs = require('fs');
const path = require('path');

const rule = require('../../../lib/rules/no-unwrapped-strings');
const { ruleTester } = require('../tester');

const pathToInvalidMocks = path.join(__dirname, 'invalid');
const invalidMocks = fs.readdirSync(pathToInvalidMocks);
const invalidInputMocks = invalidMocks.filter((filename) => filename.includes('-input.tsx'));

const getMock = (mockFilename) => {
  return {
    code: fs.readFileSync(path.join(pathToInvalidMocks, mockFilename), 'utf-8'),
    output: fs.readFileSync(
      path.join(pathToInvalidMocks, mockFilename.replace('-input', '-output')),
      'utf-8',
    ),
    errors: [{ message: 'The string `строка` is not wrapped in i18n call' }],
  };
};

ruleTester.run('no-unwrapped-strings', rule, {
  valid: [
    `'str'`,
    '`str`',
    '"str"',
    '<div>str</div>',
    `<div>{'str'}</div>`,
    "import { i18n } from './module.i18n';export const module = i18n('строка')",
    'import { i18n } from "./module.i18n";export const module = i18n("строка")',
    "import { i18n } from './module.i18n';export const module = i18n(`строка`)",
    "import { i18n } from './module.i18n'; const c = () => <div>{i18n('строка', { context: 'куку' })}</div>",
  ],

  invalid: invalidInputMocks.map(getMock).concat([
    {
      code: [
        'const blah = () => {',
          'return <div>',
              'строка',
              'строка',
          '</div>',
      '}'
      ].join('\n'),
    output: [
      `import { i18n } from './..i18n';`,
      '',
      'const blah = () => {',
          'return <div>',
              `{i18n('строка строка')}`,
          '</div>',
      '}'
    ].join('\n'),
    errors: [{ message: 'The string `строка строка` is not wrapped in i18n call' }]
    }
  ]),
});
