import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import prisma from './prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: [
    'https://nvhub-g81cdeo9m-gabrielrossanesis-projects.vercel.app'
  ],
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
