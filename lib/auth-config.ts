// Import initialization FIRST to set environment variables
import "./nextauth-init";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { config } from "./config";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Manager - can view all projects
        if (
          credentials.email === "manager@softechinc.ai" &&
          credentials.password === "tech@321#$"
        ) {
          return {
            id: "1",
            email: "manager@softechinc.ai",
            name: "Manager",
            role: "manager",
          };
        }
        
        // Nazish - can only view own projects
        if (
          credentials.email === "nazish@softechinc.ai" &&
          credentials.password === "tech@321#$"
        ) {
          return {
            id: "2",
            email: "nazish@softechinc.ai",
            name: "Nazish",
            role: "user",
          };
        }
        
        // Soban - can only view own projects
        if (
          credentials.email === "soban@softechinc.ai" &&
          credentials.password === "tech@321#$"
        ) {
          return {
            id: "3",
            email: "soban@softechinc.ai",
            name: "Soban",
            role: "user",
          };
        }
        
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: config.nextAuthSecret,
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - set user data
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role || "user";
      }
      // Ensure role is always set (fallback for existing tokens)
      if (!token.role) {
        // Determine role from email if not set
        if (token.email === "manager@softechinc.ai") {
          token.role = "manager";
        } else {
          token.role = "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        const userEmail = (token.email as string) || session.user.email || "";
        session.user.email = userEmail;
        
        // Ensure role is set in session - check token first, then email
        let role = token.role as string;
        if (!role) {
          // Fallback: determine role from email
          if (userEmail === "manager@softechinc.ai") {
            role = "manager";
          } else {
            role = "user";
          }
        }
        (session.user as any).role = role;
        
        // Debug logging
        console.log("Session callback - User:", userEmail, "Role:", role);
      }
      return session;
    },
  },
  debug: false,
};
