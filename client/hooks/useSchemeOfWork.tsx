// src/hooks/useSchemeOfWork.tsx
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  SchemeOfWork,
  Topic,
  Activity,
  Resource,
  AssessmentCriterion,
  SchemeStats,
  CreateSchemeDTO,
} from '@/types/schemeOfWork';

export const useSchemeOfWork = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [stats, setStats] = useState<SchemeStats | null>(null);

  // Get all schemes for current teacher
  const getSchemes = useCallback(async (classId?: string) => {
    if (!currentUser) return [];
    
    setLoading(true);
    try {
      let q = query(
        collection(db, 'schemesOfWork'),
        where('teacherId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );

      if (classId) {
        q = query(q, where('classId', '==', classId));
      }

      const querySnapshot = await getDocs(q);
      const schemesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          topics: data.topics?.map((topic: any) => ({
            ...topic,
            completedDate: topic.completedDate?.toDate(),
          })) || [],
        } as SchemeOfWork;
      });

      setSchemes(schemesData);
      return schemesData;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load schemes of work');
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get scheme by ID
  const getSchemeById = async (id: string) => {
    if (!currentUser) return null;
    
    setLoading(true);
    try {
      const docRef = doc(db, 'schemesOfWork', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          topics: data.topics?.map((topic: any) => ({
            ...topic,
            completedDate: topic.completedDate?.toDate(),
          })) || [],
        } as SchemeOfWork;
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load scheme');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create new scheme
  const createScheme = async (data: CreateSchemeDTO) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      const schemeData = {
        ...data,
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || 'Teacher',
        topics: [],
        objectives: [],
        resources: [],
        assessmentCriteria: [],
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
        isTemplate: data.isTemplate || false,
      };

      const docRef = await addDoc(collection(db, 'schemesOfWork'), schemeData);
      
      // Add empty topics based on total weeks
      const topics: Topic[] = Array.from({ length: data.totalWeeks }, (_, week) => ({
        id: `week-${week + 1}`,
        week: week + 1,
        title: `Week ${week + 1}`,
        subtopics: [],
        duration: 0,
        learningObjectives: [],
        teachingMethods: [],
        activities: [],
        assessmentMethods: [],
        resources: [],
        status: 'planned',
      }));

      await updateDoc(docRef, {
        topics,
        updatedAt: serverTimestamp(),
      });

      toast.success('Scheme of work created successfully');
      return docRef.id;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create scheme of work');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update scheme
  const updateScheme = async (id: string, updates: Partial<SchemeOfWork>) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'schemesOfWork', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      toast.success('Scheme updated successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update scheme');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update topic
  const updateTopic = async (schemeId: string, topicId: string, updates: Partial<Topic>) => {
    setLoading(true);
    try {
      const scheme = await getSchemeById(schemeId);
      if (!scheme) throw new Error('Scheme not found');

      const updatedTopics = scheme.topics.map(topic =>
        topic.id === topicId ? { ...topic, ...updates } : topic
      );

      const docRef = doc(db, 'schemesOfWork', schemeId);
      await updateDoc(docRef, {
        topics: updatedTopics,
        updatedAt: serverTimestamp(),
      });

      toast.success('Topic updated successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update topic');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Publish scheme
  const publishScheme = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'schemesOfWork', id);
      await updateDoc(docRef, {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success('Scheme published successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to publish scheme');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Duplicate scheme as template
  const duplicateSchemeAsTemplate = async (id: string, templateName: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      const scheme = await getSchemeById(id);
      if (!scheme) throw new Error('Scheme not found');

      const newSchemeData = {
        ...scheme,
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || 'Teacher',
        title: templateName,
        isTemplate: true,
        templateName,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: null,
        id: undefined,
      };

      delete newSchemeData.id;

      const docRef = await addDoc(collection(db, 'schemesOfWork'), newSchemeData);
      toast.success('Template created successfully');
      return docRef.id;
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create template');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get statistics
  const getStats = useCallback(async () => {
    if (!currentUser) return null;
    
    setLoading(true);
    try {
      const schemes = await getSchemes();
      
      const totalSchemes = schemes.length;
      const publishedSchemes = schemes.filter(s => s.status === 'published').length;
      const draftSchemes = schemes.filter(s => s.status === 'draft').length;
      
      let totalTopics = 0;
      let completedTopics = 0;
      let upcomingTopics = 0;
      
      schemes.forEach(scheme => {
        totalTopics += scheme.topics.length;
        completedTopics += scheme.topics.filter(t => t.status === 'completed').length;
        upcomingTopics += scheme.topics.filter(t => t.status === 'planned').length;
      });

      const averageCompletionRate = totalTopics > 0 
        ? Math.round((completedTopics / totalTopics) * 100) 
        : 0;

      const statsData: SchemeStats = {
        totalSchemes,
        publishedSchemes,
        draftSchemes,
        averageCompletionRate,
        totalTopics,
        completedTopics,
        upcomingTopics,
      };

      setStats(statsData);
      return statsData;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, getSchemes]);

  // Get templates
  const getTemplates = useCallback(async () => {
    if (!currentUser) return [];
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'schemesOfWork'),
        where('teacherId', '==', currentUser.uid),
        where('isTemplate', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const templates = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          topics: data.topics?.map((topic: any) => ({
            ...topic,
            completedDate: topic.completedDate?.toDate(),
          })) || [],
        } as SchemeOfWork;
      });

      return templates;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load data on mount
  useEffect(() => {
    if (currentUser) {
      getSchemes();
      getStats();
    }
  }, [currentUser, getSchemes, getStats]);

  return {
    schemes,
    stats,
    loading,
    error,
    getSchemes,
    getSchemeById,
    createScheme,
    updateScheme,
    updateTopic,
    publishScheme,
    duplicateSchemeAsTemplate,
    getStats,
    getTemplates,
  };
};