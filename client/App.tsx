// src/App.tsx (Updated)
import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Auth/Login";
import Signup from "@/pages/Auth/Signup";
import NotFound from "@/pages/NotFound";

import DashboardLayout from "@/layouts/DashboardLayout";

// Admin Dashboard Pages
import AdminDashboard from "@/pages/AdminDashboard/AdminDashboard";
import ClassManagement from "@/pages/AdminDashboard/ClassManagement";
import TeacherManagement from "@/pages/AdminDashboard/TeacherManagement";
import AdminResultsAnalysis from "@/pages/AdminDashboard/ResultsAnalysis";
import ReportCards from "@/pages/AdminDashboard/ReportCards";
import AttendanceOverview from "@/pages/AdminDashboard/AttendanceOverview";

// Teacher Dashboard Pages
import TeacherDashboard from "@/pages/TeacherDashboard/TeacherDashboard";
import TeacherResultEntry from "@/pages/TeacherDashboard/ResultEntry";
import TeacherResultsAnalysis from "@/pages/TeacherDashboard/ResultsAnalysis";
import AttendanceRollCall from "@/pages/TeacherDashboard/AttendanceRollCall";
import LessonPlanning from "@/pages/TeacherDashboard/LessonPlanning"; // NEW
import AssessmentGenerator from "@/pages/TeacherDashboard/AssessmentGenerator"; // NEW

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/class-management" element={<ClassManagement />} />
              <Route path="/admin/teacher-management" element={<TeacherManagement />} />
              <Route path="/admin/attendance" element={<AttendanceOverview />} />
              <Route path="/admin/results-analysis" element={<AdminResultsAnalysis />} />
              <Route path="/admin/report-cards" element={<ReportCards />} />
            </Route>

            <Route element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/result-entry" element={<TeacherResultEntry />} />
              <Route path="/teacher/attendance" element={<AttendanceRollCall />} />
              <Route path="/teacher/lesson-plans" element={<LessonPlanning />} /> {/* NEW */}
              <Route path="/teacher/assessments" element={<AssessmentGenerator />} /> {/* NEW */}
              <Route path="/teacher/results-analysis" element={<TeacherResultsAnalysis />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);