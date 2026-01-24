// Configuration values from environment variables
// Set these in .env.local file

export const config = {
  // NextAuth Configuration
  nextAuthSecret: process.env.NEXTAUTH_SECRET || "development-secret-key-change-in-production-use-random-string",
  nextAuthUrl: process.env.NEXTAUTH_URL || "https://pm1-nine.vercel.app/",

  // Database Configuration
  databaseUrl: process.env.DATABASE_URL || "",

  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },

  // Application URLs
  appUrl: process.env.APP_URL || "https://softechinc.ai",
  companyName: process.env.COMPANY_NAME || "Softech Inc",
};

