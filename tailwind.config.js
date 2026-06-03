/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        cardHover: "var(--card-hover)",
        border: "var(--border)",
        borderLight: "var(--border-light)",
        accent: "var(--accent)",
        muted: "var(--muted)",
      },
    },
  },
  plugins: [],
};
