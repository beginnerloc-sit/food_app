module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // NOTE: babel-preset-expo (SDK 54+) automatically adds the
    // react-native-worklets plugin for Reanimated 4. Do not add it here too.
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
        },
      ],
    ],
  };
};
