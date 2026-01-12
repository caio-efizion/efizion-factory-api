module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  moduleFileExtensions: ['js', 'ts', 'json', 'node'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  verbose: true
};
