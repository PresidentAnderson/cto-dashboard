/**
 * Badge Component
 * Status badges and labels
 */

import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'bg-blue-100 text-blue-800 border-blue-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  secondary: 'bg-gray-100 text-gray-800 border-gray-300',
  outline: 'bg-white text-gray-700 border-gray-300',
};

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
