import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, icon }: { title: string; description?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-sm sm:flex">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-xl">{title}</h1>
          {description && <p className="hidden text-sm text-muted-foreground sm:block">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {text && <p className="max-w-xs text-xs text-muted-foreground">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
