// client/hooks/useClasses.ts
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { ClassDoc, LearnerData } from "@/types/firestore";

export interface LearnerDoc extends LearnerData {
  id: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  assignmentId?: string;
}

export function useClassManagement() {
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Real-time sync of classes
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "classes"),
      (snapshot) => {
        try {
          const classList: ClassDoc[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<ClassDoc, "id">;
            return {
              id: docSnap.id,
              name: data.name || "Unnamed",
              learnerIds: Array.isArray(data.learnerIds) ? data.learnerIds : [],
            };
          });
          setClasses(classList);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error("Error fetching classes:", err);
          setError("Failed to load classes");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError("Failed to sync classes");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // ➕ Add a new class
  const addClass = useCallback(async (name: string): Promise<string> => {
    if (!name.trim()) throw new Error("Class name cannot be empty");
    const newDocRef = doc(collection(db, "classes"));
    await setDoc(newDocRef, { name: name.trim(), learnerIds: [] });
    return newDocRef.id;
  }, []);

  // 👤 Add a learner to a class
  const addLearner = useCallback(
    async (
      name: string,
      sex: "M" | "F",
      classId: string,
      parentPhone?: string,
      parentEmail?: string
    ) => {
      if (!name.trim()) throw new Error("Learner name is required");
      if (!classId) throw new Error("Class ID is required");

      // 1. Create learner document
      const learnerDocRef = doc(collection(db, "learners"));
      const learnerData: LearnerData = { name: name.trim(), sex, classId };
      if (parentPhone) learnerData.parentPhone = parentPhone.trim();
      if (parentEmail) learnerData.parentEmail = parentEmail.trim();

      await setDoc(learnerDocRef, learnerData);

      // 2. Atomically update class's learnerIds using current Firestore state
      const classDocRef = doc(db, "classes", classId);
      const classDoc = await getDoc(classDocRef);

      if (!classDoc.exists()) {
        throw new Error("Class not found");
      }

      const currentIds = classDoc.data()?.learnerIds || [];
      await updateDoc(classDocRef, {
        learnerIds: [...currentIds, learnerDocRef.id],
      });
    },
    []
  );

  // 🗑️ Delete a class and all its learners
  const deleteClass = useCallback(async (classId: string) => {
    if (!classId) throw new Error("Class ID is required");

    // Delete all learners in this class
    const learnersSnapshot = await getDocs(
      query(collection(db, "learners"), where("classId", "==", classId))
    );

    const batch = writeBatch(db);
    learnersSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the class itself
    await deleteDoc(doc(db, "classes", classId));
  }, []);

  // 👥 Get learners for a class
  const getClassLearners = useCallback(async (classId: string): Promise<LearnerDoc[]> => {
    const snapshot = await getDocs(
      query(collection(db, "learners"), where("classId", "==", classId))
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as LearnerData),
    }));
  }, []);

  // 📚 Get subjects assigned to a class
  const getAssignedSubjects = useCallback(async (classId: string): Promise<string[]> => {
    const snapshot = await getDocs(
      query(collection(db, "assignments"), where("classId", "==", classId))
    );
    
    // Extract unique subjects from assignments
    const subjects = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.subject) {
        subjects.add(data.subject);
      }
    });
    
    return Array.from(subjects);
  }, []);

  // 👩‍🏫 Get teachers assigned to a class (UPDATED for your assignment structure)
  const getAssignedTeachers = useCallback(async (classId: string): Promise<Teacher[]> => {
    try {
      // Get all assignments for this class
      const assignmentsSnapshot = await getDocs(
        query(collection(db, "assignments"), where("classId", "==", classId))
      );

      if (assignmentsSnapshot.empty) {
        return [];
      }

      // Group assignments by teacher to get their subjects
      const teacherSubjects = new Map<string, Set<string>>();
      const teacherAssignmentIds = new Map<string, string[]>();
      
      assignmentsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const teacherId = data.teacherId;
        const subject = data.subject;
        
        if (!teacherSubjects.has(teacherId)) {
          teacherSubjects.set(teacherId, new Set());
          teacherAssignmentIds.set(teacherId, []);
        }
        
        teacherSubjects.get(teacherId)!.add(subject);
        teacherAssignmentIds.get(teacherId)!.push(doc.id);
      });

      // Get teacher details for each unique teacher
      const teacherPromises = Array.from(teacherSubjects.keys()).map(async (teacherId) => {
        try {
          const teacherDoc = await getDoc(doc(db, "users", teacherId));
          
          if (teacherDoc.exists()) {
            const data = teacherDoc.data();
            const subjects = teacherSubjects.get(teacherId)!;
            
            // For each subject the teacher teaches in this class,
            // return a separate teacher entry (or combine based on your UI needs)
            const teacherArray: Teacher[] = [];
            
            // Option 1: Return one entry per subject
            subjects.forEach(subject => {
              teacherArray.push({
                id: teacherId,
                name: data.name || "Unknown Teacher",
                subject: subject,
                assignmentId: teacherAssignmentIds.get(teacherId)?.find(id => true) || '', // You might want to map assignment IDs better
              });
            });
            
            // Option 2: Return one entry with all subjects (if your UI expects that)
            // return {
            //   id: teacherId,
            //   name: data.name || "Unknown Teacher",
            //   subject: Array.from(subjects).join(", "), // Combine subjects
            //   assignmentId: teacherAssignmentIds.get(teacherId)?.[0] || '',
            // };
            
            return teacherArray;
          }
          return [];
        } catch (err) {
          console.error(`Error fetching teacher ${teacherId}:`, err);
          return [];
        }
      });

      const teachersArrays = await Promise.all(teacherPromises);
      // Flatten the array of arrays
      return teachersArrays.flat();
      
    } catch (err) {
      console.error("Error getting assigned teachers:", err);
      return [];
    }
  }, []);

  // 📊 Get detailed class info including assignments
  const getClassWithAssignments = useCallback(async (classId: string) => {
    const classDoc = await getDoc(doc(db, "classes", classId));
    
    if (!classDoc.exists()) {
      throw new Error("Class not found");
    }
    
    const classData = classDoc.data() as Omit<ClassDoc, "id">;
    
    // Get assignments for this class
    const assignmentsSnapshot = await getDocs(
      query(collection(db, "assignments"), where("classId", "==", classId))
    );
    
    const assignments = assignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      id: classDoc.id,
      ...classData,
      assignments
    };
  }, []);

  return {
    classes,
    loading,
    error,
    addClass,
    addLearner,
    deleteClass,
    getClassLearners,
    getAssignedSubjects,
    getAssignedTeachers,
    getClassWithAssignments,
  };
}