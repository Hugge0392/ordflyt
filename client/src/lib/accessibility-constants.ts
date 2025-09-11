// Shared accessibility constants for consistent theming across components
export const COLOR_SCHEMES = {
  "black-on-white": { bg: "#FFFFFF", text: "#000000" },
  "light-gray-on-gray": { bg: "#595959", text: "#D9D9D9" },
  "white-on-black": { bg: "#000000", text: "#FFFFFF" },
  "black-on-light-yellow": { bg: "#FFFFCC", text: "#000000" },
  "black-on-light-blue": { bg: "#CCFFFF", text: "#000000" },
  "light-yellow-on-blue": { bg: "#003399", text: "#FFFFCC" },
  "black-on-light-red": { bg: "#FFCCCC", text: "#000000" },
} as const;

export const FONT_MAPS = {
  standard: "Inter, system-ui, -apple-system, sans-serif",
  "dyslexia-friendly": "'OpenDyslexic', 'Open Dyslexic', system-ui, sans-serif",
} as const;

export const FONT_FAMILY_CSS = {
  standard: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "dyslexia-friendly": "'OpenDyslexic', 'Comic Sans MS', cursive, system-ui, sans-serif",
} as const;

export type ColorSchemeKey = keyof typeof COLOR_SCHEMES;
export type FontFamilyKey = keyof typeof FONT_MAPS;

// Helper function to apply accessibility settings globally
export const applyAccessibilitySettings = (settings: {
  fontSize: number;
  lineHeight: number;
  backgroundColor: ColorSchemeKey;
  fontFamily: FontFamilyKey;
}) => {
  const root = document.documentElement;
  const scheme = COLOR_SCHEMES[settings.backgroundColor] ?? COLOR_SCHEMES["black-on-white"];
  const fontFamily = FONT_FAMILY_CSS[settings.fontFamily] ?? FONT_FAMILY_CSS["standard"];

  // Set all accessibility CSS variables
  root.style.setProperty("--accessibility-bg-color", scheme.bg);
  root.style.setProperty("--accessibility-text-color", scheme.text);
  root.style.setProperty("--accessibility-border-color", scheme.text);
  root.style.setProperty("--accessibility-font-family", fontFamily);
  root.style.setProperty("--accessibility-font-size", `${settings.fontSize}px`);
  root.style.setProperty("--accessibility-line-height", settings.lineHeight.toString());
  root.style.setProperty("--reading-font-size", `${settings.fontSize}px`);
  root.style.setProperty("--reading-line-height", settings.lineHeight.toString());
  root.style.setProperty("--normal-font-family", fontFamily);
  root.style.setProperty("--focus-font-family", fontFamily);
};

// WCAG compliant contrast ratios
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

// Safe transparency percentages for good contrast
export const SAFE_OPACITY_LEVELS = {
  subtle: 0.1,     // 10% - for very light backgrounds
  light: 0.15,     // 15% - for light accents
  medium: 0.25,    // 25% - for borders and dividers
  strong: 0.6,     // 60% - for secondary text
  emphasis: 0.8,   // 80% - for important secondary content
} as const;