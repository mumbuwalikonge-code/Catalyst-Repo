// pages/AdminDashboard/AttendanceOverview.tsx - CLEANED & OPTIMIZED VERSION
import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Calendar,
  Download,
  Search,
  BarChart3,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  BookOpen,
  User,
  RefreshCw,
} from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useClassManagement } from "@/hooks/useClasses";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth, isValid } from "date-fns";

// Date range options
const DATE_RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

// Status Badge Component
const StatusBadge = ({ status }: { status: "present" | "absent" | "late" | "excused" }) => {
  const config = {
    present: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Present"
    },
    absent: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: <XCircle className="w-4 h-4" />,
      label: "Absent"
    },
    late: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      icon: <Clock className="w-4 h-4" />,
      label: "Late"
    },
    excused: { 
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      icon: <FileText className="w-4 h-4" />,
      label: "Excused"
    },
  };

  const { color, icon, label } = config[status];

  return (
    <div className={`inline-flex items-center gap-1.5 ${color} border rounded-full px-3 py-1 text-sm font-medium`}>
      {icon}
      {label}
    </div>
  );
};

// Session Status Badge
const SessionStatusBadge = ({ status }: { status: string }) => {
  const config = {
    submitted: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3" /> },
    draft: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
    locked: { color: "bg-blue-100 text-blue-800", icon: <FileText className="w-3 h-3" /> },
  };

  const { color, icon } = config[status as keyof typeof config] || config.submitted;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Session Detail Modal
const SessionDetailModal = ({ 
  session, 
  onClose 
}: { 
  session: any; 
  onClose: () => void 
}) => {
  if (!session) return null;

  const getStatusCounts = () => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    session.records.forEach((record: any) => {
      if (record.status && record.status !== "null") {
        counts[record.status] = (counts[record.status as keyof typeof counts] || 0) + 1;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{session.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {session.date ? format(new Date(session.date), "PPP") : "No date"}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {session.teacherName}
              </span>
              <SessionStatusBadge status={session.status} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Class</label>
              <div className="flex items-center gap-2 mt-1">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{session.className}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Teacher</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{session.teacherName}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Submitted At</label>
              <p className="font-medium">
                {session.submittedAt ? format(new Date(session.submittedAt), "PPpp") : "—"}
              </p>
            </div>
          </div>

          {/* Attendance Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{statusCounts.present}</div>
              <div className="text-sm text-green-600">Present</div>
              <div className="text-xs text-green-500 mt-1">
                {session.stats?.total > 0 ? Math.round((statusCounts.present / session.stats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-700">{statusCounts.absent}</div>
              <div className="text-sm text-red-600">Absent</div>
              <div className="text-xs text-red-500 mt-1">
                {session.stats?.total > 0 ? Math.round((statusCounts.absent / session.stats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-700">{statusCounts.late}</div>
              <div className="text-sm text-amber-600">Late</div>
              <div className="text-xs text-amber-500 mt-1">
                {session.stats?.total > 0 ? Math.round((statusCounts.late / session.stats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-700">{statusCounts.excused}</div>
              <div className="text-sm text-purple-600">Excused</div>
              <div className="text-xs text-purple-500 mt-1">
                {session.stats?.total > 0 ? Math.round((statusCounts.excused / session.stats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Attendance Records ({session.records?.length || 0} learners)</h4>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Learner</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Gender</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Note/Reason</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {session.records?.map((record: any, index: number) => (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{record.learnerName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.gender === "M" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-pink-100 text-pink-800"
                      }`}>
                        {record.gender === "M" ? "Male" : "Female"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {record.status && record.status !== "null" ? (
                        <StatusBadge status={record.status} />
                      ) : (
                        <span className="text-sm text-gray-500">Not marked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs">
                      {record.excusedReason || record.note || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {record.markedAt ? format(new Date(record.markedAt), "hh:mm a") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="border border-border px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AttendanceOverview() {
  // Hooks
  const { 
    getAttendanceOverview, 
    loading: attendanceLoading,
    isOnline
  } = useAttendance();
  const { classes } = useClassManagement();
  const { teachers } = useTeacherManagement();

  // State
  const [sessions, setSessions] = useState<any[]>([]);
  const [dateRangeType, setDateRangeType] = useState("this_week");
  const [customDateRange, setCustomDateRange] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [filters, setFilters] = useState({
    classId: "",
    teacherId: "",
    search: "",
  });
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate date range based on selection
  const getDateRange = useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);

    switch (dateRangeType) {
      case "today":
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
          label: "Today"
        };
      case "yesterday":
        return {
          start: format(yesterday, "yyyy-MM-dd"),
          end: format(yesterday, "yyyy-MM-dd"),
          label: "Yesterday"
        };
      case "this_week":
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          label: "This Week"
        };
      case "last_week":
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return {
          start: format(lastWeekStart, "yyyy-MM-dd"),
          end: format(endOfWeek(lastWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          label: "Last Week"
        };
      case "this_month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
          label: "This Month"
        };
      case "last_month":
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: format(firstDayOfLastMonth, "yyyy-MM-dd"),
          end: format(lastDayOfLastMonth, "yyyy-MM-dd"),
          label: "Last Month"
        };
      case "custom":
        return {
          start: customDateRange.start || format(subDays(today, 30), "yyyy-MM-dd"),
          end: customDateRange.end || format(today, "yyyy-MM-dd"),
          label: "Custom Range"
        };
      default:
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          label: "This Week"
        };
    }
  }, [dateRangeType, customDateRange]);

  // Load attendance data
  const loadAttendanceData = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAttendanceOverview(getDateRange.start, getDateRange.end);
      setSessions(data);
      
      if (data.length === 0) {
        toast.info("No attendance sessions found for selected period");
      }
    } catch (error) {
      console.error("Failed to load attendance data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data on mount and when date range changes
  useEffect(() => {
    loadAttendanceData();
  }, [getDateRange]);

  // Apply filters with enhanced matching
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    if (filters.classId) {
      filtered = filtered.filter(s => s.classId === filters.classId);
    }

    if (filters.teacherId) {
      filtered = filtered.filter(s => s.teacherId === filters.teacherId);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(s => {
        // Check all searchable fields
        const className = (s.className || "").toLowerCase();
        const teacherName = (s.teacherName || "").toLowerCase();
        const title = (s.title || "").toLowerCase();
        const date = s.date || "";
        
        return className.includes(searchLower) ||
               teacherName.includes(searchLower) ||
               title.includes(searchLower) ||
               date.includes(searchLower);
      });
    }

    return filtered;
  }, [filters, sessions]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    let totalSessions = filteredSessions.length;
    let totalLearners = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    filteredSessions.forEach(session => {
      if (session.stats) {
        totalLearners += session.stats.total || 0;
        totalPresent += session.stats.present || 0;
        totalAbsent += session.stats.absent || 0;
        totalLate += session.stats.late || 0;
        totalExcused += session.stats.excused || 0;
      }
    });

    const overallAttendanceRate = totalLearners > 0
      ? (totalPresent / totalLearners) * 100
      : 0;

    // Calculate trend (compare with previous period)
    const previousPeriodCount = sessions.length - filteredSessions.length;
    const sessionTrend = previousPeriodCount > 0
      ? ((totalSessions - previousPeriodCount) / previousPeriodCount) * 100
      : totalSessions > 0 ? 100 : 0;

    return {
      totalSessions,
      totalLearners,
      overallAttendanceRate,
      sessionTrend,
      averages: {
        present: totalSessions > 0 ? Math.round(totalPresent / totalSessions) : 0,
        absent: totalSessions > 0 ? Math.round(totalAbsent / totalSessions) : 0,
        late: totalSessions > 0 ? Math.round(totalLate / totalSessions) : 0,
        excused: totalSessions > 0 ? Math.round(totalExcused / totalSessions) : 0,
      },
    };
  }, [filteredSessions, sessions.length]);

  // Handle export to CSV
  const handleExportCSV = () => {
    if (filteredSessions.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Class", "Teacher", "Session Title", "Total Learners", "Present", "Absent", "Late", "Excused", "Attendance Rate"];
    
    const csvContent = [
      headers.join(","),
      ...filteredSessions.map(s => [
        s.date || "",
        `"${s.className || ""}"`,
        `"${s.teacherName || ""}"`,
        `"${s.title || ""}"`,
        s.stats?.total || 0,
        s.stats?.present || 0,
        s.stats?.absent || 0,
        s.stats?.late || 0,
        s.stats?.excused || 0,
        `${(s.stats?.attendanceRate || 0).toFixed(1)}%`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_overview_${getDateRange.start}_to_${getDateRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success(`Exported ${filteredSessions.length} sessions successfully`);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      classId: "",
      teacherId: "",
      search: "",
    });
    toast.success("Filters cleared");
  };

  if (attendanceLoading && sessions.length === 0 && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Attendance Overview</h2>
            {!isOnline && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                Offline
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            View and monitor attendance submissions from all teachers
            {!isOnline && (
              <span className="text-amber-600 font-medium ml-2">
                • Showing cached data
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAttendanceData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalSessions}</p>
            </div>
            <div className={`p-3 rounded-full ${overallStats.sessionTrend >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
              {overallStats.sessionTrend >= 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {overallStats.sessionTrend >= 0 ? "+" : ""}{overallStats.sessionTrend.toFixed(1)}% from previous period
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Learners Tracked</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalLearners}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.overallAttendanceRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${Math.min(overallStats.overallAttendanceRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average per Session</p>
              <p className="text-lg font-bold text-gray-900">
                {overallStats.averages.present} present, {overallStats.averages.absent} absent
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section - Responsive Layout */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value)}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {DATE_RANGES.map(range => (
                  <option key={range.id} value={range.id}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Date Range Inputs (shown when custom is selected) */}
            {dateRangeType === "custom" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </>
            )}

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={filters.classId}
                onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
              <select
                value={filters.teacherId}
                onChange={(e) => setFilters(prev => ({ ...prev, teacherId: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Teachers</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search sessions, classes, teachers..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredSessions.length === 0}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Selected Date Range Info */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>
            Showing data from {format(new Date(getDateRange.start), "MMM d, yyyy")} to {format(new Date(getDateRange.end), "MMM d, yyyy")}
            {dateRangeType !== "custom" && ` (${getDateRange.label})`}
          </span>
          {filters.classId && (
            <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Class filtered
            </span>
          )}
          {filters.teacherId && (
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Teacher filtered
            </span>
          )}
          {filters.search && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Search: "{filters.search}"
            </span>
          )}
        </div>
      </div>

      {/* Sessions Table - Responsive */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Attendance Sessions
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredSessions.length} found{sessions.length !== filteredSessions.length && ` of ${sessions.length}`})
              </span>
            </h3>
            {filteredSessions.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  Last refresh: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {sessions.length !== filteredSessions.length && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Clear filters to show all {sessions.length} sessions
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {filters.search || filters.classId || filters.teacherId
                  ? "No matching sessions found"
                  : "No attendance sessions found"}
              </h3>
              <p className="text-gray-500 mb-4">
                {filters.search || filters.classId || filters.teacherId
                  ? "Try adjusting your filters or search term"
                  : "No attendance has been submitted for this period"}
              </p>
              {(filters.search || filters.classId || filters.teacherId) && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSessions.map((session) => {
                  const sessionDate = session.date ? new Date(session.date) : new Date(session.submittedAt || session.createdAt);
                  const submittedDate = session.submittedAt ? new Date(session.submittedAt) : new Date(session.createdAt);
                  
                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">
                          {isValid(sessionDate) ? format(sessionDate, "MMM d, yyyy") : "No date"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isValid(submittedDate) ? format(submittedDate, "h:mm a") : "—"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{session.className || "Unknown Class"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{session.teacherName || "Unknown Teacher"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={session.title}>
                          {session.title || "Untitled Session"}
                        </div>
                        <div className="mt-1">
                          <SessionStatusBadge status={session.status} />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                            {session.stats?.present || 0} Present
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                            {session.stats?.absent || 0} Absent
                          </span>
                          {(session.stats?.late || 0) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">
                              {session.stats.late} Late
                            </span>
                          )}
                          {(session.stats?.excused || 0) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                              {session.stats.excused} Excused
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${Math.min(100, session.stats?.attendanceRate || 0)}%` }}
                            ></div>
                          </div>
                          <span className="font-medium text-sm">{(session.stats?.attendanceRate || 0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}