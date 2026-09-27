// Adopts the UIScene life cycle, which the iOS 27 SDK (Xcode 27) requires at launch.
// Backports what the Expo SDK 58 template does: the window is created by Expo's
// built-in `ExpoAppSceneDelegate` (ObjC name `EXExpoAppSceneDelegate`) instead of
// the AppDelegate. Remove this plugin once the project is on SDK 58+.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: expected a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    }
    src = src.replace(
      WINDOW_BLOCK,
      '// The window is created and React Native is started by ExpoAppSceneDelegate.\n',
    );
    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('startReactNative(')) {
      throw new Error('withSceneLifecycle: AppDelegate template changed, update the plugin');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = (config) => withSceneAppDelegate(withSceneManifest(config));
