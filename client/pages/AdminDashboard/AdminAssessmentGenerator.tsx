// src/pages/AdminDashboard/AdminAssessmentGenerator.tsx
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
  Copy,
  Settings,
  FileQuestion,
  FileCheck,
  FileKey,
  Save,
  School,
  Layers,
  TrendingUp,
  Target,
  Brain,
  Scale,
  ShieldCheck,
  FileBarChart,
} from "lucide-react";
import { useAssessments, Assessment, Question, AssessmentStats } from "@/hooks/useAssessments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAdminStats, ClassProgress } from "@/hooks/useAdminStats";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

// Define interfaces for Firestore document data
interface ClassDocument {
  id: string;
  name?: string;
  learnerIds?: string[];
  [key: string]: unknown;
}

interface LessonPlanDocument {
  id: string;
  classId?: string;
  subject?: string;
  topic?: string;
  [key: string]: unknown;
}

interface TeacherAssignmentDocument {
  id: string;
  subjects?: string[];
  [key: string]: unknown;
}

// Extend the Assessment interface for grade-wide assessments
interface GradeAssessment extends Omit<Assessment, 'classId' | 'className'> {
  grade: string;
  subject: string;
  totalClasses: number;
  averageTopicCoverage: Record<string, number>;
  standardAlignmentScore: number;
  examType: 'mid_term' | 'end_term' | 'final' | 'mock' | 'prelim';
  alignmentToStandard: number;
  difficultyProfile: {
    easy: number;
    medium: number;
    hard: number;
  };
  includeMarkingScheme: boolean;
  includeAnswerKey: boolean;
  generatedAt?: Date;
  isGradeWide?: boolean;
  questionPaperUrl?: string;
  publishedAt?: Date;
  // Add classId and className since they're needed in Firestore
  classId?: string;
  className?: string;
}

// Interface for aggregated topic data
interface AggregatedTopicData {
  topic: string;
  coveragePercentage: number;
  teacherCount: number;
  standardWeight: number;
  finalWeight: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

// Interface for grade statistics
interface GradeStat {
  grade: string;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  subjects: string[];
  averagePerformance: number;
  assessmentHistory: {
    totalAssessments: number;
    averageScore: number;
    lastAssessmentDate: string;
  };
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

  const { color, label, icon } = config[type] || config.mcq;

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

  const { color, label } = config[difficulty] || config.medium;

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

// Custom hooks for admin functionality
const useAdminAssessment = () => {
  const { createAssessment, publishAssessment, generateSampleQuestions } = useAssessments();
  const { currentUser } = useAuth();

  // Get grade statistics from classes data
  const getGradeStatistics = async (): Promise<GradeStat[]> => {
    try {
      const classesSnapshot = await getDocs(collection(db, "classes"));
      const classes = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClassDocument));

      // Group classes by grade
      const gradeMap = new Map<string, GradeStat>();
      
      for (const cls of classes) {
        const className = cls.name || "";
        const gradeMatch = className.match(/(\d+)/);
        const grade = gradeMatch ? gradeMatch[1] : "Other";
        
        if (!gradeMap.has(grade)) {
          gradeMap.set(grade, {
            grade,
            totalClasses: 0,
            totalStudents: 0,
            totalTeachers: 0,
            subjects: [],
            averagePerformance: 75, // Default value
            assessmentHistory: {
              totalAssessments: 0,
              averageScore: 0,
              lastAssessmentDate: new Date().toISOString()
            }
          });
        }
        
        const gradeStat = gradeMap.get(grade)!;
        gradeStat.totalClasses += 1;
        gradeStat.totalStudents += (cls.learnerIds?.length || 0);
        
        // Get teachers for this class
        const assignmentsSnapshot = await getDocs(
          query(collection(db, "teacherAssignments"), where("classId", "==", cls.id))
        );
        gradeStat.totalTeachers += assignmentsSnapshot.size;
        
        // Get subjects from teacher assignments
        assignmentsSnapshot.forEach(doc => {
          const assignment = doc.data() as TeacherAssignmentDocument;
          if (assignment.subjects) {
            gradeStat.subjects = [...new Set([...gradeStat.subjects, ...assignment.subjects])];
          }
        });
      }
      
      return Array.from(gradeMap.values());
    } catch (error) {
      console.error("Error getting grade statistics:", error);
      return [];
    }
  };

