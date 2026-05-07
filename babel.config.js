module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@constants': './src/constants',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@lib': './src/lib',
            '@services': './src/services',
            '@types': './src/types',
            '@utils': './src/utils',
          },
        },
      ],
      // Reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
