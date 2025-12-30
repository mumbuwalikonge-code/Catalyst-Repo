// src/pages/TeacherDashboard/AssessmentGenerator.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Edit,
  Eye,
  Send,
  Filter,
  Search,
  Clock,
  BarChart3,
  BookOpen,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  Copy,
  Settings,
  FileQuestion,
  FileCheck,
  FileKey,
  Save,
} from "lucide-react";
import { useAssessments, Assessment, Question } from "@/hooks/useAssessments";
import { useLessonPlans } from "@/hooks/useLessonPlans";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Simplified interface for component stats
interface ComponentAssessmentStats {
  total: number;
  published: number;
  weekly: number;
  totalMarks: number;
}

// Question Type Badge
const QuestionTypeBadge = ({ type }: { type: Question['type'] }) => {
  const config = {
    mcq: { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      label: "MCQ",
      icon: "A"
    },
    short_answer: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      label: "Short Answer",
      icon: "SA"
    },
    essay: { 
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      label: "Essay",
      icon: "E"
    },
    true_false: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      label: "True/False",
      icon: "T/F"
    },
    fill_blank: { 
      color: "bg-indigo-100 text-indigo-800 border-indigo-200", 
      label: "Fill Blank",
      icon: "FB"
    },
  };

  const { color, label, icon } = config[type];

  return (
    <div className={`inline-flex items-center gap-1.5 ${color} border rounded-full px-2 py-0.5 text-xs font-medium`}>
      <span className="font-bold">{icon}</span>
      <span>{label}</span>
    </div>
  );
};

// Difficulty Badge
const DifficultyBadge = ({ difficulty }: { difficulty: Question['difficulty'] }) => {
  const config = {
    easy: { color: "bg-green-100 text-green-800 border-green-200", label: "Easy" },
    medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Medium" },
    hard: { color: "bg-red-100 text-red-800 border-red-200", label: "Hard" },
  };

  const { color, label } = config[difficulty];

  return (
    <div className={`inline-flex items-center gap-1 ${color} border rounded-full px-2 py-0.5 text-xs`}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        difficulty === 'easy' ? 'bg-green-500' :
        difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      {label}
    </div>
  );
};

