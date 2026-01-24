// Import initialization FIRST - this sets environment variables
import "@/lib/nextauth-init";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
