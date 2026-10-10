const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "uploads/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      // Express error handlers must declare all four arguments
      "no-unused-vars": ["error", { argsIgnorePattern: "^(next|_)" }],
    },
  },
];
