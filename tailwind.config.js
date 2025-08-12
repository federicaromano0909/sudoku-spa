/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zen: {
          mint:  "#E9F5EC",
          cream: "#FFF6D6",
          sage:  "#A8CBA7",
          grid:  "#C7E2C1",
          forest:"#2F4F4F",
        },
      },
    },
  },
  plugins: [],
};
