import type { LucideIcon } from "lucide-react";
import {
  AlertIcon,
  DashboardIcon,
  DeadLetterIcon,
  JobsIcon,
  LogsIcon,
  NotificationIcon,
  PipelineIcon,
  SettingsIcon,
  XIcon,
} from "./Icons";

type PageKey = "overview" | "pipelines" | "jobs" | "dead-letters" | "logs" | "notifications" | "settings";

type HeaderProps = {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  autoRefreshEnabled: boolean;
  refreshIntervalMs: number;
};

type NavItem = {
  key: PageKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    key: "overview",
    label: "Overview",
    description: "System snapshot",
    icon: DashboardIcon,
  },
  {
    key: "pipelines",
    label: "Pipelines",
    description: "Routes and subscribers",
    icon: PipelineIcon,
  },
  {
    key: "jobs",
    label: "Jobs",
    description: "Execution history",
    icon: JobsIcon,
  },
  {
    key: "dead-letters",
    label: "Dead Letters",
    description: "Recovery queue",
    icon: DeadLetterIcon,
  },
  {
    key: "logs",
    label: "Logs",
    description: "Runtime stream",
    icon: LogsIcon,
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Alerts and signals",
    icon: AlertIcon,
  },
  {
    key: "settings",
    label: "Settings",
    description: "Local controls",
    icon: SettingsIcon,
  },
];

function navButtonClass(active: boolean): string {
  return `ui-nav-button ${active ? "ui-nav-button-active" : ""}`.trim();
}

function NavButton({
  active,
  item,
  onClick,
}: {
  active: boolean;
  item: NavItem;
  onClick: () => void;
}): JSX.Element {
  const Icon = item.icon;

  return (
    <button type="button" onClick={onClick} className={navButtonClass(active)}>
      <span className="flex min-w-0 items-start">
        <Icon className="ui-nav-icon" />
        <span className="min-w-0">
          <span className="block leading-5 font-semibold text-current">{item.label}</span>
          <span className={`mt-0.5 block text-[12px] leading-5 ${active ? "text-white/70" : "text-slate-400"}`}>
            {item.description}
          </span>
        </span>
      </span>
      <XIcon className="ui-nav-arrow rotate-45" />
    </button>
  );
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
    <aside className="w-full border-b border-slate-800/80 bg-[linear-gradient(180deg,_#0b1220_0%,_#111827_100%)] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[308px] lg:border-b-0 lg:border-r lg:border-r-slate-800/80 xl:w-[324px]">
      <div className="flex h-full flex-col gap-4 px-4 py-4 lg:px-5 lg:py-5">
        <div className="ui-sidebar-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="ui-card-icon-soft">
                <PipelineIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operations</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">Webhook Pipeline</h1>
              <p className="mt-2 max-w-[220px] text-sm leading-6 text-slate-300/90">
                Premium admin surface for monitoring, recovery, and secure delivery control.
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Live
            </span>
          </div>
        </div>

        <div className="ui-sidebar-card p-3">
          <div className="px-2 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavButton key={item.key} active={currentPage === item.key} item={item} onClick={() => onNavigate(item.key)} />
            ))}
          </nav>
        </div>

        <div className="mt-auto space-y-3">
          <div className="ui-sidebar-card p-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace health</p>
              <span className="text-[11px] font-medium text-slate-400">Live sync</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="ui-sidebar-card-muted p-3.5">
                <div className="flex items-center gap-2 text-slate-300">
                  <NotificationIcon className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Refresh</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{autoRefreshEnabled ? "Automatic" : "Manual"}</p>
              </div>
              <div className="ui-sidebar-card-muted p-3.5">
                <div className="flex items-center gap-2 text-slate-300">
                  <LogsIcon className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Interval</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">
                  {autoRefreshEnabled ? `${refreshIntervalMs / 1000}s` : "Disabled"}
                </p>
              </div>
            </div>
          </div>

          <form className="ui-sidebar-card p-4" onSubmit={(event) => event.preventDefault()}>
            <div className="flex items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Session</p>
              </div>
              <span className="text-[11px] font-medium text-slate-400">Protected</span>
            </div>
            <label htmlFor="dashboard-api-key" className="mb-1.5 mt-4 block text-sm font-medium text-slate-200">
              API Key
            </label>
            <input
              id="dashboard-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="Enter API key"
              autoComplete="off"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400 focus:ring-4 focus:ring-white/10"
            />
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Stored locally for secure operator actions and protected dashboard workflows.
            </p>
          </form>
        </div>
      </div>
    </aside>
  );
}
