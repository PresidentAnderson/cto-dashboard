/**
 * Table Components
 * Data table with sorting and selection
 */

import { cn } from '../../lib/utils';

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn('bg-gray-50', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn('divide-y divide-gray-200', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, selected, ...props }) {
  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-gray-50',
        selected && 'bg-blue-50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, sortable, sorted, children, ...props }) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-gray-700',
        sortable && 'cursor-pointer select-none hover:bg-gray-100',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-gray-400">
            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </div>
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td
      className={cn('p-4 align-middle', className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableCaption({ className, children, ...props }) {
  return (
    <caption
      className={cn('mt-4 text-sm text-gray-500', className)}
      {...props}
    >
      {children}
    </caption>
  );
}
