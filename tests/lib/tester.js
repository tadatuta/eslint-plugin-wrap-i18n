const RuleTester = require('eslint').RuleTester;

module.exports.ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react'],
});
