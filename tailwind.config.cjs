/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: '#212020',
        text: '#E3E3E0',
        muted: '#9E9D9A',
        dim: '#595757',
        accent: '#E96624',
        accent2: '#E19761',
        accent3: '#A3522F',
        accent4: '#966656',
        shadow: '#4F3329',
      }
    }
  },
  plugins: []
};
