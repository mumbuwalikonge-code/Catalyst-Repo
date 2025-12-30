import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Download,
  Search,
  Filter,
  BarChart3,
  Eye,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  X,
  FileText,
} from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useClassManagement } from "@/hooks/useClasses";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { toast } from "sonner";

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

// Session Detail Modal
const SessionDetailModal = ({ 
  session, 
  onClose 
}: { 
  session: any; 
  onClose: () => void 
}) => {
  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{session.title}</h3>
            <p className="text-sm text-gray-600">
              {new Date(session.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Class</label>
              <p className="font-medium">{session.className}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Teacher</label>
              <p className="font-medium">{session.teacherName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Submitted At</label>
              <p className="font-medium">
                {session.submittedAt ? new Date(session.submittedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Attendance Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{session.stats?.attendanceRate?.toFixed(1) || 0}%</div>
                <div className="text-sm text-gray-500">Rate</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Present:</span>
                  <span className="font-medium">{session.stats?.present || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Absent:</span>
                  <span className="font-medium">{session.stats?.absent || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Late:</span>
                  <span className="font-medium">{session.stats?.late || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-600">Excused:</span>
                  <span className="font-medium">{session.stats?.excused || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Attendance Records</h4>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Learner</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Gender</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Note/Reason</th>
                </tr>
              </thead>
              <tbody>
                {session.records?.map((record: any, index: number) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="py-3 px-4">{record.learnerName}</td>
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
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="py-3 px-4">
                      {record.excusedReason || record.note || "—"}
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
  const { getAttendanceOverview, loading: attendanceLoading } = useAttendance();
  const { classes } = useClassManagement();
  const { teachers } = useTeacherManagement();

  // State
  const [sessions, setSessions] = useState<any[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [filters, setFilters] = useState({
    classId: "",
    teacherId: "",
    search: "",
  });
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Load attendance data
  useEffect(() => {
    loadAttendanceData();
  }, [dateRange]);

  const loadAttendanceData = async () => {
    try {
      const data = await getAttendanceOverview(dateRange.start, dateRange.end);
      setSessions(data);
      setFilteredSessions(data);
    } catch (error) {
      toast.error("Failed to load attendance data");
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = sessions;

    if (filters.classId) {
      filtered = filtered.filter(s => s.classId === filters.classId);
    }

    if (filters.teacherId) {
      filtered = filtered.filter(s => s.teacherId === filters.teacherId);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.className.toLowerCase().includes(searchLower) ||
        s.teacherName.toLowerCase().includes(searchLower) ||
        s.title.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSessions(filtered);
  }, [filters, sessions]);

  // Calculate overall statistics
  const overallStats = filteredSessions.reduce(
    (acc, session) => {
      if (session.stats) {
        acc.totalSessions++;
        acc.totalPresent += session.stats.present || 0;
        acc.totalAbsent += session.stats.absent || 0;
        acc.totalLate += session.stats.late || 0;
        acc.totalExcused += session.stats.excused || 0;
        acc.totalLearners += session.stats.total || 0;
      }
      return acc;
    },
    { 
      totalSessions: 0, 
      totalPresent: 0, 
      totalAbsent: 0, 
      totalLate: 0, 
      totalExcused: 0, 
      totalLearners: 0 
    }
  );

  const overallAttendanceRate = overallStats.totalLearners > 0
    ? ((overallStats.totalPresent) / overallStats.totalLearners) * 100
    : 0;

  const handleExportCSV = () => {
    const headers = ["Date", "Class", "Teacher", "Present", "Absent", "Late", "Excused", "Rate"];
    const csvContent = [
      headers.join(","),
      ...filteredSessions.map(s => [
        new Date(s.date).toLocaleDateString(),
        `"${s.className}"`,
        `"${s.teacherName}"`,
        s.stats?.present || 0,
        s.stats?.absent || 0,
        s.stats?.late || 0,
        s.stats?.excused || 0,
        `${(s.stats?.attendanceRate || 0).toFixed(1)}%`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${dateRange.start}_to_${dateRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success("Report exported successfully");
  };

  if (attendanceLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Attendance Overview</h2>
        <p className="text-muted-foreground mt-1">
          View and monitor attendance submissions from all teachers
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Overall Attendance Summary
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Period: {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Sessions: <strong>{overallStats.totalSessions}</strong></span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-border min-w-[200px]">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {overallAttendanceRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Overall Rate</div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>✅ {overallStats.totalPresent}</span>
                <span>❌ {overallStats.totalAbsent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg"
                />
                <span className="self-center">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Teacher
              </label>
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
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <button
              onClick={() => setFilters({ classId: "", teacherId: "", search: "" })}
              className="border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Date & Time</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Class</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Teacher</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Session</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Attendance</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Rate</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No attendance sessions found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.submittedAt && new Date(session.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium">{session.className}</td>
                    <td className="py-4 px-6">
                      <div className="font-medium">{session.teacherName}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">{session.title}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✅ {session.stats?.present || 0}</span>
                        <span className="text-red-600">❌ {session.stats?.absent || 0}</span>
                        {session.stats?.late > 0 && (
                          <span className="text-amber-600">⏰ {session.stats.late}</span>
                        )}
                        {session.stats?.excused > 0 && (
                          <span className="text-purple-600">📝 {session.stats.excused}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, session.stats?.attendanceRate || 0)}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{(session.stats?.attendanceRate || 0).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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