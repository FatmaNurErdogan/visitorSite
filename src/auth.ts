// Personel giriş sistemi burada kuruluyor (next-auth / Auth.js).
// signIn, signOut, auth() fonksiyonlarını başka dosyalarda buradan import edip kullanacağız.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        if (!email || !password) return null;

        const staff = await prisma.staff.findUnique({ where: { email } });
        if (!staff) return null;

        const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
        if (!passwordMatches) return null;

        // ADMIN her iki kapıdan da girebilir. EMPLOYEE sadece "employee" kapısından,
        // RECEPTIONIST sadece "receptionist" kapısından girebilir.
        if (
          expectedRole &&
          staff.role !== "ADMIN" &&
          staff.role.toLowerCase() !== expectedRole.toLowerCase()
        ) {
          return null;
        }

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        };
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
