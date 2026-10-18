const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const Module = require('module');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

// Ensure hoisted tools and babel presets resolve workspace-local packages (e.g. expo-router)
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(mobileNodeModules)) {
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${mobileNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    : mobileNodeModules;
  Module._initPaths();
}

const config = getDefaultConfig(projectRoot);

// 1. Preserve Expo's default watchFolders and ensure workspace root is included
config.watchFolders = Array.from(
  new Set([...(config.watchFolders || []), workspaceRoot])
);

// 2. Preserve Expo's default nodeModulesPaths and ensure workspace node_modules resolution
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    ...(config.resolver.nodeModulesPaths || []),
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ])
);

// 3. Ensure shared package resolution in monorepo
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@expense-app/shared': path.resolve(workspaceRoot, 'shared'),
};

module.exports = config;
