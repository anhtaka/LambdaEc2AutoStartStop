import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
            },
        },
        rules: {
            "indent": ["error", 4],
            "linebreak-style": ["error", "windows"],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
        },
    },
];
