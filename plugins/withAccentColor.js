// Writes theme.config.js's accent as the iOS asset-catalog `AccentColor`
// (light + dark) and sets it as the target's global accent color
// (ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME). That makes every native
// control that uses the default tint — @expo/ui SwiftUI Slider/DatePicker/
// Stepper/Toggle, UIKit buttons, SF Symbols without explicit tint — follow the
// brand color, so changing theme.config.js alone re-colors the app (after the
// next prebuild/native build).
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const COLOR_NAME = 'AccentColor';

function hexToComponents(hex) {
  const h = hex.replace('#', '');
  const to = (i) => `0x${h.slice(i, i + 2).toUpperCase()}`;
  return { red: to(0), green: to(2), blue: to(4), alpha: '1.000' };
}

function colorsetContents(light, dark) {
  return {
    colors: [
      {
        idiom: 'universal',
        color: { 'color-space': 'srgb', components: hexToComponents(light) },
      },
      {
        idiom: 'universal',
        appearances: [{ appearance: 'luminosity', value: 'dark' }],
        color: { 'color-space': 'srgb', components: hexToComponents(dark) },
      },
    ],
    info: { author: 'xcode', version: 1 },
  };
}

function withAccentColorAsset(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      delete require.cache[require.resolve('../theme.config.js')];
      const { accent } = require('../theme.config.js');
      const dir = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName,
        'Images.xcassets',
        `${COLOR_NAME}.colorset`,
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'Contents.json'),
        JSON.stringify(colorsetContents(accent.light, accent.dark), null, 2) +
          '\n',
      );
      return cfg;
    },
  ]);
}

function withGlobalAccentBuildSetting(config) {
  return withXcodeProject(config, (cfg) => {
    const configurations = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key].buildSettings;
      // Only the app target's configurations carry PRODUCT_NAME.
      if (buildSettings && buildSettings.PRODUCT_NAME) {
        buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME =
          COLOR_NAME;
      }
    }
    return cfg;
  });
}

module.exports = function withAccentColor(config) {
  return withGlobalAccentBuildSetting(withAccentColorAsset(config));
};
