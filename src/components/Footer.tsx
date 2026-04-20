'use client';

interface FooterProps {
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
}

export function Footer({ lastUpdated, loading, error }: FooterProps) {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          © 2026 Trending Portal v1.0.2
        </p>
        <p className="text-xs text-zinc-400">
          {!loading && !error && lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh',
              })} (GMT+7)`
            : 'Loading...'}
        </p>
      </div>
    </footer>
  );
}
