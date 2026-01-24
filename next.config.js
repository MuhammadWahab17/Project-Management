/** @type {import('next').NextConfig} */

// Set NextAuth environment variables before Next.js starts
// These values must match lib/config.ts
// This runs during build and runtime initialization
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'development-secret-key-change-in-production-use-random-string';
}
if (!process.env.NEXTAUTH_URL) {
  // Vercel provides VERCEL_URL (without protocol) during build and runtime
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.APPLICATION_URL) {
    // cPanel/Namecheap might set this
    process.env.NEXTAUTH_URL = process.env.APPLICATION_URL;
  } else {
    // Default - will need to be set via environment variable in cPanel
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  }
}

const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
