module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "react-native"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  rules: {
    // Zakaz obchodzenia TypeScript — Claude nie może tego robić
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/ban-ts-comment": "error",

    // Hooki React muszą być używane poprawnie
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // Styl kodu
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "react/react-in-jsx-scope": "off", // Expo nie wymaga importu React
  },
  settings: {
    react: { version: "detect" },
  },
};
