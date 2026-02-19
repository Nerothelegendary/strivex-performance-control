import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import Profile from "./pages/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-role" element={<SelectRole />} />
        <Route path="/invite" element={<AcceptInvite />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Trainer routes */}
        <Route path="/trainer" element={<ProtectedRoute allowedRole="trainer"><TrainerDashboard /></ProtectedRoute>} />
        <Route path="/trainer/templates" element={<ProtectedRoute allowedRole="trainer"><WorkoutTemplates /></ProtectedRoute>} />
        <Route path="/trainer/template/:id" element={<ProtectedRoute allowedRole="trainer"><TemplateDetail /></ProtectedRoute>} />
        <Route path="/trainer/student/:studentId" element={<ProtectedRoute allowedRole="trainer"><StudentDetail /></ProtectedRoute>} />

        {/* Student routes */}
        <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/invite" element={<ProtectedRoute allowedRole="student"><EnterInvite /></ProtectedRoute>} />
        <Route path="/student/session/:templateId" element={<ProtectedRoute allowedRole="student"><WorkoutSession /></ProtectedRoute>} />

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
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
