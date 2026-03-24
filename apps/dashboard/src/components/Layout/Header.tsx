type HeaderProps = {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  currentPage: "overview" | "pipelines" | "jobs" | "dead-letters" | "logs" | "notifications" | "settings";
  onNavigate: (
    page: "overview" | "pipelines" | "jobs" | "dead-letters" | "logs" | "notifications" | "settings",
  ) => void;
  autoRefreshEnabled: boolean;
  refreshIntervalMs: number;
};

function navButtonClass(active: boolean): string {
  if (active) {
    return "w-full rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-left text-sm font-semibold text-white";
  }

  return "w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-slate-800";
}

export function Header({
  apiKey,
  onApiKeyChange,
  currentPage,
  onNavigate,
  autoRefreshEnabled,
  refreshIntervalMs,
}: HeaderProps): JSX.Element {
  return (
    <aside className="w-full border-b border-slate-700 bg-slate-900 text-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:border-r-slate-700">
      <div className="flex h-full flex-col gap-6 px-4 py-5">
        <div>
          <h1 className="text-lg font-bold">Webhook Pipeline</h1>
          <p className="mt-1 text-sm text-slate-300">Admin Dashboard</p>
        </div>

        <nav className="space-y-2">
          <button
            type="button"
            onClick={() => onNavigate("overview")}
            className={navButtonClass(currentPage === "overview")}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigate("pipelines")}
            className={navButtonClass(currentPage === "pipelines")}
          >
            Pipelines
          </button>
          <button
            type="button"
            onClick={() => onNavigate("jobs")}
            className={navButtonClass(currentPage === "jobs")}
          >
            Jobs
          </button>
          <button
            type="button"
            onClick={() => onNavigate("dead-letters")}
            className={navButtonClass(currentPage === "dead-letters")}
          >
            Dead Letters
          </button>
          <button
            type="button"
            onClick={() => onNavigate("logs")}
            className={navButtonClass(currentPage === "logs")}
          >
            Logs
          </button>
          <button
            type="button"
            onClick={() => onNavigate("notifications")}
            className={navButtonClass(currentPage === "notifications")}
          >
            Notifications
          </button>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className={navButtonClass(currentPage === "settings")}
          >
            Settings
          </button>
        </nav>

        <form
          className="mt-auto rounded-lg border border-slate-700 bg-slate-800/60 p-3"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="dashboard-api-key" className="mb-1 block text-xs font-medium text-slate-300">
            API Key
          </label>
          <input
            id="dashboard-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="Enter API key"
            autoComplete="off"
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
          <p className="mt-2 text-xs text-slate-400">
            {autoRefreshEnabled ? `Auto-refresh every ${refreshIntervalMs / 1000}s` : "Auto-refresh disabled"}
          </p>
        </form>
      </div>
    </aside>
  );
}
