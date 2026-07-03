import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // baseURL is omitted to dynamically resolve relative paths against the window's origin.
  // This supports localhost, production, and preview domains out-of-the-box.
});

export const { signIn, signOut, useSession } = authClient;
