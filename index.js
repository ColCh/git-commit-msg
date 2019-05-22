#!/usr/bin/env node
/* eslint-disable global-require */

/**
 *     GIT-COMMIT-MSG
 *
 * code is written without external deps
 * also without splitting code into files
 * this is an attempt to keep it short and simple
 */

// #region options
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

const maxInferredContexts = 3;
// #endregion

// #region morphs
const morphs = [
  // #region context emoji
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

    const firstLinePos = msg.indexOf('\n');
    const firstLine = msg.slice(0, firstLinePos === -1 ? undefined : firstLinePos);
    const otherLines = firstLinePos === -1 ? '' : msg.slice(firstLinePos);

    const replacedFirstLine = firstLine.replace(
      emojis,
      (matched, type) => `${commitTypeToEmoji[type]} ${matched}`,
    );

    if (replacedFirstLine === firstLine) {
      return msg;
    }

    return replacedFirstLine + otherLines;
  },
  // #endregion

  // #region mark word with emoji
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
  // #endregion

  // #region infer context
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
      );
    })();

    const inferContext = path => {
      const pathLowerCased = path.toLowerCase();
      const basename = path.replace(/^.*[\\/]/, '');
      const basenameLowerCased = path.replace(/^.*[\\/]/, '');
      const filename = basename.slice(0, basename.lastIndexOf('.'));
      const filenameLowerCased = filename.toLowerCase();

      // #region simple cases
      if (basenameLowerCased === 'package.json') {
        return 'pkg';
      }
      if (filenameLowerCased === 'karma.conf') {
        return 'karma';
      }
      if (filenameLowerCased.startsWith('webpack.config') || pathLowerCased.includes('/webpack/')) {
        return 'webpack';
      }
      if (filenameLowerCased === 'readme.md') {
        return 'readme';
      }
      if (filenameLowerCased === 'changelog.md') {
        return 'changelog';
      }
      if (basename.startsWith('yarn')) {
        return 'yarn';
      }
      // #endregion

      const pathParts = path
        .split('/')
        // skip most parent dir
        .slice(1)
        .filter(part => {
          const lowercased = part.toLowerCase();
          return !(lowercased.startsWith('index') || ['__tests__', '__snapshots__'].includes(part));
        });

      const contexts = pathParts.slice(0, maxInferredContexts);

      if (pathParts.length === 0) {
        return filename;
      }

      return contexts;
    };

    const contexts = files.reduce((acc, path) => acc.concat(inferContext(path)), []);
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
  // #endregion
];
// #endregion

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
