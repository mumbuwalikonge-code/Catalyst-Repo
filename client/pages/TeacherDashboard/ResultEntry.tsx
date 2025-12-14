// src/pages/TeacherDashboard/ResultEntry.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Download,
  Upload,
  Save,
  X,
  Search,
  CheckCircle,
  Loader2,
  AlertCircle,
  Send,
} from "lucide-react";
import Papa from "papaparse";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { useMarksData, type Term, type AssessmentType } from "@/hooks/useMarksData";
import { db } from "@/lib/firebase";
import { 
  doc, 
  writeBatch,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where
} from "firebase/firestore";

// Types
type Learner = {
  id: string;
  admissionNo: string;
  name: string;
  currentMark?: number;
};

type TeacherAssignment = {
  classId: string;
  className: string;
  subject: string;
  learners: Learner[];
};

// Firestore marks structure
interface MarkRecord {
  id?: string;
  learnerId: string;
  classId: string;
  subject: string;
  teacherId: string;
  term: Term;
  assessmentType: AssessmentType;
  score: number | null;
  createdAt: any;
  updatedAt: any;
  status: 'draft' | 'submitted';
}

const ASSESSMENT_LABELS: Record<AssessmentType, string> = {
  week4: "Week 4 Assessment",
  week8: "Week 8 Assessment",
  end_of_term: "End of Term Exam",
};

const TERM_OPTIONS: { value: Term; label: string }[] = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

// Helper function to generate admission number
const generateAdmissionNo = (className: string, index: number): string => {
  const classMatch = className.match(/(\w)(\d+)(\w*)/i);
  if (classMatch) {
    const [, firstChar, year, section] = classMatch;
    const classCode = `${firstChar.toUpperCase()}${year}${section || ''}`.substring(0, 3);
    return `${classCode}-${(index + 1).toString().padStart(3, '0')}`;
  }
  
  const classCode = className.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  return `${classCode}-${(index + 1).toString().padStart(3, '0')}`;
};

// Custom debounce hook
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

