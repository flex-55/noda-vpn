import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
      },
      fontFamily: {
        sans: ["var(--font-manrope)"],
        display: ["var(--font-space-grotesk)"],
      },
      boxShadow: {
        glow: "0 24px 80px rgba(12, 61, 53, 0.18)",
      },
      backgroundImage: {
        "hero-mesh": "radial-gradient(circle at top left, rgba(144, 238, 200, 0.7), transparent 32%), radial-gradient(circle at 80% 10%, rgba(255, 220, 164, 0.65), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,247,244,0.9))",
      },
    },
  },
  plugins: [],
};

export default config;