  // Get aggregated topic coverage across all teachers in a grade
  const getAggregatedTopicCoverage = async (): Promise<Record<string, AggregatedTopicData[]>> => {
    try {
      // Get all lesson plans
      const lessonPlansSnapshot = await getDocs(collection(db, "lessonPlans"));
      const lessonPlans = lessonPlansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LessonPlanDocument));

      // Get all classes to map class IDs to grades
      const classesSnapshot = await getDocs(collection(db, "classes"));
      const classGradeMap = new Map<string, string>();
      
      classesSnapshot.docs.forEach(doc => {
        const cls = doc.data() as ClassDocument;
        const className = cls.name || "";
        const gradeMatch = className.match(/(\d+)/);
        const grade = gradeMatch ? gradeMatch[1] : "Other";
        classGradeMap.set(doc.id, grade);
      });

      // Group lesson plans by grade and subject
      const groupedData = new Map<string, Map<string, AggregatedTopicData>>();

      for (const plan of lessonPlans) {
        const grade = classGradeMap.get(plan.classId || "") || "Other";
        const subject = plan.subject || "General";
        const topic = plan.topic || "Untitled";
        const key = `${grade}_${subject}`;

        if (!groupedData.has(key)) {
          groupedData.set(key, new Map());
        }

        const topicMap = groupedData.get(key)!;
        
        if (!topicMap.has(topic)) {
          topicMap.set(topic, {
            topic,
            coveragePercentage: 0,
            teacherCount: 0,
            standardWeight: 25, // Default standard weight
            finalWeight: 25,
            difficultyDistribution: { easy: 33, medium: 34, hard: 33 }
          });
        }

        const topicData = topicMap.get(topic)!;
        topicData.teacherCount += 1;
        topicData.coveragePercentage = Math.min(100, topicData.coveragePercentage + 20); // Simple coverage calculation
      }

      // Convert to final format
      const result: Record<string, AggregatedTopicData[]> = {};
      
      for (const [key, topicMap] of groupedData) {
        const topics = Array.from(topicMap.values());
        
        // Calculate final weights based on coverage
        const totalCoverage = topics.reduce((sum, t) => sum + t.coveragePercentage, 0);
        topics.forEach(topic => {
          topic.finalWeight = Math.round((topic.coveragePercentage / totalCoverage) * 100);
        });
        
        result[key] = topics;
      }

