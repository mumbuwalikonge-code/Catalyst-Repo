// src/hooks/useMarksData.ts
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  onSnapshot,
} from "firebase/firestore";
import { useClassManagement } from "./useClasses";
import { useTeacherManagement } from "./useTeacherManagement";

// ===== TYPES =====
export type AssessmentType = "week4" | "week8" | "end_of_term";
export type Term = "term1" | "term2" | "term3";

export interface LearnerMark {
  id: string;
  admissionNo: string;
  name: string;
  gender: "M" | "F";
  score: number | null;
  classId: string;
  className: string;
  subject: string;
  assessmentType?: AssessmentType;
}

export interface SubjectClassResults {
  id: string;
  classId: string;
  className: string;
  subject: string;
  teacherId?: string;
  learners: LearnerMark[];
}

export interface CompiledLearnerMark {
  id: string;
  admissionNo: string;
  name: string;
  gender: "M" | "F";
  classId: string;
  className: string;
  subject: string;
  week4: number | null;
  week8: number | null;
  endOfTerm: number | null;
  finalScore: number;
  teacherComment?: string;
  teacherName?: string;
}

export interface LearnerReport {
  id: string;
  name: string;
  classId: string;
  className: string;
  subjects: Array<{
    name: string;
    week4: number | null;
    week8: number | null;
    endOfTerm: number | null;
    score: number;
    grade: string;
    gradeDescription: string;
    teacherComment?: string;
    teacherName?: string;
  }>;
  comment: string;
  parentPhone?: string;
  parentEmail?: string;
  reportReady: boolean;
  reportSent: boolean;
  sentVia?: string[];
  sentAt?: string;
  sex: "M" | "F";
  admissionNo?: string;
}

// Teacher Progress Types
export interface TeacherProgress {
  teacherId: string;
  teacherName: string;
  subjects: string[];
  submittedSubjects: number;
  totalSubjects: number;
  percentComplete: number;
  missingSubjects: string[];
}

export interface ClassProgress {
  classId: string;
  className: string;
  teachers: TeacherProgress[];
  totalSubjects: number;
  submittedSubjects: number;
  percentComplete: number;
  ready: boolean;
  learners: {
    total: number;
    ready: number;
    sent: number;
  };
}

// ===== ECZ GRADING SYSTEM =====
export const ECZ_GRADING_SYSTEM = [
  { min: 75, max: 100, grade: "Distinction 1", code: "1", description: "Excellent" },
  { min: 70, max: 74, grade: "Distinction 2", code: "2", description: "Very Good" },
  { min: 65, max: 69, grade: "Merit 1", code: "3", description: "Good" },
  { min: 60, max: 64, grade: "Merit 2", code: "4", description: "Above Average" },
  { min: 55, max: 59, grade: "Credit 1", code: "5", description: "Average" },
  { min: 50, max: 54, grade: "Credit 2", code: "6", description: "Satisfactory" },
  { min: 45, max: 49, grade: "Satisfactory 1", code: "7", description: "Below Average" },
  { min: 40, max: 44, grade: "Satisfactory 2", code: "8", description: "Poor" },
  { min: 0, max: 39, grade: "Unsatisfactory", code: "9", description: "Fail" },
];

// ===== KALABO GRADE BANDS =====
export const KALABO_GRADE_BANDS = [
  { label: "Dist 1", min: 75, max: 100, key: "dist1" },
  { label: "Dist 2", min: 70, max: 74, key: "dist2" },
  { label: "Merit 1", min: 65, max: 69, key: "merit1" },
  { label: "Merit 2", min: 60, max: 64, key: "merit2" },
  { label: "Credit 1", min: 55, max: 59, key: "credit1" },
  { label: "Credit 2", min: 50, max: 54, key: "credit2" },
  { label: "Sat 1", min: 45, max: 49, key: "sat1" },
  { label: "Sat 2", min: 40, max: 44, key: "sat2" },
  { label: "Unsat", min: 0, max: 39, key: "unsat" },
];

