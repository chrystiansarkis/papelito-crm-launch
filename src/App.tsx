import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "./components/layout/AppShell";
import { Inicio } from "./pages/Inicio";
import Carteira from "@/pages/Carteira";
import Cliente from "@/pages/Cliente";
import Cobranca from "@/pages/Cobranca";
import Pedidos from "@/pages/Pedidos";

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
              <Route path="/cliente/:id" element={<Cliente />} />
              <Route path="/cobranca" element={<Cobranca />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
