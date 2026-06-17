type Status = "draft" | "active" | "completed" | "cancelled" | string;

const styles: Record<string, string> = {
  draft: "bg-ink/10 text-ink/70 dark:bg-foreground/10 dark:text-foreground/70",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = styles[status] ?? styles.draft;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
