import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    access_token?: string;
  }

  interface User extends DefaultUser {
    access_token?: string;
  }

  interface JWT {
    access_token?: string;
  }
}
