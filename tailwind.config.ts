import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Polaris paper palette — warm parchment + scholarly accents
        bg: {
          DEFAULT: "#FAF6F0",
          soft: "#F3ECE2",
          card: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#2C1810",
          dim: "#7A6B5D",
          muted: "#A89888",
        },
        polaris: {
          50: "#FDF8F3",
          100: "#F9EDE0",
          200: "#F0D8BF",
          300: "#E3BC94",
          400: "#C47D4E",
          500: "#8B5E3C",
          600: "#744D30",
          700: "#5C3D26",
          800: "#4A311F",
          900: "#3A2718",
        },
        nova: {
          400: "#C47D4E",
          500: "#B06A3B",
        },
        aurora: {
          400: "#6B9E7B",
          500: "#5B8C6D",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-libre)", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "paper": "radial-gradient(ellipse at top, rgba(139,94,60,0.06), transparent 60%), radial-gradient(ellipse at bottom right, rgba(196,125,78,0.05), transparent 60%)",
        "polaris-gradient": "linear-gradient(135deg, #8B5E3C 0%, #C47D4E 50%, #5B8C6D 100%)",
      },
      animation: {
        twinkle: "twinkle 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
