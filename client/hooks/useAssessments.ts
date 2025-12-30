// src/hooks/useAssessments.ts
import { useState, useCallback } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherManagement } from "./useTeacherManagement";
import { useClassManagement } from "./useClasses";
import { useLessonPlans } from "./useLessonPlans";

export interface Question {
  id?: string;
  type: 'mcq' | 'short_answer' | 'essay' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[]; // for MCQ
  correctAnswer: string | string[];
  marks: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt?: Date;
}

export interface Assessment {
  id?: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  type: 'weekly' | 'mid_term' | 'end_term' | 'custom';
  
  // Context
  classId: string;
  className: string;
  subject: string;
  term: number;
  week?: number;
  gradeLevel: string;
  
  // Configuration
  totalMarks: number;
  duration: number; // minutes
  instructions: string;
  
  // Questions
  questions: Question[];
  
  // Topic distribution
  topicBreakdown: Record<string, number>; // topic: percentage
  
  // Generated files
  questionPaperUrl?: string;
  markingSchemeUrl?: string;
  answerKeyUrl?: string;
  
  // Status
  status: 'draft' | 'generated' | 'published' | 'archived';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// Add this interface for assessment statistics
export interface AssessmentStats {
  total: number;
  draft: number;
  generated: number;
  published: number;
  archived: number;
  weekly: number;
  mid_term: number;
  end_term: number;
  custom: number;
  bySubject: Record<string, number>;
  totalMarks: number;
}

export const useAssessments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { getTeachersForClass } = useTeacherManagement();
  const { classes, getClassLearners } = useClassManagement();
  const { getTeacherLessonPlans } = useLessonPlans();

  // Get teacher's assigned classes
  const getTeacherClasses = useCallback(() => {
    if (!currentUser) return [];
    
    return classes.filter(cls => {
      const classTeachers = getTeachersForClass(cls.id);
      return classTeachers.some(t => t.teacherId === currentUser.uid);
    });
  }, [classes, currentUser, getTeachersForClass]);

  // Get teacher's subjects for a specific class
  const getTeacherSubjectsForClass = useCallback((classId: string) => {
    if (!currentUser) return [];
    
    const classTeachers = getTeachersForClass(classId);
    const teacherAssignment = classTeachers.find(t => t.teacherId === currentUser.uid);
    return teacherAssignment?.subjects || [];
  }, [currentUser, getTeachersForClass]);

  // Get topics covered by teacher for a class and subject
  const getCoveredTopics = useCallback(async (classId: string, subject: string, term: number) => {
    if (!currentUser) return [];
    
    try {
      const lessonPlans = await getTeacherLessonPlans({
        classId,
        subject,
        status: 'approved'
      });
      
      // Filter by term and get unique topics
      const topics = lessonPlans
        .filter(plan => plan.term === term)
        .map(plan => plan.topic)
        .filter((topic, index, self) => self.indexOf(topic) === index);
      
      return topics;
    } catch (err) {
      console.error("Error getting covered topics:", err);
      return [];
    }
  }, [currentUser, getTeacherLessonPlans]);

  // Get recommended topic distribution
  const getRecommendedTopicDistribution = useCallback(async (
    classId: string, 
    subject: string, 
    term: number, 
    week?: number
  ) => {
    const topics = await getCoveredTopics(classId, subject, term);
    
    // Simple recommendation algorithm
    const distribution: Record<string, number> = {};
    
    if (topics.length === 0) {
      return { "General Knowledge": 100 };
    }
    
    // More weight to recent topics if week is specified
    if (week && week > 0) {
      // Assume topics taught in recent weeks are more important
      topics.forEach((topic, index) => {
        const weight = Math.max(30, 100 - (index * 10));
        distribution[topic] = Math.min(weight, 100);
      });
      
      // Normalize to 100%
      const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
      Object.keys(distribution).forEach(topic => {
        distribution[topic] = Math.round((distribution[topic] / total) * 100);
      });
    } else {
      // Equal distribution for term exams
      const equalWeight = Math.floor(100 / topics.length);
      topics.forEach(topic => {
        distribution[topic] = equalWeight;
      });
      
      // Adjust for rounding
      const remaining = 100 - (equalWeight * topics.length);
      if (remaining > 0 && topics.length > 0) {
        distribution[topics[0]] += remaining;
      }
    }
    
    return distribution;
  }, [getCoveredTopics]);

