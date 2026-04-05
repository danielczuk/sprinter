module.exports = {
  preset: 'jest-expo',
  // @testing-library/react-native v13+ has built-in matchers, no need for jest-native
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/', // Foldery robocze Claude — nie testujemy
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase)',
  ],
  collectCoverageFrom: ['services/**/*.ts', 'utils/**/*.ts', 'hooks/**/*.ts', '!**/*.d.ts'],
  coverageThreshold: {
    global: { lines: 70 },
  },
};
