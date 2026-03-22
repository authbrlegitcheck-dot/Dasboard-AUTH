import React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Authentications from "./pages/Authentications";
import Goals from "./pages/Goals";
import CRM from "./pages/CRM";
import Partners from "./pages/Partners";
import MRR from "./pages/MRR";
import Investments from "./pages/Investments";
import PackagesCA from "./pages/PackagesCA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="auth-dashboard-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/authentications" element={<Authentications />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/mrr" element={<MRR />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/packages-ca" element={<PackagesCA />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
