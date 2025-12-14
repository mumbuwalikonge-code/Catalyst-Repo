// src/layouts/DashboardLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext"; // ADD THIS IMPORT

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentUser } = useAuth(); // ADD THIS

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? "ml-0" : "ml-0"}`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-border h-16 flex items-center px-6 shadow-sm sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-600 hover:text-slate-900 mr-4 lg:hidden"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">
                {currentUser?.name || currentUser?.email || "User"}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {currentUser?.role || "User"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold hover:bg-primary/20 transition-colors">
              <span>
                {currentUser?.name?.charAt(0) || 
                 currentUser?.email?.charAt(0) || 
                 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}