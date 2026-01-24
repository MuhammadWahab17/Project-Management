export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/projects/:path*", "/reminders/:path*", "/weekly-progress/:path*", "/"],
};
