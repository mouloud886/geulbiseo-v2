// craco.config.js (루트에 있는 파일을 이걸로 완전 교체)
const { POSTCSS_MODES } = require('@craco/craco');

module.exports = {
  style: {
    postcss: {
      // 반드시 file 모드만 지정, plugins 배열은 postcss.config.js에서 관리
      mode: POSTCSS_MODES.file,
    },
  },
};
