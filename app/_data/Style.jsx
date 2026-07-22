// Each style carries a `css` object that is spread onto the form container.
// `key`/`value` are kept only for backward compatibility with forms saved
// before the css-based styles existed (see getStyleCss below).
const styles = [
  {
    id: 1,
    name: "Default",
    key: "1px",
    value: "none",
    css: {},
  },
  {
    id: 2,
    name: "Retro",
    key: "boxshadow",
    value: "5px 5px 0px black",
    css: { boxShadow: "5px 5px 0px black" },
  },
  {
    id: 3,
    name: "Border",
    key: "border",
    value: "2px solid black",
    css: { border: "2px solid black" },
  },
  {
    id: 4,
    name: "Soft Shadow",
    key: "css",
    css: { boxShadow: "0 10px 30px rgba(0,0,0,0.12)" },
  },
  {
    id: 5,
    name: "Elevated",
    key: "css",
    css: { boxShadow: "0 20px 45px rgba(0,0,0,0.22)" },
  },
  {
    id: 6,
    name: "Dashed",
    key: "css",
    css: { border: "2px dashed #64748b" },
  },
  {
    id: 7,
    name: "Double",
    key: "css",
    css: { border: "4px double #111111" },
  },
  {
    id: 8,
    name: "Neon",
    key: "css",
    css: {
      border: "1px solid rgba(56,189,248,0.9)",
      boxShadow: "0 0 14px 2px rgba(56,189,248,0.65)",
    },
  },
  {
    id: 9,
    name: "Inset",
    key: "css",
    css: { boxShadow: "inset 0 2px 10px rgba(0,0,0,0.25)" },
  },
  {
    id: 10,
    name: "Left Accent",
    key: "css",
    css: { borderLeft: "6px solid #6366f1" },
  },
  {
    id: 11,
    name: "Rounded",
    key: "css",
    css: { border: "3px solid #111111", borderRadius: "1.5rem" },
  },
  {
    id: 12,
    name: "Glow",
    key: "css",
    css: { boxShadow: "0 0 0 3px #fde68a, 0 8px 20px rgba(0,0,0,0.15)" },
  },
];

// Resolves the CSS to apply for a selected style, supporting both the new
// css-based styles and legacy styles that only stored key/value.
export function getStyleCss(style) {
  if (!style) return {};
  if (style.css) return style.css;
  if (style.key === "boxshadow") return { boxShadow: style.value };
  if (style.key === "border") return { border: style.value };
  return {};
}

export default styles;
