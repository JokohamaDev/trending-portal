interface EmptyCategoryProps {
  title: string;
  icon?: React.ReactNode;
  apiKeyName: string;
}

export function EmptyCategory({ title, icon, apiKeyName }: EmptyCategoryProps) {
  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-500">{icon}</span>}
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
        </div>
      </div>

      {/* Empty State */}
      <div className="p-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          API Key Required
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Set <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">{apiKeyName}</code> in environment variables
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Or use <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">USE_MOCK_DATA=true</code> for demo
        </p>
      </div>
    </section>
  );
}
