module.exports = {
    readFileSync: jest.fn(() => {
        throw new ReferenceError('fs mock: no readFileSync implementation provided!');
    }),
    writeFileSync: jest.fn(() => {
        throw new ReferenceError('fs mock: no writeFileSync implementation provided!');
    }),
};
