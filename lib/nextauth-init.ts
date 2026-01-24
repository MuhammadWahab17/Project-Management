// Initialize NextAuth environment variables
// This file must be imported before any NextAuth code

import { config } from "./config";

// Set environment variables if not already set
if (typeof process !== 'undefined') {
  // Set NEXTAUTH_SECRET
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = config.nextAuthSecret;
  }
  
  // Set NEXTAUTH_URL
  if (!process.env.NEXTAUTH_URL) {
    // Vercel provides VERCEL_URL (without protocol) during runtime
    // Handle different Vercel URL formats
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      // VERCEL_URL might be just the domain or include subdomain
      // Ensure it has protocol
      if (vercelUrl.startsWith('http')) {
        process.env.NEXTAUTH_URL = vercelUrl;
      } else {
        process.env.NEXTAUTH_URL = `https://${vercelUrl}`;
      }
    } else {
      // Fallback to localhost for development
      process.env.NEXTAUTH_URL = config.nextAuthUrl || 'http://localhost:3000';
    }
  }
}

// Export a function to ensure this runs
export function initNextAuth() {
  // This function ensures the module is evaluated
  return true;
}

