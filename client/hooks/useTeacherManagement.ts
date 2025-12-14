// src/hooks/useTeacherManagement.ts
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
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

export interface Teacher {
  id: string; // User ID
  userId: string;
  name: string;
  email: string;
  subjects: string[];
  schoolName?: string;
  createdAt?: string;
}

export interface Class {
  id: string;
  name: string;
}

export interface TeacherAssignment {
  id: string; // Assignment document ID
  teacherId: string;
  classId: string;
  subject: string; // Single subject per assignment
  createdAt?: any;
}

export function useTeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Real-time sync of teachers (from users collection)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "users"), where("role", "==", "teacher")),
      async (snapshot) => {
        try {
          const teacherList: Teacher[] = [];
          
          for (const docSnap of snapshot.docs) {
            const userData = docSnap.data();
            
            // Get teacher subjects from teachers collection
            const teacherDoc = await getDocs(
              query(collection(db, "teachers"), where("__name__", "==", docSnap.id))
            );
            
            let subjects: string[] = [];
            if (!teacherDoc.empty) {
              const teacherData = teacherDoc.docs[0].data();
              subjects = teacherData.subjects || [];
            }
            
            teacherList.push({
              id: docSnap.id,
              userId: docSnap.id,
              name: userData.name || "Unknown Teacher",
              email: userData.email || "",
              subjects: subjects,
              schoolName: userData.schoolName,
              createdAt: userData.createdAt,
            });
          }
          
          setTeachers(teacherList);
          setError(null);
        } catch (err) {
          console.error("Error fetching teachers:", err);
          setError("Failed to load teachers");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError("Failed to sync teachers");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // 🔁 Real-time sync of classes
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "classes"),
      (snapshot) => {
        try {
          const classList: Class[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            name: docSnap.data().name || "Unnamed Class",
          }));
          setClasses(classList);
        } catch (err) {
          console.error("Error fetching classes:", err);
        }
      }
    );

    return unsubscribe;
  }, []);

  // 🔁 Real-time sync of assignments (CHANGED: now each is a single subject)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "assignments"),
      (snapshot) => {
        try {
          const assignmentList: TeacherAssignment[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              teacherId: data.teacherId,
              classId: data.classId,
              subject: data.subject,
              createdAt: data.createdAt,
            };
          });
          
          setAssignments(assignmentList);
        } catch (err) {
          console.error("Error fetching assignments:", err);
        }
      }
    );

    return unsubscribe;
  }, []);

  // ➕ Update teacher subjects
  const updateTeacherSubjects = useCallback(async (teacherId: string, subjects: string[]) => {
    try {
      await setDoc(doc(db, "teachers", teacherId), {
        subjects,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      // Also update in users collection for easy access
      await updateDoc(doc(db, "users", teacherId), {
        subjects,
        updatedAt: serverTimestamp(),
      });
      
      return true;
    } catch (err) {
      console.error("Error updating teacher subjects:", err);
      throw err;
    }
  }, []);

  // 🔗 Assign teacher to class with ONE subject
  const assignTeacherToClass = useCallback(async (
    teacherId: string, 
    classId: string, 
    subject: string
  ) => {
    try {
      // Check if this exact assignment already exists
      const existingAssignment = await getDocs(
        query(
          collection(db, "assignments"),
          where("teacherId", "==", teacherId),
          where("classId", "==", classId),
          where("subject", "==", subject)
        )
      );
      
      if (!existingAssignment.empty) {
        throw new Error("Teacher is already assigned to this class for this subject");
      }
      
      // Create new assignment
      const assignmentRef = doc(collection(db, "assignments"));
      await setDoc(assignmentRef, {
        teacherId,
        classId,
        subject,
        createdAt: serverTimestamp(),
      });
      
      return true;
    } catch (err) {
      console.error("Error assigning teacher:", err);
      throw err;
    }
  }, []);

  // 🔗 Assign teacher to class with MULTIPLE subjects
  const assignTeacherToClassMultiple = useCallback(async (
    teacherId: string, 
    classId: string, 
    subjects: string[]
  ) => {
    try {
      if (subjects.length === 0) {
        // If no subjects provided, remove all assignments for this teacher-class
        return await removeTeacherFromClassAllSubjects(teacherId, classId);
      }
      
      const batch = writeBatch(db);
      
      // Remove existing assignments for this teacher-class combo
      const existingAssignments = await getDocs(
        query(
          collection(db, "assignments"),
          where("teacherId", "==", teacherId),
          where("classId", "==", classId)
        )
      );
      
      existingAssignments.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Create new assignments for each subject
      subjects.forEach((subject) => {
        const assignmentRef = doc(collection(db, "assignments"));
        batch.set(assignmentRef, {
          teacherId,
          classId,
          subject,
          createdAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      return true;
    } catch (err) {
      console.error("Error assigning teacher:", err);
      throw err;
    }
  }, []);

  // ❌ Remove specific assignment (teacher from class for a specific subject)
  const removeTeacherFromClass = useCallback(async (assignmentId: string) => {
    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      return true;
    } catch (err) {
      console.error("Error removing teacher assignment:", err);
      throw err;
    }
  }, []);

  // ❌ Remove all assignments for teacher in class
  const removeTeacherFromClassAllSubjects = useCallback(async (teacherId: string, classId: string) => {
    try {
      const assignmentsSnapshot = await getDocs(
        query(
          collection(db, "assignments"),
          where("teacherId", "==", teacherId),
          where("classId", "==", classId)
        )
      );
      
      const batch = writeBatch(db);
      assignmentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return true;
    } catch (err) {
      console.error("Error removing teacher assignment:", err);
      throw err;
    }
  }, []);

  // 📚 Get assignments for a specific class
  const getAssignmentsByClassId = useCallback((classId: string): TeacherAssignment[] => {
    return assignments.filter(assignment => assignment.classId === classId);
  }, [assignments]);

  // 👩‍🏫 Get assignments for a specific teacher
  const getAssignmentsByTeacherId = useCallback((teacherId: string): TeacherAssignment[] => {
    return assignments.filter(assignment => assignment.teacherId === teacherId);
  }, [assignments]);

  // 📚 Get subjects taught by teacher in a specific class
  const getTeacherSubjectsForClass = useCallback((teacherId: string, classId: string): string[] => {
    const teacherAssignments = assignments.filter(
      assignment => assignment.teacherId === teacherId && assignment.classId === classId
    );
    return teacherAssignments.map(assignment => assignment.subject);
  }, [assignments]);

  // 👨‍🏫 Get teachers assigned to a class (with their subjects)
  const getTeachersForClass = useCallback((classId: string): Array<{
    teacherId: string;
    teacherName: string;
    subjects: string[];
  }> => {
    const classAssignments = assignments.filter(assignment => assignment.classId === classId);
    
    // Group by teacher
    const teachersMap = new Map<string, { teacherId: string; subjects: string[] }>();
    
    classAssignments.forEach(assignment => {
      if (!teachersMap.has(assignment.teacherId)) {
        teachersMap.set(assignment.teacherId, {
          teacherId: assignment.teacherId,
          subjects: [],
        });
      }
      teachersMap.get(assignment.teacherId)!.subjects.push(assignment.subject);
    });
    
    // Add teacher names
    return Array.from(teachersMap.values()).map(teacherData => {
      const teacher = teachers.find(t => t.id === teacherData.teacherId);
      return {
        teacherId: teacherData.teacherId,
        teacherName: teacher?.name || "Unknown Teacher",
        subjects: teacherData.subjects,
      };
    });
  }, [assignments, teachers]);

  // 📊 Get class-subject combinations for a teacher (for dashboard) - FILTER OUT DELETED CLASSES
  const getTeacherClassSubjects = useCallback((teacherId: string): Array<{
    classId: string;
    className: string;
    subject: string;
  }> => {
    const teacherAssignments = assignments.filter(assignment => assignment.teacherId === teacherId);
    
    return teacherAssignments
      .map(assignment => {
        const classInfo = classes.find(c => c.id === assignment.classId);
        return {
          classId: assignment.classId,
          className: classInfo?.name || "Class Deleted",
          subject: assignment.subject,
          classExists: !!classInfo,
        };
      })
      .filter(item => item.classExists) // Filter out assignments to deleted classes
      .map(({ classId, className, subject }) => ({ classId, className, subject }));
  }, [assignments, classes]);

  // 📊 Get ALL class assignments for a teacher (including deleted classes for cleanup)
  const getAllTeacherClassAssignments = useCallback((teacherId: string): Array<{
    classId: string;
    className: string;
    subject: string;
    classExists: boolean;
  }> => {
    const teacherAssignments = assignments.filter(assignment => assignment.teacherId === teacherId);
    
    return teacherAssignments.map(assignment => {
      const classInfo = classes.find(c => c.id === assignment.classId);
      return {
        classId: assignment.classId,
        className: classInfo?.name || "Class Deleted",
        subject: assignment.subject,
        classExists: !!classInfo,
      };
    });
  }, [assignments, classes]);

  // 📊 Get unique classes for a teacher (excluding deleted classes)
  const getTeacherClasses = useCallback((teacherId: string): Array<{
    classId: string;
    className: string;
    subjects: string[];
  }> => {
    const teacherAssignments = assignments.filter(assignment => assignment.teacherId === teacherId);
    
    // Group by class
    const classMap = new Map<string, { className: string; subjects: string[]; classExists: boolean }>();
    
    teacherAssignments.forEach(assignment => {
      if (!classMap.has(assignment.classId)) {
        const classInfo = classes.find(c => c.id === assignment.classId);
        classMap.set(assignment.classId, {
          className: classInfo?.name || "Class Deleted",
          subjects: [],
          classExists: !!classInfo,
        });
      }
      const classData = classMap.get(assignment.classId)!;
      if (!classData.subjects.includes(assignment.subject)) {
        classData.subjects.push(assignment.subject);
      }
    });
    
    // Filter out deleted classes
    return Array.from(classMap.values())
      .filter(cls => cls.classExists)
      .map(({ className, subjects }, index, array) => {
        const classId = teacherAssignments.find(a => 
          classes.find(c => c.name === className && c.id === a.classId)
        )?.classId || "";
        
        return {
          classId,
          className,
          subjects,
        };
      });
  }, [assignments, classes]);

  // Check if teacher is assigned to class for a specific subject
  const isTeacherAssignedToClassSubject = useCallback((teacherId: string, classId: string, subject: string): boolean => {
    return assignments.some(assignment => 
      assignment.teacherId === teacherId && 
      assignment.classId === classId && 
      assignment.subject === subject
    );
  }, [assignments]);

  // 🧹 Clean up assignments for deleted classes (call this when deleting classes)
  const cleanupOrphanedAssignments = useCallback(async () => {
    try {
      const assignmentsSnapshot = await getDocs(collection(db, "assignments"));
      const classIds = new Set(classes.map(cls => cls.id));
      
      const batch = writeBatch(db);
      let orphanedCount = 0;
      
      assignmentsSnapshot.docs.forEach(docSnap => {
        const assignment = docSnap.data();
        if (!classIds.has(assignment.classId)) {
          batch.delete(docSnap.ref);
          orphanedCount++;
        }
      });
      
      if (orphanedCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${orphanedCount} orphaned assignments`);
      }
      
      return orphanedCount;
    } catch (err) {
      console.error("Error cleaning up orphaned assignments:", err);
      throw err;
    }
  }, [classes]);

  // 🔄 Batch update teacher-class assignments (for the modal)
  const updateClassAssignments = useCallback(async (
    classId: string,
    teacherAssignments: Record<string, string[]> // teacherId -> subjects[]
  ) => {
    try {
      const batch = writeBatch(db);
      
      // Get all existing assignments for this class
      const existingAssignments = await getDocs(
        query(collection(db, "assignments"), where("classId", "==", classId))
      );
      
      // Remove all existing assignments first
      existingAssignments.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Create new assignments for each teacher
      for (const [teacherId, subjects] of Object.entries(teacherAssignments)) {
        if (subjects.length > 0) {
          subjects.forEach((subject) => {
            const assignmentRef = doc(collection(db, "assignments"));
            batch.set(assignmentRef, {
              teacherId,
              classId,
              subject,
              createdAt: serverTimestamp(),
            });
          });
        }
      }
      
      await batch.commit();
      return true;
    } catch (err) {
      console.error("Error updating class assignments:", err);
      throw err;
    }
  }, []);

  return {
    teachers,
    classes,
    assignments,
    loading,
    error,
    updateTeacherSubjects,
    assignTeacherToClass,        // Single subject assignment
    assignTeacherToClassMultiple, // Multiple subjects assignment
    removeTeacherFromClass,       // Remove specific assignment by ID
    removeTeacherFromClassAllSubjects, // Remove all teacher's assignments in class
    getAssignmentsByClassId,
    getAssignmentsByTeacherId,
    getTeacherSubjectsForClass,
    getTeachersForClass,
    getTeacherClassSubjects,
    getTeacherClasses,            // NEW: Get teacher's classes with subjects
    getAllTeacherClassAssignments, // NEW: Get all assignments including deleted
    isTeacherAssignedToClassSubject,
    cleanupOrphanedAssignments,
    updateClassAssignments,       // NEW: Batch update assignments for a class
  };
}