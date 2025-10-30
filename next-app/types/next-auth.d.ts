import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string; // Add the unique ID (sub)
      email: string; // Ensure email is available
      name: string;
      image: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    email: string;
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email: string;
    sub: string;
    accessToken: string; // The short-lived access token
  }
}