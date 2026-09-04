import type { HTMLAttributes } from 'react';

export type AppContentContainerProps = HTMLAttributes<HTMLDivElement>;

export function AppContentContainer({ className = '', ...props }: AppContentContainerProps) {
  return <div className={`app-content-container ${className}`} {...props} />;
}

export default AppContentContainer;
