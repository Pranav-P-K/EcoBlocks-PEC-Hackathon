const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Plus Jakarta Sans", "sans-serif"],
            },
        },
    },
    darkMode: "class",
    plugins: [
        heroui({
            themes: {
                light: {
                    colors: {
                        primary: {
                            // A rich, nature-inspired Emerald Green
                            50: "#ecfdf5",
                            100: "#d1fae5",
                            200: "#a7f3d0",
                            300: "#6ee7b7",
                            400: "#34d399",
                            500: "#10b981",
                            600: "#059669",
                            700: "#047857",
                            800: "#065f46",
                            900: "#064e3b",
                            DEFAULT: "#059669", // The main primary color used by HeroUI components
                            foreground: "#ffffff", // Text color on top of primary buttons
                        },
                        focus: "#059669", // Focus ring color
                    },
                },
                dark: {
                    colors: {
                        primary: {
                            DEFAULT: "#10b981", // Slightly lighter green for dark mode
                            foreground: "#ffffff",
                        },
                        focus: "#10b981",
                    },
                },
            },
        }),
    ],
};