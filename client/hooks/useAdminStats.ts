// client/hooks/useAdminStats.ts
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getCountFromServer,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import { ClassDoc } from "@/types/firestore";

export interface ClassProgress {
  id: string;
  name: string;
  totalLearners: number;
  submittedCount: number; // Learners with any submitted assessment
  teacherNames: string;
  reportsReadyCount: number; // Learners with complete report cards
  reportsReadyPercent: number; // Percentage of learners with complete reports in this class
}

export interface AdminStats {
  totalLearners: number;
  totalClasses: number;
  totalTeachers: number;
  classes: ClassProgress[];
  totalReportsReady: number; // Total learners with complete reports across all classes
  reportsReadyPercent: number; // Overall percentage of learners with complete reports
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "classes"),
      async (classesSnapshot) => {
        try {
          // ✅ Cast to ClassDoc
          const classes = classesSnapshot.docs.map(doc => {
            const data = doc.data() as ClassDoc;
            return {
              id: doc.id,
              name: data.name || "Unnamed Class",
              learnerIds: Array.isArray(data.learnerIds) ? data.learnerIds : [],
            };
          });

          const totalClasses = classes.length;

          const learnersCount = await getCountFromServer(collection(db, "learners"));
          const totalLearners = learnersCount.data().count;

          const teachersQuery = query(
            collection(db, "users"),
            where("role", "==", "teacher")
          );
          const teachersCount = await getCountFromServer(teachersQuery);
          const totalTeachers = teachersCount.data().count;

          const classesWithProgress: ClassProgress[] = [];
          let totalReportsReady = 0; // Track total ready reports across all classes

          // Process each class
          for (const cls of classes) {
            const totalLearnersInClass = cls.learnerIds.length;
            
            // For now, leave teacherNames as placeholder
            const teacherNames = "—";

            // 1. Count unique learners with submitted assessments (existing logic)
            const assessmentsSnapshot = await getDocs(
              query(
                collection(db, "assessments"),
                where("classId", "==", cls.id),
                where("status", "==", "submitted")
              )
            );

            const learnerSubmissionMap = new Set<string>();
            assessmentsSnapshot.docs.forEach(doc => {
              const data = doc.data() as DocumentData;
              if (data.scores && typeof data.scores === "object") {
                Object.keys(data.scores).forEach(learnerId => {
                  learnerSubmissionMap.add(learnerId);
                });
              }
            });
            const submittedCount = learnerSubmissionMap.size;

            // 2. Count learners with completed report cards (NEW LOGIC)
            let reportsReadyCount = 0;
            
            if (cls.learnerIds.length > 0) {
              // For each learner in this class, check if they have all required assessments
              for (const learnerId of cls.learnerIds) {
                try {
                  // Check if learner has marks for all three assessment types
                  const assessmentTypes = ["week4", "week8", "end_of_term"];
                  let hasAllAssessments = true;
                  
                  // We need to check if learner has marks for EACH assessment type
                  // A learner might have marks in different subjects, so we check existence
                  for (const assessmentType of assessmentTypes) {
                    const marksQuery = query(
                      collection(db, "marks"),
                      where("learnerId", "==", learnerId),
                      where("classId", "==", cls.id),
                      where("assessmentType", "==", assessmentType),
                      where("score", ">=", 0) // Ensure there's an actual score
                    );
                    
                    const marksSnapshot = await getDocs(marksQuery);
                    
                    // If no marks found for this assessment type, learner doesn't have complete report
                    if (marksSnapshot.empty) {
                      hasAllAssessments = false;
                      break;
                    }
                  }
                  
                  if (hasAllAssessments) {
                    reportsReadyCount++;
                  }
                } catch (learnerErr) {
                  console.error(`Error checking learner ${learnerId}:`, learnerErr);
                  // Continue with other learners even if one fails
                }
              }
            }
            
            totalReportsReady += reportsReadyCount;
            
            // Calculate percentage for this class
            const classReportsReadyPercent = totalLearnersInClass > 0 
              ? Math.round((reportsReadyCount / totalLearnersInClass) * 100)
              : 0;

            classesWithProgress.push({
              id: cls.id,
              name: cls.name,
              totalLearners: totalLearnersInClass,
              submittedCount,
              teacherNames,
              reportsReadyCount,
              reportsReadyPercent: classReportsReadyPercent,
            });
          }

          // Calculate overall percentage
          const overallReportsReadyPercent = totalLearners > 0 
            ? Math.round((totalReportsReady / totalLearners) * 100)
            : 0;

          setStats({
            totalLearners,
            totalClasses,
            totalTeachers,
            classes: classesWithProgress,
            totalReportsReady,
            reportsReadyPercent: overallReportsReadyPercent,
          });
          setLoading(false);
        } catch (err) {
          console.error("Error fetching admin stats:", err);
          setError("Failed to load dashboard data");
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  return { stats, loading, error };
}