import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * `img-src` has to allow arbitrary https hosts: letting an organiser paste a
 * banner URL from anywhere is a product requirement, so locking images to
 * 'self' would break the feature.
 *
 * `script-src` allows 'unsafe-inline' because Next.js emits inline bootstrap and
 * hydration scripts. Removing it means generating a per-request nonce in
 * middleware, which also opts every page out of static rendering — a real
 * trade-off rather than an oversight. The header still does useful work as it
 * stands: it blocks script loaded from a third-party origin, framing, form
 * submission to another host, and <base> injection. See "Hardening further" in
 * README.md for the nonce upgrade.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  // Tailwind's stylesheet plus the inline `style` attributes that carry each
  // event's theme variables.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Defence in depth alongside frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs a camera, a microphone or a location.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Opt-in, because it is incompatible with `next start`: standalone emits its
  // own server at .next/standalone/server.js and Next refuses to serve the
  // build any other way. The Dockerfile sets BUILD_STANDALONE=1; plain
  // `npm run build && npm start` and Vercel deploys are unaffected.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),

  // Do not leak the framework version to every visitor.
  poweredByHeader: false,

  // Organisers paste banner/logo URLs from arbitrary hosts, so next/image's
  // host allow-list would constantly get in the way. User-supplied media is
  // rendered with plain <img> (explicitly sized to avoid layout shift); this
  // entry only covers the cases where we do reach for next/image.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  // These are CommonJS and reach for Node built-ins at require time. Keeping
  // them external stops the bundler from tracing them into the edge/browser graph.
  serverExternalPackages: ["xlsx", "nodemailer", "bcryptjs"],

  async headers() {
    return [
      {
        // Everything, including the public invitation pages.
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // HSTS only in production: sending it from a local http server would
          // pin localhost to https in the browser and break development.
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      {
        // Uploaded files are user-supplied bytes served from our own origin.
        // nosniff plus a sandbox CSP keeps a mislabelled file from executing.
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
