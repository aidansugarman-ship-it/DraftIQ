const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const root = config.modRequest.projectRoot;

      // Patch 1: expo-modules-core StyleSizeLength -> StyleLength (RN 0.77 Yoga API change)
      const emoCorePath = path.join(
        root,
        'node_modules/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp'
      );
      if (fs.existsSync(emoCorePath)) {
        const before = fs.readFileSync(emoCorePath, 'utf8');
        const after = before.replace(/StyleSizeLength::points/g, 'StyleLength::points');
        if (before !== after) {
          fs.writeFileSync(emoCorePath, after);
          console.log('[withFmtFix] patched ExpoViewComponentDescriptor.cpp');
        }
      }

      // Patch 2: fmt consteval via Podfile post_install (Xcode 16 Clang bug)
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('FMT_CONSTEVAL')) {
        const fmtFix = `
  # Fix: fmt consteval compile error under Xcode 16 / RN 0.77
  Dir.glob(File.join(installer.sandbox.root, '**', 'core.h')).each do |file|
    next unless file.include?('/fmt/')
    content = File.read(file)
    if content.include?('FMT_CONSTEVAL consteval')
      content.gsub!('define FMT_CONSTEVAL consteval', 'define FMT_CONSTEVAL ')
      File.write(file, content)
    end
  end
  Dir.glob(File.join(installer.sandbox.root, '**', 'base.h')).each do |file|
    next unless file.include?('/fmt/')
    content = File.read(file)
    if content.include?('FMT_CONSTEVAL consteval')
      content.gsub!('define FMT_CONSTEVAL consteval', 'define FMT_CONSTEVAL ')
      File.write(file, content)
    end
  end
`;
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${fmtFix}`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};
