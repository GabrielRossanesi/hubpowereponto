export type DataMode = 'sandbox' | 'database';

export const dataMode: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === 'database' ? 'database' : 'sandbox';

export const isDatabaseDataMode = dataMode === 'database';
export const isSandboxDataMode = !isDatabaseDataMode;
