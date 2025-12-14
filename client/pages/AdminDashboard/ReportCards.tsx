// src/pages/AdminDashboard/ReportCards.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Mail,
  Smartphone,
  Eye,
  X,
  Download,
  Users,
  Loader2,
  AlertCircle,
  Send,
  MessageSquare,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useClassManagement } from "@/hooks/useClasses";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useMarksData, type Term } from "@/hooks/useMarksData";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import jsPDF from "jspdf";

type SubjectResult = { 
  name: string; 
  week4: number | null;
  week8: number | null;
  endOfTerm: number | null;
  score: number; 
  grade: string;
  gradeDescription: string;
  teacherComment?: string;
  teacherName?: string;
};

interface LearnerDoc {
  id: string;
  name: string;
  sex?: "M" | "F";
  parentPhone?: string;
  parentEmail?: string;
  admissionNo?: string;
}

type Learner = LearnerDoc & {
  classId: string;
  className: string;
  form: string;
  formNumber: number;
  subjects: SubjectResult[];
  comment: string;
  reportReady: boolean;
  reportSent: boolean;
  sentVia?: string[];
  sentAt?: string;
};

type ClassData = {
  id: string;
  name: string;
  total: number;
  ready: number;
  sent: number;
  teachers: Array<{
    teacherId: string;
    teacherName: string;
    subjects: string[];
    submittedSubjects: number;
    totalSubjects: number;
    week4Complete: number;
    week8Complete: number;
    endOfTermComplete: number;
  }>;
  subjectsReady: number;
  totalSubjects: number;
  percentReady: number;
  week4Percent: number;
  week8Percent: number;
  endOfTermPercent: number;
};

