module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: ['services/**/*.ts', 'utils/**/*.ts', 'hooks/**/*.ts', '!**/*.d.ts'],
  coverageThreshold: {
    global: { lines: 70 }, // Min. 70% pokrycia kodu testami
  },
};
