// src/components/Sidebar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  Award,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext"; // ADD THIS IMPORT

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth(); // ADD THIS
  
  // Determine role from actual user data, NOT from URL (SECURITY FIX)
  const isAdmin = currentUser?.role === 'admin';
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminMenuItems = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: BarChart3,
    },
    {
      label: "Class Management",
      href: "/admin/class-management",
      icon: School,
    },
    {
      label: "Teacher Management",
      href: "/admin/teacher-management",
      icon: Users,
    },
    {
      label: "Results Analysis",
      href: "/admin/results-analysis",
      icon: BarChart3,
    },
    {
      label: "Report Cards",
      href: "/admin/report-cards",
      icon: FileText,
    },
  ];

  const teacherMenuItems = [
    {
      label: "Dashboard",
      href: "/teacher/dashboard",
      icon: BarChart3,
    },
    {
      label: "Result Entry",
      href: "/teacher/result-entry",
      icon: BookOpen,
    },
    {
      label: "Results Analysis",
      href: "/teacher/results-analysis",
      icon: Award,
    },
  ];

  const menuItems = isAdmin ? adminMenuItems : teacherMenuItems;

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    try {
      await logout(); // Use the actual logout function from AuthContext
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90"
      >
        {mobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 ${
          mobileOpen ? "w-64" : "w-0 lg:w-64"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & User Info */}
          <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-heading font-bold">
                {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-sidebar-foreground text-lg truncate">
                KalaboBoarding
              </h1>
              <p className="text-xs text-sidebar-foreground/60">
                {isAdmin ? "Admin Portal" : "Teacher Portal"}
                {currentUser?.name && (
                  <>
                    <br />
                    <span className="font-medium truncate block">
                      {currentUser.name}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            <Link
              to="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent font-medium transition-all"
              onClick={(e) => {
                e.preventDefault();
                alert("Settings feature coming soon!");
              }}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent font-medium transition-all"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}