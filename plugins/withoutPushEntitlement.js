// Strips the `aps-environment` (Push Notifications) entitlement that
// expo-notifications adds. møni only uses LOCAL notifications (scheduled via
// expo-notifications), which don't need it — and free Apple "Personal Team"
// accounts can't sign the Push Notifications capability at all, so device
// builds fail with it present.
//
// Remove this plugin once we have a paid Apple Developer account and actually
// want remote push.
//
// Ordering note: Expo runs mods in REVERSE registration order, so this plugin
// must be registered BEFORE 'expo-notifications' in app.config.ts for its
// entitlements mod to run after (and win over) the one that adds the key.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
