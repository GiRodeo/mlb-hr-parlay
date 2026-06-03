// Shared loading / error / empty states so every page handles async the same
// way. Skeletons use the muted token for a subtle shimmer-free placeholder.
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "./card";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

// Grid of card-shaped skeletons for list pages.
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="text-2xl" aria-hidden>⚠️</span>
        <h3 className="font-semibold text-destructive">{title}</h3>
        {message && <p className="max-w-md text-sm text-muted-foreground">{message}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            Try again
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="text-2xl" aria-hidden>⚾</span>
        <h3 className="font-semibold">{title}</h3>
        {message && <p className="max-w-md text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
