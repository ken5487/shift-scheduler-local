
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Staff from "./pages/Staff";
import Shifts from "./pages/Shifts";
import Schedule from "./pages/Schedule";
import { AppProvider } from "./contexts/AppContext";
import Leave from "./pages/Leave";
import WorkAssignment from "./pages/WorkAssignment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/shifts" element={<Shifts />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/work-assignment" element={<WorkAssignment />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
