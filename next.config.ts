/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:3000 https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' http://localhost:3000 https://*.web3auth.io https://*.openlogin.com https://rest-testnet.onflow.org https://metamask-sdk.api.cx.metamask.io https://mm-sdk-analytics.api.cx.metamask.io",
              "frame-src 'self' http://localhost:3000 https://*.web3auth.io https://*.openlogin.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
