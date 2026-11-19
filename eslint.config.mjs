import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const HEX_COLOUR = "#[0-9a-fA-F]{3,8}\\b";
const RGB_COLOUR = "rgba?\\(";
const HEX_MESSAGE = "Design: raw hex colour. Use a colour token (e.g. bg-surface, text-primary) or a ui/ primitive.";
const RGB_MESSAGE = "Design: raw rgb colour. Use a colour token or a ui/ primitive.";

const designGuardSelectors = [
  { selector: `Literal[value=/${HEX_COLOUR}/]`, message: HEX_MESSAGE },
  { selector: `TemplateElement[value.raw=/${HEX_COLOUR}/]`, message: HEX_MESSAGE },
  { selector: `Literal[value=/${RGB_COLOUR}/]`, message: RGB_MESSAGE },
  { selector: `TemplateElement[value.raw=/${RGB_COLOUR}/]`, message: RGB_MESSAGE },
  { selector: "Literal[value=/text-\\[\\d+px\\]/]", message: "Design: pixel font size. Use the type scale (text-xs, text-sm, ...)." },
  { selector: "Literal[value=/\\b(zinc|gray|slate|neutral|stone)-\\d{2,3}\\b/]", message: "Design: off-palette grey. Use surface, border and text tokens." },
  { selector: "Literal[value=/\\[(#|rgba?\\()/]", message: "Design: Tailwind arbitrary colour. Use a colour token." },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
    }
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": ["warn", ...designGuardSelectors],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
