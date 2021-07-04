module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  watchPathIgnorePatterns: [
    "<rootDir>/.vscode/",
    "<rootDir>/data/",
    "<rootDir>/node_modules/",
    "<rootDir>/test/"
  ]
};