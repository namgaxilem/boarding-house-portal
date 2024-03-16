module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
//   theme: {
//     colors: {
//       blue: "#1fb6ff",
//       purple: "#7e5bef",
//       pink: "#ff49db",
//       orange: "#ff7849",
//       green: "#13ce66",
//       yellow: "#ffc82c",
//       "gray-dark": "#273444",
//       gray: "#8492a6",
//       "gray-light": "#d3dce6",
//     },
//     fontFamily: {
//       sans: ["Graphik", "sans-serif"],
//       serif: ["Merriweather", "serif"],
//     },
//     extend: {
//       spacing: {
//         "8xl": "96rem",
//         "9xl": "128rem",
//       },
//       borderRadius: {
//         "4xl": "2rem",
//       },
//     },
//   },

  // add daisyUI plugin
  plugins: [require("daisyui")],

  // daisyUI config (optional - here are the default values)
  daisyui: {
    themes: ["dark", "bumblebee"], // false: only light + dark | true: all themes | array: specific themes like this ["light", "dark", "cupcake"]
    darkTheme: "dark", // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ":root", // The element that receives theme color CSS variables
  },
};
