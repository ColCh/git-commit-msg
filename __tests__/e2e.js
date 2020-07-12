/* eslint-disable global-require */
jest.mock('fs');

const fs = require('fs');

const launch = (msg) => {
  return new Promise((resolve) => {
    // @ts-ignore
    fs.readFileSync.mockReturnValueOnce(msg);
    // @ts-ignore
    fs.writeFileSync.mockImplementationOnce((...[, newMsg]) => {
      resolve(newMsg);
    });
    // @ts-ignore
    global.FORCE_CLI_EXECUTE = true;
    // @ts-ignore
    global.GIT_COMMIT_MSG_HOOK_SKIP_ADDING_EMOJIS = false;
    // @ts-ignore
    global.GIT_COMMIT_MSG_HOOK_SKIP_AUTO_SUGGEST = false;

    require('..');
    // TODO: require clean cache?
  });
};

const msg = [
  'chore(pkg): my commit message',
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

describe('e2e test', () => {
  it('should match snapshot', async () => {
    expect(await launch(msg)).toMatchSnapshot();
  });
});
