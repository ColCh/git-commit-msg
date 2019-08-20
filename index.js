#!/usr/bin/env node
/* eslint-disable no-restricted-syntax */
/* eslint-disable global-require */

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
  correct: '🎚️ ',
  handle: '🏭',
  use: '🏄',
  ru: '🇷🇺 ',
};

const maxInferredContexts = 3;

// https://github.com/muan/emojilib
const whitelistedEmojiCategories = ['people', 'animals_and_nature', 'objects', 'symbols'];
// #endregion

// #region options
const options = {
  skipEmojis: () => global.SKIP_ADDING_EMOJIS === true || !!process.env.SKIP_ADDING_EMOJIS,
  skipAutoSuggestEmojis: () => global.SKIP_AUTO_SUGGEST === true || !!process.env.SKIP_AUTO_SUGGEST,
};
// #endregion

// #region morphs
const morphs = [
  // #region context emoji
  msg => {
    if (options.skipEmojis()) {
      return msg;
    }

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

  // #region emoji autosuggestion
  msg => {
    if (options.skipEmojis() || options.skipAutoSuggestEmojis()) {
      return msg;
    }

    const { lib: emojiLib } = require('emojilib');
    const emojiSuggestions = require('emoji-suggestions');

    const getEmojiCategory = emoji => {
      for (const [, info] of Object.entries(emojiLib)) {
        if (info.char === emoji) {
          return info.category;
        }
      }
    };

    const filterEmojis = emojis => {
      return emojis.filter(emoji => whitelistedEmojiCategories.includes(getEmojiCategory(emoji)));
    };

    const suggestEmoji = word => {
      const result = emojiSuggestions(word);
      if (!Array.isArray(result) || result.length === 0) {
        return null;
      }
      const suggestions = result[0];
      const emojis = suggestions[word];
      if (!Array.isArray(emojis) || emojis.length === 0) {
        return null;
      }
      const whitelistedEmojis = filterEmojis(emojis);
      return whitelistedEmojis.length === 0 ? null : whitelistedEmojis[0];
    };

    const firstLinePos = msg.indexOf('\n');
    const firstLine = msg.slice(0, firstLinePos === -1 ? undefined : firstLinePos);
    const otherLines = firstLinePos === -1 ? '' : msg.slice(firstLinePos);

    const firstLineMsgMatch = /^(?:\w+-\d+:\s+)?\w+(?:\(\w+\))?:\s+/.exec(firstLine) || [''];
    const firstLineBeforeMsg = firstLineMsgMatch[0];
    const firstLineMsg = firstLine.slice(firstLineMsgMatch[0].length);

    const replacedFirstLine =
      firstLineBeforeMsg +
      firstLineMsg.replace(/(?:^|(?<=\w\s)|:\s*)(\w+)/g, (match, word) => {
        if (!word || !/^\w+$/.test(word) || word in markWordsWithEmoji) {
          return match;
        }
        const emoji = suggestEmoji(word);
        if (!emoji) {
          return match;
        }
        return match.replace(word, `${emoji} ${word}`);
      });
    return replacedFirstLine + otherLines;
  },
  // #endregion

  // #region mark word with emoji
  msg => {
    if (options.skipEmojis()) {
      return msg;
    }

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
  if (/Merge branch/.test(msg)) {
    // leave merge commit msg as is
    return msg;
  }
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
