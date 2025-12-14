// src/App.tsx
import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute"; // ADD THIS

// Pages
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Auth/Login";
import Signup from "@/pages/Auth/Signup";
import NotFound from "@/pages/NotFound";

// Layouts
import DashboardLayout from "@/layouts/DashboardLayout";

// Admin Dashboard Pages
import AdminDashboard from "@/pages/AdminDashboard/AdminDashboard";
import ClassManagement from "@/pages/AdminDashboard/ClassManagement";
import TeacherManagement from "@/pages/AdminDashboard/TeacherManagement";
import AdminResultsAnalysis from "@/pages/AdminDashboard/ResultsAnalysis";
import ReportCards from "@/pages/AdminDashboard/ReportCards";

// Teacher Dashboard Pages
import TeacherDashboard from "@/pages/TeacherDashboard/TeacherDashboard";
import TeacherResultEntry from "@/pages/TeacherDashboard/ResultEntry";
import TeacherResultsAnalysis from "@/pages/TeacherDashboard/ResultsAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing & Auth Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Admin Dashboard Routes - PROTECTED */}
            <Route element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/class-management" element={<ClassManagement />} />
              <Route path="/admin/teacher-management" element={<TeacherManagement />} />
              <Route path="/admin/results-analysis" element={<AdminResultsAnalysis />} />
              <Route path="/admin/report-cards" element={<ReportCards />} />
            </Route>

            {/* Teacher Dashboard Routes - PROTECTED */}
            <Route element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/result-entry" element={<TeacherResultEntry />} />
              <Route path="/teacher/results-analysis" element={<TeacherResultsAnalysis />} />
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);