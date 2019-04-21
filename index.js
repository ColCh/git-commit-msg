#!/usr/bin/env node
/* eslint-disable global-require */

/**
 *     GIT-COMMIT-MSG
 *
 * code is written without external deps
 * also without splitting code into files
 * this is an attempt to keep it short and simple
 */

/* #region options */
const commitTypeToEmoji = {
  chore: '😒',
  docs: '📝',
  feat: '⭐',
  fix: '🛠',
  refactor: '♻',
  style: '💄',
  test: '🔍',
  type: '🏷',
  perf: '⚡',
  ci: '🤖',
};

const markWordsWithEmoji = {
  update: '⬆ ',
  add: '➕',
  remove: '➖',
  change: '🔁',
  rename: '🔁',
  package: '📦',
  deploy: '📦',
  fix: '🛠',
  webpack: ' 🎁',
  increase: '📈 ',
  decrease: ' 📉',
  copy: ' 📋',
  config: '⚙️',
  configure: '⚙️',
  optimize: ' 🚀',
  typo: ' 📝',
  initial: ' 🌀',
};
/* #endregion */

/* #region morphs */
const morphs = [
  /* #region context emoji */
  msg => {
    const typesWithoutEmoji = Object.keys(commitTypeToEmoji).map(type =>
      [
        `(?<!${commitTypeToEmoji[type]}\\s)`, // no preceding emoji
        type,
      ].join(''),
    );

    const emojis = new RegExp(
      [
        '(?<!\\n)', // should be first line
        `(${typesWithoutEmoji.join('|')})`, // remember type
        '(?:\\(|:)', // optionally followed by context
        '(.*\\n)?', // and line break
      ].join(''),
    );

    return msg.replace(emojis, (matched, type) => `${commitTypeToEmoji[type]} ${matched}`);
  },
  /* #endregion */

  /* #region mark word with emoji */
  msg => {
    const wordsWithoutEmoji = Object.keys(markWordsWithEmoji).map(word =>
      [
        `(?<!${markWordsWithEmoji[word]}\\s)`, // no preceding emoji
        word,
      ].join(''),
    );

    const emojis = new RegExp(
      [
        '(?<!\\n)', // should be first line
        '([\\s\\.,]|^)', // word left boundary
        `(${wordsWithoutEmoji.join('|')})`, // remember word
        '([\\s\\.,]|$)', // word right boundary
        '((.*\\n)?)', // line break
      ].join(''),
    );

    const firstLinePos = msg.indexOf('\n');
    const firstLine = msg.slice(0, firstLinePos === -1 ? undefined : firstLinePos);
    const otherLines = firstLinePos === -1 ? '' : msg.slice(firstLinePos);

    const replacedFirstLine = firstLine.replace(
      emojis,
      (...[, left, word, right, other]) =>
        `${left}${markWordsWithEmoji[word]} ${word}${right}${other}`,
    );

    if (replacedFirstLine === firstLine) {
      return msg;
    }

    return replacedFirstLine + otherLines;
  },
  /* #endregion */

  /* #region infer context */
  // works if commit is *verbose*
  msg => {
    /**
     * Take all things after `Changes to be committed` and before empty commented line
     * EXAMPLE:
     *   # Changes to be committed:
     *   #	modified:   modified-file
     *   #	deleted:    readme-file
     *   #	new file:   new-file
     *   #
     * (from git commit --verbose)
     */

    if (!msg.includes('# Changes to be committed:')) {
      return msg;
    }

    const files = (() => {
      const changedFilesIndexStart = msg.indexOf('# Changes to be committed:');
      const changedFilesIndexEnd = msg.indexOf('#\n', changedFilesIndexStart);

      const changedFilesString = msg.slice(changedFilesIndexStart, changedFilesIndexEnd);

      if (!changedFilesString) {
        return [];
      }

      const parseFilePathReg = new RegExp(
        [
          '#\\s+', // file path should start with comment mark followed by tab symbol
          '[\\w\\s]+:\\s+', // file change type (add, change, remove...) followed by ":" and space symbols
          '(.+)', // actual file path
          '$|\\n', // str end
        ].join(''),
      );

      return (
        changedFilesString
          .split('\n')
          // file paths start with "#" following by tab symbol
          .filter(str => str.startsWith('#	'))
          .map(str => (str.match(parseFilePathReg) || [])[1] || undefined)
          .filter(x => x !== undefined)
          .map(x => x.toLowerCase())
      );
    })();

    const inferContext = path => {
      const parentDir = (() => {
        const lastSlash = path.lastIndexOf('/');
        return path.slice(path.lastIndexOf('/', lastSlash - 1) + 1, lastSlash);
      })();
      const basename = path.replace(/^.*[\\/]/, '');
      const filename = basename.slice(0, basename.lastIndexOf('.'));

      /* #region simple cases */
      if (basename === 'package.json') {
        return 'pkg';
      }
      if (filename === 'karma.conf') {
        return 'karma';
      }
      if (filename === 'webpack.conf' || path.includes('/webpack/')) {
        return 'webpack';
      }
      if (filename === 'readme.md') {
        return 'readme';
      }
      if (filename === 'changelog.md') {
        return 'changelog';
      }
      if (basename.startsWith('yarn')) {
        return 'yarn';
      }
      /* #endregion */

      /* #region medium cases */
      if (
        filename.startsWith('index') &&
        (parentDir === '__tests__' || parentDir === '__snapshots__')
      ) {
        // e.g. src/foo/__snapshots__/index.js -> foo
        const pathParts = path.split('/');
        if (pathParts.length > 3 && pathParts[pathParts.length - 3]) {
          // fail with '__snapshots__/index.js'
          return pathParts[pathParts.length - 3];
        }
      }
      if (filename === 'index' && parentDir !== '') {
        // e.g. src/foo/index.js -> foo
        return filename;
      }
      /* #endregion */

      return filename;
    };

    const contexts = files.map(path => inferContext(path));
    const uniqueContexts = [...new Set(contexts)];

    const contextsWord = uniqueContexts.length > 1 ? 'contexts' : 'context';
    const contextReportMsg =
      uniqueContexts.length > 0
        ? `Found ${uniqueContexts.length} ${contextsWord}`
        : `Found no contexts`;

    const contextReport = `${[contextReportMsg, ...uniqueContexts.map(x => `    * ${x}`)]
      .map(x => `# ${x}`)
      .join('\n')}\n`;

    // this this is being tested, so append inferred contexts
    // into first commented lines
    const firstCommentedLine = msg.indexOf('# ');

    return msg.slice(0, firstCommentedLine) + contextReport + msg.slice(firstCommentedLine);
  },
  /* #endregion */
];
/* #endregion */

function main(msg) {
  // e.g. function composition
  return morphs.reduceRight((currentMessage, morph) => morph(currentMessage), msg);
}

if (global.FORCE_CLI_EXECUTE || require.main === module) {
  const fs = require('fs');
  const process = require('process');

  const commitMsgFilePath = process.argv[process.argv.length - 1];
  const commitMessage = fs.readFileSync(commitMsgFilePath).toString();
  const newCommitMessage = main(commitMessage);

  if (commitMessage !== newCommitMessage) {
    fs.writeFileSync(commitMsgFilePath, newCommitMessage);
  }
} else {
  module.exports.main = main;
  module.exports.commitTypeToEmoji = commitTypeToEmoji;
  module.exports.markWordsWithEmoji = markWordsWithEmoji;
}