// ===== HELPER FUNCTIONS =====
export const getECZGrade = (score: number): { grade: string; code: string; description: string } => {
  const grade = ECZ_GRADING_SYSTEM.find(g => score >= g.min && score <= g.max);
  return grade || ECZ_GRADING_SYSTEM[ECZ_GRADING_SYSTEM.length - 1];
};

export const getGrade = (score: number): string => {
  return getECZGrade(score).code;
};

export const getGradeDescription = (score: number): string => {
  return getECZGrade(score).grade;
};

export const getAssessmentLabel = (type: AssessmentType): string => {
  switch (type) {
    case "week4": return "Week 4 Assessment";
    case "week8": return "Week 8 Assessment";
    case "end_of_term": return "End of Term Examination";
    default: return "Assessment";
  }
};

export const generateAdmissionNo = (className: string, index: number): string => {
  const classMatch = className.match(/(\w)(\d+)(\w*)/i);
  if (classMatch) {
    const [, firstChar, year, section] = classMatch;
    const classCode = `${firstChar.toUpperCase()}${year}${section || ''}`.substring(0, 3);
    return `${classCode}-${(index + 1).toString().padStart(3, '0')}`;
  }
  const classCode = className.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  return `${classCode}-${(index + 1).toString().padStart(3, '0')}`;
};

// ===== Compute Kalabo Metrics =====
type GradeCounts = Record<string, { boys: number; girls: number }>;

export interface KalaboMetrics {
  onRoll: { total: number; boys: number; girls: number };
  sat: { total: number; boys: number; girls: number };
  gradeCounts: GradeCounts;
  quality: { boys: number; girls: number; overall: string };
  fail: { count: { boys: number; girls: number; total: number }; pct: string };
}

export const computeKalaboMetrics = (learners: LearnerMark[]): KalaboMetrics => {
  const onRollTotal = learners.length;
  const onRollBoys = learners.filter(l => l.gender === "M").length;
  const onRollGirls = learners.filter(l => l.gender === "F").length;

  const satLearners = learners.filter(l => l.score !== null);
  const satTotal = satLearners.length;
  const satBoys = satLearners.filter(l => l.gender === "M").length;
  const satGirls = satLearners.filter(l => l.gender === "F").length;

  const gradeCounts: GradeCounts = {};
  KALABO_GRADE_BANDS.forEach(band => {
    gradeCounts[band.key] = { boys: 0, girls: 0 };
  });

  satLearners.forEach(learner => {
    const score = learner.score!;
    const band = KALABO_GRADE_BANDS.find(b => score >= b.min && score <= b.max);
    if (band) {
      if (learner.gender === "M") gradeCounts[band.key].boys++;
      else gradeCounts[band.key].girls++;
    }
  });

  const qualityBands = KALABO_GRADE_BANDS.slice(0, 6);
  const qualityBoys = qualityBands.reduce((sum, b) => sum + gradeCounts[b.key].boys, 0);
  const qualityGirls = qualityBands.reduce((sum, b) => sum + gradeCounts[b.key].girls, 0);

  const failBoys = gradeCounts.unsat.boys;
  const failGirls = gradeCounts.unsat.girls;
  const failTotal = failBoys + failGirls;

  const qualityPctOverall = satTotal > 0 ? (((qualityBoys + qualityGirls) / satTotal) * 100).toFixed(1) : "0.0";
  const failPctOverall = satTotal > 0 ? ((failTotal / satTotal) * 100).toFixed(1) : "0.0";

  return {
    onRoll: { total: onRollTotal, boys: onRollBoys, girls: onRollGirls },
    sat: { total: satTotal, boys: satBoys, girls: satGirls },
    gradeCounts,
    quality: { boys: qualityBoys, girls: qualityGirls, overall: qualityPctOverall },
    fail: { count: { boys: failBoys, girls: failGirls, total: failTotal }, pct: failPctOverall },
  };
};

