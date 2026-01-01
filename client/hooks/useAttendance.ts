// hooks/useAttendance.ts - COMPLETE FIXED VERSION
import { useState, useEffect, useCallback } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Enable offline persistence
const enableOfflineSupport = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("✅ Offline persistence enabled");
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn("⚠️ Multiple tabs open, offline persistence only in one tab");
    } else if (err.code === 'unimplemented') {
      console.warn("⚠️ Browser doesn't support offline persistence");
    }
  }
};

// Call this early in your app
enableOfflineSupport();

export interface AttendanceRecord {
  learnerId: string;
  learnerName: string;
  gender: 'M' | 'F';
  status: 'present' | 'absent' | 'late' | 'excused' | null;
  excusedReason?: string;
  note?: string;
  markedAt: string | Date;
  offlineId?: string;
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
  status: 'draft' | 'submitted' | 'locked' | 'offline';
  records: AttendanceRecord[];
  stats: AttendanceStats;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  syncStatus?: 'pending' | 'synced' | 'failed';
  searchableDate?: string;
}

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Online");
      setIsOnline(true);
      syncOfflineSessions();
    };
    const handleOffline = () => {
      console.log("📴 Offline");
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Helper: Generate document ID for consistency
  const generateSessionId = (classId: string, teacherId: string, date: string) => {
    const cleanDate = date.split('T')[0].replace(/-/g, '');
    return `${classId}_${teacherId}_${cleanDate}`.toLowerCase();
  };

  // Store offline session in localStorage
  const storeOfflineSession = async (sessionData: any, status: 'draft' | 'submitted') => {
    try {
      const sessionId = generateSessionId(
        sessionData.classId, 
        currentUser?.uid || 'offline_user', 
        sessionData.date
      );
      
      const offlineSession = {
        ...sessionData,
        id: sessionId,
        status: 'offline',
        syncStatus: 'pending',
        offlineId: `offline_${Date.now()}`,
        storedAt: new Date().toISOString(),
        originalStatus: status
      };
      
      const offlineSessions = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
      offlineSessions.push(offlineSession);
      localStorage.setItem('offlineAttendance', JSON.stringify(offlineSessions));
      
      console.log("💾 Stored offline session:", sessionId);
      return sessionId;
    } catch (err) {
      console.error("Failed to store offline:", err);
      throw err;
    }
  };

  // Sync offline sessions when back online
  const syncOfflineSessions = useCallback(async () => {
    if (!isOnline || !currentUser) {
      console.log("⏸️  Skipping sync - offline or no user");
      return;
    }
    
    setLoading(true);
    try {
      const offlineSessions = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
      
      if (offlineSessions.length === 0) {
        console.log("✅ No offline sessions to sync");
        return;
      }
      
      console.log("🔄 Syncing", offlineSessions.length, "offline sessions");
      const syncedIds: string[] = [];
      
      for (const session of offlineSessions) {
        try {
          const sessionRef = doc(db, "attendanceSessions", session.id);
          const finalStatus = session.originalStatus || 'submitted';
          
          // Prepare data for Firestore
          const firestoreData = {
            ...session,
            status: finalStatus,
            syncStatus: 'synced',
            updatedAt: serverTimestamp(),
            submittedAt: finalStatus === 'submitted' ? serverTimestamp() : null,
            searchableDate: session.date || session.searchableDate
          };
          
          // Remove offline-only fields
          delete firestoreData.offlineId;
          delete firestoreData.storedAt;
          delete firestoreData.originalStatus;
          
          await setDoc(sessionRef, firestoreData, { merge: true });
          syncedIds.push(session.offlineId);
          console.log("✅ Synced session:", session.id);
        } catch (err) {
          console.error("❌ Failed to sync session:", session.id, err);
        }
      }
      
      // Remove synced sessions
      if (syncedIds.length > 0) {
        const remainingSessions = offlineSessions.filter(
          (s: any) => !syncedIds.includes(s.offlineId)
        );
        localStorage.setItem('offlineAttendance', JSON.stringify(remainingSessions));
        toast.success(`Synced ${syncedIds.length} offline sessions!`);
      }
    } catch (err) {
      console.error("❌ Sync failed:", err);
      toast.error("Failed to sync offline sessions");
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOnline]);

  // Save/update draft attendance
  const saveDraftAttendance = useCallback(async (sessionData: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const sessionId = generateSessionId(sessionData.classId, currentUser.uid, sessionData.date);
      const sessionRef = doc(db, "attendanceSessions", sessionId);
      
      const firestoreData = {
        ...sessionData,
        id: sessionId,
        records: sessionData.records.map(record => ({
          ...record,
          status: record.status,
          markedAt: record.markedAt instanceof Date ? record.markedAt.toISOString() : record.markedAt
        })),
        searchableDate: sessionData.date.split('T')[0],
        updatedAt: serverTimestamp(),
        syncStatus: 'synced' as const,
      };

      await setDoc(sessionRef, firestoreData, { merge: true });
      console.log("✅ Draft saved:", sessionId);
      return sessionId;
    } catch (err: any) {
      console.error("❌ Save draft error:", err);
      
      if (!isOnline) {
        const offlineId = await storeOfflineSession(sessionData, 'draft');
        toast.warning("Saved offline - will sync when online");
        return offlineId;
      }
      
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOnline]);

  // Submit attendance
  const submitAttendance = useCallback(async (sessionData: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    setLoading(true);
    setError(null);
    
    try {
      const formattedDate = sessionData.date.split('T')[0];
      const sessionId = generateSessionId(sessionData.classId, currentUser.uid, formattedDate);
      
      console.log("📤 SUBMITTING ATTENDANCE:", {
        sessionId,
        date: formattedDate,
        classId: sessionData.classId,
        teacherId: currentUser.uid,
        status: 'submitted'
      });
      
      const sessionRef = doc(db, "attendanceSessions", sessionId);
      
      const submittedSession = {
        ...sessionData,
        id: sessionId,
        date: formattedDate,
        status: 'submitted' as const,
        records: sessionData.records.map(record => ({
          ...record,
          status: record.status,
          markedAt: record.markedAt instanceof Date ? record.markedAt.toISOString() : record.markedAt
        })),
        searchableDate: formattedDate,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncStatus: 'synced' as const,
      };

      await setDoc(sessionRef, submittedSession, { merge: true });
      console.log("✅ Attendance submitted:", sessionId);
      
      // Clean up any offline version
      const offlineSessions = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
      const remaining = offlineSessions.filter((s: any) => !s.id.includes(sessionId));
      localStorage.setItem('offlineAttendance', JSON.stringify(remaining));
      
      return sessionId;
    } catch (err: any) {
      console.error("❌ Submit error:", err);
      
      if (!isOnline) {
        const offlineId = await storeOfflineSession(sessionData, 'submitted');
        toast.warning("Submitted offline - will sync when online");
        return offlineId;
      }
      
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOnline]);

  // Get draft attendance
  const getDraftAttendance = useCallback(async (classId: string, date: string): Promise<AttendanceSession | null> => {
    if (!currentUser) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const sessionId = generateSessionId(classId, currentUser.uid, date);
      const sessionRef = doc(db, "attendanceSessions", sessionId);
      const docSnap = await getDoc(sessionRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      if (data.status !== 'draft') {
        return null;
      }
      
      return {
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
          status: record.status || null,
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
    } catch (err: any) {
      console.error("❌ Get draft error:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get attendance overview
  const getAttendanceOverview = useCallback(async (startDate: string, endDate: string): Promise<AttendanceSession[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 FETCHING ATTENDANCE OVERVIEW:", { startDate, endDate });
      
      const q = query(
        collection(db, "attendanceSessions"),
        where("status", "==", "submitted"),
        where("searchableDate", ">=", startDate),
        where("searchableDate", "<=", endDate),
        orderBy("searchableDate", "desc"),
        orderBy("submittedAt", "desc")
      );
      
      console.log("📊 Executing Firestore query...");
      const querySnapshot = await getDocs(q);
      console.log("✅ Query completed, found:", querySnapshot.size, "documents");
      
      const sessions = querySnapshot.docs.map(docSnap => {
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
      
      // Also check for any offline submitted sessions
      const offlineSessions = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
      const offlineSubmitted = offlineSessions.filter((s: any) => 
        s.originalStatus === 'submitted' && 
        s.searchableDate >= startDate && 
        s.searchableDate <= endDate
      );
      
      console.log("📱 Found offline sessions:", offlineSubmitted.length);
      
      return [...sessions, ...offlineSubmitted];
    } catch (err: any) {
      console.error("❌ Error in getAttendanceOverview:", err);
      
      if (err.code === 'failed-precondition') {
        console.error("⚠️ Missing Firestore index! Please create composite index for:");
        console.error("Collection: attendanceSessions");
        console.error("Fields: status (asc), searchableDate (desc), submittedAt (desc)");
        toast.error("Database index needed - showing offline data only");
        
        // Return offline data as fallback
        const offlineSessions = JSON.parse(localStorage.getItem('offlineAttendance') || '[]');
        return offlineSessions.filter((s: any) => s.originalStatus === 'submitted');
      }
      
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get teacher attendance history
  const getTeacherAttendanceHistory = useCallback(async (teacherId: string, limit = 50): Promise<AttendanceSession[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const q = query(
        collection(db, "attendanceSessions"),
        where("teacherId", "==", teacherId),
        where("status", "in", ["submitted", "draft"]),
        orderBy("updatedAt", "desc")
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
      console.error("Get teacher history error:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Archive old sessions (admin only)
  const archiveOldSessions = useCallback(async (olderThanDays: number = 90) => {
    // Check if user has admin role based on your AppUser structure
    if (!currentUser) {
      throw new Error("Authentication required");
    }
    
    setLoading(true);
    try {
      toast.info("Archive feature coming soon!");
      return 0;
    } catch (err: any) {
      console.error("Archive error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get historical data
  const getHistoricalData = useCallback(async (year?: number, month?: number) => {
    setLoading(true);
    try {
      toast.info("Historical data feature coming soon!");
      return [];
    } catch (err: any) {
      console.error("Historical data error:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && currentUser) {
      console.log("🔄 Auto-syncing offline sessions...");
      syncOfflineSessions();
    }
  }, [isOnline, currentUser, syncOfflineSessions]);

  return {
    loading,
    error,
    isOnline,
    saveDraftAttendance,
    submitAttendance,
    getDraftAttendance,
    getTeacherAttendanceHistory,
    getAttendanceOverview,
    archiveOldSessions,
    getHistoricalData,
    syncOfflineSessions,
    storeOfflineSession
  };
};