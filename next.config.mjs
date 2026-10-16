import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // The directory lives on the home page and sign-up moved to /registro; keep the old addresses working.
  async redirects() {
    return [
      { source: '/profesionales', destination: '/', permanent: false },
      { source: '/profesionales/registro', destination: '/registro', permanent: true },
      { source: '/profesionales/registro/confirmacion', destination: '/registro/confirmacion', permanent: true },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'greenbit-g2',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
})
