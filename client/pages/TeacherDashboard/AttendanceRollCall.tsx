// pages/TeacherDashboard/AttendanceRollCall.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  ChevronDown,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAttendance, AttendanceSession } from "@/hooks/useAttendance";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Status Badge Component
const StatusBadge = ({ 
  status, 
  onClick,
  size = "md"
}: { 
  status: "present" | "absent" | "late" | "excused";
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) => {
  const config = {
    present: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: <Check className="w-4 h-4" />,
      label: "Present"
    },
    absent: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: <X className="w-4 h-4" />,
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
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 ${color} border rounded-lg font-medium ${sizeClasses[size]} hover:opacity-90 transition-opacity`}
    >
      {icon}
      <span>{label}</span>
      {onClick && <ChevronDown className="w-3 h-3" />}
    </button>
  );
};

// Status Selector Modal
const StatusSelectorModal = ({ 
  isOpen, 
  onClose, 
  onSelect,
  currentStatus,
  learnerName
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (status: "present" | "absent" | "late" | "excused") => void;
  currentStatus: string;
  learnerName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Mark attendance for <span className="text-primary">{learnerName}</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelect("present")}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
              currentStatus === "present" 
                ? "border-green-500 bg-green-50" 
                : "border-gray-200 hover:border-green-300"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <span className="font-medium">Present</span>
          </button>

          <button
            onClick={() => onSelect("absent")}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
              currentStatus === "absent" 
                ? "border-red-500 bg-red-50" 
                : "border-gray-200 hover:border-red-300"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <span className="font-medium">Absent</span>
          </button>

          <button
            onClick={() => onSelect("late")}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
              currentStatus === "late" 
                ? "border-amber-500 bg-amber-50" 
                : "border-gray-200 hover:border-amber-300"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="font-medium">Late</span>
          </button>

          <button
            onClick={() => onSelect("excused")}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${
              currentStatus === "excused" 
                ? "border-purple-500 bg-purple-50" 
                : "border-gray-200 hover:border-purple-300"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <span className="font-medium">Excused</span>
          </button>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-border py-2.5 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Excused Reason Modal
const ExcusedReasonModal = ({
  isOpen,
  onClose,
  onSave,
  learnerName
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
  learnerName: string;
}) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const commonReasons = [
    "Sick",
    "Family Emergency",
    "Doctor Appointment",
    "School Trip",
    "Sports Event",
    "Religious Holiday"
  ];

  const handleSave = () => {
    if (!reason.trim() && !customReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    onSave(useCustom ? customReason : reason);
    setReason("");
    setCustomReason("");
    setUseCustom(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">
          Reason for excused absence
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          For: <span className="font-medium">{learnerName}</span>
        </p>

        {!useCustom ? (
          <>
            <div className="space-y-2 mb-4">
              {commonReasons.map((commonReason) => (
                <label
                  key={commonReason}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={commonReason}
                    checked={reason === commonReason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-primary"
                  />
                  <span>{commonReason}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className="w-full py-2.5 border border-dashed border-border rounded-lg text-gray-600 hover:bg-gray-50 mb-4"
            >
              + Other reason
            </button>
          </>
        ) : (
          <div className="mb-4">
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter custom reason..."
              className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[120px]"
              rows={3}
            />
            <button
              type="button"
              onClick={() => setUseCustom(false)}
              className="text-sm text-primary mt-2 hover:underline"
            >
              ← Back to common reasons
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-border py-2.5 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={(!reason && !customReason) || (useCustom && !customReason.trim())}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Save Reason
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AttendanceRollCall() {
  // Hooks
  const { getTeachersForClass, teachers } = useTeacherManagement();
  const { classes, getClassLearners } = useClassManagement();
  const { 
    saveDraftAttendance, 
    submitAttendance, 
    getDraftAttendance,
    loading: attendanceLoading 
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
  
  // Modal states
  const [selectedLearner, setSelectedLearner] = useState<{id: string, name: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showExcusedModal, setShowExcusedModal] = useState(false);

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
        
        // Initialize all as present
        const initialRecords: Record<string, any> = {};
        classLearners.forEach((learner: any) => {
          initialRecords[learner.id] = {
            status: "present",
            note: "",
            excusedReason: "",
          };
        });
        setAttendanceRecords(initialRecords);

        // Generate session title
        const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
        if (selectedClass) {
          const classTeachers = getTeachersForClass(selectedClassId);
          const subject = classTeachers[0]?.subjects?.[0] || "Class";
          setSessionTitle(`${selectedClass.name} - ${subject} - Roll Call`);
        }

        // Check for existing draft
        const draft = await getDraftAttendance(selectedClassId, new Date().toISOString().split('T')[0]);
        if (draft) {
          // Convert records array to object format
          const recordsObj: Record<string, any> = {};
          draft.records.forEach((record: any) => {
            recordsObj[record.learnerId] = {
              status: record.status || "present",
              note: record.note || "",
              excusedReason: record.excusedReason || "",
            };
          });
          setAttendanceRecords(recordsObj);
          setSessionTitle(draft.title || "");
        }
      } catch (error) {
        console.error("Failed to load learners:", error);
        toast.error("Failed to load learners");
      }
    };

    loadLearners();
  }, [selectedClassId, teacherClasses, getClassLearners, getTeachersForClass, getDraftAttendance]);

  // Filter learners based on search
  const filteredLearners = useMemo(() => {
    return learners.filter(learner => 
      learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [learners, searchQuery]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = learners.length;
    const present = Object.values(attendanceRecords).filter(r => r.status === "present").length;
    const absent = Object.values(attendanceRecords).filter(r => r.status === "absent").length;
    const late = Object.values(attendanceRecords).filter(r => r.status === "late").length;
    const excused = Object.values(attendanceRecords).filter(r => r.status === "excused").length;
    
    const boys = learners.filter(l => l.sex === "M").length;
    const girls = learners.filter(l => l.sex === "F").length;
    const boysPresent = learners.filter(l => 
      l.sex === "M" && attendanceRecords[l.id]?.status === "present"
    ).length;
    const girlsPresent = learners.filter(l => 
      l.sex === "F" && attendanceRecords[l.id]?.status === "present"
    ).length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: total > 0 ? (present / total) * 100 : 0,
      boys: { total: boys, present: boysPresent },
      girls: { total: girls, present: girlsPresent },
    };
  }, [learners, attendanceRecords]);

  // Handlers
  const handleStatusChange = (learnerId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendanceRecords(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        status,
        note: status === "late" ? "" : prev[learnerId]?.note,
        excusedReason: status !== "excused" ? "" : prev[learnerId]?.excusedReason,
      }
    }));

    if (status === "excused") {
      setSelectedLearner({ id: learnerId, name: learners.find(l => l.id === learnerId)?.name || "" });
      setShowExcusedModal(true);
    }
    
    setShowStatusModal(false);
  };

  const handleExcusedReason = (learnerId: string, reason: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        excusedReason: reason,
      }
    }));
    setShowExcusedModal(false);
  };

  const handleMarkAll = (status: "present" | "absent") => {
    const newRecords = { ...attendanceRecords };
    learners.forEach(learner => {
      newRecords[learner.id] = {
        ...newRecords[learner.id],
        status,
        excusedReason: status === "absent" ? "" : newRecords[learner.id]?.excusedReason,
      };
    });
    setAttendanceRecords(newRecords);
  };

  const handleSaveDraft = async () => {
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
      
      const sessionData = {
        title: sessionTitle,
        date: new Date().toISOString().split('T')[0],
        classId: selectedClassId,
        className: selectedClass?.name || "",
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || "Teacher",
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
      toast.success("Draft saved successfully");
    } catch (error: any) {
      console.error("Save draft error:", error);
      toast.error(`Failed to save draft: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    if (!currentUser) {
      toast.error("You must be logged in to submit attendance");
      return;
    }

    // Validate excused reasons
    const missingReasons = Object.entries(attendanceRecords)
      .filter(([_, record]) => record.status === "excused" && !record.excusedReason?.trim())
      .map(([learnerId]) => learners.find(l => l.id === learnerId)?.name)
      .filter(Boolean);

    if (missingReasons.length > 0) {
      toast.error(`Please provide reasons for excused absences: ${missingReasons.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
      
      const sessionData = {
        title: sessionTitle,
        date: new Date().toISOString().split('T')[0],
        classId: selectedClassId,
        className: selectedClass?.name || "",
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || "Teacher",
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
      toast.success("Attendance submitted successfully!");
      
      // Reset form
      setSelectedClassId("");
      setSessionTitle("");
      setAttendanceRecords({});
      setSearchQuery("");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(`Failed to submit attendance: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Attendance Roll Call</h2>
        <p className="text-muted-foreground mt-1">
          Mark attendance for your assigned classes
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-border">
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

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>

      {selectedClassId && learners.length > 0 && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Attendance Summary
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Total: <strong>{statistics.total}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">Present: <strong>{statistics.present}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm">Absent: <strong>{statistics.absent}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm">Late: <strong>{statistics.late}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm">Excused: <strong>{statistics.excused}</strong></span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-border min-w-[200px]">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.attendanceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Attendance Rate</div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>👦 Boys: {statistics.boys.present}/{statistics.boys.total}</span>
                  <span>👧 Girls: {statistics.girls.present}/{statistics.girls.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClassId && learners.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleMarkAll("present")}
              className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium hover:bg-green-200"
            >
              <UserCheck className="w-4 h-4" />
              Mark All Present
            </button>
            <button
              onClick={() => handleMarkAll("absent")}
              className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium hover:bg-red-200"
            >
              <UserX className="w-4 h-4" />
              Mark All Absent
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search learners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
      )}

      {selectedClassId && learners.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">No.</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Learner Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Gender</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Note/Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {searchQuery ? "No learners match your search." : "No learners found."}
                    </td>
                  </tr>
                ) : (
                  filteredLearners.map((learner, index) => {
                    const record = attendanceRecords[learner.id] || { status: "present" };
                    
                    return (
                      <tr 
                        key={learner.id} 
                        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="py-4 px-6 text-gray-600">{index + 1}.</td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{learner.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                            learner.sex === "M" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-pink-100 text-pink-800"
                          }`}>
                            <User className="w-3 h-3" />
                            {learner.sex === "M" ? "Male" : "Female"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge 
                            status={record.status}
                            onClick={() => {
                              setSelectedLearner({ id: learner.id, name: learner.name });
                              setShowStatusModal(true);
                            }}
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="max-w-xs">
                            {record.status === "excused" && record.excusedReason ? (
                              <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
                                {record.excusedReason}
                              </span>
                            ) : record.status === "late" && record.note ? (
                              <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                                {record.note}
                              </span>
                            ) : record.note ? (
                              <span className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                                {record.note}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedClassId && learners.length > 0 && (
        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="border border-border px-6 py-3 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Draft...
              </span>
            ) : (
              "Save as Draft"
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Submit Attendance
              </span>
            )}
          </button>
        </div>
      )}

      {selectedClassId && learners.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No learners in this class</h3>
          <p className="text-gray-600">Add learners to the class first in Class Management</p>
        </div>
      )}

      {selectedLearner && (
        <>
          <StatusSelectorModal
            isOpen={showStatusModal}
            onClose={() => setShowStatusModal(false)}
            onSelect={(status) => handleStatusChange(selectedLearner.id, status)}
            currentStatus={attendanceRecords[selectedLearner.id]?.status || "present"}
            learnerName={selectedLearner.name}
          />
          
          <ExcusedReasonModal
            isOpen={showExcusedModal}
            onClose={() => setShowExcusedModal(false)}
            onSave={(reason) => handleExcusedReason(selectedLearner.id, reason)}
            learnerName={selectedLearner.name}
          />
        </>
      )}
    </div>
  );
}