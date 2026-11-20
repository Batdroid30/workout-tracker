import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const HEX_COLOUR = "#[0-9a-fA-F]{3,8}\\b";
const RGB_COLOUR = "rgba?\\(";
const PIXEL_FONT_SIZE = "text-\\[\\d+px\\]";
const OFF_PALETTE_GREY = "\\b(zinc|gray|slate|neutral|stone)-\\d{2,3}\\b";
const ARBITRARY_COLOUR = "\\[(#|rgba?\\()";
// A lookahead for the slash character lets opacity overlays such as bg-black/60 through.
const PALETTE_COLOUR_UTILITY =
  "\\b(text|bg|border|fill|stroke|ring)-(white|black|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\\d{2,3})?\\b(?!\\x2f)";
// text(?![-\w]) matches the bare legacy --text without catching --text-primary.
const LEGACY_TOKEN =
  "var\\(--(accent|accent-soft|accent-line|accent-glow|accent-on|text-(hi|mid|low|lo|faint|dim|muted)|text(?![-\\w])|glass-|bg-[012]|ink|surface-2|surface-3|border-soft|teal|rose|blue|brand|spectrum|zone|chart|success|warning|critical|info)";

const DESIGN_RULES = [
  { pattern: HEX_COLOUR, message: "Design: raw hex colour. Use a colour token (e.g. bg-surface, text-primary) or a ui/ primitive." },
  { pattern: RGB_COLOUR, message: "Design: raw rgb colour. Use a colour token or a ui/ primitive." },
  { pattern: PIXEL_FONT_SIZE, message: "Design: pixel font size. Use the type scale (text-xs, text-sm, ...)." },
  { pattern: OFF_PALETTE_GREY, message: "Design: off-palette grey. Use surface, border and text tokens." },
  { pattern: ARBITRARY_COLOUR, message: "Design: Tailwind arbitrary colour. Use a colour token." },
  { pattern: PALETTE_COLOUR_UTILITY, message: "Design: Tailwind palette colour. Use a colour token (bg-surface, text-positive, ...)." },
  { pattern: LEGACY_TOKEN, message: "Design: legacy token. Use the Ink + Lime tokens (--text-primary, --positive, --lime, ...)." },
];

// Primitives are where raw token values legitimately live; the rest of ui/ is linted.
const DESIGN_PRIMITIVE_FILES = [
  "Button",
  "IconButton",
  "Card",
  "Chip",
  "ToggleChip",
  "SectionHeader",
  "Input",
  "NumberStepper",
  "BottomSheet",
  "Skeleton",
  "SubmitButton",
  "BackButton",
].map((name) => `src/components/ui/${name}.tsx`);

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
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", ...DESIGN_PRIMITIVE_FILES],
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
