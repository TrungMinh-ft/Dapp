import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#020818",
        accent: "#00E5FF",
        neon: "#7B2FFF",
        copy: "#8899AA",
      },
      fontFamily: {
        heading: ["Orbitron", "sans-serif"],
        body: ["Rajdhani", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"],
        digital: ["Share Tech Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 229, 255, 0.4)",
        neon: "0 0 30px rgba(123, 47, 255, 0.35)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(0,229,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.09) 1px, transparent 1px)",
      },
      animation: {
        "glow-pulse": "glowPulse 2.8s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 2.8s linear infinite",
        grid: "gridShift 18s linear infinite",
        "scan-line": "scanLine 8s linear infinite",
        blink: "blink 1.2s step-end infinite",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(0, 229, 255, 0.2)" },
          "50%": { boxShadow: "0 0 26px rgba(0, 229, 255, 0.45)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotateX(8deg) rotateY(-12deg)" },
          "50%": { transform: "translateY(-14px) rotateX(-2deg) rotateY(12deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        gridShift: {
          "0%": { backgroundPosition: "0 0, 0 0" },
          "100%": { backgroundPosition: "0 80px, 80px 0" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(220vh)" },
        },
        blink: {
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
