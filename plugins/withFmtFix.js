const { withDangerousMod, withEntitlementsPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Strip entitlements that require a paid Apple Developer account
function withStrippedEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['com.apple.developer.applesignin'];
    delete config.modResults['aps-environment'];
    delete config.modResults['com.apple.security.application-groups'];
    return config;
  });
}

function withXcode26Fixes(config) {
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
          console.log('[patch] fixed StyleSizeLength in ExpoViewComponentDescriptor.cpp');
        }
      }

      // Patch 2: expo-modules-core createFromUtf16 -> createFromUtf8 (JSI API change)
      const jsiPath = path.join(
        root,
        'node_modules/expo-modules-core/ios/JSI/EXJSIConversions.mm'
      );
      if (fs.existsSync(jsiPath)) {
        const before = fs.readFileSync(jsiPath, 'utf8');
        const after = before.replace(
          /return jsi::String::createFromUtf16\(runtime,\s*\(const char16_t \*\)\[value cStringUsingEncoding:NSUTF16StringEncoding\],\s*length\);/g,
          'return jsi::String::createFromUtf8(runtime, [value UTF8String]);'
        );
        if (before !== after) {
          fs.writeFileSync(jsiPath, after);
          console.log('[patch] fixed createFromUtf16 in EXJSIConversions.mm');
        }
      }

      // Patch 3: fmt consteval via Podfile post_install (Xcode 26 Clang bug)
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('FMT_CONSTEVAL')) {
        const fmtFix = `
  # Fix: fmt consteval compile error under Xcode 26 / RN 0.77
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
}

module.exports = function withAllFixes(config) {
  config = withStrippedEntitlements(config);
  config = withXcode26Fixes(config);
  return config;
};
