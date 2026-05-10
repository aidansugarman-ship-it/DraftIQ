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
  installer.pods_project.targets.each do |target|
    next unless target.name == 'fmt'
    target.build_configurations.each do |cfg|
      cfg.build_settings['OTHER_CFLAGS'] = '$(inherited) -DFMT_CONSTEVAL='
    end
  end
`;

      // Inject into the existing post_install block instead of adding a new one
      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${fmtFix}`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
