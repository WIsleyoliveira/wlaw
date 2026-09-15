export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-50 px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink-950 font-display text-[18px] font-semibold text-gold-400">W</span>
          <span className="font-display text-[22px] font-semibold tracking-tight">Wlaw</span>
        </div>
        <section className="rounded-card border border-ink-200 bg-white p-6 shadow-sm">{children}</section>
        <p className="mt-4 text-center text-[11px] text-ink-400">Gestão jurídica · acesso restrito à equipe do escritório</p>
      </div>
    </main>
  );
}