      return result;
    } catch (error) {
      console.error("Error getting aggregated topic coverage:", error);
      return {};
    }
  };

  // Generate grade-wide assessment
  const generateGradeAssessment = async (config: any): Promise<Question[]> => {
    const topics = Object.keys(config.topicBreakdown || {});
    const totalQuestions = 20; // Default number of questions
    
    // Use the existing generateSampleQuestions function
    const questions = generateSampleQuestions(topics, totalQuestions);
    
    // Adjust marks based on difficulty profile
    return questions.map((question, index) => {
      // Distribute difficulty according to profile
      const difficultyProfile = config.difficultyProfile || { easy: 30, medium: 50, hard: 20 };
      const easyCount = Math.floor(totalQuestions * (difficultyProfile.easy || 30) / 100);
      const mediumCount = Math.floor(totalQuestions * (difficultyProfile.medium || 50) / 100);
      
      let difficulty: Question['difficulty'];
      if (index < easyCount) {
        difficulty = 'easy';
      } else if (index < easyCount + mediumCount) {
        difficulty = 'medium';
      } else {
        difficulty = 'hard';
      }
      
      return {
        ...question,
        difficulty,
        marks: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 5
      };
    });
  };

  // Create grade-wide assessment
  const createGradeAssessment = async (assessmentData: Omit<GradeAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!currentUser) throw new Error("User not authenticated");
    
    try {
      // Create a regular assessment with grade info
      const assessmentRef = doc(collection(db, "assessments"));
      
      const assessment: Assessment = {
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || "Administrator",
        title: assessmentData.title,
        description: assessmentData.description,
        type: 'custom', // Use custom type for grade assessments
        classId: assessmentData.classId || `grade-${assessmentData.grade}`,
        className: assessmentData.className || `Grade ${assessmentData.grade} (All Classes)`,
        subject: assessmentData.subject,
        term: assessmentData.term,
        gradeLevel: assessmentData.grade,
        totalMarks: assessmentData.totalMarks,
        duration: assessmentData.duration,
        instructions: assessmentData.instructions,
        questions: assessmentData.questions,
        topicBreakdown: assessmentData.topicBreakdown,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(assessmentRef, {
        ...assessment,
        // Add grade-specific metadata
        grade: assessmentData.grade,
        totalClasses: assessmentData.totalClasses,
        averageTopicCoverage: assessmentData.averageTopicCoverage,
        standardAlignmentScore: assessmentData.standardAlignmentScore,
        examType: assessmentData.examType,
        alignmentToStandard: assessmentData.alignmentToStandard,
        difficultyProfile: assessmentData.difficultyProfile,
        includeMarkingScheme: assessmentData.includeMarkingScheme,
        includeAnswerKey: assessmentData.includeAnswerKey,
        isGradeWide: true, // Flag to identify grade-wide assessments
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return assessmentRef.id;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create grade assessment");
    }
  };

  // Get grade-wide assessments
  const getGradeAssessments = async (): Promise<GradeAssessment[]> => {
    try {
      if (!currentUser?.uid) return [];
      
      const q = query(
        collection(db, "assessments"),
        where("isGradeWide", "==", true),
        where("teacherId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          teacherId: data.teacherId || "",
          teacherName: data.teacherName || "",
          title: data.title || "",
          description: data.description || "",
          type: data.type || 'custom',
          classId: data.classId || "",
          className: data.className || "",
          subject: data.subject || "",
          term: data.term || 1,
          gradeLevel: data.gradeLevel || "",
          totalMarks: data.totalMarks || 0,
          duration: data.duration || 120,
          instructions: data.instructions || "",
          questions: data.questions || [],
          topicBreakdown: data.topicBreakdown || {},
          status: data.status || 'draft',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          grade: data.grade || "",
          totalClasses: data.totalClasses || 0,
          averageTopicCoverage: data.averageTopicCoverage || {},
          standardAlignmentScore: data.standardAlignmentScore || 0,
          examType: data.examType || 'mid_term',
          alignmentToStandard: data.alignmentToStandard || 0,
          difficultyProfile: data.difficultyProfile || { easy: 30, medium: 50, hard: 20 },
          includeMarkingScheme: data.includeMarkingScheme !== false,
          includeAnswerKey: data.includeAnswerKey !== false,
          publishedAt: data.publishedAt?.toDate(),
          generatedAt: data.generatedAt?.toDate(),
          questionPaperUrl: data.questionPaperUrl,
        } as GradeAssessment;
      });
    } catch (error) {
      console.error("Error getting grade assessments:", error);
      return [];
    }
  };

  return {
    getGradeStatistics,
    getAggregatedTopicCoverage,
    generateGradeAssessment,
    createGradeAssessment,
    getGradeAssessments,
  };
};

