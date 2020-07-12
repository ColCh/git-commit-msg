/* eslint-disable global-require */
const { main, commitTypeToEmoji, markWordsWithEmoji } = require('..');

jest.mock('emoji-suggestions', () => jest.fn());

const emojiSuggestionsMock = require('emoji-suggestions');

const getMessage = (commitOutput) => {
  const firstCommentedLine = commitOutput.indexOf('\n# ');

  if (firstCommentedLine === -1) {
    return commitOutput;
  }

  return commitOutput.slice(0, firstCommentedLine);
};

/** without hook additions */
const getCleanOutput = (dirtyOutput) => {
  const gitOutputIndex = dirtyOutput.indexOf(
    '# Please enter the commit message for your changes. Lines starting',
  );

  if (gitOutputIndex === -1) {
    throw new Error('WTF: gitOutput should exist');
  }

  const originalCommentedLines = dirtyOutput.slice(gitOutputIndex);

  const firstCommentedLine = dirtyOutput.indexOf('# ');

  if (firstCommentedLine === -1) {
    throw new Error('WTF: firstCommentedLine should exist');
  }

  const message = dirtyOutput.slice(0, firstCommentedLine);

  const cleanOutput = `${message}${originalCommentedLines}`;
  return cleanOutput;
};

describe('main test for git-commit-msg', () => {
  beforeAll(() => {
    delete process.env.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS;
    delete process.env.GIT_COMMIT_MSG_HOOK_SKIP_AUTO_SUGGEST;
  });

  describe('commit types', () => {
    describe('per-type tests', () => {
      Object.keys(commitTypeToEmoji).forEach((type) => {
        describe(`given commit type "${type}"`, () => {
          const msg = 'some msg';
          const emoji = commitTypeToEmoji[type];

          it('should not modify invalid message', () => {
            expect(getMessage(main(`${msg}`))).toEqual(`${msg}`);
          });

          it('should add emoji for oneline msg without context', () => {
            expect(getMessage(main(`${type}: ${msg}`))).toEqual(`${emoji} ${type}: ${msg}`);
          });

          it('should not add emoji twice for oneline msg without context', () => {
            expect(getMessage(main(main(`${type}: ${msg}`)))).toEqual(`${emoji} ${type}: ${msg}`);
          });

          it('should add emoji only for first line', () => {
            expect(getMessage(main([`${type}: ${msg}`, `${type}: ${msg}`].join('\n')))).toEqual(
              [`${emoji} ${type}: ${msg}`, `${type}: ${msg}`].join('\n'),
            );
          });

          it('should not add emoji for other line but not first', () => {
            expect(getMessage(main([`${msg}`, `${type}: ${msg}`].join('\n')))).toEqual(
              [`${msg}`, `${type}: ${msg}`].join('\n'),
            );
          });

          it('should not add emoji in case global option specified', () => {
            global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS = true;
            expect(getMessage(main(`${type}: ${msg}`))).toEqual(`${type}: ${msg}`);
            delete global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS;
          });

          it('should match snapshot', () => {
            expect(getMessage(main(`${type}: ${msg}`))).toMatchSnapshot();
          });
        });
      });
    });

    describe('logic tests', () => {
      it('should not replace text after first line', () => {
        const msg = [
          ``,
          `# Please enter the commit message for your changes. Lines starting`,
          `# with '#' will be ignored, and an empty message aborts the commit.`,
          `#`,
          `# On branch master`,
          `# Your branch is ahead of 'origin/master' by 2 commits.`,
          `#   (use "git push" to publish your local commits)`,
          `#`,
          `# Changes to be committed:`,
          `#       modified:   index.js`,
          `#`,
          `# ------------------------ >8 ------------------------`,
          `# Do not modify or remove the line above.`,
          `# Everything below it will be ignored.`,
          `diff --git c/index.js i/index.js`,
          `index 3928a44..04eeec9 100755`,
          `--- c/index.js`,
          `+++ i/index.js`,
          `@@ -9,6 +9,8 @@`,
          `  * this is an attempt to keep it short and simple`,
          `  */`,
          ``,
          `  test: /./svg/`,
          `+`,
          ` /* #region options */`,
          ` const commitTypeToEmoji = {`,
          `   chore: '😒',`,
        ].join('\n');

        const actual = main(msg);

        const cleanMessage = getCleanOutput(actual);

        expect(cleanMessage).toEqual(
          [
            ``,
            `# Please enter the commit message for your changes. Lines starting`,
            `# with '#' will be ignored, and an empty message aborts the commit.`,
            `#`,
            `# On branch master`,
            `# Your branch is ahead of 'origin/master' by 2 commits.`,
            `#   (use "git push" to publish your local commits)`,
            `#`,
            `# Changes to be committed:`,
            `#       modified:   index.js`,
            `#`,
            `# ------------------------ >8 ------------------------`,
            `# Do not modify or remove the line above.`,
            `# Everything below it will be ignored.`,
            `diff --git c/index.js i/index.js`,
            `index 3928a44..04eeec9 100755`,
            `--- c/index.js`,
            `+++ i/index.js`,
            `@@ -9,6 +9,8 @@`,
            `  * this is an attempt to keep it short and simple`,
            `  */`,
            ``,
            `  test: /./svg/`,
            `+`,
            ` /* #region options */`,
            ` const commitTypeToEmoji = {`,
            `   chore: '😒',`,
          ].join('\n'),
        );
      });
    });
  });

  describe('mark words with emoji', () => {
    describe('per-word tests', () => {
      Object.keys(markWordsWithEmoji).forEach((word) => {
        describe(`given word "${word}"`, () => {
          const msg = 'some msg';
          const emoji = markWordsWithEmoji[word];

          it('should not modify message without word', () => {
            expect(getMessage(main(`${msg}`))).toEqual(`${msg}`);
          });

          it('should add emoji for oneline msg', () => {
            expect(getMessage(main(`${msg} ${word} ${msg}`))).toEqual(
              `${msg} ${emoji} ${word} ${msg}`,
            );
          });

          it('should not add emoji for oneline msg if flag specified', () => {
            global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS = true;
            expect(getMessage(main(`${msg} ${word} ${msg}`))).toEqual(`${msg} ${word} ${msg}`);
            delete global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS;
          });

          it('should not add emoji twice for oneline msg', () => {
            expect(getMessage(main(main(`${msg} ${word} ${msg}`)))).toEqual(
              `${msg} ${emoji} ${word} ${msg}`,
            );
          });

          it('should add emoji only for first line', () => {
            expect(
              getMessage(main([`${msg} ${word} ${msg}`, `${msg} ${word} ${msg}`].join('\n'))),
            ).toEqual([`${msg} ${emoji} ${word} ${msg}`, `${msg} ${word} ${msg}`].join('\n'));
          });

          it('should not add other symbols', () => {
            expect(getMessage(main(`${word}`))).toEqual(`${emoji} ${word}`);
          });

          it('should not replace partial match with free from left', () => {
            expect(getMessage(main(`${word}FOO`))).toEqual(`${word}FOO`);
          });

          it('should not replace partial match with free from right', () => {
            expect(getMessage(main(`FOO${word}`))).toEqual(`FOO${word}`);
          });

          it('should not replace text after first line', () => {
            expect(
              getCleanOutput(
                main(
                  [
                    `my commit ${word} message`,
                    `my commit ${word} second line message`,
                    `# Please enter the commit message for your changes. Lines starting`,
                    `# with '#' will be ignored, and an empty message aborts the commit.`,
                    `#`,
                    `# On branch master`,
                    `# Your branch is up to date with 'origin/master'.`,
                    `#`,
                    `# Changes not staged for commit:`,
                    `#	deleted:    ${word}`,
                    `#	modified:   ${word}.txt`,
                    `#`,
                    `# Untracked files:`,
                    `#	${word}`,
                    `#`,
                  ].join('\n'),
                ),
              ),
            ).toEqual(
              [
                `my commit ${emoji} ${word} message`,
                `my commit ${word} second line message`,
                `# Please enter the commit message for your changes. Lines starting`,
                `# with '#' will be ignored, and an empty message aborts the commit.`,
                `#`,
                `# On branch master`,
                `# Your branch is up to date with 'origin/master'.`,
                `#`,
                `# Changes not staged for commit:`,
                `#	deleted:    ${word}`,
                `#	modified:   ${word}.txt`,
                `#`,
                `# Untracked files:`,
                `#	${word}`,
                `#`,
              ].join('\n'),
            );
          });

          it('should match snapshot', () => {
            expect(getMessage(main(`${msg} ${word} ${msg}`))).toMatchSnapshot();
          });
        });
      });
    });

    describe('auto suggestion', () => {
      const fooEmoji = '👋';

      beforeEach(() => {
        emojiSuggestionsMock.mockReset();
        emojiSuggestionsMock.mockReturnValue([{ FOO: [fooEmoji] }]);
      });

      it('should suggest emoji for word FOO', () => {
        expect(getMessage(main(`FOO`))).toEqual(`${fooEmoji} FOO`);
      });

      it('should not suggest emoji for commit type word without context', () => {
        expect(getMessage(main(`FOO: msg`))).toEqual(`FOO: msg`);
      });

      it('should not suggest emoji for context', () => {
        expect(getMessage(main(`baz(FOO): msg`))).toEqual(`baz(FOO): msg`);
      });

      it('should not suggest emoji for commit message with ticket name and mock type', () => {
        expect(getMessage(main(`FOOBAR-0: FOO: FOO`))).toEqual(`FOOBAR-0: FOO: ${fooEmoji} FOO`);
      });

      it('should not suggest emoji for commit message with ticket name and real type', () => {
        emojiSuggestionsMock.mockReturnValue([{ test: [fooEmoji] }]);
        expect(getMessage(main(`FOOBAR-0: test: test`))).toEqual(
          `FOOBAR-0: ${commitTypeToEmoji.test} test: ${fooEmoji} test`,
        );
      });

      it('should suggest emoji for full commit msg with word at end', () => {
        expect(getMessage(main(`baz(FOO): msg FOO`))).toEqual(`baz(FOO): msg ${fooEmoji} FOO`);
      });

      it('should suggest emoji for full commit msg with word at end but add it only once', () => {
        expect(getMessage(main(`baz(FOO): msg ${fooEmoji} FOO`))).toEqual(
          `baz(FOO): msg ${fooEmoji} FOO`,
        );
      });

      it('should suggest emoji for full commit msg with word at beginning', () => {
        expect(getMessage(main(`baz(FOO): FOO msg`))).toEqual(`baz(FOO): ${fooEmoji} FOO msg`);
      });

      it('should suggest emoji for full commit msg with word at beginning but add it only once', () => {
        expect(getMessage(main(`baz(FOO): ${fooEmoji} FOO msg`))).toEqual(
          `baz(FOO): ${fooEmoji} FOO msg`,
        );
      });

      it('should suggest emoji for full commit msg with word in middle', () => {
        expect(getMessage(main(`baz(FOO): FOO msg`))).toEqual(`baz(FOO): ${fooEmoji} FOO msg`);
      });

      it('should suggest emoji for full commit msg with word in middle but add it only once', () => {
        expect(getMessage(main(`baz(FOO): ${fooEmoji} FOO msg`))).toEqual(
          `baz(FOO): ${fooEmoji} FOO msg`,
        );
      });

      it('should not add emoji in case global option specified', () => {
        global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS = true;
        expect(getMessage(main(`FOO`))).toEqual(`FOO`);
        delete global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS;
      });

      it('should not add emoji in case global option specified for skipping auto suggested emojis', () => {
        global.GIT_COMMIT_MSG_HOOK_SKIP_AUTO_SUGGEST = true;
        expect(getMessage(main(`FOO`))).toEqual(`FOO`);
        delete global.GIT_COMMIT_MSG_HOOK_SKIP_AUTO_SUGGEST;
      });

      it('should replace only in first line', () => {
        expect(getMessage(main([`FOO`, `FOO`].join('\n')))).toEqual(
          [`${fooEmoji} FOO`, `FOO`].join('\n'),
        );
      });

      it('should not use auto suggestions for words in hardcoded map', () => {
        const firstHardcodedWord = Object.keys(markWordsWithEmoji)[0];
        main(`${firstHardcodedWord}`);
        expect(emojiSuggestionsMock).not.toBeCalled();
      });

      it('should not suggest emoji for merge commit', () => {
        emojiSuggestionsMock.mockReturnValue([{ branch: [fooEmoji] }]);
        const msg = [`Merge branch 'foo-bar-baz' into 'master'`, 'Add foo, remove baz'].join('');
        expect(getMessage(main(msg))).toEqual(msg);
      });

      it('should not suggest emoji for message like merge commit', () => {
        emojiSuggestionsMock.mockReturnValue([{ branch: [fooEmoji] }]);
        const msg = [
          `Fobar-1: Merge branch 'foo-bar-baz' into 'master'`,
          'Add foo, remove baz',
        ].join('');
        expect(getMessage(main(msg))).toEqual(msg);
      });
    });
  });

  describe('context inferring', () => {
    /** extract only context inferring part from commit message */
    const getContextMessagePart = (dirtyOutput) => {
      let originalCommitMessage = dirtyOutput.indexOf(
        '# Please enter the commit message for your changes. Lines starting',
      );
      if (originalCommitMessage === -1) {
        originalCommitMessage = dirtyOutput.indexOf('# Changes to be committed:');
        if (originalCommitMessage === -1) {
          return '';
        }
      }
      const messageBeforeFiles = dirtyOutput.slice(0, originalCommitMessage);

      const contextMessage = messageBeforeFiles.indexOf('# Found ');
      if (contextMessage === -1) {
        return '';
      }

      return messageBeforeFiles.slice(contextMessage).replace(/\n$/, '');
    };

    it('should infer context 3 times from minimal commit message', () => {
      const msg = [
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [
          `# Found 3 contexts`,
          `#     * modified-file`,
          `#     * deleted-file`,
          `#     * new-file`,
        ].join('\n'),
      );
    });

    it('should not add anything if no changes was staged', () => {
      const msg = [
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual('');
    });

    it('should mark if no contexts found', () => {
      const msg = [`# Changes to be committed:`, `#`].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(`# Found no contexts`);
    });

    it('should infer context 3 times from commit message without unstaged changes', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch master`,
        `# Your branch is up to date with 'origin/master'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [
          `# Found 3 contexts`,
          `#     * modified-file`,
          `#     * deleted-file`,
          `#     * new-file`,
        ].join('\n'),
      );
    });

    it('should infer double underscore context', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch master`,
        `# Your branch is up to date with 'origin/master'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   src/foo/__snapshots__/index.js`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [`# Found 1 context`, `#     * foo`].join('\n'),
      );
    });

    it('should infer default double underscore context', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch master`,
        `# Your branch is up to date with 'origin/master'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   src/__snapshots__/index.js`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [`# Found 1 context`, `#     * index`].join('\n'),
      );
    });

    it('should infer context 3 times from full commit message', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch master`,
        `# Your branch is up to date with 'origin/master'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
        `# Untracked files:`,
        `#	untracked.txt`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [
          `# Found 3 contexts`,
          `#     * modified-file`,
          `#     * deleted-file`,
          `#     * new-file`,
        ].join('\n'),
      );
    });

    it('should infer package.json context', () => {
      const msg = [
        'my commit message',
        `# Changes to be committed:`,
        `#	modified:   package.json`,
        `#	deleted:    package.json`,
        `#	new file:   package.json`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [`# Found 1 context`, `#     * pkg`].join('\n'),
      );
    });

    it('should infer webpack context from config file', () => {
      const msg = [
        'my commit message',
        `# Changes to be committed:`,
        `#	modified:   webpack.config.ts`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [`# Found 1 context`, `#     * webpack`].join('\n'),
      );
    });

    it('should infer webpack context from webpack directory', () => {
      const msg = [
        'my commit message',
        `# Changes to be committed:`,
        `#	modified:   src/webpack/index.js`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [`# Found 1 context`, `#     * webpack`].join('\n'),
      );
    });

    it('should match snapshot with full commit message', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch master`,
        `# Your branch is up to date with 'origin/master'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
        `# Untracked files:`,
        `#	untracked.txt`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toMatchSnapshot();
    });

    it('should collect more contexts', () => {
      const msg = [
        `# Changes to be committed:`,
        `#	new file:   my-project/baz/BAR/FOO/index.ts`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [`# Found 3 contexts`, `#     * baz`, `#     * BAR`, `#     * FOO`].join('\n'),
      );
    });

    it('should remove extensions', () => {
      const msg = [
        `# Changes to be committed:`,
        `#	modified:   MODIFIED_FILE.ts`,
        `#	deleted:    DeLeTeDFiLe.js`,
        `#	new file:   newfile.txt`,
        `#`,
      ].join('\n');

      expect(getContextMessagePart(main(msg))).toEqual(
        [
          `# Found 3 contexts`,
          `#     * MODIFIED_FILE`,
          `#     * DeLeTeDFiLe`,
          `#     * newfile`,
        ].join('\n'),
      );
    });

    it('should preserve case', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch master`,
        `# Your branch is up to date with 'origin/master'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   ModifiedFile.txt`,
        `#	deleted:    DELETED_FILE.txt`,
        `#	new file:   NewFile.txt`,
        `#`,
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
        `# Untracked files:`,
        `#	untracked.txt`,
        `#`,
      ].join('\n');

      const actual = main(msg);

      expect(getContextMessagePart(actual)).toEqual(
        [
          `# Found 3 contexts`,
          `#     * ModifiedFile`,
          `#     * DELETED_FILE`,
          `#     * NewFile`,
        ].join('\n'),
      );
      expect(getCleanOutput(actual)).toEqual(
        [
          'my commit message',
          `# Please enter the commit message for your changes. Lines starting`,
          `# with '#' will be ignored, and an empty message aborts the commit.`,
          `#`,
          `# On branch master`,
          `# Your branch is up to date with 'origin/master'.`,
          `#`,
          `# Changes to be committed:`,
          `#	modified:   ModifiedFile.txt`,
          `#	deleted:    DELETED_FILE.txt`,
          `#	new file:   NewFile.txt`,
          `#`,
          `# Changes not staged for commit:`,
          `#	deleted:    deleted-not-staged.txt`,
          `#	modified:   modified-not-staged.txt`,
          `#`,
          `# Untracked files:`,
          `#	untracked.txt`,
          `#`,
        ].join('\n'),
      );
    });
  });

  describe('JIRA ticket', () => {
    it('should prepend ticket', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch FOOBAR-123`,
        `# Your branch is up to date with 'origin/FOOBAR-123'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
        `# Untracked files:`,
        `#	untracked.txt`,
        `#`,
      ].join('\n');

      const actual = main(msg);

      const [firstLine] = actual.split('\n');

      expect(firstLine).toMatch(/^FOOBAR-123: /);
    });

    it('should convert ticket to uppercase', () => {
      const msg = [
        'my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch foobar-123`,
        `# Your branch is up to date with 'origin/foobar-123'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
        `# Untracked files:`,
        `#	untracked.txt`,
        `#`,
      ].join('\n');

      const actual = main(msg);

      const [firstLine] = actual.split('\n');

      expect(firstLine).toMatch(/^FOOBAR-123: /);
    });

    it('should not add ticket twice', () => {
      const msg = [
        'FOOBAR-123: my commit message',
        `# Please enter the commit message for your changes. Lines starting`,
        `# with '#' will be ignored, and an empty message aborts the commit.`,
        `#`,
        `# On branch FOOBAR-123`,
        `# Your branch is up to date with 'origin/FOOBAR-123'.`,
        `#`,
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
        `# Changes not staged for commit:`,
        `#	deleted:    deleted-not-staged.txt`,
        `#	modified:   modified-not-staged.txt`,
        `#`,
        `# Untracked files:`,
        `#	untracked.txt`,
        `#`,
      ].join('\n');

      const actual = main(msg);

      const [firstLine] = actual.split('\n');

      expect(firstLine).toMatch(/^FOOBAR-123: my/);
    });
  });

  describe('TYPES CheatSheet', () => {
    it('should add types CheatSheet', () => {
      const msg = [`# Changes to be committed:`, `#	new file:   NewFile.txt`, `#`].join('\n');

      const actual = main(msg);
      expect(actual).toMatch(/# TYPES: ((\w+),\s)*(\w+)\n/);
    });

    it('should exact types CheatSheet', () => {
      const msg = [
        'my message',
        `# Changes to be committed:`,
        `#	new file:   NewFile.txt`,
        `#`,
      ].join('\n');

      const actual = main(msg);
      const [, cheatSheet = ''] = /(# TYPES: ((\w+),\s)*(\w+))\n/.exec(actual) || [];
      expect(cheatSheet).toBe(`# TYPES: ${Object.keys(commitTypeToEmoji).join(', ')}`);

      // first line should be comment
      const [firstLine] = actual.split(/\n/g);
      expect(firstLine).not.toMatch(/# TYPES: ((\w+),\s)*(\w+)\n/);
    });
  });
});
