import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/auth/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import StudyMaterials from "./pages/StudyMaterials";
import Tutors from "./pages/Tutors";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import TutorDashboard from "./pages/tutor/TutorDashboard";
import Attendance from "./pages/tutor/Attendance";
import Reports from "./pages/tutor/Reports";
import CreateTutors from "./pages/admin/CreateTutors";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<Index />} />
            
            {/* Auth routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/study-materials" element={<StudyMaterials />} />
              <Route path="/tutors" element={<Tutors />} />
              <Route path="/settings" element={<Settings />} />
              
            {/* Tutor routes */}
              <Route path="/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/tutor/attendance/:bookingId" element={<Attendance />} />
              <Route path="/tutor/reports" element={<Reports />} />
              
              {/* Admin routes */}
              <Route path="/admin/create-tutors" element={<CreateTutors />} />
            </Route>
            
            {/* Catch-all route - must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
