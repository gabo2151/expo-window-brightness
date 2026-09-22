// Only used by Jest. Without it the iOS and Android jest-expo projects cannot
// parse `react-native/jest/setup.js`, which is Flow-typed — babel-preset-expo
// is what teaches Babel to strip Flow out of react-native's own sources.
//
// Not published: `.npmignore` excludes it. The library itself is built by
// `expo-module build` (tsc), which never touches Babel.
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
  };
};
