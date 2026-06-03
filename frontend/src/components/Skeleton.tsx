import React from 'react';

interface SkeletonProps {
  /**
   * The width of the skeleton (can be percentage, px, or other CSS units)
   */
  width?: string | number;
  /**
   * The height of the skeleton (can be percentage, px, or other CSS units)
   */
  height?: string | number;
  /**
   * Border radius of the skeleton
   */
  borderRadius?: string | number;
  /**
   * Whether to show animation
   */
  animated?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
  /**
   * HTML element to render as
   */
  as?: React.ElementType;
}

/**
 * Skeleton component for loading placeholders
 * Used for showing animated placeholders while content is loading
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '0.25rem',
  animated = true,
  className,
  as: Component = 'div',
}) => {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <Component
      className={[
        'bg-slate-200 dark:bg-slate-700',
        animated && 'animate-pulse',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}
;

/**
 * SkeletonText component for loading text placeholders
 */
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => {
  return (
    <div className={['space-y-3', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={i === lines - 1 ? '0.75rem' : '1rem'}
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
};

/**
 * SkeletonCard component for loading card placeholders
 */
export const SkeletonCard: React.FC<{
  imageHeight?: number;
  className?: string;
}> = ({ imageHeight = 200, className }) => {
  return (
    <div className={['rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4', className].filter(Boolean).join(' ')}>
      <Skeleton height={imageHeight} borderRadius="0.5rem" className="mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
};

/**
 * SkeletonTableRow component for loading table row placeholders
 */
export const SkeletonTableRow: React.FC<{
  columns: number;
  className?: string;
}> = ({ columns, className }) => {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton width="75%" />
        </td>
      ))}
    </tr>
  );
};

/**
 * SkeletonTable component for loading table placeholders
 */
export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 5, className }) => {
  return (
    <div className={['border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden', className].filter(Boolean).join(' ')}>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * SkeletonGrid component for loading grid placeholders
 */

export const SkeletonPage: React.FC<{
  cards?: number;
  columns?: number;
  className?: string;
}> = ({ cards = 6, columns = 3, className }) => {
  return (
    <div className={['space-y-6', className].filter(Boolean).join(' ')}>
      <div className="space-y-3">
        <Skeleton width="40%" height="1.75rem" className="rounded-lg" />
        <Skeleton width="25%" height="1rem" className="rounded-lg" />
      </div>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${100 / columns}%), 1fr))`,
        }}
      >
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
            <Skeleton height={180} className="rounded-3xl mb-4" />
            <Skeleton width="85%" />
            <Skeleton width="60%" />
            <Skeleton width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonGrid: React.FC<{
  items?: number;
  columns?: number;
  className?: string;
}> = ({ items = 12, columns = 3, className }) => {
  return (
    <div
      className={['grid gap-4', className].filter(Boolean).join(' ')}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${100 / columns}%), 1fr))`,
      }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default Skeleton;
