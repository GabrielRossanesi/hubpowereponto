export type DataMode = 'sandbox' | 'database';

// Force 'database' in production/Vercel environments to prevent mock bypass in production
const isProd = 
  process.env.NODE_ENV === 'production' || 
  process.env.VERCEL === '1' || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));

export const dataMode: DataMode =
  isProd ? 'database' : (process.env.NEXT_PUBLIC_DATA_MODE === 'database' ? 'database' : 'sandbox');

export const isDatabaseDataMode = dataMode === 'database';
export const isSandboxDataMode = !isDatabaseDataMode;
