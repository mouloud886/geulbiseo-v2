module.exports = {
  style: {
    postcss: {
      mode: POSTCSS_MODES.file,
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
};
