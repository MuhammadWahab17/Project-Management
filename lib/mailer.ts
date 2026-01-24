import nodemailer from "nodemailer";
import { config } from "./config";

const smtpHost = config.smtp.host;
const smtpPort = config.smtp.port;
const smtpUser = config.smtp.user;
const smtpPass = config.smtp.pass;

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: true, // Use SSL/TLS
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    // Don't reject unauthorized certificates (handles expired certificates)
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true,
});
