// src/pages/AdminDashboard/TeacherManagement.tsx
import React, { useState, useEffect } from "react";
import {
  User,
  Upload,
  Download,
  BookOpen,
  Search,
  X,
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";

// ===== REUSABLE MODAL =====
const Modal = ({
  children,
  title,
  onClose,
  size = "md",
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  size?: "md" | "lg";
}) => {
  const sizeClasses = size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl p-6 w-full ${sizeClasses} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ===== TEACHER FORM MODAL (Edit Subjects Only) =====
const TeacherEditModal = ({
  isOpen,
  onClose,
  onSave,
  globalSubjects,
  title,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacherId: string, subjects: string[]) => Promise<boolean>;
  globalSubjects: string[];
  title: string;
  initialData?: { teacherId: string; name: string; subjects: string[] };
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    initialData?.subjects || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData?.teacherId) return;
    
    setIsSaving(true);
    try {
      const success = await onSave(initialData.teacherId, selectedSubjects);
      if (success) {
        onClose();
      } else {
        alert("Failed to update teacher. Please try again.");
      }
    } catch (err) {
      console.error("Error updating teacher:", err);
      alert("Failed to update teacher. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-sm text-gray-600 mb-2">Editing: <span className="font-medium">{initialData?.name}</span></p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subjects Taught
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg">
            {globalSubjects.map((subject) => (
              <label
                key={subject}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  selectedSubjects.includes(subject)
                    ? "bg-blue-100 border border-blue-300"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(subject)}
                  onChange={() => toggleSubject(subject)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm">{subject}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </span>
            ) : (
              "Update Teacher"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-border py-2.5 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ===== MAIN COMPONENT =====
export default function TeacherManagement() {
  const {
    teachers,
    classes,
    assignments,
    loading,
    error,
    updateTeacherSubjects,
    assignTeacherToClassMultiple,
    removeTeacherFromClassAllSubjects,
    getAssignmentsByClassId,
    getAssignmentsByTeacherId,
    getTeachersForClass,
  } = useTeacherManagement();

  const { classes: allClasses } = useClassManagement();

  // ===== GLOBAL SUBJECTS =====
  const [globalSubjects] = useState<string[]>([
    "Mathematics",
    "English",
    "Silozi",
    "Physics",
    "Chemistry",
    "Biology",
    "History",
    "Geography",
    "CRE",
    "Agriculture",
    "Business Studies",
    "Computer Studies",
  ]);

  // ===== MODAL STATE =====
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<{
    teacherId: string;
    name: string;
    subjects: string[];
  } | null>(null);
  
  // Updated state for assignment modal
  const [assignmentData, setAssignmentData] = useState<{
    classId: string;
    className: string;
  } | null>(null);
  
  // Track selected teachers and their subjects for the class
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [teacherSelections, setTeacherSelections] = useState<Record<string, string[]>>({});
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  // ===== ASSIGNMENT =====
  const openAssignModal = (classId: string, className: string) => {
    // Get all current teachers for this class
    const classTeachers = getTeachersForClass(classId);
    
    // Initialize selected teachers and their subjects
    const initialSelections: Record<string, string[]> = {};
    const initialSelectedTeachers = new Set<string>();
    
    classTeachers.forEach(teacher => {
      initialSelectedTeachers.add(teacher.teacherId);
      initialSelections[teacher.teacherId] = teacher.subjects;
    });
    
    setAssignmentData({
      classId,
      className,
    });
    
    setSelectedTeachers(initialSelectedTeachers);
    setTeacherSelections(initialSelections);
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignmentData) return;
    
    setIsSavingAssignment(true);
    try {
      // Remove all existing assignments for this class first
      const existingAssignments = getAssignmentsByClassId(assignmentData.classId);
      
      // Remove assignments for teachers who are no longer selected
      for (const assignment of existingAssignments) {
        if (!selectedTeachers.has(assignment.teacherId)) {
          await removeTeacherFromClassAllSubjects(assignment.teacherId, assignmentData.classId);
        }
      }
      
      // Update assignments for selected teachers
      for (const teacherId of Array.from(selectedTeachers)) {
        const selectedSubjects = teacherSelections[teacherId] || [];
        
        if (selectedSubjects.length > 0) {
          // Update or create assignments for this teacher
          await assignTeacherToClassMultiple(teacherId, assignmentData.classId, selectedSubjects);
        } else {
          // Remove teacher from class if no subjects selected
          await removeTeacherFromClassAllSubjects(teacherId, assignmentData.classId);
        }
      }
      
      setIsAssignModalOpen(false);
      setAssignmentData(null);
      setSelectedTeachers(new Set());
      setTeacherSelections({});
      alert("✅ Assignments saved successfully!");
    } catch (err: any) {
      console.error("Error saving assignments:", err);
      alert(`Failed to save assignments: ${err.message}`);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const toggleTeacherSelection = (teacherId: string) => {
    const newSelectedTeachers = new Set(selectedTeachers);
    
    if (newSelectedTeachers.has(teacherId)) {
      newSelectedTeachers.delete(teacherId);
      // Remove teacher selections when deselected
      const newSelections = { ...teacherSelections };
      delete newSelections[teacherId];
      setTeacherSelections(newSelections);
    } else {
      newSelectedTeachers.add(teacherId);
      // Initialize with empty subjects - user will select which subjects
      setTeacherSelections(prev => ({
        ...prev,
        [teacherId]: []
      }));
    }
    
    setSelectedTeachers(newSelectedTeachers);
  };

  const toggleSubjectForTeacher = (teacherId: string, subject: string) => {
    setTeacherSelections(prev => {
      const currentSubjects = prev[teacherId] || [];
      const teacher = teachers.find(t => t.id === teacherId);
      
      // Only allow subjects that the teacher can teach
      if (teacher && !teacher.subjects.includes(subject)) {
        return prev;
      }
      
      const newSubjects = currentSubjects.includes(subject)
        ? currentSubjects.filter(s => s !== subject)
        : [...currentSubjects, subject];
      
      return {
        ...prev,
        [teacherId]: newSubjects
      };
    });
  };

  // Get assigned classes for a teacher (FILTER OUT DELETED CLASSES)
  const getAssignedClassesForTeacher = (teacherId: string) => {
    const teacherAssignments = getAssignmentsByTeacherId(teacherId);
    
    // Group assignments by class, but only include classes that exist
    const classMap = new Map<string, { 
      className: string; 
      subjects: string[]; 
      classExists: boolean 
    }>();
    
    teacherAssignments.forEach(assignment => {
      if (!classMap.has(assignment.classId)) {
        const classInfo = allClasses.find(c => c.id === assignment.classId);
        const classExists = !!classInfo;
        
        // Only add to map if class exists
        if (classExists) {
          classMap.set(assignment.classId, {
            className: classInfo.name,
            subjects: [],
            classExists: true
          });
        }
      }
      const classData = classMap.get(assignment.classId);
      if (classData && !classData.subjects.includes(assignment.subject)) {
        classData.subjects.push(assignment.subject);
      }
    });
    
    // Convert to array and filter out non-existent classes
    return Array.from(classMap.values())
      .filter(cls => cls.classExists)
      .map(({ className, subjects }) => ({ className, subjects }));
  };

  // Get available subjects for a teacher in the assignment modal
  const getAvailableSubjectsForTeacher = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return [];
    
    // Return teacher's subjects (global subjects they can teach)
    return teacher.subjects;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-3 mb-8">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Teacher Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage teachers, subjects, and class assignments.
        </p>
      </div>

      {/* Assign Teachers Section */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
          <BookOpen className="w-5 h-5" />
          Assign Teachers to Classes
        </h3>
        <div className="space-y-3">
          {allClasses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No classes created yet.</p>
          ) : (
            allClasses.map((cls) => {
              const classTeachers = getTeachersForClass(cls.id);
              
              return (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{cls.name}</span>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        {classTeachers.length} teacher{classTeachers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {classTeachers.length > 0 ? (
                      <div className="space-y-1">
                        {classTeachers.map((teacher, idx) => (
                          <div key={idx} className="text-sm text-gray-600">
                            <span className="font-medium">{teacher.teacherName}</span>: {teacher.subjects.join(", ")}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No teachers assigned</p>
                    )}
                  </div>
                  <button
                    onClick={() => openAssignModal(cls.id, cls.name)}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium"
                  >
                    <UserCheck className="w-4 h-4" />
                    {classTeachers.length > 0 ? "Manage" : "Assign"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Teacher List with Search */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">All Teachers</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search teachers..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm border-b border-gray-200">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Subjects Taught</th>
                <th className="pb-3 font-medium">Assigned Classes</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    {teacherSearch ? "No teachers match your search." : "No teachers found."}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const assignedClasses = getAssignedClassesForTeacher(teacher.id);
                  
                  return (
                    <tr key={teacher.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-3 font-medium text-gray-900">{teacher.name}</td>
                      <td className="py-3 text-sm text-gray-600">{teacher.email}</td>
                      <td className="py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map((subj, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {subj}
                            </span>
                          ))}
                          {teacher.subjects.length === 0 && (
                            <span className="text-gray-400 text-xs">No subjects assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {assignedClasses.length > 0 ? (
                          <div className="space-y-1">
                            {assignedClasses.map((cls, idx) => (
                              <div key={idx}>
                                <div className="font-medium">{cls.className}</div>
                                <div className="text-xs text-gray-500">({cls.subjects.join(", ")})</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => {
                            setEditingTeacher({
                              teacherId: teacher.id,
                              name: teacher.name,
                              subjects: teacher.subjects,
                            });
                            setIsEditTeacherModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Subjects
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === MODALS === */}
      {editingTeacher && (
        <TeacherEditModal
          isOpen={isEditTeacherModalOpen}
          onClose={() => {
            setIsEditTeacherModalOpen(false);
            setEditingTeacher(null);
          }}
          onSave={updateTeacherSubjects}
          globalSubjects={globalSubjects}
          initialData={editingTeacher}
          title="Edit Teacher Subjects"
        />
      )}

      {isAssignModalOpen && assignmentData && (
        <Modal
          title={`Manage Teachers for ${assignmentData.className}`}
          onClose={() => {
            setIsAssignModalOpen(false);
            setAssignmentData(null);
            setSelectedTeachers(new Set());
            setTeacherSelections({});
          }}
          size="lg"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Teachers for {assignmentData.className}
                <span className="text-xs text-gray-500 ml-2">
                  (You can assign multiple teachers to this class)
                </span>
              </label>
              
              <div className="space-y-3 max-h-64 overflow-y-auto p-3 border border-border rounded-lg">
                {teachers.map((teacher) => {
                  const isSelected = selectedTeachers.has(teacher.id);
                  const availableSubjects = getAvailableSubjectsForTeacher(teacher.id);
                  
                  return (
                    <div key={teacher.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center p-3 bg-gray-50 border-b">
                        <input
                          type="checkbox"
                          id={`teacher-${teacher.id}`}
                          checked={isSelected}
                          onChange={() => toggleTeacherSelection(teacher.id)}
                          className="rounded text-primary focus:ring-primary mr-3"
                          disabled={isSavingAssignment}
                        />
                        <label htmlFor={`teacher-${teacher.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{teacher.name}</div>
                          <div className="text-xs text-gray-500">{teacher.email}</div>
                          {availableSubjects.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Can teach: {availableSubjects.join(", ")}
                            </div>
                          )}
                        </label>
                      </div>
                      
                      {isSelected && (
                        <div className="p-3 bg-white">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subjects to teach in {assignmentData.className}:
                          </label>
                          {availableSubjects.length === 0 ? (
                            <p className="text-amber-600 text-sm">
                              This teacher has no subjects assigned. Please edit their subjects first.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {availableSubjects.map((subject) => {
                                const isSubjectSelected = (teacherSelections[teacher.id] || []).includes(subject);
                                
                                return (
                                  <label
                                    key={`${teacher.id}-${subject}`}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                                      isSubjectSelected
                                        ? "bg-blue-100 border border-blue-300"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSubjectSelected}
                                      onChange={() => toggleSubjectForTeacher(teacher.id, subject)}
                                      className="rounded text-primary focus:ring-primary"
                                      disabled={isSavingAssignment}
                                    />
                                    <span className="text-sm">{subject}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {(teacherSelections[teacher.id] || []).length === 0 && availableSubjects.length > 0 && (
                            <p className="text-amber-600 text-xs mt-2">
                              Select at least one subject or deselect the teacher
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveAssignment}
                disabled={isSavingAssignment || Array.from(selectedTeachers).some(
                  teacherId => (teacherSelections[teacherId] || []).length === 0
                )}
                className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isSavingAssignment ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </span>
                ) : (
                  "Save Assignments"
                )}
              </button>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignmentData(null);
                  setSelectedTeachers(new Set());
                  setTeacherSelections({});
                }}
                disabled={isSavingAssignment}
                className="flex-1 border border-border py-2.5 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}