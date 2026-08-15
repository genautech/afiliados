import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (!user?.password) return null;
          if (user.isActive === false) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? 'USER';
        token.active = true;
        return token;
      }
      if (!token.id) {
        token.active = false;
        return token;
      }
      try {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { id: true, email: true, role: true, isActive: true },
        });
        if (!currentUser || currentUser.isActive === false) {
          delete token.id;
          delete token.role;
          token.active = false;
          return token;
        }
        token.id = currentUser.id;
        token.email = currentUser.email;
        token.role = currentUser.role ?? 'USER';
        token.active = true;
      } catch {
        delete token.id;
        delete token.role;
        token.active = false;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token.active !== true || !token.id) {
        session.user = undefined;
        return session;
      }
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role ?? 'USER';
      }
      return session;
    },
  },
};