// Topic Coverage Visualization
const TopicCoverageChart = ({ topic, coverage, standardWeight, teacherCount }: {
  topic: string;
  coverage: number;
  standardWeight: number;
  teacherCount: number;
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-900">{topic}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{teacherCount} teachers</span>
          <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            {coverage}%
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Actual Coverage</span>
          <span className="font-medium">{coverage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${Math.min(coverage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Standard Weight</span>
          <span className="font-medium">{standardWeight}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full"
            style={{ width: `${Math.min(standardWeight, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Assessment Configuration Modal for Admin
const AdminAssessmentConfigModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData,
  gradeStats,
  aggregatedTopics
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialData?: any;
  gradeStats: GradeStat[];
  aggregatedTopics: Record<string, AggregatedTopicData[]>;
}) => {
  const [config, setConfig] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    type: 'custom' as const,
    grade: initialData?.grade || "",
    subject: initialData?.subject || "",
    term: initialData?.term || 1,
    examType: initialData?.examType || 'mid_term',
    totalMarks: initialData?.totalMarks || 100,
    duration: initialData?.duration || 120,
    instructions: initialData?.instructions || "Answer all questions. Show all your workings where necessary.",
    topicBreakdown: initialData?.topicBreakdown || {},
    difficultyProfile: initialData?.difficultyProfile || {
      easy: 30,
      medium: 50,
      hard: 20
    },
    alignmentToStandard: initialData?.alignmentToStandard || 80,
    includeMarkingScheme: initialData?.includeMarkingScheme !== false,
    includeAnswerKey: initialData?.includeAnswerKey !== false,
  });

  const [selectedGradeStats, setSelectedGradeStats] = useState<GradeStat | null>(null);
  const [topics, setTopics] = useState<AggregatedTopicData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Update topics when grade or subject changes
  useEffect(() => {
    if (config.grade && config.subject) {
      const key = `${config.grade}_${config.subject}`;
      const gradeTopics = aggregatedTopics[key] || [];
      setTopics(gradeTopics);
      
      // Set default topic breakdown based on final weights
      if (!initialData?.topicBreakdown && gradeTopics.length > 0) {
        const breakdown = gradeTopics.reduce((acc: Record<string, number>, topic) => {
          acc[topic.topic] = topic.finalWeight;
          return acc;
        }, {});
        
        setConfig(prev => ({ ...prev, topicBreakdown: breakdown }));
      }
      
      // Set selected grade stats
      const stats = gradeStats.find(stat => stat.grade === config.grade);
      setSelectedGradeStats(stats || null);
    }
  }, [config.grade, config.subject, aggregatedTopics]);

  const handleTopicWeightChange = (topic: string, weight: number) => {
    setConfig(prev => ({
      ...prev,
      topicBreakdown: {
        ...prev.topicBreakdown,
        [topic]: weight
      }
    }));
  };

  const handleDifficultyChange = (level: 'easy' | 'medium' | 'hard', value: number) => {
    setConfig(prev => ({
      ...prev,
      difficultyProfile: {
        ...prev.difficultyProfile,
        [level]: value
      }
    }));
  };

  const calculateStandardAlignment = () => {
    if (topics.length === 0) return 0;
    
    let alignment = 0;
    let totalWeight = 0;
    
    topics.forEach(topic => {
      const configuredWeight = config.topicBreakdown[topic.topic] || 0;
      const deviation = Math.abs(topic.standardWeight - configuredWeight);
      alignment += (100 - deviation) * (topic.standardWeight / 100);
      totalWeight += topic.standardWeight;
    });
    
    return Math.round(alignment / (totalWeight || 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.grade || !config.subject || !config.title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // FIXED: Validate topic breakdown sums to 100%
    const totalWeight = Object.values(config.topicBreakdown).reduce((sum: number, weight: any) => {
      const numWeight = typeof weight === 'number' ? weight : 0;
      return sum + numWeight;
    }, 0);
    
    if (Math.abs(totalWeight - 100) > 1) { // Allow 1% tolerance
      toast.error("Topic distribution must total 100%");
      return;
    }

    // FIXED: Validate difficulty profile sums to 100%
    const difficultyTotal = Object.values(config.difficultyProfile).reduce((sum: number, value: any) => {
      const numValue = typeof value === 'number' ? value : 0;
      return sum + numValue;
    }, 0);
    
    if (Math.abs(difficultyTotal - 100) > 1) {
      toast.error("Difficulty profile must total 100%");
      return;
    }

    setIsSaving(true);
    try {
      const alignmentScore = calculateStandardAlignment();
      const gradeStat = gradeStats.find(stat => stat.grade === config.grade);
      
      await onSave({
        ...config,
        alignmentToStandard: alignmentScore,
        totalClasses: gradeStat?.totalClasses || 0,
        totalStudents: gradeStat?.totalStudents || 0,
        totalTeachers: gradeStat?.totalTeachers || 0,
        averageTopicCoverage: topics.reduce((acc: Record<string, number>, topic) => {
          acc[topic.topic] = topic.coveragePercentage;
          return acc;
        }, {}),
        standardAlignmentScore: alignmentScore,
      });
      
      onClose();
      toast.success("Assessment configuration saved");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save assessment configuration";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Grade Assessment" : "Configure Grade-Wide Assessment"}
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
                placeholder="e.g., Grade 10 Mathematics Mid-Term Exam"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type
              </label>
              <div className="w-full p-2.5 border border-border rounded-lg bg-gray-50 text-gray-600">
                Grade-Wide Assessment
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description of the assessment purpose and scope..."
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              rows={2}
            />
          </div>

          {/* Grade & Subject Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level *
              </label>
              <select
                value={config.grade}
                onChange={(e) => setConfig(prev => ({ ...prev, grade: e.target.value, subject: "" }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              >
                <option value="">Select Grade</option>
                {gradeStats.map(stat => (
                  <option key={stat.grade} value={stat.grade}>
                    Grade {stat.grade} ({stat.totalClasses} classes, {stat.totalStudents} students)
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
                disabled={!config.grade}
              >
                <option value="">Select Subject</option>
                {selectedGradeStats?.subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade Statistics */}
          {selectedGradeStats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Grade Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">{selectedGradeStats.totalClasses}</div>
                  <div className="text-xs text-blue-600">Classes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">{selectedGradeStats.totalStudents}</div>
                  <div className="text-xs text-blue-600">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">{selectedGradeStats.totalTeachers}</div>
                  <div className="text-xs text-blue-600">Teachers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">{selectedGradeStats.averagePerformance}%</div>
                  <div className="text-xs text-blue-600">Avg Performance</div>
                </div>
              </div>
            </div>
          )}

          {/* Term & Exam Type */}
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
                Exam Type *
              </label>
              <select
                value={config.examType}
                onChange={(e) => setConfig(prev => ({ ...prev, examType: e.target.value }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="mid_term">Mid-Term Exam</option>
                <option value="end_term">End of Term Exam</option>
                <option value="prelim">Preliminary Exam</option>
                <option value="mock">Mock Exam</option>
                <option value="final">Final Exam</option>
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
                onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 120 }))}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                min="30"
                required
              />
            </div>
          </div>

          {/* Difficulty Profile */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Difficulty Profile</h4>
            <div className="space-y-4">
              {(['easy', 'medium', 'hard'] as const).map(level => {
                const colorClass = level === 'easy' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
                const bgColorClass = level === 'easy' ? 'bg-green-600' : level === 'medium' ? 'bg-yellow-600' : 'bg-red-600';
                return (
                  <div key={level} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                        <span className="text-sm font-medium capitalize">{level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={config.difficultyProfile[level]}
                          onChange={(e) => handleDifficultyChange(level, parseInt(e.target.value) || 0)}
                          className="w-20 p-2 border border-border rounded-lg text-center"
                          min="0"
                          max="100"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${bgColorClass}`}
                        style={{ width: `${config.difficultyProfile[level]}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <div className="font-medium text-gray-900">Total</div>
                <div className="font-bold text-primary">
                  {Object.values(config.difficultyProfile).reduce((sum: number, value: unknown) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return sum + numValue;
                  }, 0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Topic Distribution */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900">Topic Distribution</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Alignment to Standard: {calculateStandardAlignment()}%
                </span>
                <Scale className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {topics.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {!config.grade || !config.subject 
                  ? "Select grade and subject to view topics" 
                  : "No topic data available for this grade and subject"}
              </div>
            ) : (
              <div className="space-y-4">
                {topics.map(topic => {
                  const currentWeight = config.topicBreakdown[topic.topic] || 0;
                  const deviation = Math.abs(topic.standardWeight - currentWeight);
                  
                  return (
                    <div key={topic.topic} className="space-y-3">
                      <TopicCoverageChart
                        topic={topic.topic}
                        coverage={topic.coveragePercentage}
                        standardWeight={topic.standardWeight}
                        teacherCount={topic.teacherCount}
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Recommended weight: {topic.finalWeight}%
                          {deviation > 10 && (
                            <span className="ml-2 text-amber-600">
                              (Deviation: {deviation}%)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={currentWeight}
                            onChange={(e) => handleTopicWeightChange(topic.topic, parseInt(e.target.value) || 0)}
                            className="w-20 p-2 border border-border rounded-lg text-center"
                            min="0"
                            max="100"
                          />
                          <span className="text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <div className="font-medium text-gray-900">Total Distribution</div>
                  <div className="font-bold text-primary">
                    {Object.values(config.topicBreakdown).reduce((sum: number, weight: unknown) => {
                      const numWeight = typeof weight === 'number' ? weight : 0;
                      return sum + numWeight;
                    }, 0)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeMarkingScheme"
                checked={config.includeMarkingScheme}
                onChange={(e) => setConfig(prev => ({ ...prev, includeMarkingScheme: e.target.checked }))}
                className="w-4 h-4 text-primary rounded focus:ring-primary/20"
              />
              <label htmlFor="includeMarkingScheme" className="text-sm text-gray-700">
                Include Detailed Marking Scheme
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeAnswerKey"
                checked={config.includeAnswerKey}
                onChange={(e) => setConfig(prev => ({ ...prev, includeAnswerKey: e.target.checked }))}
                className="w-4 h-4 text-primary rounded focus:ring-primary/20"
              />
              <label htmlFor="includeAnswerKey" className="text-sm text-gray-700">
                Include Answer Key
              </label>
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
                initialData ? "Update Configuration" : "Create Grade Assessment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Admin Assessment Generator Component
export default function AdminAssessmentGenerator() {
  // Hooks
  const { currentUser } = useAuth();
  const { 
    publishAssessment,
    getAssessmentStats,
    loading: baseLoading,
    error: baseError
  } = useAssessments();
  
  const { stats: adminStats, loading: adminLoading } = useAdminStats();
  
  const {
    getGradeStatistics,
    getAggregatedTopicCoverage,
    generateGradeAssessment,
    createGradeAssessment,
    getGradeAssessments,
  } = useAdminAssessment();
  
  // State
  const [assessments, setAssessments] = useState<GradeAssessment[]>([]);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [gradeStats, setGradeStats] = useState<GradeStat[]>([]);
  const [aggregatedTopics, setAggregatedTopics] = useState<Record<string, AggregatedTopicData[]>>({});
  
  // Current assessment being edited
  const [currentAssessment, setCurrentAssessment] = useState<Partial<GradeAssessment>>({
    title: "",
    type: 'custom',
    grade: "",
    subject: "",
    term: 1,
    examType: 'mid_term',
    totalMarks: 100,
    duration: 120,
    instructions: "Answer all questions. Show all your workings where necessary.",
    questions: [],
    topicBreakdown: {},
    difficultyProfile: {
      easy: 30,
      medium: 50,
      hard: 20
    },
    alignmentToStandard: 80,
    includeMarkingScheme: true,
    includeAnswerKey: true,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    grade: "",
    subject: "",
    examType: "",
    search: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingData(true);
      try {
        // Load grade statistics
        const gradeStatistics = await getGradeStatistics();
        setGradeStats(gradeStatistics);
        
        // Load aggregated topic coverage
        const aggregated = await getAggregatedTopicCoverage();
        setAggregatedTopics(aggregated);
        
        // Load existing grade assessments
        const assessmentsData = await getGradeAssessments();
        setAssessments(assessmentsData);
        
        // Load assessment stats
        const statsData = await getAssessmentStats();
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast.error("Failed to load assessment data");
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment => {
      // Grade filter
      if (filters.grade && assessment.grade !== filters.grade) return false;
      
      // Subject filter
      if (filters.subject && assessment.subject !== filters.subject) return false;
      
      // Exam type filter
      if (filters.examType && assessment.examType !== filters.examType) return false;
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          assessment.title.toLowerCase().includes(searchLower) ||
          assessment.description?.toLowerCase().includes(searchLower) ||
          assessment.subject.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [assessments, filters]);

  const handleSaveConfiguration = async (configData: any) => {
    if (!currentUser) return;
    
    try {
      setCurrentAssessment(prev => ({
        ...prev,
        ...configData,
        adminId: currentUser.uid,
        adminName: currentUser.name || currentUser.email || "Administrator",
      }));
      
      setShowConfigModal(false);
      
      // Generate questions based on configuration
      setIsGenerating(true);
      const generatedQuestions = await generateGradeAssessment(configData);
      setQuestions(generatedQuestions);
      
      toast.success("Assessment configured. Ready to generate questions!");
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAssessment = async () => {
    if (!currentAssessment.grade || !currentAssessment.subject || !currentAssessment.title) {
      toast.error("Please complete the assessment configuration first");
      return;
    }

    if (questions.length === 0) {
      toast.error("Please generate questions first");
      return;
    }

    setIsGenerating(true);
    try {
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      
      const assessmentData: Omit<GradeAssessment, 'id' | 'createdAt' | 'updatedAt'> = {
        teacherId: currentUser?.uid || "",
        teacherName: currentUser?.name || currentUser?.email || "Administrator",
        title: currentAssessment.title || "",
        description: currentAssessment.description || "",
        type: 'custom',
        classId: `grade-${currentAssessment.grade}`,
        className: `Grade ${currentAssessment.grade} (All Classes)`,
        subject: currentAssessment.subject || "",
        term: currentAssessment.term || 1,
        gradeLevel: currentAssessment.grade || "",
        totalMarks: totalMarks,
        duration: currentAssessment.duration || 120,
        instructions: currentAssessment.instructions || "",
        questions: questions,
        topicBreakdown: currentAssessment.topicBreakdown || {},
        status: 'draft',
        // createdAt and updatedAt are omitted from type - they'll be set by createGradeAssessment
        grade: currentAssessment.grade || "",
        totalClasses: currentAssessment.totalClasses || 0,
        averageTopicCoverage: currentAssessment.averageTopicCoverage || {},
        standardAlignmentScore: currentAssessment.standardAlignmentScore || 0,
        examType: currentAssessment.examType || 'mid_term',
        alignmentToStandard: currentAssessment.alignmentToStandard || 0,
        difficultyProfile: currentAssessment.difficultyProfile || { easy: 30, medium: 50, hard: 20 },
        includeMarkingScheme: currentAssessment.includeMarkingScheme !== false,
        includeAnswerKey: currentAssessment.includeAnswerKey !== false,
      };

      const assessmentId = await createGradeAssessment(assessmentData);
      
      // Load the created assessment
      const updatedAssessments = await getGradeAssessments();
      setAssessments(updatedAssessments);
      
      // Reset form
      setCurrentAssessment({
        title: "",
        type: 'custom',
        grade: "",
        subject: "",
        term: 1,
        examType: 'mid_term',
        totalMarks: 100,
        duration: 120,
        instructions: "Answer all questions. Show all your workings where necessary.",
        questions: [],
        topicBreakdown: {},
        difficultyProfile: {
          easy: 30,
          medium: 50,
          hard: 20
        },
        alignmentToStandard: 80,
        includeMarkingScheme: true,
        includeAnswerKey: true,
      });
      setQuestions([]);
      
      toast.success("Grade assessment created successfully!");
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    setIsGenerating(true);
    try {
      await publishAssessment(assessmentId);
      toast.success("Assessment published to all classes!");
      
      // Reload assessments
      const updatedAssessments = await getGradeAssessments();
      setAssessments(updatedAssessments);
      
      // Reload stats
      const statsData = await getAssessmentStats();
      setStats(statsData);
    } catch (error: unknown) {
      // FIXED: Convert unknown error to string
      const errorMessage = String(error);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get unique grades and subjects for filters
  const uniqueGrades = Array.from(new Set(gradeStats.map(stat => stat.grade)));
  const allSubjects = gradeStats.flatMap(stat => stat.subjects);
  const uniqueSubjects = Array.from(new Set(allSubjects));

  const loading = baseLoading || adminLoading || isLoadingData;
  const error = baseError;

  if (loading && assessments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-3 text-gray-600">Loading assessment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Grade Assessment Generator</h2>
          <p className="text-muted-foreground mt-1">
            Create standardized assessments for entire grades based on aggregated teacher data
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium text-gray-700">Admin Mode</span>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{gradeStats.length}</div>
              <div className="text-sm text-gray-500">Active Grades</div>
            </div>
            <School className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{assessments.length}</div>
              <div className="text-sm text-gray-500">Grade Assessments</div>
            </div>
            <FileText className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {adminStats?.totalLearners || 0}
              </div>
              <div className="text-sm text-gray-500">Total Students</div>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {adminStats?.totalTeachers || 0}
              </div>
              <div className="text-sm text-gray-500">Total Teachers</div>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Create New Assessment Card */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create New Grade Assessment
            </h3>
            <p className="text-sm text-gray-600">
              Configure standardized assessments based on aggregated teacher data and curriculum standards
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
            
            {currentAssessment.grade && currentAssessment.subject && questions.length === 0 && (
              <button
                onClick={async () => {
                  try {
                    setIsGenerating(true);
                    const generatedQuestions = await generateGradeAssessment(currentAssessment);
                    setQuestions(generatedQuestions);
                    toast.success(`Generated ${generatedQuestions.length} questions`);
                  } catch (error) {
                    const errorMessage = getErrorMessage(error);
                    toast.error(errorMessage);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                Generate Questions
              </button>
            )}
          </div>
        </div>

        {/* Current Configuration Summary */}
        {(currentAssessment.grade || questions.length > 0) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentAssessment.grade && (
              <div className="bg-white rounded-lg p-4 border border-border">
                <div className="text-sm text-gray-500">Configuration</div>
                <div className="font-medium text-gray-900 truncate">{currentAssessment.title || "Untitled"}</div>
                <div className="text-sm text-gray-600">
                  Grade {currentAssessment.grade} • {currentAssessment.subject}
                </div>
              </div>
            )}
            
            {Object.keys(currentAssessment.topicBreakdown || {}).length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-border">
                <div className="text-sm text-gray-500">Topic Alignment</div>
                <div className="font-medium text-gray-900">
                  {currentAssessment.alignmentToStandard || 0}% to Standard
                </div>
                <div className="text-sm text-gray-600">
                  {Object.keys(currentAssessment.topicBreakdown || {}).length} topics configured
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
                Generated Questions ({questions.length})
                <span className="text-sm font-normal text-gray-500 ml-2">
                  Total Marks: {questions.reduce((sum, q) => sum + q.marks, 0)}
                </span>
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAssessment}
                  disabled={isGenerating}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
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
          <h3 className="text-lg font-semibold text-gray-900">Grade Assessments</h3>
          
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
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Grades</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>

              <select
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>

              <select
                value={filters.examType}
                onChange={(e) => setFilters(prev => ({ ...prev, examType: e.target.value }))}
                className="p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">All Types</option>
                <option value="mid_term">Mid-Term</option>
                <option value="end_term">End of Term</option>
                <option value="final">Final Exam</option>
                <option value="mock">Mock Exam</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAssessments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filters.search || filters.grade || filters.subject 
              ? "No assessments match your filters." 
              : "No grade assessments created yet. Create your first assessment!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssessments.map(assessment => (
              <div key={assessment.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 truncate">{assessment.title}</h4>
                    <div className="text-sm text-gray-600">
                      Grade {assessment.grade} • {assessment.subject}
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
                    <span className="text-gray-500">Alignment:</span>
                    <span className="font-medium">{assessment.alignmentToStandard}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Classes:</span>
                    <span className="font-medium">{assessment.totalClasses}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Questions:</span>
                    <span className="font-medium">{assessment.questions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Marks:</span>
                    <span className="font-medium">{assessment.totalMarks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => {
                      setCurrentAssessment(assessment);
                      setQuestions(assessment.questions || []);
                      // You can implement a preview modal here
                    }}
                    className="flex-1 border border-border py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 inline-block mr-1" />
                    View
                  </button>
                  
                  {assessment.status === 'draft' && (
                    <button
                      onClick={() => handlePublishAssessment(assessment.id!)}
                      disabled={isGenerating}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isGenerating ? (
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

      {/* Error Display - FIXED: Using String() to convert unknown to string */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">
            {String(error)}
          </p>
        </div>
      )}

      {/* Modals */}
      <AdminAssessmentConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfiguration}
        initialData={currentAssessment}
        gradeStats={gradeStats}
        aggregatedTopics={aggregatedTopics}
      />
    </div>
  );
}