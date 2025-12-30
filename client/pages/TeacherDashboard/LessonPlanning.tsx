// src/pages/TeacherDashboard/LessonPlanning.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  BookOpen,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter,
  Search,
  ChevronDown,
  Eye,
  Send,
  Save,
  Loader2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { useLessonPlans, LessonPlan } from "@/hooks/useLessonPlans";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Status Badge Component
const StatusBadge = ({ status }: { status: LessonPlan['status'] }) => {
  const config = {
    draft: { 
      color: "bg-gray-100 text-gray-800 border-gray-200", 
      icon: <FileText className="w-4 h-4" />,
      label: "Draft"
    },
    submitted: { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      icon: <Send className="w-4 h-4" />,
      label: "Submitted"
    },
    reviewed: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      icon: <Eye className="w-4 h-4" />,
      label: "Reviewed"
    },
    approved: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Approved"
    },
    rejected: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: <XCircle className="w-4 h-4" />,
      label: "Rejected"
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

// Lesson Plan Form Modal
const LessonPlanFormModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData,
  teacherClasses,
  getTeacherSubjectsForClass
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: LessonPlan;
  teacherClasses: any[];
  getTeacherSubjectsForClass: (classId: string) => string[];
}) => {
  const [formData, setFormData] = useState({
    classId: initialData?.classId || "",
    subject: initialData?.subject || "",
    date: initialData?.date || new Date().toISOString().split('T')[0],
    week: initialData?.week || 1,
    term: initialData?.term || 1,
    topic: initialData?.topic || "",
    subTopic: initialData?.subTopic || "",
    duration: initialData?.duration || 40,
    objectives: initialData?.objectives || [""],
    priorKnowledge: initialData?.priorKnowledge || [""],
    activities: initialData?.activities || [""],
    materials: initialData?.materials || [""],
    assessmentMethods: initialData?.assessmentMethods || [""],
    differentiation: initialData?.differentiation || [""],
    homework: initialData?.homework || "",
    notes: initialData?.notes || "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const subjects = formData.classId ? getTeacherSubjectsForClass(formData.classId) : [];

  const handleArrayInputChange = (field: keyof typeof formData, index: number, value: string) => {
    const array = [...(formData[field] as string[])];
    array[index] = value;
    setFormData(prev => ({ ...prev, [field]: array }));
  };

  const addArrayItem = (field: keyof typeof formData) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: [...(prev[field] as string[]), ""] 
    }));
  };

  const removeArrayItem = (field: keyof typeof formData, index: number) => {
    const array = [...(formData[field] as string[])];
    array.splice(index, 1);
    setFormData(prev => ({ ...prev, [field]: array }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.classId || !formData.subject || !formData.topic.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save lesson plan");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Lesson Plan" : "Create New Lesson Plan"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value, subject: "" }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              >
                <option value="">Select Class</option>
                {teacherClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
                disabled={!formData.classId}
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 40 }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week
              </label>
              <select
                value={formData.week}
                onChange={(e) => setFormData(prev => ({ ...prev, week: parseInt(e.target.value) }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(week => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term
              </label>
              <select
                value={formData.term}
                onChange={(e) => setFormData(prev => ({ ...prev, term: parseInt(e.target.value) }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="p-2.5 border border-border rounded-lg bg-gray-50">
                <StatusBadge status={initialData?.status || 'draft'} />
              </div>
            </div>
          </div>

          {/* Topic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Introduction to Algebra"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub-topic
              </label>
              <input
                type="text"
                value={formData.subTopic}
                onChange={(e) => setFormData(prev => ({ ...prev, subTopic: e.target.value }))}
                placeholder="e.g., Linear Equations"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Learning Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learning Objectives
              <span className="text-xs text-gray-500 ml-2">(One per line)</span>
            </label>
            {formData.objectives.map((objective, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => handleArrayInputChange('objectives', index, e.target.value)}
                  placeholder="e.g., Students will be able to solve linear equations"
                  className="flex-1 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {formData.objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('objectives', index)}
                    className="p-2.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('objectives')}
              className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Objective
            </button>
          </div>

          {/* Prior Knowledge */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prior Knowledge Required
            </label>
            {formData.priorKnowledge.map((knowledge, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={knowledge}
                  onChange={(e) => handleArrayInputChange('priorKnowledge', index, e.target.value)}
                  placeholder="e.g., Basic arithmetic operations"
                  className="flex-1 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {formData.priorKnowledge.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('priorKnowledge', index)}
                    className="p-2.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('priorKnowledge')}
              className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Prior Knowledge
            </button>
          </div>

          {/* Teaching/Learning Activities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teaching/Learning Activities
            </label>
            {formData.activities.map((activity, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  value={activity}
                  onChange={(e) => handleArrayInputChange('activities', index, e.target.value)}
                  placeholder="e.g., Group discussion on real-world applications"
                  className="flex-1 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  rows={2}
                />
                {formData.activities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('activities', index)}
                    className="p-2.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('activities')}
              className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Activity
            </button>
          </div>

          {/* Materials/Resources */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teaching Aids/Materials
            </label>
            {formData.materials.map((material, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={material}
                  onChange={(e) => handleArrayInputChange('materials', index, e.target.value)}
                  placeholder="e.g., Whiteboard, markers, worksheets"
                  className="flex-1 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {formData.materials.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('materials', index)}
                    className="p-2.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('materials')}
              className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Material
            </button>
          </div>

          {/* Assessment Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Methods
            </label>
            {formData.assessmentMethods.map((method, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={method}
                  onChange={(e) => handleArrayInputChange('assessmentMethods', index, e.target.value)}
                  placeholder="e.g., Oral questions, written exercises"
                  className="flex-1 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {formData.assessmentMethods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('assessmentMethods', index)}
                    className="p-2.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('assessmentMethods')}
              className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Assessment Method
            </button>
          </div>

          {/* Differentiation Strategies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Differentiation Strategies
            </label>
            {formData.differentiation.map((strategy, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={strategy}
                  onChange={(e) => handleArrayInputChange('differentiation', index, e.target.value)}
                  placeholder="e.g., Provide extra support for struggling students"
                  className="flex-1 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {formData.differentiation.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('differentiation', index)}
                    className="p-2.5 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('differentiation')}
              className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Strategy
            </button>
          </div>

          {/* Homework & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Homework/Assignment
              </label>
              <textarea
                value={formData.homework}
                onChange={(e) => setFormData(prev => ({ ...prev, homework: e.target.value }))}
                placeholder="e.g., Complete exercises 1-10 on page 45"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes or comments..."
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border py-3 rounded-lg font-medium hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </span>
              ) : (
                initialData ? "Update Lesson Plan" : "Create Lesson Plan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Lesson Plan Modal
const ViewLessonPlanModal = ({ 
  lessonPlan, 
  onClose 
}: { 
  lessonPlan: LessonPlan; 
  onClose: () => void 
}) => {
  if (!lessonPlan) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{lessonPlan.topic}</h3>
            <p className="text-sm text-gray-600">
              {lessonPlan.className} • {lessonPlan.subject} • {new Date(lessonPlan.date).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Status</div>
            <div className="mt-1">
              <StatusBadge status={lessonPlan.status} />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Duration</div>
            <div className="mt-1 font-medium">{lessonPlan.duration} minutes</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Term/Week</div>
            <div className="mt-1 font-medium">Term {lessonPlan.term} • Week {lessonPlan.week}</div>
          </div>
        </div>

        <div className="space-y-6">
          {lessonPlan.subTopic && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Sub-topic</h4>
              <p className="text-gray-700">{lessonPlan.subTopic}</p>
            </div>
          )}

          {lessonPlan.objectives.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Learning Objectives</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lessonPlan.objectives.map((objective, index) => (
                  <li key={index} className="text-gray-700">{objective}</li>
                ))}
              </ul>
            </div>
          )}

          {lessonPlan.priorKnowledge.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Prior Knowledge Required</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lessonPlan.priorKnowledge.map((knowledge, index) => (
                  <li key={index} className="text-gray-700">{knowledge}</li>
                ))}
              </ul>
            </div>
          )}

          {lessonPlan.activities.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Teaching/Learning Activities</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lessonPlan.activities.map((activity, index) => (
                  <li key={index} className="text-gray-700">{activity}</li>
                ))}
              </ul>
            </div>
          )}

          {lessonPlan.materials.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Teaching Aids/Materials</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lessonPlan.materials.map((material, index) => (
                  <li key={index} className="text-gray-700">{material}</li>
                ))}
              </ul>
            </div>
          )}

          {lessonPlan.assessmentMethods.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Assessment Methods</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lessonPlan.assessmentMethods.map((method, index) => (
                  <li key={index} className="text-gray-700">{method}</li>
                ))}
              </ul>
            </div>
          )}

          {lessonPlan.differentiation.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Differentiation Strategies</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lessonPlan.differentiation.map((strategy, index) => (
                  <li key={index} className="text-gray-700">{strategy}</li>
                ))}
              </ul>
            </div>
          )}

          {lessonPlan.homework && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Homework/Assignment</h4>
              <p className="text-gray-700">{lessonPlan.homework}</p>
            </div>
          )}

          {lessonPlan.notes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Additional Notes</h4>
              <p className="text-gray-700">{lessonPlan.notes}</p>
            </div>
          )}

          {lessonPlan.feedback && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Feedback from Reviewer</h4>
              <p className="text-blue-800">{lessonPlan.feedback}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
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

// Main Component
export default function LessonPlanning() {
  // Hooks
  const { 
    createLessonPlan, 
    updateLessonPlan, 
    deleteLessonPlan, 
    getTeacherLessonPlans, 
    submitForReview,
    getLessonPlanStats,
    getCalendarEvents,
    getTeacherClasses,
    getTeacherSubjectsForClass,
    loading,
    error
  } = useLessonPlans();
  
  const { currentUser } = useAuth();
  
  // State
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [filters, setFilters] = useState({
    classId: "",
    subject: "",
    status: "",
    search: "",
  });
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get teacher classes
  const teacherClasses = getTeacherClasses();

  // Load lesson plans
  useEffect(() => {
    loadLessonPlans();
  }, [filters]);

  // Load statistics
  useEffect(() => {
    loadStats();
  }, []);

  // Load calendar events
  useEffect(() => {
    loadCalendarEvents();
  }, [selectedMonth, selectedYear]);

  const loadLessonPlans = async () => {
    try {
      const plans = await getTeacherLessonPlans({
        classId: filters.classId || undefined,
        subject: filters.subject || undefined,
        status: filters.status as LessonPlan['status'] || undefined,
      });
      setLessonPlans(plans);
    } catch (error) {
      console.error("Failed to load lesson plans:", error);
    }
  };

  const loadStats = async () => {
    const statsData = await getLessonPlanStats();
    setStats(statsData);
  };

  const loadCalendarEvents = async () => {
    const events = await getCalendarEvents(selectedMonth, selectedYear);
    setCalendarEvents(events);
  };

  const filteredLessonPlans = useMemo(() => {
    return lessonPlans.filter(plan => {
      if (!filters.search) return true;
      
      const searchLower = filters.search.toLowerCase();
      return (
        plan.topic.toLowerCase().includes(searchLower) ||
        plan.className.toLowerCase().includes(searchLower) ||
        plan.subject.toLowerCase().includes(searchLower) ||
        plan.subTopic.toLowerCase().includes(searchLower)
      );
    });
  }, [lessonPlans, filters.search]);

  const handleCreateLessonPlan = async (formData: any) => {
    if (!currentUser) return;
    
    try {
      const lessonPlanData = {
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || "Teacher",
        classId: formData.classId,
        className: teacherClasses.find(c => c.id === formData.classId)?.name || "",
        subject: formData.subject,
        date: formData.date,
        week: formData.week,
        term: formData.term,
        topic: formData.topic,
        subTopic: formData.subTopic,
        duration: formData.duration,
        objectives: formData.objectives.filter((obj: string) => obj.trim()),
        priorKnowledge: formData.priorKnowledge.filter((pk: string) => pk.trim()),
        activities: formData.activities.filter((act: string) => act.trim()),
        materials: formData.materials.filter((mat: string) => mat.trim()),
        assessmentMethods: formData.assessmentMethods.filter((method: string) => method.trim()),
        differentiation: formData.differentiation.filter((diff: string) => diff.trim()),
        homework: formData.homework,
        notes: formData.notes,
        status: 'draft' as const,
      };

      if (selectedLessonPlan?.id) {
        await updateLessonPlan(selectedLessonPlan.id, lessonPlanData);
        toast.success("Lesson plan updated successfully");
      } else {
        await createLessonPlan(lessonPlanData);
        toast.success("Lesson plan created successfully");
      }

      await loadLessonPlans();
      await loadStats();
      setShowFormModal(false);
      setSelectedLessonPlan(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save lesson plan");
    }
  };

  const handleDeleteLessonPlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson plan?")) return;
    
    try {
      await deleteLessonPlan(id);
      toast.success("Lesson plan deleted successfully");
      await loadLessonPlans();
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lesson plan");
    }
  };

  const handleSubmitForReview = async (id: string) => {
    setIsSubmitting(true);
    try {
      await submitForReview(id);
      toast.success("Lesson plan submitted for review");
      await loadLessonPlans();
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit lesson plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportLessonPlan = (plan: LessonPlan) => {
    // In a real app, this would generate a PDF or DOCX
    const content = JSON.stringify(plan, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lesson-plan-${plan.topic}-${plan.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lesson plan exported successfully");
  };

  if (loading && lessonPlans.length === 0) {
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
        <h2 className="text-3xl font-bold text-gray-900">Lesson Planning</h2>
        <p className="text-muted-foreground mt-1">
          Create, manage, and submit lesson plans for your classes
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Plans</div>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-sm text-gray-500">Approved</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
                <div className="text-sm text-gray-500">Submitted</div>
              </div>
              <Send className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.thisWeek}</div>
                <div className="text-sm text-gray-500">This Week</div>
              </div>
              <Calendar className="w-8 h-8 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedLessonPlan(null);
                setShowFormModal(true);
              }}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Create New Plan
            </button>
            
            <button
              onClick={() => {
                // In a real app, this would import from file
                toast.info("Import feature coming soon!");
              }}
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" />
              Import Template
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search lesson plans..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filters.classId}
                onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Classes</option>
                {teacherClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Preview */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendar View</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const now = new Date();
                setSelectedMonth(now.getMonth());
                setSelectedYear(now.getFullYear());
              }}
              className="text-sm text-primary hover:text-primary/80"
            >
              Today
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="text-sm border border-border rounded px-2 py-1"
            >
              {[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ].map((month, index) => (
                <option key={month} value={index}>
                  {month} {selectedYear}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {calendarEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {calendarEvents.slice(0, 6).map(event => (
              <div 
                key={event.id} 
                className={`p-3 rounded-lg border ${
                  event.color === 'green' ? 'bg-green-50 border-green-200' :
                  event.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                  event.color === 'red' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900 truncate">{event.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{event.subject}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No lesson plans scheduled for this period
          </div>
        )}
        
        {calendarEvents.length > 6 && (
          <div className="text-center mt-4">
            <button
              onClick={() => toast.info("Full calendar view coming soon!")}
              className="text-primary hover:text-primary/80 text-sm"
            >
              View Full Calendar ({calendarEvents.length} plans)
            </button>
          </div>
        )}
      </div>

      {/* Lesson Plans Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Date</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Class & Subject</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Topic</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Duration</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLessonPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    {filters.search || filters.classId || filters.status 
                      ? "No lesson plans match your filters." 
                      : "No lesson plans created yet. Create your first lesson plan!"}
                  </td>
                </tr>
              ) : (
                filteredLessonPlans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(plan.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Week {plan.week} • Term {plan.term}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{plan.className}</div>
                      <div className="text-sm text-gray-500">{plan.subject}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{plan.topic}</div>
                      {plan.subTopic && (
                        <div className="text-sm text-gray-500">{plan.subTopic}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{plan.duration} min</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedLessonPlan(plan);
                            setShowViewModal(true);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {plan.status === 'draft' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedLessonPlan(plan);
                                setShowFormModal(true);
                              }}
                              className="text-blue-500 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleSubmitForReview(plan.id!)}
                              disabled={isSubmitting}
                              className="text-green-500 hover:text-green-700 disabled:opacity-50"
                              title="Submit for Review"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => handleExportLessonPlan(plan)}
                          className="text-purple-500 hover:text-purple-700"
                          title="Export"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        {plan.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteLessonPlan(plan.id!)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Modals */}
      <LessonPlanFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedLessonPlan(null);
        }}
        onSave={handleCreateLessonPlan}
        initialData={selectedLessonPlan || undefined}
        teacherClasses={teacherClasses}
        getTeacherSubjectsForClass={getTeacherSubjectsForClass}
      />

      {selectedLessonPlan && (
        <ViewLessonPlanModal
          lessonPlan={selectedLessonPlan}
          onClose={() => {
            setShowViewModal(false);
            setSelectedLessonPlan(null);
          }}
        />
      )}
    </div>
  );
}