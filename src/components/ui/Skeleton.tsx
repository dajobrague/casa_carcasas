import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: string;
}

/**
 * Componente Skeleton para mostrar como placeholder durante la carga
 */
export function Skeleton({
  className,
  height = 'h-4',
  width = 'w-full',
  rounded = 'rounded',
}: SkeletonProps) {
  return (
    <div
      className={cn(
        height,
        width,
        rounded,
        'animate-pulse bg-gray-200',
        className
      )}
    />
  );
}

/**
 * Componente SkeletonTable para mostrar una tabla de carga
 */
export function SkeletonTable({
  rows = 5,
  columns = 7,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Encabezado de tabla */}
      <div className="grid grid-cols-8 gap-2">
        <div className="col-span-1">
          <Skeleton height="h-8" />
        </div>
        {Array(columns)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="col-span-1">
              <Skeleton height="h-8" />
            </div>
          ))}
      </div>

      {/* Filas de tabla */}
      {Array(rows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-2">
            <div className="col-span-1">
              <Skeleton height="h-6" />
            </div>
            {Array(columns)
              .fill(0)
              .map((_, j) => (
                <div key={j} className="col-span-1">
                  <Skeleton height="h-6" />
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}

/**
 * Componente SkeletonCard para mostrar una tarjeta de carga
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 p-4 space-y-3',
        className
      )}
    >
      <Skeleton height="h-5" width="w-3/4" />
      <Skeleton height="h-4" width="w-1/2" />
      <div className="pt-2">
        <Skeleton height="h-10" />
      </div>
    </div>
  );
}

/**
 * Componente SkeletonGraf para mostrar un gráfico de carga
 */
export function SkeletonGraph({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton height="h-6" width="w-1/3" />
      <div className="h-60 bg-gray-50 rounded border border-gray-200 flex items-end justify-between p-4">
        {Array(12)
          .fill(0)
          .map((_, i) => {
            const height = Math.floor(Math.random() * 80) + 10; // Altura aleatoria entre 10% y 90%
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 bg-gray-200 rounded-t animate-pulse"
                  style={{ height: `${height}%` }}
                />
                <Skeleton height="h-3" width="w-8" />
              </div>
            );
          })}
      </div>
    </div>
  );
} 