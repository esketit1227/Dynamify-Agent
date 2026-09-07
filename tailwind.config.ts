import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0d12",
          900: "#12151c",
          800: "#1a1e28",
          700: "#252a37",
          600: "#343b4c",
          500: "#4a5268",
          400: "#6b7386",
          300: "#9aa1b2",
          200: "#c7cbd6",
          100: "#e7e9ee",
          50: "#f6f7f9",
        },
        accent: {
          600: "#5b5bf6",
          500: "#6f6ff8",
          400: "#8f8ffa",
        },
      },
    },
  },
  plugins: [],
};

export default config;
