import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "./components/layout/AppShell";
import { Inicio } from "./pages/Inicio";
import Carteira from "@/pages/Carteira";
import CarteiraNovo from "@/pages/CarteiraNovo";
import Cliente from "@/pages/Cliente";
import ClienteEditar from "@/pages/ClienteEditar";
import Cobranca from "@/pages/Cobranca";
import Pedidos from "@/pages/Pedidos";
import PedidoPage from "@/pages/Pedido";
import PedidoNovo from "@/pages/PedidoNovo";
import PedidoEditar from "@/pages/PedidoEditar";
import Atendimentos from "@/pages/Atendimentos";
import CampanhasVendas from "@/pages/CampanhasVendas";
import CampanhaVendasNova from "@/pages/CampanhaVendasNova";
import CampanhaVendasEditar from "@/pages/CampanhaVendasEditar";
import CampanhaVendas from "@/pages/CampanhaVendas";
import ProdutoConfigPage from "@/pages/ProdutoConfig";
import TabelasPrecoPage from "@/pages/TabelasPreco";
import DescontoCadastroPage from "@/pages/DescontoCadastro";
import TabelaPrecoCadastroPage from "@/pages/TabelaPrecoCadastro";
import BonificacaoRegrasPage from "@/pages/BonificacaoRegras";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Inicio />} />
              <Route path="/carteira" element={<Carteira />} />
              <Route path="/carteira/novo" element={<CarteiraNovo />} />
              <Route path="/cliente/:id" element={<Cliente />} />
              <Route path="/cliente/:id/editar" element={<ClienteEditar />} />
              <Route path="/cobranca" element={<Cobranca />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/pedidos/novo" element={<PedidoNovo />} />
              <Route path="/pedidos/:id/editar" element={<PedidoEditar />} />
              <Route path="/pedido/:id" element={<PedidoPage />} />
              <Route path="/atendimentos" element={<Atendimentos />} />
              <Route path="/campanhas-vendas" element={<CampanhasVendas />} />
              <Route path="/campanhas-vendas/nova" element={<CampanhaVendasNova />} />
              <Route path="/campanhas-vendas/:id/editar" element={<CampanhaVendasEditar />} />
              <Route path="/campanhas-vendas/:id" element={<CampanhaVendas />} />
              <Route path="/admin/produtos" element={<ProdutoConfigPage />} />
              <Route path="/tabelas-preco" element={<TabelasPrecoPage />} />
              <Route path="/tabelas-preco/cadastro/novo" element={<TabelaPrecoCadastroPage />} />
              <Route path="/tabelas-preco/cadastro/:id" element={<TabelaPrecoCadastroPage />} />
              <Route path="/tabelas-preco/desconto/novo" element={<DescontoCadastroPage />} />
              <Route path="/tabelas-preco/desconto/:id" element={<DescontoCadastroPage />} />
              <Route path="/bonificacao-regras" element={<BonificacaoRegrasPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
