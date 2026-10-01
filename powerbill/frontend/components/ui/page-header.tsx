export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div className="max-w-3xl">
      {eyebrow ? <p className="mb-2 font-mono text-[11px] font-bold tracking-[.08em] text-forest">{eyebrow}</p> : null}
      <h1 className="font-display text-3xl font-bold tracking-[-.025em] md:text-4xl">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-info md:text-base">{description}</p> : null}
    </div>{action ? <div>{action}</div> : null}
  </header>;
}
