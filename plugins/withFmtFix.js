const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// RN 0.77 ships with a fmt version that fails to compile under Xcode 16 Clang
// because FMT_STRING uses consteval which triggers a compiler bug.
// Setting FMT_CONSTEVAL= disables consteval for the fmt pod only.
module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('FMT_CONSTEVAL')) return config;

      const fmtFix = `
  # Fix: fmt consteval compile error under Xcode 16 / RN 0.77
  # Patch the fmt header to disable consteval which breaks Clang 16
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
      return config;
    },
  ]);
};
