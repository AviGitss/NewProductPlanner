import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b7cdff",
          300: "#8aabff",
          400: "#5c82ff",
          500: "#3357f7",
          600: "#233ecf",
          700: "#1c30a4",
          800: "#1a2b84",
          900: "#1a276b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
