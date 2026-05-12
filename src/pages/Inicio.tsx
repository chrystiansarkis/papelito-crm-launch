import { useCurrentUser } from "@/hooks/useCurrentUser";

export function Inicio() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }
  if (!user) {
    return (
      <div className="p-8 text-muted-foreground">
        Usuário não encontrado em <code className="font-mono">crm.usuarios</code>.
      </div>
    );
  }

  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl mb-1">
        {saudacao}, {user.nome.split(" ")[0]}.
      </h1>
      <p className="text-sm text-muted-foreground mb-8 capitalize">
        Hoje é {dataHoje}.
      </p>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-display text-xl mb-2">Tela Início — em construção</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Você logou como <span className="font-medium text-ink">{user.papel}</span>. A próxima entrega vai
          construir o cockpit completo com 10 blocos: briefing IA, movimento do mês, atividade por recência, KPIs, e mais.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Carteira" value="—" />
          <Stat label="Em risco" value="—" />
          <Stat label="Pedidos no mês" value="R$ —" mono />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-paper p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={mono ? "font-mono text-2xl" : "font-display text-2xl"}>{value}</div>
    </div>
  );
}