// ===== MAIN HOOK =====
export function useMarksData() {
  const { classes: allClasses, getClassLearners } = useClassManagement();
  const { assignments, getTeachersForClass } = useTeacherManagement();
  
  const [subjectClasses, setSubjectClasses] = useState<SubjectClassResults[]>([]);
  const [learnerReports, setLearnerReports] = useState<LearnerReport[]>([]);
  const [compiledMarks, setCompiledMarks] = useState<CompiledLearnerMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // ===== FETCH MARKS BY CLASS-SUBJECT (for specific assessment type) =====
  const fetchSubjectClassMarks = useCallback(async (
    term: Term,
    assessmentType: AssessmentType,
    teacherId?: string
  ): Promise<SubjectClassResults[]> => {
    if (!allClasses.length || !assignments.length) return [];
    
    try {
      const filteredAssignments = teacherId 
        ? assignments.filter(a => a.teacherId === teacherId)
        : assignments;
      
      const classSubjectMap = new Map<string, { 
        classId: string; 
        className: string; 
        subject: string;
        teacherId?: string;
      }>();
      
      filteredAssignments.forEach(assignment => {
        const key = `${assignment.classId}-${assignment.subject}`;
        if (!classSubjectMap.has(key)) {
          const classInfo = allClasses.find(c => c.id === assignment.classId);
          classSubjectMap.set(key, {
            classId: assignment.classId,
            className: classInfo?.name || "Unknown Class",
            subject: assignment.subject,
            teacherId: assignment.teacherId,
          });
        }
      });

      const subjectClassPromises = Array.from(classSubjectMap.values()).map(async (combo) => {
        const learnersData = await getClassLearners(combo.classId);
        
        const learnersWithMarks: LearnerMark[] = await Promise.all(
          learnersData.map(async (learner, index) => {
            const marksQuery = query(
              collection(db, "marks"),
              where("learnerId", "==", learner.id),
              where("classId", "==", combo.classId),
              where("subject", "==", combo.subject),
              where("term", "==", term),
              where("assessmentType", "==", assessmentType)
            );
            
            const marksSnapshot = await getDocs(marksQuery);
            let score: number | null = null;
            
            if (!marksSnapshot.empty) {
              const markData = marksSnapshot.docs[0].data() as DocumentData;
              score = markData.score;
            }
            
            // FIX: Use optional chaining and type assertion to handle admissionNo
            const learnerData = learner as any; // Temporary fix
            return {
              id: learner.id,
              admissionNo: learnerData.admissionNo || generateAdmissionNo(combo.className, index),
              name: learner.name,
              gender: learner.sex || "M",
              score: score,
              classId: combo.classId,
              className: combo.className,
              subject: combo.subject,
              assessmentType,
            };
          })
        );
        
        return {
          id: `${combo.classId}-${combo.subject}`,
          classId: combo.classId,
          className: combo.className,
          subject: combo.subject,
          teacherId: combo.teacherId,
          learners: learnersWithMarks,
        };
      });

      return await Promise.all(subjectClassPromises);
      
    } catch (err) {
      console.error("Error fetching subject class marks:", err);
      throw err;
    }
  }, [allClasses, assignments, getClassLearners]);

  // ===== FETCH LEARNER REPORTS (compiled across all assessment types) =====
  const fetchLearnerReports = useCallback(async (
    term: Term
  ): Promise<LearnerReport[]> => {
    if (!allClasses.length) return [];
    
    try {
      const allLearnerReports: LearnerReport[] = [];
      const assessmentTypes: AssessmentType[] = ["week4", "week8", "end_of_term"];
      
      for (const cls of allClasses) {
        const classLearners = await getClassLearners(cls.id);
        
        const learnerPromises = classLearners.map(async (learner) => {
          const marksBySubject: Record<string, {
            week4: number | null;
            week8: number | null;
            endOfTerm: number | null;
            teacherComment?: string;
            teacherName?: string;
          }> = {};
          
          for (const assessmentType of assessmentTypes) {
            const marksQuery = query(
              collection(db, "marks"),
              where("learnerId", "==", learner.id),
              where("term", "==", term),
              where("assessmentType", "==", assessmentType)
            );
            
            const marksSnapshot = await getDocs(marksQuery);
            
            marksSnapshot.docs.forEach(doc => {
              const markData = doc.data() as DocumentData;
              const subject = markData.subject;
              const score = markData.score;
              const comment = markData.comment || "";
              const teacherName = markData.teacherName || "";
              
              if (!marksBySubject[subject]) {
                marksBySubject[subject] = {
                  week4: null,
                  week8: null,
                  endOfTerm: null,
                };
              }
              
              if (assessmentType === "week4") marksBySubject[subject].week4 = score;
              if (assessmentType === "week8") marksBySubject[subject].week8 = score;
              if (assessmentType === "end_of_term") marksBySubject[subject].endOfTerm = score;
              
              if (comment && !marksBySubject[subject].teacherComment) {
                marksBySubject[subject].teacherComment = comment;
                marksBySubject[subject].teacherName = teacherName;
              }
            });
          }
          
          const subjects = Object.entries(marksBySubject)
            .map(([subjectName, marks]) => {
              const finalScore = marks.endOfTerm !== null ? marks.endOfTerm : 
                                marks.week8 !== null ? marks.week8 : 
                                marks.week4 !== null ? marks.week4 : 0;
              
              const eczGrade = getECZGrade(finalScore);
              
              return {
                name: subjectName,
                week4: marks.week4,
                week8: marks.week8,
                endOfTerm: marks.endOfTerm,
                score: finalScore,
                grade: eczGrade.code,
                gradeDescription: eczGrade.grade,
                teacherComment: marks.teacherComment,
                teacherName: marks.teacherName,
              };
            });
          
          const reportReady = subjects.length > 0 && subjects.every(subject => {
            return subject.week4 !== undefined && 
                   subject.week8 !== undefined && 
                   subject.endOfTerm !== undefined;
          });
          
          // FIX: Use optional chaining and type assertion
          const learnerData = learner as any; // Temporary fix
          
          return {
            id: learner.id,
            name: learner.name,
            classId: cls.id,
            className: cls.name,
            subjects,
            comment: "Good performance overall. Shows improvement.",
            parentPhone: learner.parentPhone,
            parentEmail: learner.parentEmail,
            reportReady,
            reportSent: false,
            sex: learner.sex || "M",
            admissionNo: learnerData.admissionNo,
          };
        });
        
        const classLearnerData = await Promise.all(learnerPromises);
        allLearnerReports.push(...classLearnerData);
      }
      
      return allLearnerReports;
      
    } catch (err) {
      console.error("Error fetching learner reports:", err);
      throw err;
    }
  }, [allClasses, getClassLearners]);

  // ===== GET COMPILED MARKS FOR A CLASS =====
  const getCompiledClassMarks = useCallback(async (
    classId: string,
    term: Term
  ): Promise<CompiledLearnerMark[]> => {
    const classLearners = await getClassLearners(classId);
    const classInfo = allClasses.find(c => c.id === classId);
    const assessmentTypes: AssessmentType[] = ["week4", "week8", "end_of_term"];
    
    const compiledMarks: CompiledLearnerMark[] = [];
    
    for (const learner of classLearners) {
      const marksBySubject: Record<string, {
        week4: number | null;
        week8: number | null;
        endOfTerm: number | null;
        teacherComment?: string;
        teacherName?: string;
      }> = {};
      
      for (const assessmentType of assessmentTypes) {
        const marksQuery = query(
          collection(db, "marks"),
          where("learnerId", "==", learner.id),
          where("term", "==", term),
          where("assessmentType", "==", assessmentType)
        );
        
        const marksSnapshot = await getDocs(marksQuery);
        
        marksSnapshot.docs.forEach(doc => {
          const markData = doc.data() as DocumentData;
          const subject = markData.subject;
          const score = markData.score;
          const comment = markData.comment || "";
          const teacherName = markData.teacherName || "";
          
          if (!marksBySubject[subject]) {
            marksBySubject[subject] = {
              week4: null,
              week8: null,
              endOfTerm: null,
            };
          }
          
          if (assessmentType === "week4") marksBySubject[subject].week4 = score;
          if (assessmentType === "week8") marksBySubject[subject].week8 = score;
          if (assessmentType === "end_of_term") marksBySubject[subject].endOfTerm = score;
          
          if (comment && !marksBySubject[subject].teacherComment) {
            marksBySubject[subject].teacherComment = comment;
            marksBySubject[subject].teacherName = teacherName;
          }
        });
      }
      
      Object.entries(marksBySubject).forEach(([subject, marks]) => {
        const finalScore = marks.endOfTerm !== null ? marks.endOfTerm : 
                          marks.week8 !== null ? marks.week8 : 
                          marks.week4 !== null ? marks.week4 : 0;
        
        // FIX: Use optional chaining and type assertion
        const learnerData = learner as any; // Temporary fix
        
        compiledMarks.push({
          id: learner.id,
          admissionNo: learnerData.admissionNo || "",
          name: learner.name,
          gender: learner.sex || "M",
          classId,
          className: classInfo?.name || "Unknown",
          subject,
          week4: marks.week4,
          week8: marks.week8,
          endOfTerm: marks.endOfTerm,
          finalScore,
          teacherComment: marks.teacherComment,
          teacherName: marks.teacherName,
        });
      });
    }
    
    return compiledMarks;
  }, [allClasses, getClassLearners]);

  // ===== GET TEACHER PROGRESS (for all assessment types) =====
  const getTeacherProgress = useCallback((classId: string, term: Term): TeacherProgress[] => {
    const classTeachers = getTeachersForClass(classId);
    
    return classTeachers.map(teacher => {
      const teacherSubjects = teacher.subjects;
      let submittedSubjects = 0;
      const missingSubjects: string[] = [];
      
      teacherSubjects.forEach(subject => {
        const subjectClass = subjectClasses.find(
          sc => sc.subject === subject && sc.teacherId === teacher.teacherId
        );
        
        if (subjectClass) {
          const totalLearners = subjectClass.learners.length;
          const markedLearners = subjectClass.learners.filter(l => l.score !== null).length;
          
          if (markedLearners >= totalLearners * 0.8) {
            submittedSubjects++;
          } else {
            missingSubjects.push(subject);
          }
        } else {
          missingSubjects.push(subject);
        }
      });
      
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        subjects: teacherSubjects,
        submittedSubjects,
        totalSubjects: teacherSubjects.length,
        percentComplete: teacherSubjects.length > 0 
          ? Math.round((submittedSubjects / teacherSubjects.length) * 100) 
          : 0,
        missingSubjects,
      };
    });
  }, [subjectClasses, getTeachersForClass]);

  // ===== GET CLASS PROGRESS =====
  const getClassProgress = useCallback((classId: string, term: Term): ClassProgress | null => {
    const classTeachers = getTeachersForClass(classId);
    if (!classTeachers.length) return null;
    
    const teacherProgress = getTeacherProgress(classId, term);
    const classLearnerReports = learnerReports.filter(lr => lr.classId === classId);
    const readyLearners = classLearnerReports.filter(lr => lr.reportReady).length;
    const sentLearners = classLearnerReports.filter(lr => lr.reportSent).length;
    
    let totalSubjects = 0;
    let submittedSubjects = 0;
    
    teacherProgress.forEach(teacher => {
      totalSubjects += teacher.totalSubjects;
      submittedSubjects += teacher.submittedSubjects;
    });
    
    const percentComplete = totalSubjects > 0 
      ? Math.round((submittedSubjects / totalSubjects) * 100) 
      : 0;
    
    return {
      classId,
      className: allClasses.find(c => c.id === classId)?.name || "Unknown Class",
      teachers: teacherProgress,
      totalSubjects,
      submittedSubjects,
      percentComplete,
      ready: percentComplete === 100,
      learners: {
        total: classLearnerReports.length,
        ready: readyLearners,
        sent: sentLearners,
      },
    };
  }, [getTeachersForClass, getTeacherProgress, learnerReports, allClasses]);

  // ===== GET ALL CLASSES PROGRESS =====
  const getAllClassesProgress = useCallback((term: Term): ClassProgress[] => {
    const classIds = Array.from(new Set(subjectClasses.map(sc => sc.classId)));
    const progress: ClassProgress[] = [];
    
    classIds.forEach(classId => {
      const classProgress = getClassProgress(classId, term);
      if (classProgress) {
        progress.push(classProgress);
      }
    });
    
    return progress;
  }, [subjectClasses, getClassProgress]);

  // ===== CHECK SUBJECT COMPLETION FOR ALL ASSESSMENT TYPES =====
  const checkSubjectCompletionAllAssessments = useCallback((classId: string, term: Term) => {
    const classTeachers = getTeachersForClass(classId);
    const classLearnerReports = learnerReports.filter(lr => lr.classId === classId);
    
    const result: Array<{
      subject: string;
      teacherId: string;
      teacherName: string;
      week4Complete: boolean;
      week8Complete: boolean;
      endOfTermComplete: boolean;
      fullyComplete: boolean;
    }> = [];
    
    classTeachers.forEach(teacher => {
      teacher.subjects.forEach(subject => {
        const subjectData = classLearnerReports
          .flatMap(lr => lr.subjects)
          .filter(s => s.name === subject);
        
        const week4Count = subjectData.filter(s => s.week4 !== undefined && s.week4 !== null).length;
        const week8Count = subjectData.filter(s => s.week8 !== undefined && s.week8 !== null).length;
        const endOfTermCount = subjectData.filter(s => s.endOfTerm !== undefined && s.endOfTerm !== null).length;
        
        const totalLearners = classLearnerReports.length;
        const threshold = totalLearners * 0.8;
        
        const week4Complete = week4Count >= threshold;
        const week8Complete = week8Count >= threshold;
        const endOfTermComplete = endOfTermCount >= threshold;
        const fullyComplete = week4Complete && week8Complete && endOfTermComplete;
        
        result.push({
          subject,
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          week4Complete,
          week8Complete,
          endOfTermComplete,
          fullyComplete,
        });
      });
    });
    
    return result;
  }, [learnerReports, getTeachersForClass]);

  // ===== GET READY CLASSES =====
  const getReadyClasses = useCallback((term: Term): string[] => {
    const allProgress = getAllClassesProgress(term);
    return allProgress
      .filter(progress => progress.ready)
      .map(progress => progress.classId);
  }, [getAllClassesProgress]);

  // ===== GET PENDING CLASSES =====
  const getPendingClasses = useCallback((term: Term): string[] => {
    const allProgress = getAllClassesProgress(term);
    return allProgress
      .filter(progress => !progress.ready)
      .map(progress => progress.classId);
  }, [getAllClassesProgress]);

  // ===== GET MARKS FOR TEACHER =====
  const getTeacherMarks = useCallback(async (
    teacherId: string,
    term: Term,
    assessmentType: AssessmentType
  ) => {
    return await fetchSubjectClassMarks(term, assessmentType, teacherId);
  }, [fetchSubjectClassMarks]);

  // ===== GET ALL SCHOOL MARKS =====
  const getAllSchoolMarks = useCallback(async (
    term: Term,
    assessmentType: AssessmentType
  ) => {
    return await fetchSubjectClassMarks(term, assessmentType);
  }, [fetchSubjectClassMarks]);

  // ===== GET REPORTS BY CLASS =====
  const getReportsByClass = useCallback(async (
    classId: string,
    term: Term
  ): Promise<LearnerReport[]> => {
    const allReports = await fetchLearnerReports(term);
    return allReports.filter(report => report.classId === classId);
  }, [fetchLearnerReports]);

  // ===== REFRESH DATA =====
  const refreshData = useCallback(async (
    term: Term,
    options?: { teacherId?: string; classId?: string }
  ) => {
    setLoading(true);
    setError("");
    
    try {
      if (options?.classId) {
        const reports = await getReportsByClass(options.classId, term);
        setLearnerReports(reports);
        setSubjectClasses([]);
      } else if (options?.teacherId) {
        const marks = await getTeacherMarks(options.teacherId, term, "end_of_term");
        setSubjectClasses(marks);
        setLearnerReports([]);
      } else {
        const reports = await fetchLearnerReports(term);
        setLearnerReports(reports);
        
        const compiledMarksArray: CompiledLearnerMark[] = [];
        for (const cls of allClasses) {
          const marks = await getCompiledClassMarks(cls.id, term);
          compiledMarksArray.push(...marks);
        }
        setCompiledMarks(compiledMarksArray);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Failed to load marks data");
    } finally {
      setLoading(false);
    }
  }, [fetchLearnerReports, getTeacherMarks, getReportsByClass, getCompiledClassMarks, allClasses]);

  // ===== REALTIME LISTENER FOR MARKS =====
  const setupMarksListener = useCallback((
    term: Term,
    assessmentType: AssessmentType,
    callback: (marks: SubjectClassResults[]) => void
  ) => {
    const marksQuery = query(
      collection(db, "marks"),
      where("term", "==", term),
      where("assessmentType", "==", assessmentType)
    );
    
    const unsubscribe = onSnapshot(marksQuery, async (snapshot) => {
      const marks = await getAllSchoolMarks(term, assessmentType);
      callback(marks);
    });
    
    return unsubscribe;
  }, [getAllSchoolMarks]);

  // ===== AGGREGATE SCHOOL METRICS =====
  const aggregateSchoolMetrics = useCallback((subjectClasses: SubjectClassResults[]) => {
    let totalOnRoll = 0;
    let totalSat = 0;
    let totalQuality = 0;
    let totalFail = 0;
    let totalSatCount = 0;

    subjectClasses.forEach(cls => {
      const metrics = computeKalaboMetrics(cls.learners);
      totalOnRoll += metrics.onRoll.total;
      totalSat += metrics.sat.total;
      totalQuality += parseFloat(metrics.quality.overall) * metrics.sat.total;
      totalFail += parseFloat(metrics.fail.pct) * metrics.sat.total;
      totalSatCount += metrics.sat.total;
    });

    const avgQuality = totalSatCount > 0 ? (totalQuality / totalSatCount).toFixed(1) : "0.0";
    const avgFail = totalSatCount > 0 ? (totalFail / totalSatCount).toFixed(1) : "0.0";

    return {
      onRoll: totalOnRoll,
      sat: totalSat,
      qualityPct: avgQuality,
      failPct: avgFail,
    };
  }, []);

  // ===== GET CLASS PROGRESS FOR REPORT CARDS =====
  const getClassProgressReport = useCallback((): Array<{
    id: string;
    name: string;
    total: number;
    ready: number;
    sent: number;
  }> => {
    const classMap = new Map<string, { 
      id: string; 
      name: string; 
      total: number; 
      ready: number; 
      sent: number;
    }>();
    
    learnerReports.forEach(report => {
      if (!classMap.has(report.classId)) {
        classMap.set(report.classId, {
          id: report.classId,
          name: report.className,
          total: 0,
          ready: 0,
          sent: 0,
        });
      }
      
      const classData = classMap.get(report.classId)!;
      classData.total++;
      
      if (report.reportReady) {
        classData.ready++;
      }
      
      if (report.reportSent) {
        classData.sent++;
      }
    });
    
    return Array.from(classMap.values());
  }, [learnerReports]);

  // ===== CHECK IF LEARNER HAS ALL ASSESSMENT TYPES =====
  const checkLearnerAssessmentsComplete = useCallback(async (
    learnerId: string,
    classId: string,
    term: Term,
    subjects: string[]
  ): Promise<boolean> => {
    try {
      const assessmentTypes: AssessmentType[] = ["week4", "week8", "end_of_term"];
      
      for (const subject of subjects) {
        let hasWeek4 = false;
        let hasWeek8 = false;
        let hasEndOfTerm = false;
        
        for (const assessmentType of assessmentTypes) {
          const marksQuery = query(
            collection(db, "marks"),
            where("learnerId", "==", learnerId),
            where("classId", "==", classId),
            where("subject", "==", subject),
            where("term", "==", term),
            where("assessmentType", "==", assessmentType)
          );
          
          const marksSnapshot = await getDocs(marksQuery);
          const hasMark = !marksSnapshot.empty;
          
          if (assessmentType === "week4") hasWeek4 = hasMark;
          if (assessmentType === "week8") hasWeek8 = hasMark;
          if (assessmentType === "end_of_term") hasEndOfTerm = hasMark;
        }
        
        if (!hasWeek4 || !hasWeek8 || !hasEndOfTerm) {
          return false;
        }
      }
      
      return true;
    } catch (err) {
      console.error("Error checking learner assessments:", err);
      return false;
    }
  }, []);

  // ===== GET ASSESSMENT COMPLETION STATS FOR CLASS =====
  const getAssessmentCompletionStats = useCallback(async (
    classId: string,
    term: Term
  ): Promise<{
    week4Percent: number;
    week8Percent: number;
    endOfTermPercent: number;
    overallPercent: number;
  }> => {
    const classTeachers = getTeachersForClass(classId);
    const classLearners = await getClassLearners(classId);
    
    let totalAssessments = 0;
    let completedWeek4 = 0;
    let completedWeek8 = 0;
    let completedEndOfTerm = 0;
    
    for (const teacher of classTeachers) {
      for (const subject of teacher.subjects) {
        totalAssessments += classLearners.length * 3;
        
        for (const learner of classLearners) {
          const week4Query = query(
            collection(db, "marks"),
            where("learnerId", "==", learner.id),
            where("classId", "==", classId),
            where("subject", "==", subject),
            where("term", "==", term),
            where("assessmentType", "==", "week4")
          );
          
          const week8Query = query(
            collection(db, "marks"),
            where("learnerId", "==", learner.id),
            where("classId", "==", classId),
            where("subject", "==", subject),
            where("term", "==", term),
            where("assessmentType", "==", "week8")
          );
          
          const endOfTermQuery = query(
            collection(db, "marks"),
            where("learnerId", "==", learner.id),
            where("classId", "==", classId),
            where("subject", "==", subject),
            where("term", "==", term),
            where("assessmentType", "==", "end_of_term")
          );
          
          const [week4Snapshot, week8Snapshot, endOfTermSnapshot] = await Promise.all([
            getDocs(week4Query),
            getDocs(week8Query),
            getDocs(endOfTermQuery)
          ]);
          
          if (!week4Snapshot.empty) completedWeek4++;
          if (!week8Snapshot.empty) completedWeek8++;
          if (!endOfTermSnapshot.empty) completedEndOfTerm++;
        }
      }
    }
    
    const week4Percent = totalAssessments > 0 ? Math.round((completedWeek4 / totalAssessments) * 300) : 0;
    const week8Percent = totalAssessments > 0 ? Math.round((completedWeek8 / totalAssessments) * 300) : 0;
    const endOfTermPercent = totalAssessments > 0 ? Math.round((completedEndOfTerm / totalAssessments) * 300) : 0;
    const overallPercent = Math.round((week4Percent + week8Percent + endOfTermPercent) / 3);
    
    return {
      week4Percent,
      week8Percent,
      endOfTermPercent,
      overallPercent,
    };
  }, [getTeachersForClass, getClassLearners]);

  // Initialize with default data
  useEffect(() => {
    const initializeData = async () => {
      await refreshData("term1");
    };
    
    initializeData();
  }, [refreshData]);

  return {
    // Data
    subjectClasses,
    learnerReports,
    compiledMarks,
    loading,
    error,
    
    // Core functions
    fetchSubjectClassMarks,
    fetchLearnerReports,
    getTeacherMarks,
    getAllSchoolMarks,
    getReportsByClass,
    refreshData,
    setupMarksListener,
    getCompiledClassMarks,
    
    // Teacher Progress Functions
    getTeacherProgress,
    getClassProgress,
    getAllClassesProgress,
    checkSubjectCompletionAllAssessments,
    getReadyClasses,
    getPendingClasses,
    getClassProgressReport,
    
    // New Assessment Functions
    checkLearnerAssessmentsComplete,
    getAssessmentCompletionStats,
    
    // Helper functions
    computeKalaboMetrics,
    aggregateSchoolMetrics,
    getGrade,
    getECZGrade,
    getGradeDescription,
    getAssessmentLabel,
    
    // Constants
    KALABO_GRADE_BANDS,
    ECZ_GRADING_SYSTEM,
  };
}