import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SelectRole from "./pages/SelectRole";
import AcceptInvite from "./pages/AcceptInvite";
import TrainerDashboard from "./pages/trainer/TrainerDashboard";
import WorkoutTemplates from "./pages/trainer/WorkoutTemplates";
import TemplateDetail from "./pages/trainer/TemplateDetail";
import StudentDetail from "./pages/trainer/StudentDetail";
import StudentDashboard from "./pages/student/StudentDashboard";
import EnterInvite from "./pages/student/EnterInvite";
import WorkoutSession from "./pages/student/WorkoutSession";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-role" element={<SelectRole />} />
        <Route path="/invite" element={<AcceptInvite />} />
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/trainer/templates" element={<WorkoutTemplates />} />
        <Route path="/trainer/template/:id" element={<TemplateDetail />} />
        <Route path="/trainer/student/:studentId" element={<StudentDetail />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/invite" element={<EnterInvite />} />
        <Route path="/student/session/:templateId" element={<WorkoutSession />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
