const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Supabase realtime / ws needs this on some RN versions
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