// Question Editor Modal
const QuestionEditorModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData,
  topics
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  initialData?: Question;
  topics: string[];
}) => {
  const [question, setQuestion] = useState<Partial<Question>>({
    type: initialData?.type || 'mcq',
    question: initialData?.question || '',
    options: initialData?.options || ['', '', '', ''],
    correctAnswer: initialData?.correctAnswer || '',
    marks: initialData?.marks || 1,
    topic: initialData?.topic || topics[0] || '',
    difficulty: initialData?.difficulty || 'medium',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestion(prev => ({ 
      ...prev, 
      options: [...(prev.options || []), ''] 
    }));
  };

  const removeOption = (index: number) => {
    const newOptions = [...(question.options || [])];
    newOptions.splice(index, 1);
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.question?.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (question.type === 'mcq' && (!question.options || question.options.some(opt => !opt.trim()))) {
      toast.error("All MCQ options must be filled");
      return;
    }

    if (!question.correctAnswer) {
      toast.error("Correct answer is required");
      return;
    }

    setIsSaving(true);
    try {
      onSave(question as Question);
      onClose();
    } catch (error) {
      toast.error("Failed to save question");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Question" : "Add New Question"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Type & Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type *
              </label>
              <select
                value={question.type}
                onChange={(e) => setQuestion(prev => ({ 
                  ...prev, 
                  type: e.target.value as Question['type'],
                  options: e.target.value === 'mcq' ? ['', '', '', ''] : undefined
                }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="short_answer">Short Answer</option>
                <option value="essay">Essay</option>
                <option value="true_false">True/False</option>
                <option value="fill_blank">Fill in the Blank</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <select
                value={question.topic}
                onChange={(e) => setQuestion(prev => ({ ...prev, topic: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Select Topic</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty & Marks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty *
              </label>
              <select
                value={question.difficulty}
                onChange={(e) => setQuestion(prev => ({ 
                  ...prev, 
                  difficulty: e.target.value as Question['difficulty'] 
                }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks *
              </label>
              <input
                type="number"
                value={question.marks}
                onChange={(e) => setQuestion(prev => ({ 
                  ...prev, 
                  marks: parseInt(e.target.value) || 1 
                }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                min="1"
                max="20"
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={question.question}
              onChange={(e) => setQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter your question here..."
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[100px]"
              rows={3}
            />
          </div>

          {/* MCQ Options */}
          {question.type === 'mcq' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
                <span className="text-xs text-gray-500 ml-2">(Mark the correct answer)</span>
              </label>
              <div className="space-y-2">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={question.correctAnswer === option}
                      onChange={() => setQuestion(prev => ({ ...prev, correctAnswer: option }))}
                      className="text-primary"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1 p-2 border border-border rounded-lg"
                    />
                    {question.options!.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {question.options!.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Correct Answer for non-MCQ */}
          {question.type !== 'mcq' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer *
                {question.type === 'true_false' && (
                  <span className="text-xs text-gray-500 ml-2">(Select true or false)</span>
                )}
              </label>
              
              {question.type === 'true_false' ? (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      value="true"
                      checked={question.correctAnswer === 'true'}
                      onChange={(e) => setQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="text-primary"
                    />
                    <span>True</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      value="false"
                      checked={question.correctAnswer === 'false'}
                      onChange={(e) => setQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="text-primary"
                    />
                    <span>False</span>
                  </label>
                </div>
              ) : (
                <textarea
                  value={question.correctAnswer as string}
                  onChange={(e) => setQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                  placeholder="Enter the correct answer..."
                  className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px]"
                  rows={2}
                />
              )}
            </div>
          )}

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
                initialData ? "Update Question" : "Add Question"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assessment Configuration Modal
const AssessmentConfigModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData,
  teacherClasses,
  getTeacherSubjectsForClass,
  getCoveredTopics,
  getRecommendedTopicDistribution
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialData?: any;
  teacherClasses: any[];
  getTeacherSubjectsForClass: (classId: string) => string[];
  getCoveredTopics: (classId: string, subject: string, term: number) => Promise<string[]>;
  getRecommendedTopicDistribution: (classId: string, subject: string, term: number, week?: number) => Promise<Record<string, number>>;
}) => {
  const [config, setConfig] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    type: initialData?.type || 'weekly',
    classId: initialData?.classId || "",
    subject: initialData?.subject || "",
    term: initialData?.term || 1,
    week: initialData?.week || 1,
    totalMarks: initialData?.totalMarks || 50,
    duration: initialData?.duration || 60,
    instructions: initialData?.instructions || "Answer all questions.",
    topicBreakdown: initialData?.topicBreakdown || {},
  });

  const [topics, setTopics] = useState<string[]>([]);
  const [recommendedDistribution, setRecommendedDistribution] = useState<Record<string, number>>({});
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const subjects = config.classId ? getTeacherSubjectsForClass(config.classId) : [];

  // Load topics when class, subject, or term changes
  useEffect(() => {
    const loadTopics = async () => {
      if (!config.classId || !config.subject) return;
      
      setIsLoadingTopics(true);
      try {
        const coveredTopics = await getCoveredTopics(config.classId, config.subject, config.term);
        setTopics(coveredTopics);
        
        const distribution = await getRecommendedTopicDistribution(
          config.classId, 
          config.subject, 
          config.term,
          config.type === 'weekly' ? config.week : undefined
        );
        setRecommendedDistribution(distribution);
        
        // Auto-set topic breakdown if not set
        if (!initialData?.topicBreakdown && Object.keys(distribution).length > 0) {
          setConfig(prev => ({ ...prev, topicBreakdown: distribution }));
        }
      } catch (error) {
        console.error("Failed to load topics:", error);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    loadTopics();
  }, [config.classId, config.subject, config.term, config.week, config.type]);

  const handleTopicWeightChange = (topic: string, weight: number) => {
    setConfig(prev => ({
      ...prev,
      topicBreakdown: {
        ...prev.topicBreakdown,
        [topic]: weight
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.classId || !config.subject || !config.title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate topic breakdown sums to 100%
    const totalWeight = Object.values(config.topicBreakdown).reduce((sum: number, weight: number) => sum + weight, 0);
    if (totalWeight !== 100 && Object.keys(config.topicBreakdown).length > 0) {
      toast.error("Topic distribution must total 100%");
      return;
    }

    setIsSaving(true);
    try {
      const selectedClass = teacherClasses.find(c => c.id === config.classId);
      await onSave({
        ...config,
        className: selectedClass?.name || "",
        gradeLevel: selectedClass?.name?.match(/\d+/)?.[0] || "10", // Extract grade from class name
      });
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save assessment configuration");
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
            {initialData ? "Edit Assessment" : "Configure Assessment"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Title *
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Term 1 Mathematics Test"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type *
              </label>
              <select
                value={config.type}
                onChange={(e) => setConfig(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="weekly">Weekly Test</option>
                <option value="mid_term">Mid-Term Test</option>
                <option value="end_term">End of Term Exam</option>
                <option value="custom">Custom Assessment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the assessment..."
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              rows={2}
            />
          </div>

          {/* Class & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                value={config.classId}
                onChange={(e) => setConfig(prev => ({ ...prev, classId: e.target.value, subject: "" }))}
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
                value={config.subject}
                onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
                disabled={!config.classId}
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Term & Week */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term *
              </label>
              <select
                value={config.term}
                onChange={(e) => setConfig(prev => ({ ...prev, term: parseInt(e.target.value) }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {config.type === 'weekly' ? 'Week *' : 'Week (Optional)'}
              </label>
              <select
                value={config.week}
                onChange={(e) => setConfig(prev => ({ ...prev, week: parseInt(e.target.value) }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required={config.type === 'weekly'}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(week => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assessment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Marks *
              </label>
              <input
                type="number"
                value={config.totalMarks}
                onChange={(e) => setConfig(prev => ({ ...prev, totalMarks: parseInt(e.target.value) || 0 }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                min="1"
                max="200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                min="1"
                required
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={config.instructions}
              onChange={(e) => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Instructions for students..."
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              rows={3}
            />
          </div>

          {/* Topic Distribution */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900">Topic Distribution</h4>
              <button
                type="button"
                onClick={() => {
                  if (Object.keys(recommendedDistribution).length > 0) {
                    setConfig(prev => ({ ...prev, topicBreakdown: recommendedDistribution }));
                    toast.success("Applied recommended distribution");
                  }
                }}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <BarChart3 className="w-4 h-4" />
                Apply Recommended
              </button>
            </div>

            {isLoadingTopics ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading topics...</p>
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No topics found. Please ensure you have lesson plans for this class and subject.
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map(topic => {
                  const recommendedWeight = recommendedDistribution[topic] || 0;
                  const currentWeight = config.topicBreakdown[topic] || 0;
                  
                  return (
                    <div key={topic} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{topic}</div>
                        {recommendedWeight > 0 && (
                          <div className="text-xs text-gray-500">
                            Recommended: {recommendedWeight}%
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={currentWeight}
                          onChange={(e) => handleTopicWeightChange(topic, parseInt(e.target.value) || 0)}
                          className="w-20 p-2 border border-border rounded-lg text-center"
                          min="0"
                          max="100"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <div className="font-medium text-gray-900">Total</div>
                  <div className="font-bold text-primary">
                    {Object.values(config.topicBreakdown).reduce((sum: number, weight: number) => sum + weight, 0)}%
                  </div>
                </div>
              </div>
            )}
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
                initialData ? "Update Configuration" : "Create Assessment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Preview Assessment Modal
const PreviewAssessmentModal = ({ 
  assessment, 
  onClose,
  onGenerate
}: { 
  assessment: Assessment; 
  onClose: () => void;
  onGenerate: () => Promise<void>;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!assessment) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
      onClose();
    } catch (error) {
      toast.error("Failed to generate assessment files");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Assessment Preview</h3>
            <p className="text-sm text-gray-600">
              {assessment.className} • {assessment.subject} • Term {assessment.term}
              {assessment.week && ` • Week ${assessment.week}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Total Marks</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{assessment.totalMarks}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Duration</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{assessment.duration} min</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Questions</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{assessment.questions.length}</div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-2">Instructions</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-line">{assessment.instructions}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-900">Questions ({assessment.questions.length})</h4>
            <div className="text-sm text-gray-500">
              Total Marks: {assessment.questions.reduce((sum, q) => sum + q.marks, 0)}/{assessment.totalMarks}
            </div>
          </div>
          
          <div className="space-y-4">
            {assessment.questions.map((question, index) => (
              <div key={question.id || index} className="border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">Q{index + 1}.</span>
                    <QuestionTypeBadge type={question.type} />
                    <DifficultyBadge difficulty={question.difficulty} />
                  </div>
                  <div className="font-bold text-primary">{question.marks} mark(s)</div>
                </div>
                
                <p className="text-gray-900 mb-3">{question.question}</p>
                
                {question.type === 'mcq' && question.options && (
                  <div className="space-y-1 ml-4">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          option === question.correctAnswer 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-300'
                        }`}>
                          {option === question.correctAnswer && (
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          )}
                        </div>
                        <span className={`${
                          option === question.correctAnswer 
                            ? 'text-green-700 font-medium' 
                            : 'text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + optIndex)}) {option}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {question.type !== 'mcq' && (
                  <div className="ml-4">
                    <div className="text-sm text-gray-500 mb-1">Correct Answer:</div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
                      {question.correctAnswer}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  Topic: {question.topic}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Distribution */}
        {Object.keys(assessment.topicBreakdown).length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Topic Distribution</h4>
            <div className="space-y-2">
              {Object.entries(assessment.topicBreakdown).map(([topic, percentage]) => (
                <div key={topic} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{topic}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Files */}
        {assessment.questionPaperUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">Generated Files</h4>
            <div className="space-y-2">
              {assessment.questionPaperUrl && (
                <a 
                  href={assessment.questionPaperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileQuestion className="w-4 h-4" />
                  Question Paper (PDF)
                </a>
              )}
              {assessment.markingSchemeUrl && (
                <a 
                  href={assessment.markingSchemeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileCheck className="w-4 h-4" />
                  Marking Scheme (PDF)
                </a>
              )}
              {assessment.answerKeyUrl && (
                <a 
                  href={assessment.answerKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileKey className="w-4 h-4" />
                  Answer Key (PDF)
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 border border-border py-3 rounded-lg font-medium hover:bg-gray-50"
          >
            Close
          </button>
          
          {!assessment.questionPaperUrl ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Assessment Files
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                // Download all files
                toast.success("Downloading assessment files...");
                onClose();
              }}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
            >
              <span className="flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Download All Files
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AssessmentGenerator() {
  // Hooks
  const { 
    createAssessment,
    publishAssessment,
    getTeacherAssessments,
    getAssessmentStats,
    getTeacherClasses,
    getTeacherSubjectsForClass,
    getCoveredTopics,
    getRecommendedTopicDistribution,
    generateSampleQuestions,
    loading,
    error
  } = useAssessments();
  
  const { currentUser } = useAuth();
  
  // State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stats, setStats] = useState<ComponentAssessmentStats | null>(null);
  
  // Current assessment being edited
  const [currentAssessment, setCurrentAssessment] = useState<Partial<Assessment>>({
    title: "",
    type: 'weekly',
    classId: "",
    subject: "",
    term: 1,
    week: 1,
    totalMarks: 50,
    duration: 60,
    instructions: "Answer all questions.",
    questions: [],
    topicBreakdown: {},
    status: 'draft',
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    classId: "",
    subject: "",
    status: "",
    search: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Helper function to safely get error message
  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return 'An error occurred';
  };

  // Get teacher classes
  const teacherClasses = getTeacherClasses();

  // Load assessments
  useEffect(() => {
    loadAssessments();
  }, [filters]);

  // Load statistics
  useEffect(() => {
    loadStats();
  }, []);

  const loadAssessments = async () => {
    try {
      const assessmentsData = await getTeacherAssessments({
        classId: filters.classId || undefined,
        subject: filters.subject || undefined,
        status: filters.status as Assessment['status'] || undefined,
        term: filters.classId ? undefined : undefined, // Optional: add term filter
      });
      setAssessments(assessmentsData);
    } catch (error) {
      console.error("Failed to load assessments:", error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getAssessmentStats();
      if (statsData) {
        // Map the full stats to our component's simplified version
        setStats({
          total: statsData.total || 0,
          published: statsData.published || 0,
          weekly: statsData.weekly || 0,
          totalMarks: statsData.totalMarks || 0,
        });
      } else {
        setStats({
          total: 0,
          published: 0,
          weekly: 0,
          totalMarks: 0,
        });
      }
    } catch (error) {
      console.error("Failed to load assessment stats:", error);
      setStats({
        total: 0,
        published: 0,
        weekly: 0,
        totalMarks: 0,
      });
    }
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment => {
      if (!filters.search) return true;
      
      const searchLower = filters.search.toLowerCase();
      return (
        assessment.title.toLowerCase().includes(searchLower) ||
        assessment.className.toLowerCase().includes(searchLower) ||
        assessment.subject.toLowerCase().includes(searchLower) ||
        assessment.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [assessments, filters.search]);

  const handleSaveConfiguration = async (configData: any) => {
    if (!currentUser) return;
    
    try {
      setCurrentAssessment(prev => ({
        ...prev,
        ...configData,
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || "Teacher",
      }));
      
      // If we have topics, generate sample questions
      const topics = Object.keys(configData.topicBreakdown);
      if (topics.length > 0 && questions.length === 0) {
        const sampleQuestions = generateSampleQuestions(topics, Math.min(5, topics.length * 2));
        setQuestions(sampleQuestions);
      }
      
      setShowConfigModal(false);
      toast.success("Assessment configuration saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    }
  };

  const handleAddQuestion = (question: Question) => {
    if (selectedQuestion) {
      // Update existing question
      setQuestions(prev => prev.map(q => 
        q === selectedQuestion ? { ...question, id: q.id } : q
      ));
    } else {
      // Add new question
      setQuestions(prev => [...prev, { ...question, id: Date.now().toString() }]);
    }
    
    setShowQuestionModal(false);
    setSelectedQuestion(null);
    toast.success(selectedQuestion ? "Question updated" : "Question added");
  };

  const handleDeleteQuestion = (index: number) => {
    if (!confirm("Delete this question?")) return;
    
    setQuestions(prev => prev.filter((_, i) => i !== index));
    toast.success("Question deleted");
  };

  const handleGenerateSampleQuestions = () => {
    const topics = Object.keys(currentAssessment.topicBreakdown || {});
    if (topics.length === 0) {
      toast.error("Please configure topics first");
      return;
    }
    
    const sampleQuestions = generateSampleQuestions(topics, 5);
    setQuestions(sampleQuestions);
    toast.success(`Generated ${sampleQuestions.length} sample questions`);
  };

  const handleSaveAssessment = async () => {
    if (!currentAssessment.classId || !currentAssessment.subject || !currentAssessment.title) {
      toast.error("Please complete the assessment configuration first");
      return;
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    setIsGenerating(true);
    try {
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      
      const assessmentData = {
        ...currentAssessment,
        questions,
        totalMarks,
        status: 'draft' as const,
      };

      const assessmentId = await createAssessment(assessmentData as Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>);
      
      // Load the created assessment
      const updatedAssessments = await getTeacherAssessments();
      setAssessments(updatedAssessments);
      
      // Reset form
      setCurrentAssessment({
        title: "",
        type: 'weekly',
        classId: "",
        subject: "",
        term: 1,
        week: 1,
        totalMarks: 50,
        duration: 60,
        instructions: "Answer all questions.",
        questions: [],
        topicBreakdown: {},
        status: 'draft',
      });
      setQuestions([]);
      
      toast.success("Assessment saved successfully!");
      
      // Show preview of created assessment
      const createdAssessment = updatedAssessments.find(a => a.id === assessmentId);
      if (createdAssessment) {
        setCurrentAssessment(createdAssessment);
        setShowPreviewModal(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save assessment");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    setIsPublishing(true);
    try {
      await publishAssessment(assessmentId);
      toast.success("Assessment published successfully!");
      await loadAssessments();
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to publish assessment");
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading && assessments.length === 0) {
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
        <h2 className="text-3xl font-bold text-gray-900">Assessment Generator</h2>
        <p className="text-muted-foreground mt-1">
          Create and generate assessments for your classes with smart topic recommendations
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
                <div className="text-sm text-gray-500">Total Assessments</div>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.published || 0}</div>
                <div className="text-sm text-gray-500">Published</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.weekly || 0}</div>
                <div className="text-sm text-gray-500">Weekly Tests</div>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalMarks || 0}</div>
                <div className="text-sm text-gray-500">Total Marks</div>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Create New Assessment Card */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create New Assessment
            </h3>
            <p className="text-sm text-gray-600">
              Configure your assessment, add questions, and generate printable papers
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90"
            >
              <Settings className="w-4 h-4" />
              Configure Assessment
            </button>
            
            {currentAssessment.classId && currentAssessment.subject && (
              <button
                onClick={() => setShowQuestionModal(true)}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            )}
          </div>
        </div>

        {/* Current Configuration Summary */}
        {(currentAssessment.classId || questions.length > 0) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentAssessment.classId && (
              <div className="bg-white rounded-lg p-4 border border-border">
                <div className="text-sm text-gray-500">Configuration</div>
                <div className="font-medium text-gray-900 truncate">{currentAssessment.title || "Untitled"}</div>
                <div className="text-sm text-gray-600">
                  {currentAssessment.className} • {currentAssessment.subject}
                  {currentAssessment.week && ` • Week ${currentAssessment.week}`}
                </div>
              </div>
            )}
            
            {Object.keys(currentAssessment.topicBreakdown || {}).length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-border">
                <div className="text-sm text-gray-500">Topics</div>
                <div className="font-medium text-gray-900">
                  {Object.keys(currentAssessment.topicBreakdown || {}).length} topics
                </div>
                <div className="text-sm text-gray-600">
                  {Object.entries(currentAssessment.topicBreakdown || {})
                    .slice(0, 2)
                    .map(([topic]) => topic)
                    .join(", ")}
                  {Object.keys(currentAssessment.topicBreakdown || {}).length > 2 && "..."}
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-lg p-4 border border-border">
              <div className="text-sm text-gray-500">Questions</div>
              <div className="font-medium text-gray-900">{questions.length} questions</div>
              <div className="text-sm text-gray-600">
                {questions.reduce((sum, q) => sum + q.marks, 0)} total marks
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Questions Management */}
      {questions.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Questions ({questions.length})
                <span className="text-sm font-normal text-gray-500 ml-2">
                  Total Marks: {questions.reduce((sum, q) => sum + q.marks, 0)}
                </span>
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateSampleQuestions}
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Generate Samples
                </button>
                
                <button
                  onClick={handleSaveAssessment}
                  disabled={isGenerating}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Assessment
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">#</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Question</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Topic</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Difficulty</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Marks</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question, index) => (
                  <tr key={question.id || index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="py-3 px-6 font-medium text-gray-900">{index + 1}.</td>
                    <td className="py-3 px-6">
                      <div className="max-w-md">
                        <div className="text-gray-900 line-clamp-2">{question.question}</div>
                        {question.type === 'mcq' && question.options && (
                          <div className="text-xs text-gray-500 mt-1">
                            Options: {question.options.slice(0, 2).map(opt => opt.substring(0, 20)).join(", ")}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <QuestionTypeBadge type={question.type} />
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-sm text-gray-700">{question.topic}</div>
                    </td>
                    <td className="py-3 px-6">
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>
                    <td className="py-3 px-6 font-medium text-primary">{question.marks}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedQuestion(question);
                            setShowQuestionModal(true);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing Assessments */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Assessments</h3>
          
          <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search assessments..."
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
                <option value="generated">Generated</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAssessments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filters.search || filters.classId || filters.status 
              ? "No assessments match your filters." 
              : "No assessments created yet. Create your first assessment!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssessments.map(assessment => (
              <div key={assessment.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 truncate">{assessment.title}</h4>
                    <div className="text-sm text-gray-600">
                      {assessment.className} • {assessment.subject}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    assessment.status === 'published' ? 'bg-green-100 text-green-800' :
                    assessment.status === 'generated' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {assessment.status}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium">{assessment.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Term/Week:</span>
                    <span className="font-medium">
                      Term {assessment.term}
                      {assessment.week && ` • Week ${assessment.week}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Questions:</span>
                    <span className="font-medium">{assessment.questions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Marks:</span>
                    <span className="font-medium">{assessment.totalMarks}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => {
                      setCurrentAssessment(assessment);
                      setQuestions(assessment.questions || []);
                      setShowPreviewModal(true);
                    }}
                    className="flex-1 border border-border py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 inline-block mr-1" />
                    View
                  </button>
                  
                  {assessment.status === 'draft' && (
                    <button
                      onClick={() => handlePublishAssessment(assessment.id!)}
                      disabled={isPublishing}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-4 h-4 animate-spin inline-block" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 inline-block mr-1" />
                          Publish
                        </>
                      )}
                    </button>
                  )}
                  
                  {assessment.questionPaperUrl && (
                    <a
                      href={assessment.questionPaperUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 text-center"
                    >
                      <Download className="w-4 h-4 inline-block mr-1" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display - FIXED React Node Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">
            {getErrorMessage(error)}
          </p>
        </div>
      )}

      {/* Modals - FIXED Modal Rendering Issue */}
      <AssessmentConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfiguration}
        initialData={currentAssessment}
        teacherClasses={teacherClasses}
        getTeacherSubjectsForClass={getTeacherSubjectsForClass}
        getCoveredTopics={getCoveredTopics}
        getRecommendedTopicDistribution={getRecommendedTopicDistribution}
      />

      <QuestionEditorModal
        isOpen={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          setSelectedQuestion(null);
        }}
        onSave={handleAddQuestion}
        initialData={selectedQuestion || undefined}
        topics={Object.keys(currentAssessment.topicBreakdown || {})}
      />

      {/* FIX: Only render PreviewModal when showPreviewModal is true */}
      {showPreviewModal && currentAssessment && (
        <PreviewAssessmentModal
          assessment={currentAssessment as Assessment}
          onClose={() => setShowPreviewModal(false)}
          onGenerate={async () => {
            if (currentAssessment.id) {
              await handlePublishAssessment(currentAssessment.id);
            }
          }}
        />
      )}
    </div>
  );
}