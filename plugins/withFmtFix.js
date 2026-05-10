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

      const patch = `
# Fix: fmt consteval compile error under Xcode 16 / RN 0.77
post_install do |installer|
  installer.pods_project.targets.each do |target|
    next unless target.name == 'fmt'
    target.build_configurations.each do |cfg|
      cfg.build_settings['OTHER_CFLAGS'] = '$(inherited) -DFMT_CONSTEVAL='
    end
  end
end
`;

      fs.writeFileSync(podfilePath, podfile + patch);
      return config;
    },
  ]);
};
