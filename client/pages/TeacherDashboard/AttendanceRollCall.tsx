// pages/TeacherDashboard/AttendanceRollCall.tsx - CLEANED & OPTIMIZED VERSION
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check,
  X,
  Clock,
  FileText,
  Users,
  Search,
  Calendar,
  Save,
  Send,
  Loader2,
  UserCheck,
  UserX,
  AlertCircle,
  Circle,
  RefreshCw,
} from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

// Status Button Component
const StatusButton = ({ 
  status, 
  isSelected,
  onClick,
  count
}: { 
  status: "present" | "absent" | "late" | "excused" | "pending";
  isSelected: boolean;
  onClick: () => void;
  count?: number;
}) => {
  const config = {
    present: { 
      color: "bg-green-100 text-green-800 hover:bg-green-200",
      activeColor: "bg-green-500 text-white",
      icon: <Check className="w-4 h-4" />,
      label: "Present"
    },
    absent: { 
      color: "bg-red-100 text-red-800 hover:bg-red-200",
      activeColor: "bg-red-500 text-white",
      icon: <X className="w-4 h-4" />,
      label: "Absent"
    },
    late: { 
      color: "bg-amber-100 text-amber-800 hover:bg-amber-200",
      activeColor: "bg-amber-500 text-white",
      icon: <Clock className="w-4 h-4" />,
      label: "Late"
    },
    excused: { 
      color: "bg-purple-100 text-purple-800 hover:bg-purple-200",
      activeColor: "bg-purple-500 text-white",
      icon: <FileText className="w-4 h-4" />,
      label: "Excused"
    },
    pending: { 
      color: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      activeColor: "bg-gray-500 text-white",
      icon: <Circle className="w-4 h-4" />,
      label: "Pending"
    },
  };

  const { color, activeColor, icon, label } = config[status];

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
        isSelected ? activeColor : color
      } ${isSelected ? 'scale-105 shadow-md' : 'hover:scale-[1.02]'}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{label}</span>
        {count !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            isSelected ? 'bg-white/30' : 'bg-black/10'
          }`}>
            {count}
          </span>
        )}
      </div>
    </button>
  );
};

// Quick Actions Bar
const QuickActionsBar = ({ 
  onMarkAll, 
  onSaveDraft, 
  onSearch, 
  searchQuery, 
  isSaving,
  onSyncOffline,
  isSyncing,
  isOnline
}: {
  onMarkAll: (status: "present" | "absent") => void;
  onSaveDraft: () => void;
  onSearch: (value: string) => void;
  searchQuery: string;
  isSaving: boolean;
  onSyncOffline: () => void;
  isSyncing: boolean;
  isOnline: boolean;
}) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-border">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Search Bar */}
        <div className="w-full md:w-auto md:flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search learners by name..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => onMarkAll("present")}
            className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg font-medium hover:bg-green-200 text-sm"
          >
            <UserCheck className="w-4 h-4" />
            All Present
          </button>
          <button
            onClick={() => onMarkAll("absent")}
            className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg font-medium hover:bg-red-200 text-sm"
          >
            <UserX className="w-4 h-4" />
            All Absent
          </button>
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </button>
          {!isOnline && (
            <button
              onClick={onSyncOffline}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg font-medium hover:bg-blue-200 disabled:opacity-50 text-sm"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Learner Row Component
const LearnerRow = ({ 
  learner, 
  index, 
  record, 
  onStatusChange,
  onNoteChange,
  onExcusedReasonChange
}: { 
  learner: any;
  index: number;
  record: any;
  onStatusChange: (learnerId: string, status: "present" | "absent" | "late" | "excused") => void;
  onNoteChange: (learnerId: string, note: string) => void;
  onExcusedReasonChange: (learnerId: string, reason: string) => void;
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(record.note || "");
  const [excusedReason, setExcusedReason] = useState(record.excusedReason || "");
  const [showExcusedInput, setShowExcusedInput] = useState(false);

  const handleNoteSave = () => {
    onNoteChange(learner.id, note);
    setShowNoteInput(false);
  };

  const handleExcusedReasonSave = () => {
    if (excusedReason.trim()) {
      onExcusedReasonChange(learner.id, excusedReason.trim());
      setShowExcusedInput(false);
    }
  };

  // Get status display
  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status) {
      case "present": return "bg-green-100 text-green-800";
      case "absent": return "bg-red-100 text-red-800";
      case "late": return "bg-amber-100 text-amber-800";
      case "excused": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string | null) => {
    if (!status) return <Circle className="w-4 h-4" />;
    switch (status) {
      case "present": return <Check className="w-4 h-4" />;
      case "absent": return <X className="w-4 h-4" />;
      case "late": return <Clock className="w-4 h-4" />;
      case "excused": return <FileText className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border p-4 hover:border-primary/30 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Learner Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-gray-500 font-medium">#{index + 1}</div>
            <div>
              <h4 className="font-semibold text-gray-900">{learner.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  learner.sex === "M" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-pink-100 text-pink-800"
                }`}>
                  {learner.sex === "M" ? "Male" : "Female"}
                </span>
                {learner.parentPhone && (
                  <span className="text-xs text-gray-500">
                    📱 {learner.parentPhone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
          <button
            onClick={() => onStatusChange(learner.id, "present")}
            className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-all ${
              record.status === "present" 
                ? "bg-green-500 text-white shadow-sm" 
                : record.status === null
                ? "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Present</span>
          </button>
          
          <button
            onClick={() => onStatusChange(learner.id, "absent")}
            className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-all ${
              record.status === "absent" 
                ? "bg-red-500 text-white shadow-sm" 
                : record.status === null
                ? "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800"
                : "bg-red-100 text-red-800 hover:bg-red-200"
            }`}
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Absent</span>
          </button>
          
          <button
            onClick={() => onStatusChange(learner.id, "late")}
            className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-all ${
              record.status === "late" 
                ? "bg-amber-500 text-white shadow-sm" 
                : record.status === null
                ? "bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-800"
                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Late</span>
          </button>
          
          <button
            onClick={() => {
              onStatusChange(learner.id, "excused");
              setShowExcusedInput(true);
            }}
            className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-all ${
              record.status === "excused" 
                ? "bg-purple-500 text-white shadow-sm" 
                : record.status === null
                ? "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-800"
                : "bg-purple-100 text-purple-800 hover:bg-purple-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Excused</span>
          </button>
        </div>

        {/* Note/Reason Section */}
        <div className="sm:w-48">
          {record.status === "excused" ? (
            <div>
              {showExcusedInput ? (
                <div className="space-y-2">
                  <textarea
                    value={excusedReason}
                    onChange={(e) => setExcusedReason(e.target.value)}
                    placeholder="Enter excused reason..."
                    className="w-full p-2 text-sm border border-purple-200 rounded focus:ring-1 focus:ring-purple-300 focus:border-purple-400 outline-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleExcusedReasonSave}
                      className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowExcusedInput(false);
                        setExcusedReason(record.excusedReason || "");
                      }}
                      className="px-2 py-1 border border-border text-xs rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setShowExcusedInput(true)}
                  className="text-sm text-purple-700 bg-purple-50 p-2 rounded border border-purple-100 cursor-pointer hover:bg-purple-100"
                >
                  <div className="font-medium mb-1">Reason:</div>
                  <div>{record.excusedReason || "Click to add reason"}</div>
                </div>
              )}
            </div>
          ) : record.status === "late" && record.note ? (
            <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
              {record.note}
            </div>
          ) : showNoteInput ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note..."
                className="w-full p-2 text-sm border border-border rounded focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNoteSave}
                  className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowNoteInput(false);
                    setNote(record.note || "");
                  }}
                  className="px-2 py-1 border border-border text-xs rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : record.note ? (
            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
              {record.note}
            </div>
          ) : (
            <button
              onClick={() => setShowNoteInput(true)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              Add note
            </button>
          )}
        </div>
      </div>
      
      {/* Current Status Badge */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
          {getStatusIcon(record.status)}
          <span>Status: {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : "Not Marked"}</span>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AttendanceRollCall() {
  // Hooks
  const { getTeachersForClass } = useTeacherManagement();
  const { classes, getClassLearners } = useClassManagement();
  const { 
    saveDraftAttendance, 
    submitAttendance, 
    getDraftAttendance,
    loading: attendanceLoading,
    isOnline,
    syncOfflineSessions
  } = useAttendance();
  const { currentUser } = useAuth();

  // State
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [learners, setLearners] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      handleSyncOffline();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Get teacher's assigned classes
  const teacherClasses = useMemo(() => {
    if (!currentUser) return [];
    
    return classes.filter(cls => {
      const classTeachers = getTeachersForClass(cls.id);
      return classTeachers.some(t => t.teacherId === currentUser.uid);
    });
  }, [classes, currentUser, getTeachersForClass]);

  // Load learners when class is selected
  useEffect(() => {
    if (!selectedClassId) return;

    const loadLearners = async () => {
      try {
        const classLearners = await getClassLearners(selectedClassId);
        setLearners(classLearners);
        
        // Initialize all as NULL - NO DEFAULT STATUS
        const initialRecords: Record<string, any> = {};
        classLearners.forEach((learner: any) => {
          initialRecords[learner.id] = {
            status: null,
            note: "",
            excusedReason: "",
          };
        });
        setAttendanceRecords(initialRecords);

        // Generate session title
        const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
        if (selectedClass) {
          const classTeachers = getTeachersForClass(selectedClassId);
          const teacherAssignment = classTeachers.find(t => t.teacherId === currentUser?.uid);
          const subject = teacherAssignment?.subjects?.[0] || "Class";
          setSessionTitle(`${selectedClass.name} - ${subject} - ${format(new Date(), "MMM d, yyyy")}`);
        }

        // Check for existing draft for today
        const today = new Date().toISOString().split('T')[0];
        const draft = await getDraftAttendance(selectedClassId, today);
        
        if (draft) {
          // Convert records array to object format
          const recordsObj: Record<string, any> = {};
          draft.records.forEach((record: any) => {
            recordsObj[record.learnerId] = {
              status: record.status || null,
              note: record.note || "",
              excusedReason: record.excusedReason || "",
            };
          });
          
          // Merge with initial records
          const mergedRecords = { ...initialRecords, ...recordsObj };
          setAttendanceRecords(mergedRecords);
          setSessionTitle(draft.title || "");
          toast.success("Loaded existing draft for today");
        }
      } catch (error) {
        console.error("Failed to load learners:", error);
        toast.error("Failed to load learners");
      }
    };

    loadLearners();
  }, [selectedClassId, teacherClasses, getClassLearners, getTeachersForClass, getDraftAttendance, currentUser]);

  // Filter learners based on search
  const filteredLearners = useMemo(() => {
    return learners.filter(learner => 
      learner.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [learners, searchQuery]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = learners.length;
    const present = Object.values(attendanceRecords).filter(r => r.status === "present").length;
    const absent = Object.values(attendanceRecords).filter(r => r.status === "absent").length;
    const late = Object.values(attendanceRecords).filter(r => r.status === "late").length;
    const excused = Object.values(attendanceRecords).filter(r => r.status === "excused").length;
    const pending = Object.values(attendanceRecords).filter(r => r.status === null).length;
    
    const boys = learners.filter(l => l.sex === "M").length;
    const girls = learners.filter(l => l.sex === "F").length;
    const boysPresent = learners.filter(l => 
      l.sex === "M" && attendanceRecords[l.id]?.status === "present"
    ).length;
    const girlsPresent = learners.filter(l => 
      l.sex === "F" && attendanceRecords[l.id]?.status === "present"
    ).length;

    // Calculate attendance rate excluding pending
    const markedTotal = total - pending;
    const attendanceRate = markedTotal > 0 ? ((present + late + excused) / markedTotal) * 100 : 0;

    return {
      total,
      present,
      absent,
      late,
      excused,
      pending,
      attendanceRate,
      boys: { total: boys, present: boysPresent },
      girls: { total: girls, present: girlsPresent },
      marked: markedTotal,
    };
  }, [learners, attendanceRecords]);

  // Handlers
  const handleStatusChange = useCallback((learnerId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendanceRecords(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        status,
        note: status === "late" ? "" : prev[learnerId]?.note,
        excusedReason: status !== "excused" ? "" : prev[learnerId]?.excusedReason,
      }
    }));
  }, []);

  const handleNoteChange = useCallback((learnerId: string, note: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        note,
      }
    }));
  }, []);

  const handleExcusedReasonChange = useCallback((learnerId: string, reason: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        excusedReason: reason,
      }
    }));
    toast.success("Reason saved");
  }, []);

  const handleMarkAll = useCallback((status: "present" | "absent") => {
    const newRecords = { ...attendanceRecords };
    learners.forEach(learner => {
      newRecords[learner.id] = {
        ...newRecords[learner.id],
        status,
        excusedReason: status === "absent" ? "" : newRecords[learner.id]?.excusedReason,
      };
    });
    setAttendanceRecords(newRecords);
    toast.success(`Marked all learners as ${status}`);
  }, [attendanceRecords, learners]);

  // Save draft attendance
  const handleSaveDraft = useCallback(async () => {
    if (!selectedClassId || !sessionTitle.trim()) {
      toast.error("Please select a class and add a session title");
      return;
    }

    if (!currentUser) {
      toast.error("You must be logged in to save attendance");
      return;
    }

    setIsSaving(true);
    try {
      const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
      const today = new Date().toISOString().split('T')[0];
      
      const sessionData = {
        title: sessionTitle,
        date: today,
        classId: selectedClassId,
        className: selectedClass?.name || "",
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || currentUser.email || "Teacher",
        status: "draft" as const,
        records: Object.entries(attendanceRecords).map(([learnerId, record]) => {
          const learner = learners.find(l => l.id === learnerId);
          return {
            learnerId,
            learnerName: learner?.name || "",
            gender: learner?.sex === "M" ? "M" as const : "F" as const,
            status: record.status,
            excusedReason: record.excusedReason || "",
            note: record.note || "",
            markedAt: new Date(),
          };
        }),
        stats: statistics,
      };

      await saveDraftAttendance(sessionData);
      toast.success("Draft saved successfully!");
    } catch (error: any) {
      toast.error(`Failed to save draft: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [selectedClassId, sessionTitle, currentUser, teacherClasses, attendanceRecords, learners, statistics, saveDraftAttendance]);

  // Submit attendance - CRITICAL FUNCTION
  const handleSubmit = useCallback(async () => {
    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    if (!currentUser) {
      toast.error("You must be logged in to submit attendance");
      return;
    }

    // Validate ALL learners have status (not null)
    const missingStatus = Object.entries(attendanceRecords)
      .filter(([_, record]) => record.status === null)
      .map(([learnerId]) => learners.find(l => l.id === learnerId)?.name)
      .filter(Boolean);

    if (missingStatus.length > 0) {
      toast.error(
        <div className="text-left">
          Please mark attendance for all learners:
          <ul className="mt-1 list-disc list-inside">
            {missingStatus.slice(0, 3).map((name, idx) => (
              <li key={idx}>{name}</li>
            ))}
            {missingStatus.length > 3 && (
              <li>...and {missingStatus.length - 3} more</li>
            )}
          </ul>
        </div>
      );
      return;
    }

    // Validate excused reasons
    const missingReasons = Object.entries(attendanceRecords)
      .filter(([_, record]) => record.status === "excused" && !record.excusedReason?.trim())
      .map(([learnerId]) => learners.find(l => l.id === learnerId)?.name)
      .filter(Boolean);

    if (missingReasons.length > 0) {
      toast.error(
        <div className="text-left">
          Please provide reasons for excused absences:
          <ul className="mt-1 list-disc list-inside">
            {missingReasons.slice(0, 3).map((name, idx) => (
              <li key={idx}>{name}</li>
            ))}
            {missingReasons.length > 3 && (
              <li>...and {missingReasons.length - 3} more</li>
            )}
          </ul>
        </div>
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
      const today = new Date().toISOString().split('T')[0];
      
      const sessionData = {
        title: sessionTitle,
        date: today,
        classId: selectedClassId,
        className: selectedClass?.name || "",
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || currentUser.email || "Teacher",
        status: "submitted" as const,
        records: Object.entries(attendanceRecords).map(([learnerId, record]) => {
          const learner = learners.find(l => l.id === learnerId);
          return {
            learnerId,
            learnerName: learner?.name || "",
            gender: learner?.sex === "M" ? "M" as const : "F" as const,
            status: record.status,
            excusedReason: record.excusedReason || "",
            note: record.note || "",
            markedAt: new Date(),
          };
        }),
        stats: statistics,
      };

      await submitAttendance(sessionData);
      
      toast.success(
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5" />
          <div>
            <span className="font-medium">Attendance submitted successfully!</span>
            <div className="text-sm text-gray-600 mt-1">
              {isOnline ? "It will appear in the admin overview." : "Saved offline - will sync when online."}
            </div>
          </div>
        </div>
      );
      
      // Reset form
      setSelectedClassId("");
      setSessionTitle("");
      setAttendanceRecords({});
      setSearchQuery("");
      
    } catch (error: any) {
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <div>
            <span className="font-medium">Failed to submit attendance</span>
            <div className="text-sm text-gray-600 mt-1">
              {error.message || "Unknown error occurred"}
              {!isOnline && " (You're offline - data saved locally)"}
            </div>
          </div>
        </div>
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedClassId, currentUser, attendanceRecords, learners, teacherClasses, sessionTitle, statistics, submitAttendance, isOnline]);

  const handleSyncOffline = useCallback(async () => {
    setSyncingOffline(true);
    try {
      await syncOfflineSessions();
      toast.success("Offline sessions synced successfully!");
    } catch (error) {
      toast.error("Failed to sync offline sessions");
    } finally {
      setSyncingOffline(false);
    }
  }, [syncOfflineSessions]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (Object.keys(attendanceRecords).length === 0) return;

    const autoSaveInterval = setInterval(() => {
      if (!isSaving && !isSubmitting && selectedClassId && sessionTitle) {
        handleSaveDraft();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [attendanceRecords, isSaving, isSubmitting, selectedClassId, sessionTitle, handleSaveDraft]);

  if (attendanceLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Roll Call</h2>
          {!isOnline && (
            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
              Offline
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Mark attendance for your assigned classes. All learners start unmarked.
          {!isOnline && (
            <span className="text-amber-600 font-medium ml-2">
              Working offline - will sync when connection returns
            </span>
          )}
        </p>
      </div>

      {/* Class Selection Card */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">Choose a class</option>
              {teacherClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Title
            </label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g., Class 10A - Biology - Roll Call"
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
        </div>
      </div>

      {selectedClassId && learners.length > 0 && (
        <>
          {/* Statistics Card */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 md:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.present}</div>
                    <div className="text-sm text-gray-600">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{statistics.absent}</div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{statistics.late}</div>
                    <div className="text-sm text-gray-600">Late</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.excused}</div>
                    <div className="text-sm text-gray-600">Excused</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{statistics.pending}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {statistics.marked}/{statistics.total} learners marked • {statistics.attendanceRate.toFixed(1)}% attendance rate
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-border min-w-[180px]">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {statistics.attendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Attendance Rate</div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>👦 {statistics.boys.present}/{statistics.boys.total}</span>
                    <span>👧 {statistics.girls.present}/{statistics.girls.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActionsBar
            onMarkAll={handleMarkAll}
            onSaveDraft={handleSaveDraft}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            isSaving={isSaving}
            onSyncOffline={handleSyncOffline}
            isSyncing={syncingOffline}
            isOnline={isOnline}
          />

          {/* Status Overview Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <StatusButton
              status="pending"
              isSelected={false}
              onClick={() => {}}
              count={statistics.pending}
            />
            <StatusButton
              status="present"
              isSelected={false}
              onClick={() => handleMarkAll("present")}
              count={statistics.present}
            />
            <StatusButton
              status="absent"
              isSelected={false}
              onClick={() => handleMarkAll("absent")}
              count={statistics.absent}
            />
            <StatusButton
              status="late"
              isSelected={false}
              onClick={() => {}}
              count={statistics.late}
            />
            <StatusButton
              status="excused"
              isSelected={false}
              onClick={() => {}}
              count={statistics.excused}
            />
          </div>

          {/* Learners List */}
          <div className="space-y-3">
            {filteredLearners.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? "No learners match your search" : "No learners found"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery ? "Try a different search term" : "Add learners to this class first"}
                </p>
              </div>
            ) : (
              filteredLearners.map((learner, index) => {
                const record = attendanceRecords[learner.id] || { status: null };
                
                return (
                  <LearnerRow
                    key={learner.id}
                    learner={learner}
                    index={index}
                    record={record}
                    onStatusChange={handleStatusChange}
                    onNoteChange={handleNoteChange}
                    onExcusedReasonChange={handleExcusedReasonChange}
                  />
                );
              })
            )}
          </div>

          {/* Submit Section */}
          <div className="sticky bottom-0 bg-white border-t border-border p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{statistics.marked}/{statistics.total}</span> learners marked
                {searchQuery && <span> • {filteredLearners.length} shown (filtered)</span>}
                {!isOnline && (
                  <span className="text-amber-600 font-medium ml-2">• Working offline</span>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-4 py-2.5 border border-border rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save as Draft"
                  )}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || statistics.pending > 0}
                  className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {statistics.pending > 0 ? `Submit (${statistics.pending} pending)` : "Submit Attendance"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedClassId && learners.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No learners in this class</h3>
          <p className="text-gray-600">Add learners to the class first in Class Management</p>
        </div>
      )}

      {!selectedClassId && teacherClasses.length > 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a class to begin</h3>
          <p className="text-gray-600">Choose one of your assigned classes to mark attendance</p>
        </div>
      )}

      {!selectedClassId && teacherClasses.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes assigned</h3>
          <p className="text-gray-600">You haven't been assigned to any classes yet. Contact your administrator.</p>
        </div>
      )}
    </div>
  );
}