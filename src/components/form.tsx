import { cx } from "@/components/ui";

export function Campo({
  label,
  obrigatorio,
  dica,
  children,
  className,
}: {
  label: string;
  obrigatorio?: boolean;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-ink-700">
        {label}
        {obrigatorio && <span className="text-gold-500">*</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-[11px] leading-snug text-ink-500">{dica}</span>}
    </label>
  );
}

const base =
  "h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-gold-400";

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(base, props.className)} />;
}

export function Selecao({
  opcoes,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { opcoes: string[] }) {
  return (
    <select {...rest} className={cx(base, "appearance-none pr-8", rest.className)}>
      {opcoes.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

export function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={cx(base, "h-auto py-2.5 leading-snug", props.className)}
    />
  );
}

export function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-ink-200 px-5 py-5 last:border-b-0 lg:grid-cols-[220px_1fr]">
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-tight">{titulo}</h2>
        {descricao && <p className="mt-1 text-[12px] leading-snug text-ink-500">{descricao}</p>}
        <div className="gold-rule mt-2 h-px w-8" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