  // Create a new assessment
  const createAssessment = useCallback(async (assessmentData: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const assessmentRef = doc(collection(db, "assessments"));
      
      const assessment = {
        ...assessmentData,
        id: assessmentRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(assessmentRef, assessment);
      
      return assessmentRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Generate question paper PDF
  const generateQuestionPaper = useCallback(async (assessmentId: string): Promise<string> => {
    // This would integrate with a PDF generation service
    // For now, return a placeholder URL
    return `https://example.com/assessment-${assessmentId}-questions.pdf`;
  }, []);

  // Generate marking scheme PDF
  const generateMarkingScheme = useCallback(async (assessmentId: string): Promise<string> => {
    // This would integrate with a PDF generation service
    return `https://example.com/assessment-${assessmentId}-marking.pdf`;
  }, []);

  // Generate answer key
  const generateAnswerKey = useCallback(async (assessmentId: string): Promise<string> => {
    return `https://example.com/assessment-${assessmentId}-answers.pdf`;
  }, []);

  // Publish assessment (generate all files)
  const publishAssessment = useCallback(async (assessmentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const questionPaperUrl = await generateQuestionPaper(assessmentId);
      const markingSchemeUrl = await generateMarkingScheme(assessmentId);
      const answerKeyUrl = await generateAnswerKey(assessmentId);
      
      const assessmentRef = doc(db, "assessments", assessmentId);
      
      await setDoc(assessmentRef, {
        questionPaperUrl,
        markingSchemeUrl,
        answerKeyUrl,
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      return {
        questionPaperUrl,
        markingSchemeUrl,
        answerKeyUrl,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [generateQuestionPaper, generateMarkingScheme, generateAnswerKey]);

  // Get teacher's assessments
  const getTeacherAssessments = useCallback(async (filters?: {
    classId?: string;
    subject?: string;
    status?: Assessment['status'];
    term?: number;
  }) => {
    if (!currentUser) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      let q = query(
        collection(db, "assessments"),
        where("teacherId", "==", currentUser.uid)
      );
      
      if (filters?.classId) {
        q = query(q, where("classId", "==", filters.classId));
      }
      
      if (filters?.subject) {
        q = query(q, where("subject", "==", filters.subject));
      }
      
      if (filters?.status) {
        q = query(q, where("status", "==", filters.status));
      }
      
      if (filters?.term) {
        q = query(q, where("term", "==", filters.term));
      }
      
      q = query(q, orderBy("createdAt", "desc"));
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
        } as Assessment;
      });
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get assessment statistics
  const getAssessmentStats = useCallback(async (): Promise<AssessmentStats | null> => {
    if (!currentUser) return null;
    
    try {
      const allAssessments = await getTeacherAssessments();
      
      const stats: AssessmentStats = {
        total: allAssessments.length,
        draft: allAssessments.filter(a => a.status === 'draft').length,
        generated: allAssessments.filter(a => a.status === 'generated').length,
        published: allAssessments.filter(a => a.status === 'published').length,
        archived: allAssessments.filter(a => a.status === 'archived').length,
        
        // By type
        weekly: allAssessments.filter(a => a.type === 'weekly').length,
        mid_term: allAssessments.filter(a => a.type === 'mid_term').length,
        end_term: allAssessments.filter(a => a.type === 'end_term').length,
        custom: allAssessments.filter(a => a.type === 'custom').length,
        
        // By subject
        bySubject: allAssessments.reduce((acc, assessment) => {
          acc[assessment.subject] = (acc[assessment.subject] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        
        // Total marks generated
        totalMarks: allAssessments.reduce((sum, assessment) => sum + assessment.totalMarks, 0),
      };
      
      return stats;
    } catch (err) {
      console.error("Error getting assessment stats:", err);
      return null;
    }
  }, [currentUser, getTeacherAssessments]);

  // Create sample questions based on topics
  const generateSampleQuestions = useCallback((topics: string[], count: number): Question[] => {
    const questionTypes: Question['type'][] = ['mcq', 'short_answer', 'essay', 'true_false'];
    const difficulties: Question['difficulty'][] = ['easy', 'medium', 'hard'];
    
    const questions: Question[] = [];
    
    for (let i = 0; i < count; i++) {
      const topic = topics[i % topics.length];
      const type = questionTypes[i % questionTypes.length];
      const difficulty = difficulties[i % difficulties.length];
      
      let question: Question;
      
      switch (type) {
        case 'mcq':
          question = {
            type: 'mcq',
            question: `What is the main concept of ${topic}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            marks: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
            topic,
            difficulty,
          };
          break;
          
        case 'short_answer':
          question = {
            type: 'short_answer',
            question: `Explain briefly about ${topic}`,
            correctAnswer: 'Sample correct answer',
            marks: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4,
            topic,
            difficulty,
          };
          break;
          
        case 'essay':
          question = {
            type: 'essay',
            question: `Discuss in detail the importance of ${topic}`,
            correctAnswer: 'Comprehensive essay answer',
            marks: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 10,
            topic,
            difficulty,
          };
          break;
          
        case 'true_false':
          question = {
            type: 'true_false',
            question: `${topic} is an important concept in this subject.`,
            correctAnswer: 'true',
            marks: 1,
            topic,
            difficulty,
          };
          break;
          
        default:
          question = {
            type: 'short_answer',
            question: `Question about ${topic}`,
            correctAnswer: 'Answer',
            marks: 2,
            topic,
            difficulty,
          };
      }
      
      questions.push(question);
    }
    
    return questions;
  }, []);

  return {
    loading,
    error,
    createAssessment,
    publishAssessment,
    getTeacherAssessments,
    getAssessmentStats,
    getTeacherClasses,
    getTeacherSubjectsForClass,
    getCoveredTopics,
    getRecommendedTopicDistribution,
    generateSampleQuestions,
    generateQuestionPaper,
    generateMarkingScheme,
    generateAnswerKey,
  };
};