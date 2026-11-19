import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const HEX_COLOUR = "#[0-9a-fA-F]{3,8}\\b";
const RGB_COLOUR = "rgba?\\(";
const PIXEL_FONT_SIZE = "text-\\[\\d+px\\]";
const OFF_PALETTE_GREY = "\\b(zinc|gray|slate|neutral|stone)-\\d{2,3}\\b";
const ARBITRARY_COLOUR = "\\[(#|rgba?\\()";

const DESIGN_RULES = [
  { pattern: HEX_COLOUR, message: "Design: raw hex colour. Use a colour token (e.g. bg-surface, text-primary) or a ui/ primitive." },
  { pattern: RGB_COLOUR, message: "Design: raw rgb colour. Use a colour token or a ui/ primitive." },
  { pattern: PIXEL_FONT_SIZE, message: "Design: pixel font size. Use the type scale (text-xs, text-sm, ...)." },
  { pattern: OFF_PALETTE_GREY, message: "Design: off-palette grey. Use surface, border and text tokens." },
  { pattern: ARBITRARY_COLOUR, message: "Design: Tailwind arbitrary colour. Use a colour token." },
];

// Template literals (className={`...`}) are TemplateElement nodes, not Literals.
const designGuardSelectors = DESIGN_RULES.flatMap(({ pattern, message }) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
]);

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
