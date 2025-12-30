// src/hooks/useLessonPlans.ts
import { useState, useCallback } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherManagement } from "./useTeacherManagement";
import { useClassManagement } from "./useClasses";

export interface LessonPlan {
  id?: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subject: string;
  date: string; // ISO string YYYY-MM-DD
  week: number;
  term: number;
  
  // Content
  topic: string;
  subTopic: string;
  duration: number; // minutes
  objectives: string[];
  priorKnowledge: string[];
  activities: string[];
  materials: string[];
  assessmentMethods: string[];
  differentiation: string[];
  homework: string;
  notes?: string;
  
  // Status
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  reviewerId?: string;
  reviewerName?: string;
  feedback?: string;
  approvedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const useLessonPlans = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { getTeachersForClass } = useTeacherManagement();
  const { classes } = useClassManagement();

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

  // Create a new lesson plan
  const createLessonPlan = useCallback(async (lessonPlanData: Omit<LessonPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const lessonPlanRef = doc(collection(db, "lessonPlans"));
      
      const lessonPlan = {
        ...lessonPlanData,
        id: lessonPlanRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(lessonPlanRef, lessonPlan);
      
      return lessonPlanRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Update a lesson plan
  const updateLessonPlan = useCallback(async (lessonPlanId: string, updates: Partial<LessonPlan>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const lessonPlanRef = doc(db, "lessonPlans", lessonPlanId);
      
      await updateDoc(lessonPlanRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Delete a lesson plan
  const deleteLessonPlan = useCallback(async (lessonPlanId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const lessonPlanRef = doc(db, "lessonPlans", lessonPlanId);
      await deleteDoc(lessonPlanRef);
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get lesson plans for a teacher
  const getTeacherLessonPlans = useCallback(async (filters?: {
    classId?: string;
    subject?: string;
    status?: LessonPlan['status'];
    startDate?: string;
    endDate?: string;
  }) => {
    if (!currentUser) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      let q = query(
        collection(db, "lessonPlans"),
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
      
      if (filters?.startDate && filters?.endDate) {
        q = query(
          q,
          where("date", ">=", filters.startDate),
          where("date", "<=", filters.endDate)
        );
      }
      
      q = query(q, orderBy("date", "desc"));
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate(),
        } as LessonPlan;
      });
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Submit lesson plan for review
  const submitForReview = useCallback(async (lessonPlanId: string) => {
    return updateLessonPlan(lessonPlanId, { status: 'submitted' });
  }, [updateLessonPlan]);

  // Get lesson plan statistics
  const getLessonPlanStats = useCallback(async () => {
    if (!currentUser) return null;
    
    try {
      const allPlans = await getTeacherLessonPlans();
      
      const stats = {
        total: allPlans.length,
        draft: allPlans.filter(p => p.status === 'draft').length,
        submitted: allPlans.filter(p => p.status === 'submitted').length,
        approved: allPlans.filter(p => p.status === 'approved').length,
        rejected: allPlans.filter(p => p.status === 'rejected').length,
        
        // Weekly stats
        thisWeek: allPlans.filter(p => {
          const planDate = new Date(p.date);
          const now = new Date();
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          return planDate >= startOfWeek && planDate <= endOfWeek;
        }).length,
        
        // By subject
        bySubject: allPlans.reduce((acc, plan) => {
          acc[plan.subject] = (acc[plan.subject] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      
      return stats;
    } catch (err) {
      console.error("Error getting lesson plan stats:", err);
      return null;
    }
  }, [currentUser, getTeacherLessonPlans]);

  // Get calendar events for lesson plans
  const getCalendarEvents = useCallback(async (month: number, year: number) => {
    if (!currentUser) return [];
    
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const plans = await getTeacherLessonPlans({ startDate, endDate });
      
      return plans.map(plan => ({
        id: plan.id!,
        title: `${plan.className} - ${plan.topic}`,
        date: plan.date,
        color: plan.status === 'approved' ? 'green' : 
               plan.status === 'submitted' ? 'blue' : 
               plan.status === 'rejected' ? 'red' : 'gray',
        status: plan.status,
        subject: plan.subject,
      }));
    } catch (err) {
      console.error("Error getting calendar events:", err);
      return [];
    }
  }, [currentUser, getTeacherLessonPlans]);

  return {
    loading,
    error,
    createLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
    getTeacherLessonPlans,
    submitForReview,
    getLessonPlanStats,
    getCalendarEvents,
    getTeacherClasses,
    getTeacherSubjectsForClass,
  };
};