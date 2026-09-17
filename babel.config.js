module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
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
      // worklets plugin (Reanimated 4) must be listed last
      "react-native-worklets/plugin",
    ],
  };
};
