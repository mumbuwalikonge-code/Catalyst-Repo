// src/pages/TeacherDashboard/SchemesOfWork.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Share,
  Edit,
  Trash2,
  Eye,
  Layers,
  Target,
  BarChart3,
  School,
  Users,
  CalendarDays,
  FileEdit,
  BookCopy,
  ChevronRight,
  ChevronDown,
  CalendarIcon,
  User,
  BookMarked,
  CheckSquare,
  ListChecks,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronUp,
  Link,
  Copy,
  MoreVertical,
  Settings,
  Archive,
  FileOutput,
  Printer,
} from 'lucide-react';
import { useSchemeOfWork } from '@/hooks/useSchemeOfWork';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useClassManagement } from '@/hooks/useClasses';

// Types (keep the same interfaces as before)
interface SchemeOfWork {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subject: string;
  gradeLevel: string;
  term: number;
  academicYear: string;
  title: string;
  description?: string;
  topics: Topic[];
  objectives: string[];
  resources: Resource[];
  assessmentCriteria: AssessmentCriterion[];
  totalWeeks: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  version: number;
  isTemplate: boolean;
  templateName?: string;
}

interface Topic {
  id: string;
  week: number;
  title: string;
  subtopics: string[];
  duration: number;
  learningObjectives: string[];
  teachingMethods: string[];
  activities: Activity[];
  assessmentMethods: string[];
  resources: Resource[];
  notes?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  completedDate?: Date;
}

interface Activity {
  id: string;
  title: string;
  type: 'individual' | 'group' | 'pair' | 'class';
  description: string;
  duration: number;
  materials: string[];
  objectives: string[];
}

interface Resource {
  id: string;
  type: 'textbook' | 'worksheet' | 'digital' | 'material' | 'other';
  title: string;
  description?: string;
  url?: string;
  quantity?: number;
  available: boolean;
}

interface AssessmentCriterion {
  id: string;
  type: 'formative' | 'summative' | 'diagnostic';
  description: string;
  weight: number;
  assessmentMethod: string;
  dueWeek: number;
}

interface FilterState {
  status: 'all' | 'draft' | 'published' | 'archived';
  classId: string;
  term: string;
  search: string;
}

