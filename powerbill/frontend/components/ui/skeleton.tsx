export function Skeleton({ className="" }: { className?: string }) { return <div className={`animate-pulse rounded-md bg-raised ${className}`} aria-hidden="true"/>; }
export function PageSkeleton() { return <div className="space-y-5"><Skeleton className="h-9 w-64"/><Skeleton className="h-24 w-full"/><Skeleton className="h-72 w-full"/></div>; }