export default function ResultEntry() {
  const { currentUser } = useAuth();
  const { 
    getTeacherClassSubjects,
    loading: teacherLoading
  } = useTeacherManagement();
  
  const { 
    classes: allClasses, 
    loading: classLoading,
    getClassLearners 
  } = useClassManagement();
  
  const { getTeacherMarks, refreshData } = useMarksData();
  
  // State
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("end_of_term");
  const [term, setTerm] = useState<Term>("term1");
  const [marks, setMarks] = useState<Record<string, number | null>>({});
  const [marksStatus, setMarksStatus] = useState<Record<string, 'draft' | 'submitted'>>({});
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);

  // Auto-save marks without notifications
  const debouncedAutoSave = useDebounce(async () => {
    if (!currentUser || !selectedAssignment || !autoSaveEnabled || submitting) return;
    
    try {
      await saveMarksToFirestore('draft');
      setLastSaveTime(new Date());
      setAutoSaveIndicator(true);
      setTimeout(() => setAutoSaveIndicator(false), 1000); // Brief visual feedback
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, 1500); // 1.5 second debounce

  // Trigger auto-save when marks change
  useEffect(() => {
    if (Object.keys(marks).length > 0) {
      debouncedAutoSave();
    }
  }, [marks, debouncedAutoSave]);

  // Fetch teacher's assigned classes and learners
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!currentUser || currentUser.role !== 'teacher' || teacherLoading || classLoading) {
        return;
      }

      try {
        setLoading(true);
        
        const classSubjectCombos = getTeacherClassSubjects(currentUser.uid);
        
        const assignmentPromises = classSubjectCombos.map(async (combo) => {
          const learnersData = await getClassLearners(combo.classId);
          
          const learners: Learner[] = learnersData.map((learner, index) => {
            const admissionNo = generateAdmissionNo(combo.className, index);
            
            return {
              id: learner.id,
              admissionNo: admissionNo,
              name: learner.name,
            };
          });
          
          return {
            classId: combo.classId,
            className: combo.className,
            subject: combo.subject,
            learners: learners,
          };
        });

        const resolvedAssignments = await Promise.all(assignmentPromises);
        setTeacherAssignments(resolvedAssignments);
        
        if (resolvedAssignments.length > 0 && !selectedAssignment) {
          setSelectedAssignment(resolvedAssignments[0]);
          await loadMarks(resolvedAssignments[0]);
        }
        
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [currentUser, teacherLoading, classLoading, getTeacherClassSubjects, getClassLearners]);

  // Set up real-time listener for marks updates (silent)
  useEffect(() => {
    if (!currentUser || !selectedAssignment) return;

    const marksQuery = query(
      collection(db, "marks"),
      where("classId", "==", selectedAssignment.classId),
      where("subject", "==", selectedAssignment.subject),
      where("term", "==", term),
      where("assessmentType", "==", assessmentType),
      where("teacherId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(marksQuery, (snapshot) => {
      const newMarks: Record<string, number | null> = {};
      const newStatus: Record<string, 'draft' | 'submitted'> = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data() as MarkRecord;
        newMarks[data.learnerId] = data.score;
        newStatus[data.learnerId] = data.status || 'draft';
      });
      
      setMarks(prev => ({ ...prev, ...newMarks }));
      setMarksStatus(prev => ({ ...prev, ...newStatus }));
      
      const hasSubmittedMarks = Object.values(newStatus).some(status => status === 'submitted');
      setHasSubmitted(hasSubmittedMarks);
    });

    return () => unsubscribe();
  }, [currentUser, selectedAssignment, term, assessmentType]);

  // Load marks from Firestore when assignment changes
  const loadMarks = async (assignment: TeacherAssignment) => {
    if (!currentUser || !assignment) return;
    
    try {
      setLoading(true);
      
      const subjectClasses = await getTeacherMarks(currentUser.uid, term, assessmentType);
      
      const subjectClass = subjectClasses.find(
        sc => sc.classId === assignment.classId && sc.subject === assignment.subject
      );
      
      const marksMap: Record<string, number | null> = {};
      const statusMap: Record<string, 'draft' | 'submitted'> = {};
      
      if (subjectClass) {
        subjectClass.learners.forEach(learner => {
          marksMap[learner.id] = learner.score;
          statusMap[learner.id] = (learner as any).status || 'draft';
        });
      }
      
      assignment.learners.forEach(learner => {
        if (marksMap[learner.id] === undefined) {
          marksMap[learner.id] = null;
          statusMap[learner.id] = 'draft';
        }
      });
      
      setMarks(marksMap);
      setMarksStatus(statusMap);
      
      const hasMarks = Object.values(marksMap).some(score => score !== null);
      const hasSubmittedMarks = Object.values(statusMap).some(status => status === 'submitted');
      setHasSubmitted(hasSubmittedMarks || hasMarks);
      
    } catch (error) {
      console.error("Error loading marks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save marks to Firestore (draft or submitted) - silent version
  const saveMarksToFirestore = async (status: 'draft' | 'submitted' = 'draft') => {
    if (!currentUser || !selectedAssignment) return false;
    
    try {
      const batch = writeBatch(db);
      let hasChanges = false;
      
      for (const learner of selectedAssignment.learners) {
        const score = marks[learner.id];
        const currentStatus = marksStatus[learner.id];
        
        if (score !== undefined || status === 'submitted') {
          const markId = `${learner.id}_${selectedAssignment.classId}_${selectedAssignment.subject}_${term}_${assessmentType}`;
          const markRef = doc(db, "marks", markId);
          
          const markData: MarkRecord = {
            learnerId: learner.id,
            classId: selectedAssignment.classId,
            subject: selectedAssignment.subject,
            teacherId: currentUser.uid,
            term: term,
            assessmentType: assessmentType,
            score: score,
            status: status,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          
          batch.set(markRef, markData, { merge: true });
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        await batch.commit();
        
        // Update local status silently
        if (status === 'submitted') {
          const newStatus = { ...marksStatus };
          selectedAssignment.learners.forEach(learner => {
            newStatus[learner.id] = 'submitted';
          });
          setMarksStatus(newStatus);
          setHasSubmitted(true);
        }
        
        // Refresh data silently
        refreshData(term, assessmentType, { teacherId: currentUser.uid });
        
        // Notify other components silently via custom event
        if (status === 'submitted') {
          window.dispatchEvent(new CustomEvent('marks-submitted', {
            detail: {
              classId: selectedAssignment.classId,
              className: selectedAssignment.className,
              subject: selectedAssignment.subject,
              term,
              assessmentType,
              timestamp: new Date().toISOString()
            }
          }));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error saving marks:", error);
      return false;
    }
  };

  // Handle assignment selection
  const handleAssignmentSelect = async (assignment: TeacherAssignment) => {
    setSelectedAssignment(assignment);
    await loadMarks(assignment);
    setSearchTerm("");
  };

  // Handle assessment type change
  const handleAssessmentChange = async (newAssessmentType: AssessmentType) => {
    setAssessmentType(newAssessmentType);
    if (selectedAssignment) {
      await loadMarks(selectedAssignment);
    }
  };

  // Handle term change
  const handleTermChange = async (newTerm: Term) => {
    setTerm(newTerm);
    if (selectedAssignment) {
      await loadMarks(selectedAssignment);
    }
  };

  // Filter learners by name or admissionNo
  const filteredLearners = useMemo(() => {
    if (!selectedAssignment) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return selectedAssignment.learners;
    return selectedAssignment.learners.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.admissionNo.toLowerCase().includes(term)
    );
  }, [selectedAssignment, searchTerm]);

  const handleMarkChange = (learnerId: string, value: string) => {
    const num = value === "" ? null : parseFloat(value);
    setMarks((prev) => ({
      ...prev,
      [learnerId]: num === null || isNaN(num) ? null : Math.min(Math.max(num, 0), 100),
    }));
  };

  // Manual save (draft) - silent
  const handleSaveMarks = async () => {
    if (!currentUser || !selectedAssignment) return;
    
    try {
      setSaving(true);
      await saveMarksToFirestore('draft');
      setLastSaveTime(new Date());
    } catch (error) {
      console.error("Error saving marks:", error);
    } finally {
      setSaving(false);
    }
  };

  // Submit marks (final) - silent with minimal feedback
  const handleSubmitMarks = async () => {
    if (!currentUser || !selectedAssignment) return;
    
    // Check for missing marks - show simple confirm without alerts
    const missingMarks = selectedAssignment.learners.filter(
      learner => marks[learner.id] === undefined || marks[learner.id] === null
    );
    
    if (missingMarks.length > 0) {
      const confirmSubmit = window.confirm(
        `${missingMarks.length} learner(s) have no marks. Continue with submission?`
      );
      if (!confirmSubmit) return;
    }
    
    try {
      setSubmitting(true);
      await saveMarksToFirestore('submitted');
    } catch (error) {
      console.error("Error submitting marks:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // CSV handling - silent with minimal feedback
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAssignment) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newMarks = { ...marks };
        let validCount = 0;
        let errors: string[] = [];

        results.data.forEach((row: any, idx: number) => {
          const admissionNo = (row["Admission No"] || row.admissionNo || "").trim();
          const name = (row["Name"] || row.name || "").trim();
          const scoreStr = row["Score"]?.trim();
          let score: number | null = null;

          if (scoreStr !== "" && scoreStr != null) {
            const num = parseFloat(scoreStr);
            if (isNaN(num) || num < 0 || num > 100) {
              errors.push(`Row ${idx + 1}: Invalid score "${scoreStr}"`);
              return;
            }
            score = num;
          }

          const learner = selectedAssignment.learners.find(
            (l) =>
              l.admissionNo === admissionNo &&
              l.name.toLowerCase() === name.toLowerCase()
          );

          if (learner) {
            newMarks[learner.id] = score;
            validCount++;
          } else {
            errors.push(`Row ${idx + 1}: No match for "${name}" (${admissionNo})`);
          }
        });

        setMarks(newMarks);

        // Silent import - only console logs for debugging
        if (validCount > 0) {
          console.log(`CSV imported: ${validCount} marks updated`);
        }

        if (errors.length > 0) {
          console.warn("CSV import warnings:", errors);
        }
      },
      error: () => {
        console.error("Failed to parse CSV");
      },
    });

    e.target.value = "";
    setIsCsvModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    if (!selectedAssignment) return;
    
    const headers = "Admission No,Name,Score\n";
    const rows = selectedAssignment.learners.map(learner => 
      `${learner.admissionNo},${learner.name},`
    ).join("\n");
    
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marks_template_${selectedAssignment.className}_${selectedAssignment.subject.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!selectedAssignment) return null;
    
    const enteredCount = Object.values(marks).filter(score => score !== null && score !== undefined).length;
    const absentCount = Object.values(marks).filter(score => score === null).length;
    const pendingCount = selectedAssignment.learners.length - Object.keys(marks).length;
    const submittedCount = Object.values(marksStatus).filter(status => status === 'submitted').length;
    
    const validScores = Object.values(marks).filter(score => score !== null && score !== undefined);
    const averageScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + (score || 0), 0) / validScores.length
      : 0;
    
    return {
      enteredCount,
      absentCount,
      pendingCount,
      submittedCount,
      averageScore: averageScore.toFixed(1),
      completionPercentage: ((enteredCount + absentCount) / selectedAssignment.learners.length * 100).toFixed(0),
    };
  }, [selectedAssignment, marks, marksStatus]);

  if (teacherLoading || classLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Access Restricted</h2>
          <p className="text-slate-500">
            This page is only available for teachers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enter Results</h1>
        <p className="text-muted-foreground mt-1">
          Enter marks for your assigned classes and subjects. Marks are auto-saved as you type.
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lastSaveTime && (
            <span className="text-xs text-gray-500">
              Last save: {lastSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {autoSaveIndicator && (
            <span className="text-xs text-green-600 font-medium animate-pulse">
              • Auto-saving...
            </span>
          )}
        </div>
      </div>

      {/* Assignment Selector */}
      <div className="bg-white rounded-xl p-5 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Assignment
            </label>
            <select
              value={selectedAssignment ? `${selectedAssignment.classId}|${selectedAssignment.subject}` : ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setSelectedAssignment(null);
                } else {
                  const [classId, subject] = value.split("|");
                  const assignment = teacherAssignments.find(
                    a => a.classId === classId && a.subject === subject
                  );
                  if (assignment) {
                    handleAssignmentSelect(assignment);
                  }
                }
              }}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">— Choose an assignment —</option>
              {teacherAssignments.map((assignment) => (
                <option 
                  key={`${assignment.classId}-${assignment.subject}`} 
                  value={`${assignment.classId}|${assignment.subject}`}
                >
                  {assignment.className} — {assignment.subject}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {teacherAssignments.length} assignment{teacherAssignments.length !== 1 ? 's' : ''} available
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={term}
              onChange={(e) => handleTermChange(e.target.value as Term)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {TERM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
            <select
              value={assessmentType}
              onChange={(e) => handleAssessmentChange(e.target.value as AssessmentType)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="week4">Week 4 Assessment</option>
              <option value="week8">Week 8 Assessment</option>
              <option value="end_of_term">End of Term Exam</option>
            </select>
          </div>
        </div>
        
        {/* Auto-save toggle */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="autoSave"
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="autoSave" className="text-sm text-gray-700">
            Auto-save enabled
          </label>
        </div>
      </div>

      {/* Action Bar */}
      {selectedAssignment && (
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/5 font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-slate-50 font-medium"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          
          <div className="ml-auto flex items-center gap-4">
            {hasSubmitted && (
              <span className="inline-flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Submitted
              </span>
            )}
            
            <button
              onClick={handleSaveMarks}
              disabled={saving}
              className="inline-flex items-center gap-2 border border-blue-500 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Draft
                </>
              )}
            </button>
            
            <button
              onClick={handleSubmitMarks}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Marks
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Learner Marks Table */}
      {selectedAssignment ? (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedAssignment.className} — {selectedAssignment.subject}
                </h2>
                <p className="text-sm text-gray-500">
                  {ASSESSMENT_LABELS[assessmentType]} • Term {term.replace('term', '')}
                </p>
              </div>
            </div>
            
            {/* Stats */}
            {stats && (
              <div className="ml-auto flex flex-wrap gap-4">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">Entered</div>
                  <div className="text-lg font-bold text-green-600">{stats.enteredCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">Absent</div>
                  <div className="text-lg font-bold text-amber-600">{stats.absentCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">Submitted</div>
                  <div className="text-lg font-bold text-blue-600">{stats.submittedCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">Average</div>
                  <div className="text-lg font-bold text-purple-600">{stats.averageScore}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">Completion</div>
                  <div className="text-lg font-bold text-indigo-600">{stats.completionPercentage}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Search Filter */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredLearners.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm 
                    ? `No learners found matching "${searchTerm}"`
                    : "No learners in this class"
                  }
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Admission No</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Name</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Score (0–100)</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLearners.map((learner) => {
                    const mark = marks[learner.id];
                    const status = marksStatus[learner.id];
                    const isAbsent = mark === null;
                    const hasMark = mark !== null && mark !== undefined;
                    
                    return (
                      <tr key={learner.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-mono text-sm">{learner.admissionNo}</td>
                        <td className="p-3 font-medium">{learner.name}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={hasMark ? mark : ""}
                            onChange={(e) => handleMarkChange(learner.id, e.target.value)}
                            className="w-24 p-2 border border-border rounded text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            placeholder={isAbsent ? "Absent" : "Enter score"}
                            disabled={status === 'submitted'}
                          />
                        </td>
                        <td className="p-3">
                          {status === 'submitted' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                              Submitted
                            </span>
                          ) : isAbsent ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded font-medium">
                              Absent
                            </span>
                          ) : hasMark ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                              Draft
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Status Legend */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Submitted</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Draft (Auto-saved)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Pending</span>
              </div>
            </div>
          </div>
        </div>
      ) : teacherAssignments.length > 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Select an Assignment</h3>
          <p className="text-gray-500">
            Choose from your {teacherAssignments.length} assignment{teacherAssignments.length !== 1 ? 's' : ''} to begin entering marks.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Class Assignments</h3>
          <p className="text-gray-500">
            You haven't been assigned to any classes. Contact your administrator.
          </p>
        </div>
      )}

      {/* CSV Upload Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upload Marks (CSV)</h3>
              <button 
                onClick={() => setIsCsvModalOpen(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              CSV must include: <code className="bg-gray-100 px-1">Admission No</code>,{" "}
              <code className="bg-gray-100 px-1">Name</code>, and{" "}
              <code className="bg-gray-100 px-1">Score</code>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Leave <code className="bg-gray-100 px-1">Score</code> blank to mark as absent.
            </p>
            <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-lg p-6 hover:bg-gray-50 cursor-pointer">
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Choose CSV File</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>
            <div className="mt-4 text-xs text-gray-500">
              <p>Example:</p>
              <p>
                <code>F4A-001,John Doe,85</code>
              </p>
              <p>
                <code>F4A-002,Jane Smith,</code> ← absent
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}