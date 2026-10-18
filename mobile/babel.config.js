const path = require('path');
const Module = require('module');

// Ensure hoisted babel-preset-expo resolves workspace packages like expo-router in monorepo
const mobileNodeModules = path.resolve(__dirname, 'node_modules');
if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(mobileNodeModules)) {
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${mobileNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    : mobileNodeModules;
  Module._initPaths();
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
