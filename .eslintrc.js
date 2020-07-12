module.exports = {
  extends: ['airbnb', 'plugin:prettier/recommended', 'prettier/react', 'plugin:jest/recommended'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },
  globals: {
    FORCE_CLI_EXECUTE: 'writable',
    GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS: 'writable',
    GIT_COMMIT_MSG_HOOK_SKIP_AUTO_SUGGEST: 'writable',
  },
  plugins: ['jest'],
  rules: {
    'jsx-a11y/href-no-hash': ['off'],
    'react/jsx-filename-extension': ['warn', { extensions: ['.js', '.jsx'] }],
    'max-len': [
      'warn',
      {
        code: 100,
        tabWidth: 2,
        comments: 100,
        ignoreComments: false,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
  },
};