// Scheme Creator Modal Component
const SchemeCreatorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { createScheme, loading } = useSchemeOfWork();
  const { classes } = useClassManagement();
  
  const [formData, setFormData] = useState({
    title: '',
    classId: '',
    className: '',
    subject: '',
    gradeLevel: '',
    term: 1,
    academicYear: '',
    totalWeeks: 12,
    description: '',
    isTemplate: false,
    templateName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);

  // Get current academic year
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear - 1}/${currentYear}`,
    `${currentYear}/${currentYear + 1}`,
    `${currentYear + 1}/${currentYear + 2}`,
  ];

  // Initialize academic year
  useEffect(() => {
    if (!formData.academicYear && academicYears[1]) {
      setFormData(prev => ({ ...prev, academicYear: academicYears[1] }));
    }
  }, []);

  // Update class info when class is selected
  useEffect(() => {
    if (formData.classId) {
      const selectedClass = classes.find(c => c.id === formData.classId);
      if (selectedClass) {
        setFormData(prev => ({
          ...prev,
          className: selectedClass.name,
          gradeLevel: selectedClass.gradeLevel || '',
        }));
      }
    }
  }, [formData.classId, classes]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.classId) newErrors.classId = 'Class is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.academicYear) newErrors.academicYear = 'Academic year is required';
    if (formData.totalWeeks < 1 || formData.totalWeeks > 52) newErrors.totalWeeks = 'Weeks must be between 1-52';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await createScheme({
        classId: formData.classId,
        className: formData.className,
        subject: formData.subject,
        gradeLevel: formData.gradeLevel,
        term: formData.term,
        academicYear: formData.academicYear,
        title: formData.title,
        description: formData.description,
        totalWeeks: formData.totalWeeks,
        isTemplate: formData.isTemplate,
        templateName: formData.templateName,
      });
      
      toast.success('Scheme of work created successfully');
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to create scheme of work');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      classId: '',
      className: '',
      subject: '',
      gradeLevel: '',
      term: 1,
      academicYear: academicYears[1] || '',
      totalWeeks: 12,
      description: '',
      isTemplate: false,
      templateName: '',
    });
    setErrors({});
    setStep(1);
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.classId) newErrors.classId = 'Class is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Create New Scheme of Work</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheme Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Grade 10 Mathematics Term 1"
                  className={`w-full p-2.5 border ${errors.title ? 'border-red-300' : 'border-border'} rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                    className={`w-full p-2.5 border ${errors.classId ? 'border-red-300' : 'border-border'} rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                  {errors.classId && <p className="mt-1 text-sm text-red-600">{errors.classId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Mathematics"
                    className={`w-full p-2.5 border ${errors.subject ? 'border-red-300' : 'border-border'} rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                  />
                  {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term *
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
                    Academic Year *
                  </label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                    className={`w-full p-2.5 border ${errors.academicYear ? 'border-red-300' : 'border-border'} rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                  >
                    <option value="">Select Year</option>
                    {academicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  {errors.academicYear && <p className="mt-1 text-sm text-red-600">{errors.academicYear}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this scheme of work..."
                  className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Weeks *
                  </label>
                  <input
                    type="number"
                    value={formData.totalWeeks}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalWeeks: parseInt(e.target.value) || 12 }))}
                    min="1"
                    max="52"
                    className={`w-full p-2.5 border ${errors.totalWeeks ? 'border-red-300' : 'border-border'} rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                  />
                  {errors.totalWeeks && <p className="mt-1 text-sm text-red-600">{errors.totalWeeks}</p>}
                  <p className="mt-1 text-xs text-gray-500">Number of teaching weeks in the term</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, gradeLevel: e.target.value }))}
                    placeholder="e.g., Grade 10"
                    className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    disabled
                  />
                </div>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="isTemplate"
                    checked={formData.isTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, isTemplate: e.target.checked }))}
                    className="w-4 h-4 text-primary rounded focus:ring-primary/20"
                  />
                  <label htmlFor="isTemplate" className="text-sm font-medium text-gray-700">
                    Save as Template
                  </label>
                </div>
                
                {formData.isTemplate && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.templateName}
                      onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
                      placeholder="e.g., Standard Mathematics Term 1"
                      className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Templates can be reused for other classes or terms
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Title:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Class:</span>
                    <span className="font-medium">{formData.className}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Subject:</span>
                    <span className="font-medium">{formData.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Term:</span>
                    <span className="font-medium">Term {formData.term} - {formData.academicYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Duration:</span>
                    <span className="font-medium">{formData.totalWeeks} weeks</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 mt-6 border-t border-border">
            {step === 2 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 border border-border py-3 rounded-lg font-medium hover:bg-gray-50"
              >
                Back
              </button>
            )}
            
            {step === 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </span>
                ) : (
                  'Create Scheme of Work'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Topic Progress Modal Component
const TopicProgressModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  scheme: SchemeOfWork;
  onSuccess: () => void;
}> = ({ isOpen, onClose, scheme, onSuccess }) => {
  const { updateTopic, loading } = useSchemeOfWork();
  const [topics, setTopics] = useState<Topic[]>(scheme.topics);
  const [activeWeek, setActiveWeek] = useState(1);

  const handleStatusChange = async (topicId: string, status: Topic['status']) => {
    try {
      await updateTopic(scheme.id, topicId, { status });
      
      // Update local state
      setTopics(prev => prev.map(topic =>
        topic.id === topicId ? { ...topic, status } : topic
      ));
      
      toast.success('Topic status updated');
      onSuccess();
    } catch (error) {
      toast.error('Failed to update topic status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  const currentWeekTopics = topics.filter(topic => topic.week === activeWeek);
  const completedTopics = topics.filter(t => t.status === 'completed').length;
  const totalTopics = topics.length;
  const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Update Progress</h3>
            <p className="text-sm text-gray-600 mt-1">{scheme.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Overall Progress</div>
              <div className="text-2xl font-bold text-primary">{completionRate}%</div>
              <div className="text-sm text-gray-600">
                {completedTopics} of {totalTopics} topics completed
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs">Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs">In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-xs">Planned</span>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="bg-primary h-2 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Week Navigation */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Select Week</h4>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: scheme.totalWeeks }, (_, i) => i + 1).map(week => {
              const weekTopics = topics.filter(t => t.week === week);
              const completedWeekTopics = weekTopics.filter(t => t.status === 'completed').length;
              const totalWeekTopics = weekTopics.length;
              const weekCompletion = totalWeekTopics > 0 ? Math.round((completedWeekTopics / totalWeekTopics) * 100) : 0;
              
              return (
                <button
                  key={week}
                  onClick={() => setActiveWeek(week)}
                  className={`px-4 py-2 rounded-lg border ${activeWeek === week ? 'border-primary bg-primary/5' : 'border-border hover:bg-gray-50'}`}
                >
                  <div className="text-sm font-medium">Week {week}</div>
                  <div className="text-xs text-gray-500">{weekCompletion}% complete</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Week Topics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Week {activeWeek} Topics</h4>
          
          {currentWeekTopics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No topics scheduled for this week
            </div>
          ) : (
            <div className="space-y-3">
              {currentWeekTopics.map(topic => (
                <div key={topic.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">{topic.title}</h5>
                      <div className="text-sm text-gray-600 mt-1">
                        {topic.duration} hours • {topic.subtopics.length} subtopics
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(topic.status)}`}>
                      {topic.status.replace('_', ' ')}
                    </div>
                  </div>
                  
                  {topic.subtopics.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Subtopics:</div>
                      <div className="flex flex-wrap gap-2">
                        {topic.subtopics.map((subtopic, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {subtopic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(topic.id, 'planned')}
                      disabled={loading || topic.status === 'planned'}
                      className={`flex-1 px-3 py-1.5 text-sm rounded border ${topic.status === 'planned' ? 'bg-gray-100 text-gray-700 border-gray-300' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                      Planned
                    </button>
                    <button
                      onClick={() => handleStatusChange(topic.id, 'in_progress')}
                      disabled={loading || topic.status === 'in_progress'}
                      className={`flex-1 px-3 py-1.5 text-sm rounded border ${topic.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-blue-300 hover:bg-blue-50'}`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(topic.id, 'completed')}
                      disabled={loading || topic.status === 'completed'}
                      className={`flex-1 px-3 py-1.5 text-sm rounded border ${topic.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' : 'border-green-300 hover:bg-green-50'}`}
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => handleStatusChange(topic.id, 'delayed')}
                      disabled={loading || topic.status === 'delayed'}
                      className={`flex-1 px-3 py-1.5 text-sm rounded border ${topic.status === 'delayed' ? 'bg-red-100 text-red-700 border-red-300' : 'border-red-300 hover:bg-red-50'}`}
                    >
                      Delayed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 border border-border py-3 rounded-lg font-medium hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => {
              toast.success('Progress saved successfully');
              onClose();
            }}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Schemes of Work Component
const SchemesOfWork: React.FC = () => {
  const { currentUser } = useAuth();
  const { schemes, stats, loading, error, getSchemes, publishScheme, getStats } = useSchemeOfWork();
  const { classes, loading: classesLoading } = useClassManagement();
  
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    classId: '',
    term: '',
    search: '',
  });

  const [selectedScheme, setSelectedScheme] = useState<SchemeOfWork | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter(scheme => {
      if (filters.status !== 'all' && scheme.status !== filters.status) return false;
      if (filters.classId && scheme.classId !== filters.classId) return false;
      if (filters.term && scheme.term !== parseInt(filters.term)) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          scheme.title.toLowerCase().includes(searchLower) ||
          scheme.subject.toLowerCase().includes(searchLower) ||
          scheme.className.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [schemes, filters]);

  // Get unique terms from schemes
  const uniqueTerms = useMemo(() => {
    const terms = schemes.map(s => s.term);
    return Array.from(new Set(terms)).sort();
  }, [schemes]);

  const handleCreateScheme = () => {
    setShowCreateModal(true);
  };

  const handleUpdateProgress = (scheme: SchemeOfWork) => {
    setSelectedScheme(scheme);
    setShowProgressModal(true);
  };

  const handlePublishScheme = async (schemeId: string) => {
    const success = await publishScheme(schemeId);
    if (success) {
      await getSchemes();
      await getStats();
    }
  };

  const toggleSchemeExpand = (schemeId: string) => {
    setExpandedScheme(expandedScheme === schemeId ? null : schemeId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressPercentage = (scheme: SchemeOfWork) => {
    const totalTopics = scheme.topics.length;
    const completedTopics = scheme.topics.filter(t => t.status === 'completed').length;
    return totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  };

  const handleSuccess = () => {
    getSchemes();
    getStats();
  };

  if (loading && schemes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-600">Loading schemes of work...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Schemes of Work</h2>
          <p className="text-muted-foreground mt-1">
            Plan and manage your curriculum for the academic term
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium text-gray-700">Teacher: {currentUser?.name}</span>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalSchemes || 0}</div>
              <div className="text-sm text-gray-500">Total Schemes</div>
            </div>
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats?.publishedSchemes || 0}</div>
              <div className="text-sm text-gray-500">Published</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats?.completedTopics || 0}</div>
              <div className="text-sm text-gray-500">Topics Completed</div>
            </div>
            <ListChecks className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats?.averageCompletionRate || 0}%</div>
              <div className="text-sm text-gray-500">Avg Completion</div>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create New Scheme of Work
            </h3>
            <p className="text-sm text-gray-600">
              Start planning your curriculum for the upcoming term with our guided template
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCreateScheme}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Create New Scheme
            </button>
            
            <button
              onClick={() => toast.info('Template gallery coming soon!')}
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              <BookCopy className="w-4 h-4" />
              Use Template
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Schemes of Work</h3>
          
          <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search schemes..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={filters.classId}
                onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                disabled={classesLoading}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

              <select
                value={filters.term}
                onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Terms</option>
                {uniqueTerms.map(term => (
                  <option key={term} value={term}>Term {term}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Schemes List */}
        {filteredSchemes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filters.search || filters.classId || filters.term 
              ? "No schemes match your filters." 
              : "No schemes of work created yet. Create your first scheme!"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSchemes.map(scheme => {
              const progress = getProgressPercentage(scheme);
              const completedTopics = scheme.topics.filter(t => t.status === 'completed').length;
              const inProgressTopics = scheme.topics.filter(t => t.status === 'in_progress').length;
              
              return (
                <div key={scheme.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Scheme Header */}
                  <div 
                    className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleSchemeExpand(scheme.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedScheme === scheme.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">{scheme.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <School className="w-4 h-4" />
                              {scheme.className}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookMarked className="w-4 h-4" />
                              {scheme.subject}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              Term {scheme.term} • {scheme.academicYear}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Progress</div>
                          <div className="font-semibold text-primary">{progress}%</div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(scheme.status)}`}>
                          {scheme.status.charAt(0).toUpperCase() + scheme.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedScheme === scheme.id && (
                    <div className="p-4 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Progress Overview */}
                        <div className="space-y-4">
                          <h5 className="font-semibold text-gray-900">Progress Overview</h5>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Completion</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-green-50 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{completedTopics}</div>
                                <div className="text-xs text-green-700">Completed</div>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{inProgressTopics}</div>
                                <div className="text-xs text-blue-700">In Progress</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="text-lg font-bold text-gray-600">{scheme.topics.length - completedTopics - inProgressTopics}</div>
                                <div className="text-xs text-gray-700">Pending</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Topics Overview */}
                        <div className="space-y-4">
                          <h5 className="font-semibold text-gray-900">Topics ({scheme.topics.length})</h5>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {scheme.topics.slice(0, 5).map(topic => (
                              <div key={topic.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    topic.status === 'completed' ? 'bg-green-500' :
                                    topic.status === 'in_progress' ? 'bg-yellow-500' :
                                    topic.status === 'delayed' ? 'bg-red-500' : 'bg-gray-300'
                                  }`} />
                                  <span className="text-sm">{topic.title}</span>
                                </div>
                                <span className="text-xs text-gray-500">Week {topic.week}</span>
                              </div>
                            ))}
                            {scheme.topics.length > 5 && (
                              <div className="text-center text-sm text-gray-500">
                                +{scheme.topics.length - 5} more topics
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4">
                          <h5 className="font-semibold text-gray-900">Actions</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setSelectedScheme(scheme);
                                // You can implement edit functionality here
                                toast.info('Edit functionality coming soon!');
                              }}
                              className="flex items-center justify-center gap-2 p-2 border border-border rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            
                            <button
                              onClick={() => handleUpdateProgress(scheme)}
                              className="flex items-center justify-center gap-2 p-2 border border-border rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              <CheckSquare className="w-4 h-4" />
                              Update Progress
                            </button>
                            
                            {scheme.status === 'draft' && (
                              <button
                                onClick={() => handlePublishScheme(scheme.id)}
                                className="col-span-2 flex items-center justify-center gap-2 p-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                              >
                                <Share className="w-4 h-4" />
                                Publish Scheme
                              </button>
                            )}
                            
                            <button
                              onClick={() => toast.info('Export feature coming soon!')}
                              className="col-span-2 flex items-center justify-center gap-2 p-2 border border-border rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              <Download className="w-4 h-4" />
                              Export (PDF/Excel)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-5 h-5 text-red-500">!</div>
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <SchemeCreatorModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showProgressModal && selectedScheme && (
        <TopicProgressModal
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          scheme={selectedScheme}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default SchemesOfWork;