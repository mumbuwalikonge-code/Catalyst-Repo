// client/pages/AdminDashboard/AdminDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { Loader2 } from "lucide-react";

// Sub-pages
import ClassManagement from "./ClassManagement";
import TeacherManagement from "./TeacherManagement";
import ReportCards from "./ReportCards";

// Make sure this is a function declaration, not an arrow function
function AdminDashboard() {
  const [activeView, setActiveView] = useState<
    "overview" | "classes" | "teachers" | "reports"
  >("overview");
  const { stats, loading, error } = useAdminStats();

  // === Render Sub-Views ===
  if (activeView === "classes") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="text-primary font-medium hover:underline"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
        </div>
        <ClassManagement />
      </div>
    );
  }

  if (activeView === "teachers") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="text-primary font-medium hover:underline"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
        </div>
        <TeacherManagement />
      </div>
    );
  }

  if (activeView === "reports") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("overview")}
            className="text-primary font-medium hover:underline"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
        </div>
        <ReportCards />
      </div>
    );
  }

  // Handle loading and error
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">{error || "Failed to load data"}</p>
      </div>
    );
  }

  // Destructure stats with proper types
  const { 
    totalLearners, 
    totalClasses, 
    totalTeachers, 
    classes, 
    reportsReadyPercent,
    totalReportsReady 
  } = stats;

  // Calculate pending classes based on incomplete report cards
  const pendingClasses = classes.filter(cls => cls.reportsReadyCount < cls.totalLearners);
  const pendingClassNames = pendingClasses.slice(0, 2).map(cls => cls.name).join(", ");
  const morePending = pendingClasses.length > 2 ? ` +${pendingClasses.length - 2} more` : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, Admin!</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening in Kalabo Secondary School today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Learners", 
            value: totalLearners.toLocaleString(), 
            subValue: null,
            icon: Users 
          },
          { 
            label: "Classes", 
            value: totalClasses.toString(), 
            subValue: null,
            icon: BookOpen 
          },
          { 
            label: "Teachers", 
            value: totalTeachers.toString(), 
            subValue: null,
            icon: Users 
          },
          { 
            label: "Report Cards Ready", 
            value: `${reportsReadyPercent}%`, 
            subValue: `${totalReportsReady} of ${totalLearners}`,
            icon: CheckCircle2 
          },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {stat.subValue && (
                    <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class Progress + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Progress */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Class Progress</h2>
          {classes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No classes created yet.</p>
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => {
                // Calculate completion percentages
                const marksCompletionPercent = cls.totalLearners > 0 
                  ? Math.round((cls.submittedCount / cls.totalLearners) * 100)
                  : 0;
                
                const reportsCompletionPercent = cls.reportsReadyPercent;

                return (
                  <div key={cls.id} className="pb-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{cls.name}</p>
                        <p className="text-xs text-muted-foreground">{cls.teacherNames}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {cls.submittedCount}/{cls.totalLearners} marks
                        </p>
                        <p className="text-xs text-gray-500">
                          {cls.reportsReadyCount}/{cls.totalLearners} reports
                        </p>
                      </div>
                    </div>
                    
                    {/* Marks Progress Bar */}
                    <div className="mb2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Marks submitted</span>
                        <span>{marksCompletionPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all"
                          style={{ width: `${marksCompletionPercent}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Reports Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Reports ready</span>
                        <span>{reportsCompletionPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                          style={{ width: `${reportsCompletionPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-border space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          <button
            onClick={() => setActiveView("classes")}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg py-2 px-4 font-semibold hover:opacity-90 transition-opacity"
          >
            Add New Class
          </button>
          <button
            onClick={() => setActiveView("teachers")}
            className="w-full border-2 border-primary text-primary rounded-lg py-2 px-4 font-semibold hover:bg-primary/5 transition-colors"
          >
            Assign Teachers
          </button>
          <button
            onClick={() => setActiveView("reports")}
            className="w-full border-2 border-primary text-primary rounded-lg py-2 px-4 font-semibold hover:bg-primary/5 transition-colors"
          >
            View All Reports
          </button>

          {/* Pending Alert - Now shows classes with incomplete reports */}
          {pendingClasses.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-800 mb-1">
                      {pendingClasses.length} Class{pendingClasses.length !== 1 ? "es" : ""} Pending Reports
                    </p>
                    <p className="text-xs text-orange-700">
                      {pendingClassNames}
                      {morePending}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Complete all assessments (week4, week8, end_of_term) to generate reports
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Marks Submitted</p>
                <p className="text-lg font-bold text-gray-900">
                  {classes.reduce((sum, cls) => sum + cls.submittedCount, 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Reports Generated</p>
                <p className="text-lg font-bold text-emerald-600">
                  {totalReportsReady}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CRITICAL: Make sure this export default is at the end
export default AdminDashboard;