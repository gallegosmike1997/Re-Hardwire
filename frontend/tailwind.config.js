/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0B0F12",
          card: "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.12)",
        },
        light: {
          bg: "#F8F8FA",
          card: "rgba(255,255,255,0.65)",
          border: "rgba(0,0,0,0.12)",
        },
        accent: "#0D9488",
      },
      backdropBlur: {
        glass: "18px",
      },
    },
  },
  plugins: [],
};
