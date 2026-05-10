const fs = require('fs');
const path = require('path');

const patches = [
  {
    file: 'node_modules/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp',
    find: /StyleSizeLength::points/g,
    replace: 'StyleLength::points',
  },
];

for (const { file, find, replace } of patches) {
  const full = path.join(__dirname, '..', file);
  if (!fs.existsSync(full)) continue;
  const before = fs.readFileSync(full, 'utf8');
  const after = before.replace(find, replace);
  if (before !== after) {
    fs.writeFileSync(full, after);
    console.log('patched', file);
  }
}
