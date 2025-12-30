// hooks/useAttendance.ts
import { useState, useCallback } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// Define TypeScript interfaces
export interface AttendanceRecord {
  learnerId: string;
  learnerName: string;
  gender: 'M' | 'F';
  status: 'present' | 'absent' | 'late' | 'excused';
  excusedReason?: string;
  note?: string;
  markedAt: string | Date;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  boys: { total: number; present: number; };
  girls: { total: number; present: number; };
}

export interface AttendanceSession {
  id: string;
  title: string;
  date: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  status: 'draft' | 'submitted' | 'locked';
  records: AttendanceRecord[];
  stats: AttendanceStats;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
}

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const saveDraftAttendance = useCallback(async (sessionData: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const sessionRef = doc(collection(db, "attendanceSessions"));
      
      // Prepare data for Firestore
      const firestoreData = {
        ...sessionData,
        id: sessionRef.id,
        records: sessionData.records.map(record => ({
          ...record,
          markedAt: record.markedAt instanceof Date ? record.markedAt.toISOString() : record.markedAt
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(sessionRef, firestoreData);
      
      return sessionRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const submitAttendance = useCallback(async (sessionData: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const sessionRef = doc(collection(db, "attendanceSessions"));
      
      const submittedSession = {
        ...sessionData,
        id: sessionRef.id,
        status: 'submitted' as const,
        records: sessionData.records.map(record => ({
          ...record,
          markedAt: record.markedAt instanceof Date ? record.markedAt.toISOString() : record.markedAt
        })),
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(sessionRef, submittedSession);
      
      return sessionRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const getDraftAttendance = useCallback(async (classId: string, date: string): Promise<AttendanceSession | null> => {
    if (!currentUser) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const q = query(
        collection(db, "attendanceSessions"),
        where("classId", "==", classId),
        where("date", "==", date),
        where("teacherId", "==", currentUser.uid),
        where("status", "==", "draft")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      
      // Convert Firestore data to AttendanceSession type
      const session: AttendanceSession = {
        id: docSnap.id,
        title: data.title || "",
        date: data.date || "",
        classId: data.classId || "",
        className: data.className || "",
        teacherId: data.teacherId || "",
        teacherName: data.teacherName || "",
        status: data.status || "draft",
        records: (data.records || []).map((record: any) => ({
          learnerId: record.learnerId || "",
          learnerName: record.learnerName || "",
          gender: record.gender || 'M',
          status: record.status || "present",
          excusedReason: record.excusedReason || "",
          note: record.note || "",
          markedAt: record.markedAt ? new Date(record.markedAt) : new Date()
        })),
        stats: data.stats || {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          boys: { total: 0, present: 0 },
          girls: { total: 0, present: 0 }
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        submittedAt: data.submittedAt?.toDate()
      };
      
      return session;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const getTeacherAttendanceHistory = useCallback(async (teacherId: string, limit = 50): Promise<AttendanceSession[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const q = query(
        collection(db, "attendanceSessions"),
        where("teacherId", "==", teacherId),
        where("status", "==", "submitted"),
        orderBy("submittedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.slice(0, limit);
      
      return docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "",
          date: data.date || "",
          classId: data.classId || "",
          className: data.className || "",
          teacherId: data.teacherId || "",
          teacherName: data.teacherName || "",
          status: data.status || "submitted",
          records: (data.records || []).map((record: any) => ({
            learnerId: record.learnerId || "",
            learnerName: record.learnerName || "",
            gender: record.gender || 'M',
            status: record.status || "present",
            excusedReason: record.excusedReason || "",
            note: record.note || "",
            markedAt: record.markedAt ? new Date(record.markedAt) : new Date()
          })),
          stats: data.stats || {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0,
            boys: { total: 0, present: 0 },
            girls: { total: 0, present: 0 }
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          submittedAt: data.submittedAt?.toDate()
        };
      });
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getAttendanceOverview = useCallback(async (startDate: string, endDate: string): Promise<AttendanceSession[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const start = Timestamp.fromDate(new Date(startDate));
      const end = Timestamp.fromDate(new Date(endDate));
      
      const q = query(
        collection(db, "attendanceSessions"),
        where("status", "==", "submitted"),
        where("submittedAt", ">=", start),
        where("submittedAt", "<=", end),
        orderBy("submittedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "",
          date: data.date || "",
          classId: data.classId || "",
          className: data.className || "",
          teacherId: data.teacherId || "",
          teacherName: data.teacherName || "",
          status: data.status || "submitted",
          records: (data.records || []).map((record: any) => ({
            learnerId: record.learnerId || "",
            learnerName: record.learnerName || "",
            gender: record.gender || 'M',
            status: record.status || "present",
            excusedReason: record.excusedReason || "",
            note: record.note || "",
            markedAt: record.markedAt ? new Date(record.markedAt) : new Date()
          })),
          stats: data.stats || {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0,
            boys: { total: 0, present: 0 },
            girls: { total: 0, present: 0 }
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          submittedAt: data.submittedAt?.toDate()
        };
      });
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    saveDraftAttendance,
    submitAttendance,
    getDraftAttendance,
    getTeacherAttendanceHistory,
    getAttendanceOverview,
  };
};