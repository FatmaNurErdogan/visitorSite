// Personel giriş sistemi burada kuruluyor (next-auth / Auth.js).
// signIn, signOut, auth() fonksiyonlarını başka dosyalarda buradan import edip kullanacağız.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyStaffCredentials } from "@/lib/verifyStaffCredentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        expectedRole: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        // Hangi kapıdan giriş yapılmaya çalışıldığı ("employee" veya "receptionist").
        // Home sayfasındaki linkler bunu /login?as=... ile taşıyor.
        const expectedRole = credentials?.expectedRole as string | undefined;
        return verifyStaffCredentials(email, password, expectedRole);
      },
    }),
  ],
  callbacks: {
    // Giriş yapan kişinin role'ünü (ADMIN/EMPLOYEE/RECEPTIONIST) oturum bilgisine ekliyoruz
    // ki sayfalarda "bu kişi ne görebilir" kararını buna göre verebilelim.
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
});
