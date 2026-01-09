import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Helper: Send token data securely to your FastAPI backend
async function sendTokenToBackend(data: {
  user_id: string;
  refresh_token: string;
  access_token: string;
  expires_at: number;
}) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL || "http://localhost:8000"}/auth/store-google-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(`[NEXTAUTH] Failed to store refresh token in backend: ${response.statusText}`);
    } else {
      console.log("[NEXTAUTH] ✅ Stored refresh token in Supabase via FastAPI.");
    }
  } catch (err) {
    console.error("[NEXTAUTH] ❌ Could not connect to FastAPI backend:", err);
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // ✅ Include ALL necessary scopes
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
          access_type: "offline", // ✅ Required for refresh token
          prompt: "consent", // ✅ Forces re-consent if scopes change
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  callbacks: {
    // 🔹 Handles tokens during login
    async jwt({ token, account }) {
      if (account) {
        if (account.access_token) {
          token.accessToken = account.access_token;
        }
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }
        if (account.expires_at) {
          token.expiresAt = account.expires_at;
        }

        // ✅ Send refresh token + access token to backend for Supabase storage
        if (account.refresh_token && token.email) {
          await sendTokenToBackend({
            user_id: token.email!,
            refresh_token: account.refresh_token,
            access_token: account.access_token!,
            expires_at: account.expires_at!,
          });
        }
      }
      return token;
    },

    // 🔹 Make session available in frontend
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).email = token.email;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