const ECZ_GRADING_SYSTEM = [
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

const getECZGrade = (score: number): { grade: string; code: string; description: string } => {
  const grade = ECZ_GRADING_SYSTEM.find(g => score >= g.min && score <= g.max);
  return grade || ECZ_GRADING_SYSTEM[ECZ_GRADING_SYSTEM.length - 1];
};

const Modal = ({
  children,
  title,
  onClose,
  size = "md",
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) => {
  const sizeClasses = size === "lg" ? "max-w-3xl" : "max-w-md";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl p-6 w-full ${sizeClasses} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const generateSMSMessage = (learner: Learner, term: string, year: string): string => {
  const averageScore = learner.subjects.length > 0 
    ? learner.subjects.reduce((sum, subj) => sum + subj.score, 0) / learner.subjects.length 
    : 0;
  
  const averageGrade = getECZGrade(averageScore);
  
  return `KALABO SECONDARY SCHOOL REPORT CARD
${learner.name} - ${learner.className}
Term: ${term} ${year}
Avg: ${averageScore.toFixed(1)}% (${averageGrade.grade})
Report sent via SMS. Details sent to email/WhatsApp.
Contact school for full report.`;
};

const generateReportCardPDF = (learner: Learner, term: string, year: string, comment: string = "") => {
  const doc = new jsPDF();
  
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("KALABO SECONDARY SCHOOL", 105, 20, { align: "center" });
  doc.setFontSize(16);
  doc.text("STUDENT REPORT CARD", 105, 30, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  let yPos = 55;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(20, yPos, 170, 30, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(20, yPos, 170, 30);
  
  yPos += 10;
  doc.text(`Student: ${learner.name}`, 25, yPos);
  doc.text(`Class: ${learner.className}`, 100, yPos);
  doc.text(`Admission: ${learner.admissionNo || "N/A"}`, 150, yPos);
  
  yPos += 8;
  doc.text(`Term: ${term}`, 25, yPos);
  doc.text(`Year: ${year}`, 100, yPos);
  doc.text(`Form: ${learner.form}`, 150, yPos);
  
  yPos += 20;

  doc.setFillColor(59, 130, 246);
  doc.rect(20, yPos, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("SUBJECT", 22, yPos + 7);
  doc.text("WK 4", 62, yPos + 7, { align: "center" });
  doc.text("WK 8", 77, yPos + 7, { align: "center" });
  doc.text("EOT", 92, yPos + 7, { align: "center" });
  doc.text("SCORE", 107, yPos + 7, { align: "center" });
  doc.text("GRADE", 132, yPos + 7, { align: "center" });
  doc.text("COMMENT", 157, yPos + 7);
  
  yPos += 10;
  doc.setTextColor(0, 0, 0);

  learner.subjects.forEach((subject, index) => {
    if (index > 0) {
      doc.setDrawColor(220, 220, 220);
      doc.line(20, yPos, 190, yPos);
    }
    
    doc.setFontSize(9);
    doc.text(subject.name.substring(0, 18), 22, yPos + 7);
    doc.text(subject.week4?.toString() || "Abs", 62, yPos + 7, { align: "center" });
    doc.text(subject.week8?.toString() || "Abs", 77, yPos + 7, { align: "center" });
    doc.text(subject.endOfTerm?.toString() || "Abs", 92, yPos + 7, { align: "center" });
    doc.text(`${subject.score}%`, 107, yPos + 7, { align: "center" });
    doc.text(subject.grade, 132, yPos + 7, { align: "center" });
    doc.text((subject.teacherComment || getECZGrade(subject.score).description).substring(0, 15), 157, yPos + 7);
    
    yPos += 10;
  });

  const averageScore = learner.subjects.length > 0 
    ? learner.subjects.reduce((sum, subj) => sum + subj.score, 0) / learner.subjects.length 
    : 0;
  const averageGrade = getECZGrade(averageScore);

  yPos += 15;
  doc.setFontSize(12);
  doc.text("OVERALL PERFORMANCE:", 25, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`Average Score: ${averageScore.toFixed(1)}%`, 25, yPos);
  doc.text(`Overall Grade: ${averageGrade.grade}`, 100, yPos);
  
  yPos += 15;
  doc.setFontSize(12);
  doc.text("TEACHER'S COMMENTS:", 25, yPos);
  yPos += 8;
  doc.setFontSize(10);
  
  const commentText = comment || learner.comment || "No comment provided";
  const maxWidth = 150;
  const lineHeight = 5;
  let currentLine = "";
  const lines = [];
  
  for (const word of commentText.split(' ')) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const testWidth = doc.getTextWidth(testLine);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  lines.forEach((line, index) => {
    doc.text(line, 25, yPos + (index * lineHeight));
  });

  const fileName = `${learner.name.replace(/\s+/g, '_')}_ReportCard_${term}_${year}.pdf`;
  doc.save(fileName);
  
  return doc;
};

const generateWhatsAppMessage = (learner: Learner, term: string, year: string): string => {
  const averageScore = learner.subjects.length > 0 
    ? learner.subjects.reduce((sum, subj) => sum + subj.score, 0) / learner.subjects.length 
    : 0;
  
  const averageGrade = getECZGrade(averageScore);
  const bestSubject = learner.subjects.length > 0 
    ? learner.subjects.reduce((best, current) => current.score > best.score ? current : best)
    : null;

  const message = `📚 *KALABO SECONDARY SCHOOL - REPORT CARD*

*Student:* ${learner.name}
*Class:* ${learner.className} (Form ${learner.formNumber})
*Term:* ${term} ${year}

*OVERALL PERFORMANCE:*
• Average Score: ${averageScore.toFixed(1)}%
• Overall Grade: ${averageGrade.grade}

*TOP SUBJECTS:*
${bestSubject ? `• ${bestSubject.name}: ${bestSubject.score}% (Grade ${bestSubject.grade})` : 'No data available'}

*ECZ GRADING SYSTEM:*
1️⃣ Distinction 1 (75-100%)
2️⃣ Distinction 2 (70-74%)
3️⃣ Merit 1 (65-69%)
4️⃣ Merit 2 (60-64%)
5️⃣ Credit 1 (55-59%)
6️⃣ Credit 2 (50-54%)
7️⃣ Satisfactory 1 (45-49%)
8️⃣ Satisfactory 2 (40-44%)
9️⃣ Unsatisfactory (0-39%)

We encourage ${learner.name} to continue working hard. Parent-teacher consultations available upon request.

*Kalabo Secondary School*
"Excellence Through Diligence"`;

  return encodeURIComponent(message);
};

const generateEmailTemplate = (learner: Learner, term: string, year: string): string => {
  const averageScore = learner.subjects.length > 0 
    ? learner.subjects.reduce((sum, subj) => sum + subj.score, 0) / learner.subjects.length 
    : 0;

  const averageGrade = getECZGrade(averageScore);
  const subjectGrades = learner.subjects.map(subj => 
    `${subj.name}: ${subj.score}% (Grade ${subj.grade} - ${getECZGrade(subj.score).grade})`
  ).join('<br>');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 20px; color: white; text-align: center;">
        <h1 style="margin: 0;">KALABO SECONDARY SCHOOL</h1>
        <h2 style="margin: 10px 0 0 0;">STUDENT REPORT CARD - ECZ GRADING SYSTEM</h2>
      </div>
      
      <div style="padding: 20px; background: #f8fafc;">
        <h3>Dear Parent/Guardian,</h3>
        <p>Please find ${learner.name}'s academic report for ${term} ${year} attached.</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #3b82f6;">STUDENT INFORMATION</h4>
          <p><strong>Name:</strong> ${learner.name}</p>
          <p><strong>Class:</strong> ${learner.className} (Form ${learner.formNumber})</p>
          <p><strong>Admission Number:</strong> ${learner.admissionNo || 'N/A'}</p>
          <p><strong>Overall Average:</strong> ${averageScore.toFixed(1)}%</p>
          <p><strong>Overall Grade:</strong> ${averageGrade.grade}</p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h4 style="color: #3b82f6;">SUBJECT PERFORMANCE (ECZ Grading)</h4>
          ${subjectGrades}
        </div>
        
        <p>The full detailed report is attached as a PDF document. Please review it with your child.</p>
        
        <p>Should you have any questions, please contact the school office.</p>
        
        <p>Best regards,<br>
        <strong>Kalabo Secondary School Administration</strong><br>
        Excellence Through Diligence</p>
      </div>
    </div>
  `;
};

const extractFormNumber = (className: string): number => {
  const match = className.match(/form\s*(\d+)/i) || className.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    return Math.min(Math.max(num, 1), 5);
  }
  return 1;
};

export default function ReportCards() {
  const { classes: allClasses, getClassLearners, loading: classesLoading } = useClassManagement();
  const { getTeachersForClass } = useTeacherManagement();
  const { 
    getClassProgress,
    getReadyClasses,
    getPendingClasses,
    refreshData,
    loading: marksLoading,
    getAssessmentCompletionStats
  } = useMarksData();
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term>("term1");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [viewReadyModal, setViewReadyModal] = useState<{ open: boolean; classId: string | null }>({
    open: false,
    classId: null,
  });
  const [reportPreviewModal, setReportPreviewModal] = useState<{
    open: boolean;
    learner: Learner | null;
  }>({ open: false, learner: null });
  const [sendReportModal, setSendReportModal] = useState<{
    open: boolean;
    learner: Learner | null;
  }>({ open: false, learner: null });
  const [sendBulkModal, setSendBulkModal] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingMethod, setSendingMethod] = useState<"sms" | "whatsapp" | "email" | "all">("whatsapp");

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (classesLoading || marksLoading || allClasses.length === 0) {
      return;
    }
    
    setIsRefreshing(true);
    setFetchError(null);
    
    try {
      if (forceRefresh) {
        await refreshData(selectedTerm);
      }
      
      const classDataPromises = allClasses.map(async (cls) => {
        try {
          const classLearners = await getClassLearners(cls.id);
          const classTeachers = getTeachersForClass(cls.id);
          
          const allSubjects = new Set(
            classTeachers.flatMap(teacher => teacher.subjects)
          );
          
          let readyCount = 0;
          const learnerDataPromises = classLearners.map(async (learner) => {
            try {
              // Query marks for ALL THREE assessment types
              const marksQuery = query(
                collection(db, "marks"),
                where("learnerId", "==", learner.id),
                where("term", "==", selectedTerm)
              );
              
              const marksSnapshot = await getDocs(marksQuery);
              
              // Group marks by subject and assessment type
              const subjectAssessmentMap: Record<string, Set<string>> = {};
              
              marksSnapshot.docs.forEach(doc => {
                const data = doc.data() as DocumentData;
                const subject = data.subject;
                const assessmentType = data.assessmentType;
                
                if (!subjectAssessmentMap[subject]) {
                  subjectAssessmentMap[subject] = new Set();
                }
                subjectAssessmentMap[subject].add(assessmentType);
              });
              
              // Check if learner has all three assessment types for each required subject
              const hasAllAssessments = Array.from(allSubjects).every(subject => {
                const assessments = subjectAssessmentMap[subject] || new Set();
                return assessments.has("week4") && 
                       assessments.has("week8") && 
                       assessments.has("end_of_term");
              });
              
              if (hasAllAssessments) readyCount++;
              
              return {
                learnerId: learner.id,
                hasAllAssessments,
                markedSubjects: Object.keys(subjectAssessmentMap),
              };
            } catch (err) {
              console.error(`Error fetching marks for learner ${learner.id}:`, err);
              return {
                learnerId: learner.id,
                hasAllAssessments: false,
                markedSubjects: [],
              };
            }
          });
          
          const learnerResults = await Promise.all(learnerDataPromises);
          
          // Track completion per assessment type per teacher
          const teachersWithProgress = classTeachers.map(teacher => {
            let week4Complete = 0;
            let week8Complete = 0;
            let endOfTermComplete = 0;
            let submittedSubjects = 0;
            
            teacher.subjects.forEach(subject => {
              // For each subject, check how many learners have each assessment type
              let week4Count = 0;
              let week8Count = 0;
              let endOfTermCount = 0;
              
              learnerResults.forEach(lr => {
                if (lr.markedSubjects.includes(subject)) {
                  week4Count++;
                  week8Count++;
                  endOfTermCount++;
                }
              });
              
              const totalLearners = classLearners.length;
              const threshold = Math.ceil(totalLearners * 0.8); // 80% completion
              
              if (week4Count >= threshold) week4Complete++;
              if (week8Count >= threshold) week8Complete++;
              if (endOfTermCount >= threshold) endOfTermComplete++;
              
              // Subject is fully submitted if all three assessment types are complete
              if (week4Count >= threshold && week8Count >= threshold && endOfTermCount >= threshold) {
                submittedSubjects++;
              }
            });
            
            return {
              teacherId: teacher.teacherId,
              teacherName: teacher.teacherName,
              subjects: teacher.subjects,
              submittedSubjects,
              totalSubjects: teacher.subjects.length,
              week4Complete,
              week8Complete,
              endOfTermComplete,
            };
          });
          
          const totalSubjects = allSubjects.size;
          const subjectsReady = learnerResults.filter(lr => lr.hasAllAssessments).length > 0 
            ? totalSubjects 
            : 0;
          
          // Calculate completion percentages
          const totalTeacherSubjects = teachersWithProgress.reduce((sum, t) => sum + t.totalSubjects, 0);
          
          const week4Percent = totalTeacherSubjects > 0 
            ? Math.round((teachersWithProgress.reduce((sum, t) => sum + t.week4Complete, 0) / totalTeacherSubjects) * 100) 
            : 0;
          
          const week8Percent = totalTeacherSubjects > 0 
            ? Math.round((teachersWithProgress.reduce((sum, t) => sum + t.week8Complete, 0) / totalTeacherSubjects) * 100) 
            : 0;
          
          const endOfTermPercent = totalTeacherSubjects > 0 
            ? Math.round((teachersWithProgress.reduce((sum, t) => sum + t.endOfTermComplete, 0) / totalTeacherSubjects) * 100) 
            : 0;
          
          const overallPercent = Math.round((week4Percent + week8Percent + endOfTermPercent) / 3);
          
          return {
            id: cls.id,
            name: cls.name,
            total: classLearners.length,
            ready: readyCount,
            sent: 0,
            teachers: teachersWithProgress,
            subjectsReady,
            totalSubjects,
            percentReady: overallPercent,
            week4Percent,
            week8Percent,
            endOfTermPercent,
          };
        } catch (err) {
          console.error(`Error processing class ${cls.id}:`, err);
          return {
            id: cls.id,
            name: cls.name,
            total: 0,
            ready: 0,
            sent: 0,
            teachers: [],
            subjectsReady: 0,
            totalSubjects: 0,
            percentReady: 0,
            week4Percent: 0,
            week8Percent: 0,
            endOfTermPercent: 0,
          };
        }
      });

      const classData = await Promise.all(classDataPromises);
      setClasses(classData);
      
      // Fetch detailed learner data
      const allLearners: Learner[] = [];
      
      for (const cls of allClasses) {
        try {
          const classLearners = await getClassLearners(cls.id);
          
          const learnerPromises = classLearners.map(async (learner) => {
            try {
              // Query ALL marks for this learner in the selected term
              const marksQuery = query(
                collection(db, "marks"),
                where("learnerId", "==", learner.id),
                where("term", "==", selectedTerm)
              );
              
              const marksSnapshot = await getDocs(marksQuery);
              const subjectMarks: Record<string, {
                week4: number | null;
                week8: number | null;
                endOfTerm: number | null;
                teacherComment?: string;
                teacherName?: string;
              }> = {};
              
              marksSnapshot.docs.forEach(doc => {
                const markData = doc.data() as DocumentData;
                const subject = markData.subject;
                const assessmentType = markData.assessmentType;
                const score = markData.score;
                const comment = markData.comment || "";
                const teacherName = markData.teacherName || "";
                
                if (!subjectMarks[subject]) {
                  subjectMarks[subject] = {
                    week4: null,
                    week8: null,
                    endOfTerm: null,
                  };
                }
                
                if (assessmentType === "week4") subjectMarks[subject].week4 = score;
                if (assessmentType === "week8") subjectMarks[subject].week8 = score;
                if (assessmentType === "end_of_term") subjectMarks[subject].endOfTerm = score;
                
                if (comment && !subjectMarks[subject].teacherComment) {
                  subjectMarks[subject].teacherComment = comment;
                  subjectMarks[subject].teacherName = teacherName;
                }
              });
              
              const formNumber = extractFormNumber(cls.name);
              const form = `Form ${formNumber}`;
              
              const subjects: SubjectResult[] = Object.entries(subjectMarks).map(([name, marks]) => {
                // Use end_of_term as final score, fallback to others
                const finalScore = marks.endOfTerm !== null ? marks.endOfTerm : 
                                  marks.week8 !== null ? marks.week8 : 
                                  marks.week4 !== null ? marks.week4 : 0;
                
                const gradeInfo = getECZGrade(finalScore);
                
                return {
                  name,
                  week4: marks.week4,
                  week8: marks.week8,
                  endOfTerm: marks.endOfTerm,
                  score: finalScore,
                  grade: gradeInfo.code,
                  gradeDescription: gradeInfo.grade,
                  teacherComment: marks.teacherComment,
                  teacherName: marks.teacherName,
                };
              });
              
              // Check if report is ready - must have all three assessment types for each subject
              const reportReady = subjects.length > 0 && subjects.every(subject => {
                // All three assessment types must have values (including null for absent)
                return subject.week4 !== undefined && 
                       subject.week8 !== undefined && 
                       subject.endOfTerm !== undefined;
              });
              
              return {
                ...learner,
                classId: cls.id,
                className: cls.name,
                form,
                formNumber,
                subjects,
                comment: "Good performance overall. Shows improvement.",
                reportReady,
                reportSent: false,
              };
            } catch (err) {
              console.error(`Error processing learner ${learner.id}:`, err);
              const formNumber = extractFormNumber(cls.name);
              const form = `Form ${formNumber}`;
              
              return {
                ...learner,
                classId: cls.id,
                className: cls.name,
                form,
                formNumber,
                subjects: [],
                comment: "",
                reportReady: false,
                reportSent: false,
              };
            }
          });
          
          const classLearnerData = await Promise.all(learnerPromises);
          allLearners.push(...classLearnerData);
        } catch (err) {
          console.error(`Error fetching learners for class ${cls.id}:`, err);
        }
      }
      
      setLearners(allLearners);
      
    } catch (error) {
      console.error("Error fetching report data:", error);
      setFetchError("Failed to load report data. Please try again.");
    } finally {
      setIsRefreshing(false);
      setInitialLoading(false);
    }
  }, [
    allClasses, 
    classesLoading, 
    marksLoading, 
    selectedTerm, 
    getClassLearners,
    getTeachersForClass,
    refreshData
  ]);

  useEffect(() => {
    if (!classesLoading && !marksLoading && allClasses.length > 0) {
      fetchData(true);
    }
  }, [classesLoading, marksLoading, allClasses.length, fetchData]);

  const handleTermChange = useCallback((newTerm: Term) => {
    setSelectedTerm(newTerm);
    fetchData(true);
  }, [fetchData]);

  const filteredClasses = useMemo(() => {
    if (showPendingOnly) {
      return classes.filter(cls => cls.percentReady < 100);
    }
    return classes.filter(cls => cls.percentReady === 100);
  }, [classes, showPendingOnly]);

  const readyClassIds = useMemo(() => 
    getReadyClasses(selectedTerm),
    [getReadyClasses, selectedTerm]
  );
  
  const pendingClassIds = useMemo(() => 
    getPendingClasses(selectedTerm),
    [getPendingClasses, selectedTerm]
  );

  const learnersInClass = useMemo(() => 
    learners.filter((l) => l.classId === viewReadyModal.classId),
    [learners, viewReadyModal.classId]
  );
  
  const readyLearners = useMemo(() => 
    learnersInClass.filter(l => l.reportReady),
    [learnersInClass]
  );

  const selectedClass = useMemo(() => 
    classes.find(c => c.id === viewReadyModal.classId),
    [classes, viewReadyModal.classId]
  );

  const handleGeneratePDF = (learner: Learner) => {
    generateReportCardPDF(learner, selectedTerm.replace('term', 'Term '), selectedYear, comment);
  };

  const handleSendReport = async () => {
    if (!sendReportModal.learner) return;
    
    setSendingReport(true);
    const learner = sendReportModal.learner;
    
    try {
      const sentVia: string[] = [];
      
      if (sendingMethod === "sms" || sendingMethod === "all") {
        if (learner.parentPhone) {
          const smsMessage = generateSMSMessage(learner, selectedTerm.replace('term', 'Term '), selectedYear);
          const smsUrl = `sms:${learner.parentPhone.replace(/\D/g, '')}?body=${encodeURIComponent(smsMessage)}`;
          window.open(smsUrl, '_blank');
          sentVia.push("sms");
        }
      }
      
      if (sendingMethod === "whatsapp" || sendingMethod === "all") {
        if (learner.parentPhone) {
          const message = generateWhatsAppMessage(learner, selectedTerm.replace('term', 'Term '), selectedYear);
          const whatsappUrl = `https://wa.me/${learner.parentPhone.replace(/\D/g, '')}?text=${message}`;
          window.open(whatsappUrl, '_blank');
          sentVia.push("whatsapp");
        }
      }
      
      if (sendingMethod === "email" || sendingMethod === "all") {
        if (learner.parentEmail) {
          const emailTemplate = generateEmailTemplate(learner, selectedTerm.replace('term', 'Term '), selectedYear);
          const mailtoLink = `mailto:${learner.parentEmail}?subject=${encodeURIComponent(`Report Card - ${learner.name} - ${selectedTerm} ${selectedYear}`)}&body=${encodeURIComponent(emailTemplate.replace(/<[^>]*>/g, ''))}`;
          window.open(mailtoLink, '_blank');
          sentVia.push("email");
        }
      }
      
      setLearners(prev => prev.map(l => 
        l.id === learner.id ? { 
          ...l, 
          reportSent: true, 
          sentVia,
          sentAt: new Date().toISOString()
        } : l
      ));
      
      setTimeout(() => {
        setSendReportModal({ open: false, learner: null });
        setSendingReport(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error sending report:", error);
      setSendingReport(false);
    }
  };

  const handleSendAllInClass = async (classId: string) => {
    const classLearners = learners.filter(l => l.classId === classId && l.reportReady && !l.reportSent);
    
    if (classLearners.length === 0) return;
    
    setSendingBulk(true);
    
    try {
      for (const learner of classLearners) {
        console.log(`Sending report for ${learner.name}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setLearners(prev => prev.map(l => 
          l.id === learner.id ? { 
            ...l, 
            reportSent: true, 
            sentVia: ["bulk"],
            sentAt: new Date().toISOString()
          } : l
        ));
      }
      
      alert(`✅ Reports sent for ${classLearners.length} learners`);
    } catch (error) {
      console.error("Error sending bulk reports:", error);
      alert("Error sending some reports");
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendAllReports = async () => {
    const readyClasses = classes.filter(cls => cls.percentReady === 100);
    const allReadyLearners = learners.filter(l => 
      readyClasses.some(cls => cls.id === l.classId) && 
      l.reportReady && 
      !l.reportSent
    );
    
    if (allReadyLearners.length === 0) {
      alert("No ready reports to send");
      return;
    }
    
    setSendingBulk(true);
    setSendBulkModal(true);
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const learner of allReadyLearners) {
        try {
          console.log(`Bulk sending report for ${learner.name}`);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          setLearners(prev => prev.map(l => 
            l.id === learner.id ? { 
              ...l, 
              reportSent: true, 
              sentVia: ["bulk_all"],
              sentAt: new Date().toISOString()
            } : l
          ));
          
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to send for ${learner.name}:`, error);
        }
      }
      
      alert(`✅ Bulk send complete: ${successCount} sent, ${errorCount} failed`);
    } catch (error) {
      console.error("Bulk send error:", error);
      alert("Error in bulk sending");
    } finally {
      setSendingBulk(false);
      setSendBulkModal(false);
    }
  };

  const toggleClassExpansion = (classId: string) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };

  if (initialLoading && classes.length === 0 && learners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-gray-600">Loading report data...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-red-200">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 mb-2">Error Loading Data</h3>
        <p className="text-red-500 mb-4">{fetchError}</p>
        <button
          onClick={() => fetchData(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (allClasses.length === 0 && !classesLoading) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-border">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Classes Found</h3>
        <p className="text-gray-500">
          You need to create classes and add learners before generating report cards.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Report Cards</h2>
        <p className="text-muted-foreground mt-1">
          Generate and send report cards to parents via SMS, WhatsApp, and Email.
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
          <BookOpen className="w-4 h-4" />
          <span>Using ECZ Grading System (Form 1-5)</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => handleTermChange(e.target.value as Term)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="term1">Term 1</option>
              <option value="term2">Term 2</option>
              <option value="term3">Term 3</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              {showPendingOnly ? 'Pending' : 'Ready'} Reports: {filteredClasses.length} classes
            </div>
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowPendingOnly(!showPendingOnly)}
              className={`px-4 py-2 rounded-lg font-medium ${
                showPendingOnly
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              {showPendingOnly ? (
                <>
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Show Ready
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 inline mr-2" />
                  Show Pending
                </>
              )}
            </button>
            
            {!showPendingOnly && (
              <button
                onClick={handleSendAllReports}
                disabled={sendingBulk || filteredClasses.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 inline mr-2" />
                    Send All
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-border">
        <h3 className="font-bold text-gray-900 mb-3">ECZ Grading System (Grade 8-12 / Form 1-5)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {ECZ_GRADING_SYSTEM.map((grade) => (
            <div key={grade.code} className="border rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{grade.code}</div>
              <div className="text-xs font-medium">{grade.grade}</div>
              <div className="text-xs text-gray-600">{grade.min}-{grade.max}%</div>
            </div>
          ))}
        </div>
      </div>

      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {showPendingOnly ? 'All Reports Ready!' : 'No Ready Reports'}
          </h3>
          <p className="text-gray-500">
            {showPendingOnly 
              ? 'All classes have complete reports. Great work!'
              : 'Reports are not yet ready. Check pending reports or wait for teachers to submit marks.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const classLearners = learners.filter(l => l.classId === cls.id);
            const sentCount = classLearners.filter(l => l.reportSent).length;
            
            return (
              <div
                key={cls.id}
                className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{cls.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        cls.percentReady === 100
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cls.percentReady}% Ready
                      </span>
                      <span className="text-xs text-gray-500">
                        {cls.ready}/{cls.total} learners • {sentCount} sent
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleClassExpansion(cls.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedClassId === cls.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {expandedClassId === cls.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Assessment Completion:</h4>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Week 4</span>
                          <span className="text-gray-600">{cls.week4Percent}% complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${cls.week4Percent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Week 8</span>
                          <span className="text-gray-600">{cls.week8Percent}% complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-600 h-1.5 rounded-full" 
                            style={{ width: `${cls.week8Percent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">End of Term</span>
                          <span className="text-gray-600">{cls.endOfTermPercent}% complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-purple-600 h-1.5 rounded-full" 
                            style={{ width: `${cls.endOfTermPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full ${
                      cls.percentReady === 100 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${cls.percentReady}%` }}
                  ></div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      setViewReadyModal({ open: true, classId: cls.id })
                    }
                    disabled={cls.ready === 0}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg font-medium py-2 ${
                      cls.ready > 0
                        ? "bg-white border border-blue-600 text-blue-600 hover:bg-blue-50"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showPendingOnly ? 'View Progress' : 'View Ready'} ({cls.ready})
                  </button>
                  
                  <button
                    onClick={() => {
                      const classLearners = learners.filter(l => l.classId === cls.id && l.reportReady);
                      classLearners.forEach(learner => {
                        handleGeneratePDF(learner);
                      });
                    }}
                    disabled={cls.ready === 0}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg font-medium py-2 ${
                      cls.ready > 0
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90"
                        : "bg-gray-300 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download All
                  </button>
                  
                  {cls.percentReady === 100 && (
                    <button
                      onClick={() => handleSendAllInClass(cls.id)}
                      disabled={sendingBulk || cls.ready === 0}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg font-medium py-2 ${
                        cls.ready > 0
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90"
                          : "bg-gray-300 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send All
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewReadyModal.open && selectedClass && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {showPendingOnly ? 'Report Progress' : 'Ready Learners'} - {selectedClass.name}
            </span>
          }
          onClose={() => setViewReadyModal({ open: false, classId: null })}
          size="lg"
        >
          <div className="max-h-96 overflow-y-auto">
            {readyLearners.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {showPendingOnly 
                    ? 'No learners with marks yet. Waiting for teacher submissions.'
                    : 'No ready learners in this class.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {readyLearners.map((learner) => (
                  <div
                    key={learner.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{learner.name}</p>
                      <p className="text-sm text-gray-500">
                        {learner.subjects.length} subjects • Average: {(
                          learner.subjects.reduce((sum, s) => sum + s.score, 0) / learner.subjects.length
                        ).toFixed(1)}%
                      </p>
                      <div className="flex gap-1 mt-1">
                        {learner.parentPhone && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                            📱 {learner.parentPhone}
                          </span>
                        )}
                        {learner.parentEmail && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                            ✉️ {learner.parentEmail}
                          </span>
                        )}
                        {learner.reportSent && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">
                            ✅ Sent {learner.sentAt ? new Date(learner.sentAt).toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setReportPreviewModal({ open: true, learner });
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(learner)}
                        className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => {
                          setSendReportModal({ open: true, learner });
                        }}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm font-medium"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showPendingOnly && selectedClass.teachers.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-3">Teacher Submission Status:</h4>
                <div className="space-y-3">
                  {selectedClass.teachers.map((teacher, idx) => (
                    <div key={idx} className="bg-white border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{teacher.teacherName}</span>
                        <span className="text-sm text-gray-600">
                          {teacher.submittedSubjects}/{teacher.totalSubjects} subjects
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(teacher.submittedSubjects / teacher.totalSubjects) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Subjects: {teacher.subjects.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {reportPreviewModal.open && reportPreviewModal.learner && (
        <Modal
          title={
            <div>
              <div className="font-bold text-lg">{reportPreviewModal.learner.name}</div>
              <div className="text-sm text-gray-600">{reportPreviewModal.learner.className} (Form {reportPreviewModal.learner.formNumber})</div>
            </div>
          }
          onClose={() => setReportPreviewModal({ open: false, learner: null })}
          size="lg"
        >
          <div className="space-y-5">
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg">
                  <h3 className="text-xl font-bold">KALABO SECONDARY SCHOOL</h3>
                  <h4 className="text-lg">STUDENT REPORT CARD - ECZ GRADING</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Student:</strong> {reportPreviewModal.learner.name}</p>
                    <p><strong>Class:</strong> {reportPreviewModal.learner.className}</p>
                    <p><strong>Term:</strong> {selectedTerm.replace('term', 'Term ')} {selectedYear}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Admission:</strong> {reportPreviewModal.learner.admissionNo || 'N/A'}</p>
                    <p><strong>Form:</strong> {reportPreviewModal.learner.form}</p>
                    <p><strong>Sex:</strong> {reportPreviewModal.learner.sex === "M" ? "Male" : "Female"}</p>
                  </div>
                </div>
                
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="p-2 text-left">Subject</th>
                        <th className="p-2 text-center">WK 4</th>
                        <th className="p-2 text-center">WK 8</th>
                        <th className="p-2 text-center">EOT</th>
                        <th className="p-2 text-center">Score</th>
                        <th className="p-2 text-center">Grade</th>
                        <th className="p-2 text-center">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportPreviewModal.learner.subjects.map((subject, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{subject.name}</td>
                          <td className="p-2 text-center">{subject.week4 !== null ? subject.week4 : "Abs"}</td>
                          <td className="p-2 text-center">{subject.week8 !== null ? subject.week8 : "Abs"}</td>
                          <td className="p-2 text-center">{subject.endOfTerm !== null ? subject.endOfTerm : "Abs"}</td>
                          <td className="p-2 text-center">{subject.score}%</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              subject.score >= 75 ? 'bg-green-100 text-green-800' :
                              subject.score >= 60 ? 'bg-blue-100 text-blue-800' :
                              subject.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {subject.grade} ({subject.gradeDescription})
                            </span>
                          </td>
                          <td className="p-2 text-center text-xs">
                            {subject.teacherComment || getECZGrade(subject.score).description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleGeneratePDF(reportPreviewModal.learner!)}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={() => {
                  setSendReportModal({ open: true, learner: reportPreviewModal.learner });
                }}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send to Parent
              </button>
            </div>
          </div>
        </Modal>
      )}

      {sendReportModal.open && sendReportModal.learner && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Report to Parent
            </span>
          }
          onClose={() => setSendReportModal({ open: false, learner: null })}
        >
          <div className="space-y-5">
            <div>
              <p className="font-medium">Sending report for:</p>
              <p className="text-lg font-bold">{sendReportModal.learner.name}</p>
              <p className="text-sm text-gray-600">{sendReportModal.learner.className} (Form {sendReportModal.learner.formNumber})</p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="font-medium text-blue-800 mb-2">Parent Contact Information:</p>
              <div className="space-y-2">
                {sendReportModal.learner.parentPhone ? (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>{sendReportModal.learner.parentPhone}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      SMS & WhatsApp
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">⚠️ No phone number available</p>
                )}
                {sendReportModal.learner.parentEmail ? (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>{sendReportModal.learner.parentEmail}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      Email
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">⚠️ No email address available</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send via:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSendingMethod("sms")}
                  className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1 ${
                    sendingMethod === "sms"
                      ? "bg-green-100 text-green-800 border-2 border-green-500"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs">SMS</span>
                </button>
                <button
                  onClick={() => setSendingMethod("whatsapp")}
                  className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1 ${
                    sendingMethod === "whatsapp"
                      ? "bg-green-100 text-green-800 border-2 border-green-500"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs">WhatsApp</span>
                </button>
                <button
                  onClick={() => setSendingMethod("email")}
                  className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1 ${
                    sendingMethod === "email"
                      ? "bg-blue-100 text-blue-800 border-2 border-blue-500"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-xs">Email</span>
                </button>
                <button
                  onClick={() => setSendingMethod("all")}
                  className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1 ${
                    sendingMethod === "all"
                      ? "bg-purple-100 text-purple-800 border-2 border-purple-500"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Send className="w-5 h-5" />
                  <span className="text-xs">All Methods</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleSendReport}
              disabled={sendingReport || (!sendReportModal.learner.parentPhone && !sendReportModal.learner.parentEmail)}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                sendingReport
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white"
              }`}
            >
              {sendingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Report Now
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              {sendingMethod === "sms" && "Will open SMS app with pre-filled message"}
              {sendingMethod === "whatsapp" && "Will open WhatsApp with pre-filled message"}
              {sendingMethod === "email" && "Will open email client with report"}
              {sendingMethod === "all" && "Will open all available channels"}
            </p>
          </div>
        </Modal>
      )}

      {sendBulkModal && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Bulk Sending Reports
            </span>
          }
          onClose={() => setSendBulkModal(false)}
        >
          <div className="text-center py-6">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sending Reports...</h3>
            <p className="text-gray-600">
              Please wait while we send reports to all parents. This may take a few minutes.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Reports are being sent via all available channels (SMS, WhatsApp, Email)
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}