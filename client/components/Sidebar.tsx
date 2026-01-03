// src/components/Sidebar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  School,
  Award,
  Calendar,
  ClipboardCheck,
  FileEdit,
  FileQuestion,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';

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
      label: "Attendance Overview",
      href: "/admin/attendance",
      icon: ClipboardCheck,
    },
    {
      label: "Results Analysis",
      href: "/admin/results-analysis",
      icon: BarChart3,
    },
    {
      label: "Assessment Generator",
      href: "/admin/assessments",
      icon: FileQuestion,
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
      label: "Schemes of Work",
      href: "/teacher/schemes",
      icon: FileText,
    },
    {
      label: "Attendance",
      href: "/teacher/attendance",
      icon: Calendar,
    },
    {
      label: "Lesson Planning",
      href: "/teacher/lesson-plans",
      icon: FileEdit,
    },
    {
      label: "Assessment Generator",
      href: "/teacher/assessments",
      icon: FileQuestion,
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
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <aside
        className={`fixed lg:static top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 ${
          isOpen ? "w-64" : "w-0 lg:w-64"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
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

          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => isOpen && onToggle()} // Close sidebar on mobile when clicking a link
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

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}