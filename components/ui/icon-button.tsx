import React from 'react';
import Button, { type ButtonProps } from './button';

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  label: string;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className = '', children, type = 'button', ...props }, ref) => (
    <Button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`h-9 w-9 shrink-0 p-0 ${className}`}
      {...props}
    >
      {children}
    </Button>
  ),
);

IconButton.displayName = 'IconButton';

export default IconButton;
