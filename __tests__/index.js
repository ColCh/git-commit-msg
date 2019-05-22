/* eslint-disable global-require */
const { main, commitTypeToEmoji, markWordsWithEmoji } = require('../');

describe('main test for git-commit-msg', () => {
  describe('commit types', () => {
    describe('per-type tests', () => {
      Object.keys(commitTypeToEmoji).forEach(type => {
        describe(`given commit type "${type}"`, () => {
          const msg = 'some msg';
          const emoji = commitTypeToEmoji[type];

          it('should not modify invalid message', () => {
            expect(main(`${msg}`)).toEqual(`${msg}`);
          });

          it('should add emoji for oneline msg without context', () => {
            expect(main(`${type}: ${msg}`)).toEqual(`${emoji} ${type}: ${msg}`);
          });

          it('should not add emoji twice for oneline msg without context', () => {
            expect(main(main(`${type}: ${msg}`))).toEqual(`${emoji} ${type}: ${msg}`);
          });

          it('should add emoji only for first line', () => {
            expect(main([`${type}: ${msg}`, `${type}: ${msg}`].join('\n'))).toEqual(
              [`${emoji} ${type}: ${msg}`, `${type}: ${msg}`].join('\n'),
            );
          });

          it('should not add emoji for other line but not first', () => {
            expect(main([`${msg}`, `${type}: ${msg}`].join('\n'))).toEqual(
              [`${msg}`, `${type}: ${msg}`].join('\n'),
            );
          });

          it('should not add emoji in case global option specified', () => {
            global.SKIP_ADDING_EMOJIS = true;
            expect(main(`${type}: ${msg}`)).toEqual(`${type}: ${msg}`);
            delete global.SKIP_ADDING_EMOJIS;
          });

          it('should match snapshot', () => {
            expect(main(`${type}: ${msg}`)).toMatchSnapshot();
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

        expect(main(msg)).toEqual(
          [
            ``,
            `# Found no contexts`,
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
      Object.keys(markWordsWithEmoji).forEach(word => {
        describe(`given word "${word}"`, () => {
          const msg = 'some msg';
          const emoji = markWordsWithEmoji[word];

          it('should not modify message without word', () => {
            expect(main(`${msg}`)).toEqual(`${msg}`);
          });

          it('should add emoji for oneline msg', () => {
            expect(main(`${msg} ${word} ${msg}`)).toEqual(`${msg} ${emoji} ${word} ${msg}`);
          });

          it('should not add emoji for oneline msg if flag specified', () => {
            global.SKIP_ADDING_EMOJIS = true;
            expect(main(`${msg} ${word} ${msg}`)).toEqual(`${msg} ${word} ${msg}`);
            delete global.SKIP_ADDING_EMOJIS;
          });

          it('should not add emoji twice for oneline msg', () => {
            expect(main(main(`${msg} ${word} ${msg}`))).toEqual(`${msg} ${emoji} ${word} ${msg}`);
          });

          it('should add emoji only for first line', () => {
            expect(main([`${msg} ${word} ${msg}`, `${msg} ${word} ${msg}`].join('\n'))).toEqual(
              [`${msg} ${emoji} ${word} ${msg}`, `${msg} ${word} ${msg}`].join('\n'),
            );
          });

          it('should not add other symbols', () => {
            expect(main(`${word}`)).toEqual(`${emoji} ${word}`);
          });

          it('should not replace partial match with free from left', () => {
            expect(main(`${word}FOO`)).toEqual(`${word}FOO`);
          });

          it('should not replace partial match with free from right', () => {
            expect(main(`FOO${word}`)).toEqual(`FOO${word}`);
          });

          it('should not replace text after first line', () => {
            expect(
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
            expect(main(`${msg} ${word} ${msg}`)).toMatchSnapshot();
          });
        });
      });
    });
  });

  describe('context inferring', () => {
    it('should infer context 3 times from minimal commit message', () => {
      const msg = [
        `# Changes to be committed:`,
        `#	modified:   modified-file.txt`,
        `#	deleted:    deleted-file.txt`,
        `#	new file:   new-file.txt`,
        `#`,
      ].join('\n');

      expect(main(msg)).toEqual(
        [
          `# Found 3 contexts`,
          `#     * modified-file`,
          `#     * deleted-file`,
          `#     * new-file`,
          `# Changes to be committed:`,
          `#	modified:   modified-file.txt`,
          `#	deleted:    deleted-file.txt`,
          `#	new file:   new-file.txt`,
          `#`,
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

      expect(main(msg)).toEqual(
        [
          `# Changes not staged for commit:`,
          `#	deleted:    deleted-not-staged.txt`,
          `#	modified:   modified-not-staged.txt`,
          `#`,
        ].join('\n'),
      );
    });

    it('should mark if no contexts found', () => {
      const msg = [`# Changes to be committed:`, `#`].join('\n');

      expect(main(msg)).toEqual(
        [`# Found no contexts`, `# Changes to be committed:`, `#`].join('\n'),
      );
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

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 3 contexts`,
          `#     * modified-file`,
          `#     * deleted-file`,
          `#     * new-file`,
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

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 1 context`,
          `#     * foo`,
          `# Please enter the commit message for your changes. Lines starting`,
          `# with '#' will be ignored, and an empty message aborts the commit.`,
          `#`,
          `# On branch master`,
          `# Your branch is up to date with 'origin/master'.`,
          `#`,
          `# Changes to be committed:`,
          `#	modified:   src/foo/__snapshots__/index.js`,
          `#`,
        ].join('\n'),
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

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 1 context`,
          `#     * index`,
          `# Please enter the commit message for your changes. Lines starting`,
          `# with '#' will be ignored, and an empty message aborts the commit.`,
          `#`,
          `# On branch master`,
          `# Your branch is up to date with 'origin/master'.`,
          `#`,
          `# Changes to be committed:`,
          `#	modified:   src/__snapshots__/index.js`,
          `#`,
        ].join('\n'),
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

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 3 contexts`,
          `#     * modified-file`,
          `#     * deleted-file`,
          `#     * new-file`,
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

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 1 context`,
          `#     * pkg`,
          `# Changes to be committed:`,
          `#	modified:   package.json`,
          `#	deleted:    package.json`,
          `#	new file:   package.json`,
          `#`,
        ].join('\n'),
      );
    });

    it('should infer webpack context from config file', () => {
      const msg = [
        'my commit message',
        `# Changes to be committed:`,
        `#	modified:   webpack.config.ts`,
        `#`,
      ].join('\n');

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 1 context`,
          `#     * webpack`,
          `# Changes to be committed:`,
          `#	modified:   webpack.config.ts`,
          `#`,
        ].join('\n'),
      );
    });

    it('should infer webpack context from webpack directory', () => {
      const msg = [
        'my commit message',
        `# Changes to be committed:`,
        `#	modified:   src/webpack/index.js`,
        `#`,
      ].join('\n');

      expect(main(msg)).toEqual(
        [
          'my commit message',
          `# Found 1 context`,
          `#     * webpack`,
          `# Changes to be committed:`,
          `#	modified:   src/webpack/index.js`,
          `#`,
        ].join('\n'),
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

      expect(main(msg)).toMatchSnapshot();
    });

    it('should collect more contexts', () => {
      const msg = [
        `# Changes to be committed:`,
        `#	new file:   my-project/baz/BAR/FOO/index.ts`,
        `#`,
      ].join('\n');

      expect(main(msg)).toEqual(
        [
          `# Found 3 contexts`,
          `#     * baz`,
          `#     * BAR`,
          `#     * FOO`,
          `# Changes to be committed:`,
          `#	new file:   my-project/baz/BAR/FOO/index.ts`,
          `#`,
        ].join('\n'),
      );
    });
  });

  it('should preserve case', () => {
    const msg = [`# Changes to be committed:`, `#	new file:   NewFile.txt`, `#`].join('\n');

    expect(main(msg)).toEqual(
      [
        `# Found 1 context`,
        `#     * NewFile`,
        `# Changes to be committed:`,
        `#	new file:   NewFile.txt`,
        `#`,
      ].join('\n'),
    );
  });
});
