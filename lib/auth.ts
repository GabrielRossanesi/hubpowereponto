import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import prisma from './prisma';

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("FATAL: BETTER_AUTH_SECRET não está definida.");
}

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL não está definida.");
}

if (!process.env.BETTER_AUTH_URL) {
  console.error("FATAL: BETTER_AUTH_URL não está definida.");
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.warn("WARNING: NEXT_PUBLIC_APP_URL não está definida.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    'https://nvhub.vercel.app',
    'https://nvhub-g81cdeo9m-gabrielrossanesis-projects.vercel.app'
  ].filter(Boolean) as string[],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  plugins: [
    organization({
      // We can customize the organization behavior here if needed
    }),
  ],
});
