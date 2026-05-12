import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },

        // Papelito core
        paper: "#FAFAF6",
        ink: {
          DEFAULT: "#161616",
          soft: "#3B3B3B",
        },

        // Grays (Figma Make)
        "gray-soft": "#F4F4EE",
        "gray-line": "#E8E8E3",
        "gray-text": "#6B6B66",
        "gray-faint": "#9C9C97",

        // Brand (yellow)
        brand: {
          DEFAULT: "#F5C518",
          soft: "#FEFAE6",
          deep: "#D9A800",
        },
        yellow: {
          DEFAULT: "#F5C518",
          50: "#FEFAE6",
          100: "#FDF4C2",
          500: "#F5C518",
          600: "#D9A800",
        },

        // Status (Figma Make)
        good: {
          DEFAULT: "#22C55E",
          soft: "#DCFCE7",
        },
        warn: {
          DEFAULT: "#F59E0B",
          soft: "#FEF3C7",
        },
        bad: {
          DEFAULT: "#EF4444",
          soft: "#FEE2E2",
        },

        // Legacy aliases (compat antes do refactor)
        saude: {
          saudavel: "#22C55E",
          atencao: "#F59E0B",
          em_risco: "#EF4444",
          sumido: "#6B7280",
        },
        score: {
          A: "#15803D",
          B: "#84CC16",
          C: "#F59E0B",
          D: "#F97316",
          E: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "slide-out-left": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-100%)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-left": "slide-in-left 0.2s ease-out",
        "slide-out-left": "slide-out-left 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
