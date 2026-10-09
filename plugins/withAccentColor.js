// Writes every theme.config.js token that has an `asset` name as a named
// Light/Dark colorset (MoniBg, MoniSurface1, ... -> PlatformColor('MoniBg')) and
// theme.config.js's accent as the iOS asset-catalog `AccentColor`
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

/** Accepts `#RRGGBB` or `rgba(r,g,b,a)`. */
function hexToComponents(value) {
  const m =
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
      value,
    );
  if (m) {
    const hex = (n) =>
      `0x${Number(n).toString(16).toUpperCase().padStart(2, '0')}`;
    return {
      red: hex(m[1]),
      green: hex(m[2]),
      blue: hex(m[3]),
      alpha: Number(m[4] ?? 1).toFixed(3),
    };
  }
  const h = value.replace('#', '');
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
      const theme = require('../theme.config.js');
      const assets = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName,
        'Images.xcassets',
      );
      const write = (name, light, dark) => {
        const dir = path.join(assets, `${name}.colorset`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'Contents.json'),
          JSON.stringify(colorsetContents(light, dark), null, 2) + '\n',
        );
      };
      write(COLOR_NAME, theme.accent.light, theme.accent.dark);
      for (const [key, token] of Object.entries(theme)) {
        if (key === 'fixed' || !token || !token.asset) continue;
        write(token.asset, token.light, token.dark);
      }
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
