/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel doesn't auto-trace files read via runtime fs paths. Force the JSON
  // data the API reads into the serverless function bundle so the deployed app
  // can replay the committed cache (and load fixtures) reliably.
  outputFileTracingIncludes: {
    "/api/compare": ["./data/cache/**", "./fixtures/**"],
  },
};

export default nextConfig;
