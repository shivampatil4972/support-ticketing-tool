/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },

      colors: {
        primary: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
          DEFAULT: "#06b6d4",
        },

        accent: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          DEFAULT: "#8b5cf6",
        },

        dark: {
          bg: "#050A18",
          "bg-secondary": "#0A1128",
          card: "#0F1A2E",
          "card-hover": "#142240",
          border: "#1E3054",
          "border-hover": "#2A4070",
          text: "#F1F5F9",
          muted: "#94A3B8",
          subtle: "#64748B",
        },

        light: {
          bg: "#F8FAFC",
          "bg-secondary": "#F1F5F9",
          card: "#FFFFFF",
          "card-hover": "#F8FAFC",
          border: "#E2E8F0",
          "border-hover": "#CBD5E1",
          text: "#0F172A",
          muted: "#64748B",
          subtle: "#94A3B8",
        },

        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          DEFAULT: "#22c55e",
        },

        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          DEFAULT: "#f59e0b",
        },

        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          DEFAULT: "#ef4444",
        },
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },

      boxShadow: {
        "glow-primary": "0 0 20px rgba(6, 182, 212, 0.15)",
        "glow-accent": "0 0 20px rgba(139, 92, 246, 0.15)",
        "glow-success": "0 0 20px rgba(34, 197, 94, 0.15)",
        "soft": "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 10px 40px -10px rgba(0, 0, 0, 0.1)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        "card": "0 1px 3px rgba(0,0,0,0.08), 0 8px 30px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1), 0 20px 50px rgba(0,0,0,0.08)",
      },

      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(6, 182, 212, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.1)" },
        },
      },

      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-dark": "radial-gradient(at 20% 80%, rgba(6, 182, 212, 0.06) 0, transparent 50%), radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.06) 0, transparent 50%), radial-gradient(at 50% 50%, rgba(6, 182, 212, 0.03) 0, transparent 70%)",
        "mesh-light": "radial-gradient(at 20% 80%, rgba(6, 182, 212, 0.08) 0, transparent 50%), radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.08) 0, transparent 50%)",
      },
    },
  },

  plugins: [],
};