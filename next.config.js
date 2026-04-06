/** @type {import('next').NextConfig} */
const path = require('path');

module.exports = {
  // Bundle boilerhaus-ui through webpack so its CJS/ESM mixed dist works
  // correctly in Next.js's SSR page-data collection step.
  transpilePackages: ['@boilerhaus-ui/boilerhaus-ui'],

  webpack(config) {
    // The boilerhaus-ui ESM dist (index.js) was compiled with rolldown and
    // contains a createRequire shim that throws in browsers:
    //   Error: Calling `require` for "react" in an environment that
    //   doesn't expose the `require` function.
    // Forcing webpack to use the CJS dist (index.cjs) instead means webpack's
    // own module system handles every require() call — no browser crash.
    config.resolve.alias['@boilerhaus-ui/boilerhaus-ui'] = path.resolve(
      __dirname,
      'node_modules/@boilerhaus-ui/boilerhaus-ui/dist/index.cjs'
    );
    return config;
  },
};
