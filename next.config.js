/** @type {import('next').NextConfig} */
module.exports = {
  // Bundle boilerhaus-ui through webpack so its CJS/ESM mixed dist works
  // correctly in Next.js's SSR page-data collection step.
  transpilePackages: ['@boilerhaus-ui/boilerhaus-ui'],
};
