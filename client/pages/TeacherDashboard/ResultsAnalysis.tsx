// src/pages/TeacherDashboard/ResultsAnalysis.tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Download,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { 
  useMarksData, 
  type Term, 
  type AssessmentType,
  type LearnerMark,
  getAssessmentLabel,
} from "@/hooks/useMarksData";
import { db } from "@/lib/firebase";
import { 
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ===== ECZ GRADING SYSTEM =====
const ECZ_GRADING_SYSTEM = [
  { range: "75-100", grade: "Distinction 1", code: "1" },
  { range: "70-74", grade: "Distinction 2", code: "2" },
  { range: "65-69", grade: "Merit 1", code: "3" },
  { range: "60-64", grade: "Merit 2", code: "4" },
  { range: "55-59", grade: "Credit 1", code: "5" },
  { range: "50-54", grade: "Credit 2", code: "6" },
  { range: "45-49", grade: "Satisfactory 1", code: "7" },
  { range: "40-44", grade: "Satisfactory 2", code: "8" },
  { range: "0-39", grade: "Unsatisfactory", code: "9" },
];

// Helper function to get ECZ grade from score
const getECZGrade = (score: number): { grade: string; code: string } => {
  const grade = ECZ_GRADING_SYSTEM.find(g => {
    const [min, max] = g.range.split("-").map(Number);
    return score >= min && score <= max;
  });
  return grade || ECZ_GRADING_SYSTEM[ECZ_GRADING_SYSTEM.length - 1];
};

// Compute ECZ metrics with gender breakdown
const computeECZMetrics = (learners: LearnerMark[]) => {
  const totalLearners = learners.length;
  const assessedLearners = learners.filter(l => l.score !== null);
  const sat = assessedLearners.length;
  
  // Gender counts - FIXED: Use correct gender property
  const boys = learners.filter(l => l.gender === "M");
  const girls = learners.filter(l => l.gender === "F");
  const assessedBoys = assessedLearners.filter(l => l.gender === "M");
  const assessedGirls = assessedLearners.filter(l => l.gender === "F");

  // Initialize grade counts with gender breakdown
  const gradeCounts: Record<string, { boys: number; girls: number; total: number }> = {};
  ECZ_GRADING_SYSTEM.forEach(grade => {
    gradeCounts[grade.code] = { boys: 0, girls: 0, total: 0 };
  });

  // Calculate scores and grades
  let totalScore = 0;
  const scores: number[] = [];
  
  assessedLearners.forEach(learner => {
    const score = learner.score!;
    totalScore += score;
    scores.push(score);
    
    const grade = getECZGrade(score);
    const isMale = learner.gender === "M";
    
    // Update grade counts with gender
    if (isMale) {
      gradeCounts[grade.code].boys++;
    } else {
      gradeCounts[grade.code].girls++;
    }
    gradeCounts[grade.code].total++;
  });

  // Calculate statistics
  const avgScore = sat > 0 ? totalScore / sat : 0;
  
  // Calculate quality (grades 1-4: Distinction and Merit)
  const quality = ECZ_GRADING_SYSTEM.slice(0, 4).reduce((sum, grade) => 
    sum + gradeCounts[grade.code].total, 0
  );
  const qualityPct = sat > 0 ? Math.round((quality / sat) * 100) : 0;
  
  // Calculate fail (grade 9: Unsatisfactory)
  const failCount = gradeCounts['9']?.total || 0;
  const failPct = sat > 0 ? Math.round((failCount / sat) * 100) : 0;

  // Calculate quality and fail by gender
  const qualityBoys = ECZ_GRADING_SYSTEM.slice(0, 4).reduce((sum, grade) => 
    sum + gradeCounts[grade.code].boys, 0
  );
  const qualityGirls = ECZ_GRADING_SYSTEM.slice(0, 4).reduce((sum, grade) => 
    sum + gradeCounts[grade.code].girls, 0
  );

  // Find highest and lowest scores with gender
  const sortedScores = [...scores].sort((a, b) => b - a);
  const highestScore = sortedScores[0] || 0;
  const lowestScore = sortedScores[sortedScores.length - 1] || 0;

  // Calculate gender averages
  const boysTotalScore = assessedBoys.reduce((sum, l) => sum + l.score!, 0);
  const girlsTotalScore = assessedGirls.reduce((sum, l) => sum + l.score!, 0);
  
  const boysAverage = assessedBoys.length > 0 ? boysTotalScore / assessedBoys.length : 0;
  const girlsAverage = assessedGirls.length > 0 ? girlsTotalScore / assessedGirls.length : 0;

  return {
    onRoll: {
      total: totalLearners,
      boys: boys.length,
      girls: girls.length
    },
    sat: {
      total: sat,
      boys: assessedBoys.length,
      girls: assessedGirls.length,
      rate: totalLearners > 0 ? Math.round((sat / totalLearners) * 100) : 0
    },
    averageScore: Math.round(avgScore * 10) / 10,
    quality: {
      total: quality,
      pct: qualityPct,
      boys: qualityBoys,
      girls: qualityGirls
    },
    fail: {
      total: failCount,
      pct: failPct,
      boys: gradeCounts['9']?.boys || 0,
      girls: gradeCounts['9']?.girls || 0
    },
    gradeCounts,
    highestScore,
    lowestScore,
    genderDistribution: {
      boys: {
        total: boys.length,
        assessed: assessedBoys.length,
        average: Math.round(boysAverage * 10) / 10
      },
      girls: {
        total: girls.length,
        assessed: assessedGirls.length,
        average: Math.round(girlsAverage * 10) / 10
      }
    }
  };
};

// ===== TYPES =====
type ClassResults = {
  id: string;
  className: string;
  subject: string;
  learners: LearnerMark[];
  lastUpdated?: Date;
};

type TrendType = 'up' | 'down' | 'neutral';
type ECZMetrics = ReturnType<typeof computeECZMetrics>;

// ===== TERM OPTIONS =====
const TERM_OPTIONS: { value: Term; label: string }[] = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

// ===== StatCard Component =====
const StatCard = ({
  title,
  value,
  icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  trend?: TrendType;
}) => (
  <div className="bg-white rounded-xl p-4 border border-border hover:shadow-sm transition-shadow">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <p className="text-sm text-gray-600">{title}</p>
          {trend && (
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </span>
          )}
        </div>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
    </div>
  </div>
);

// Toast Notification Component
const ToastNotification = ({ message, type = 'info', onClose }: { 
  message: string; 
  type?: 'info' | 'success' | 'error';
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-100 border-green-300' : 
                  type === 'error' ? 'bg-red-100 border-red-300' : 
                  'bg-blue-100 border-blue-300';
  
  const textColor = type === 'success' ? 'text-green-800' : 
                    type === 'error' ? 'text-red-800' : 
                    'text-blue-800';

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border ${bgColor} ${textColor} shadow-lg max-w-sm animate-fade-in`}>
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

// Helper function to generate admission number
const generateAdmissionNo = (className: string, index: number): string => {
  const classMatch = className.match(/(\w)(\d+)(\w*)/i);
  if (classMatch) {
    const [, firstChar, year, section] = classMatch;
    const classCode = `${firstChar.toUpperCase()}${year}${section || ''}`.substring(0, 3);
    return `${classCode}-${(index + 1).toString().padStart(3, '0')}`;
  }
  const classCode = className.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  return `${classCode}-${(index + 1).toString().padStart(3, '0')}`;
};

// ===== Main Component =====
export default function ResultsAnalysis() {
  const { currentUser } = useAuth();
  const { 
    getTeacherClassSubjects,
    loading: teacherLoading
  } = useTeacherManagement();
  
  const { 
    classes: allClasses, 
    loading: classLoading,
    getClassLearners 
  } = useClassManagement();
  
  const { getTeacherMarks, loading: marksLoading } = useMarksData();
  
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType>("end_of_term");
  const [selectedTerm, setSelectedTerm] = useState<Term>("term1");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
  const [loading, setLoading] = useState(false);
  const [classResults, setClassResults] = useState<ClassResults[]>([]);
  const [selectedResults, setSelectedResults] = useState<ClassResults | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Real-time update control states
  const [pendingUpdates, setPendingUpdates] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shouldUpdate, setShouldUpdate] = useState(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<number>(Date.now());
  
  // Refs for debouncing and batching
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotQueueRef = useRef<QuerySnapshot<DocumentData>[]>([]);
  const isMountedRef = useRef(true);
  const pdfExportRef = useRef<HTMLDivElement>(null);

  // Initialize and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Listen for marks submission events from ResultEntry
  useEffect(() => {
    const handleMarksSubmitted = (event: CustomEvent) => {
      const { classId, subject, term, assessmentType } = event.detail;
      
      if (
        selectedClassId === classId && 
        selectedSubject === subject && 
        selectedTerm === term && 
        selectedAssessment === assessmentType
      ) {
        setToastMessage("New marks submitted. Analysis will update shortly...");
        // Trigger a delayed refresh
        handleDelayedRefresh();
      }
    };

    window.addEventListener('marks-submitted', handleMarksSubmitted as EventListener);

    return () => {
      window.removeEventListener('marks-submitted', handleMarksSubmitted as EventListener);
    };
  }, [selectedClassId, selectedSubject, selectedTerm, selectedAssessment]);

  // Debounced update processor
  const processPendingUpdates = useCallback(() => {
    if (!isMountedRef.current || snapshotQueueRef.current.length === 0 || isUpdating) {
      return;
    }

    setIsUpdating(true);
    
    try {
      // Process all queued snapshots at once
      const latestSnapshot = snapshotQueueRef.current[snapshotQueueRef.current.length - 1];
      snapshotQueueRef.current = []; // Clear queue after processing
      
      if (latestSnapshot && !latestSnapshot.empty && selectedResults) {
        const latestUpdate = latestSnapshot.docs[0]?.data().updatedAt;
        if (latestUpdate) {
          setLastUpdate(latestUpdate.toDate());
        }
        
        // Update the class results with batched changes
        setClassResults(prev => prev.map(result => {
          if (result.id === selectedClassId && result.subject === selectedSubject) {
            const updatedLearners = latestSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: data.learnerId,
                admissionNo: data.admissionNo || generateAdmissionNo(result.className, 0),
                name: data.learnerName,
                gender: data.gender || "M",
                score: data.score,
                classId: data.classId,
                className: data.className || result.className,
                subject: data.subject,
              };
            });
            
            return {
              ...result,
              learners: updatedLearners,
              lastUpdated: latestUpdate?.toDate() || new Date(),
            };
          }
          return result;
        }));
        
        setUpdateCount(prev => prev + 1);
        setPendingUpdates(0);
        
        // Show toast only for significant updates (not every small change)
        if (Date.now() - lastSnapshotTime > 5000) { // Only show every 5 seconds
          setToastMessage("Analysis updated with latest data");
          setLastSnapshotTime(Date.now());
        }
      }
    } catch (error) {
      console.error("Error processing updates:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedClassId, selectedSubject, selectedResults, lastSnapshotTime]);

  // Set up throttled real-time Firestore listener
  useEffect(() => {
    if (!currentUser || !selectedClassId || !selectedSubject) return;

    const marksQuery = query(
      collection(db, "marks"),
      where("classId", "==", selectedClassId),
      where("subject", "==", selectedSubject),
      where("term", "==", selectedTerm),
      where("assessmentType", "==", selectedAssessment),
      where("teacherId", "==", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      marksQuery,
      (snapshot) => {
        if (!isMountedRef.current) return;

        // Queue the snapshot for batch processing
        snapshotQueueRef.current.push(snapshot);
        setPendingUpdates(prev => Math.min(prev + 1, 99)); // Cap at 99

        // Clear any existing timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // Debounce updates: wait for a pause in changes
        updateTimeoutRef.current = setTimeout(() => {
          processPendingUpdates();
        }, 1000); // Batch updates every second
      },
      (error) => {
        console.error("Real-time listener error:", error);
        if (isMountedRef.current) {
          setToastMessage("Connection error - updates may be delayed");
        }
      }
    );

    return () => {
      unsubscribe();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [currentUser, selectedClassId, selectedSubject, selectedTerm, selectedAssessment, processPendingUpdates]);

  // Initial data fetch
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher' || teacherLoading || classLoading || initialLoadDone) {
      return;
    }

    const fetchTeacherResults = async () => {
      try {
        setLoading(true);
        
        const classSubjectCombos = getTeacherClassSubjects(currentUser.uid);
        const subjectClasses = await getTeacherMarks(currentUser.uid, selectedTerm, selectedAssessment);
        
        const resultsPromises = classSubjectCombos.map(async (combo) => {
          const subjectClass = subjectClasses.find(
            sc => sc.classId === combo.classId && sc.subject === combo.subject
          );
          
          let learners: LearnerMark[] = [];
          
          if (subjectClass) {
            learners = subjectClass.learners;
          } else {
            const learnersData = await getClassLearners(combo.classId);
            learners = learnersData.map((learner, index) => ({
              id: learner.id,
              admissionNo: generateAdmissionNo(combo.className, index),
              name: learner.name,
              gender: learner.sex || "M",
              score: null,
              classId: combo.classId,
              className: combo.className,
              subject: combo.subject,
            }));
          }
          
          return {
            id: combo.classId,
            className: combo.className,
            subject: combo.subject,
            learners: learners,
            lastUpdated: new Date(),
          };
        });

        const resolvedResults = await Promise.all(resultsPromises);
        setClassResults(resolvedResults);
        
        if (resolvedResults.length > 0 && !selectedResults) {
          const firstResult = resolvedResults[0];
          setSelectedClassId(firstResult.id);
          setSelectedSubject(firstResult.subject);
          setSelectedResults(firstResult);
          setLastUpdate(firstResult.lastUpdated);
        }
        
        setInitialLoadDone(true);
        
      } catch (error) {
        console.error("Error fetching teacher results:", error);
        setToastMessage("Failed to load results data");
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherResults();
  }, [currentUser, teacherLoading, classLoading, selectedTerm, selectedAssessment, initialLoadDone, getTeacherClassSubjects, getTeacherMarks, getClassLearners, selectedResults]);

  // Update selected results when selection changes
  useEffect(() => {
    if (selectedClassId && selectedSubject) {
      const results = classResults.find(
        r => r.id === selectedClassId && r.subject === selectedSubject
      );
      setSelectedResults(results || null);
      
      if (results?.lastUpdated) {
        setLastUpdate(results.lastUpdated);
      }
    }
  }, [selectedClassId, selectedSubject, classResults]);

  // Handle term or assessment change
  useEffect(() => {
    setInitialLoadDone(false);
    setClassResults([]);
    setSelectedResults(null);
    setSelectedClassId("");
    setSelectedSubject("");
  }, [selectedTerm, selectedAssessment]);

  // Delayed refresh function
  const handleDelayedRefresh = () => {
    if (!currentUser) return;
    
    setIsRefreshing(true);
    
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    snapshotQueueRef.current = [];
    
    // Debounce the refresh to prevent rapid updates
    setTimeout(() => {
      if (isMountedRef.current) {
        setInitialLoadDone(false);
        setShouldUpdate(true);
      }
    }, 500);
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    handleDelayedRefresh();
  };

  // ECZ metrics for selected class-subject
  const eczMetrics = useMemo(() => {
    if (!selectedResults) return null;
    return computeECZMetrics(selectedResults.learners);
  }, [selectedResults]);

  // Grade Distribution Chart Data (memoized to prevent unnecessary re-renders)
  const gradeBandChartData = useMemo(() => {
    if (!eczMetrics) return null;

    const labels = ECZ_GRADING_SYSTEM.map(g => `${g.code}: ${g.grade.split(' ')[0]}`);

    if (viewMode === "detailed") {
      const boysData = ECZ_GRADING_SYSTEM.map(g => eczMetrics.gradeCounts[g.code]?.boys || 0);
      const girlsData = ECZ_GRADING_SYSTEM.map(g => eczMetrics.gradeCounts[g.code]?.girls || 0);
      return {
        labels,
        datasets: [
          {
            label: "Boys",
            data: boysData,
            backgroundColor: "#3B82F6", // Blue
            borderRadius: 4,
          },
          {
            label: "Girls",
            data: girlsData,
            backgroundColor: "#EC4899", // Pink
            borderRadius: 4,
          },
        ],
      };
    } else {
      const totalData = ECZ_GRADING_SYSTEM.map(
        g => eczMetrics.gradeCounts[g.code]?.total || 0
      );
      return {
        labels,
        datasets: [
          {
            label: "Total Learners",
            data: totalData,
            backgroundColor: [
              '#10B981', // Distinction 1
              '#34D399', // Distinction 2
              '#60A5FA', // Merit 1
              '#3B82F6', // Merit 2
              '#818CF8', // Credit 1
              '#A78BFA', // Credit 2
              '#EAB308', // Satisfactory 1
              '#F59E0B', // Satisfactory 2
              '#EF4444', // Unsatisfactory
            ],
            borderRadius: 4,
          },
        ],
      };
    }
  }, [eczMetrics, viewMode]);

  // Top & Bottom Performers (memoized) - FIXED: Show only those with highest and lowest scores
  const topBottom = useMemo(() => {
    if (!selectedResults) return { top3: [], bottom3: [] };
    
    const learnersWithScores = selectedResults.learners.filter((l) => l.score !== null);
    if (learnersWithScores.length === 0) return { top3: [], bottom3: [] };
    
    // Sort by score in descending order
    const sorted = [...learnersWithScores].sort((a, b) => b.score! - a.score!);
    
    // Get top performers (highest scores)
    const topScore = sorted[0]?.score;
    const topPerformers = sorted.filter(l => l.score === topScore).slice(0, 3);
    
    // Get bottom performers (lowest scores)
    const bottomScore = sorted[sorted.length - 1]?.score;
    const bottomPerformers = sorted.filter(l => l.score === bottomScore).slice(0, 3);
    
    return {
      top3: topPerformers,
      bottom3: bottomPerformers,
    };
  }, [selectedResults]);

  // Performance trends (memoized)
  const performanceTrend = useMemo(() => {
    if (!eczMetrics || !selectedResults) return null;
    
    const qualityPct = typeof eczMetrics.quality.pct === 'string' 
      ? parseFloat(eczMetrics.quality.pct) 
      : Number(eczMetrics.quality.pct);
    
    const failPct = typeof eczMetrics.fail.pct === 'string'
      ? parseFloat(eczMetrics.fail.pct)
      : Number(eczMetrics.fail.pct);
    
    if (isNaN(qualityPct) || isNaN(failPct)) {
      return {
        quality: 'neutral' as TrendType,
        fail: 'neutral' as TrendType,
        completion: 'up' as TrendType,
      };
    }
    
    const previousQuality = qualityPct - 5;
    const qualityTrend: TrendType = qualityPct > previousQuality ? 'up' : 
                  qualityPct < previousQuality ? 'down' : 'neutral';
    
    const failTrend: TrendType = failPct < 30 ? 'down' : 'up';
    
    return {
      quality: qualityTrend,
      fail: failTrend,
      completion: 'up' as TrendType,
    };
  }, [eczMetrics, selectedResults]);

  // Generate detailed PDF report - FIXED: TypeScript issues and gender handling
  const generateTeacherPDFReport = () => {
    if (!selectedResults || !eczMetrics || !currentUser) return;
    
    const doc = new jsPDF("landscape", "mm", "a4");
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    // ===== HEADER SECTION =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KALABO SECONDARY SCHOOL EDUCATION BOARD", 148, 10, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`SUBJECT RESULTS ANALYSIS - ${selectedResults.subject.toUpperCase()}`, 148, 17, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`${selectedResults.className} | TERM ${selectedTerm.replace('term', '')} - ${selectedYear}`, 148, 24, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(getAssessmentLabel(selectedAssessment).toUpperCase(), 148, 31, { align: "center" });
    
    // Header line
    doc.setDrawColor(0);
    doc.line(10, 35, 285, 35);
    
    // ===== TEACHER & CLASS INFO =====
    let yPos = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TEACHER INFORMATION:", 10, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Teacher: ${currentUser.displayName || 'Not specified'}`, 90, yPos);
    doc.text(`Date: ${currentDate}`, 200, yPos);
    
    yPos += 8;
    doc.text(`Class: ${selectedResults.className}`, 10, yPos);
    doc.text(`Subject: ${selectedResults.subject}`, 90, yPos);
    doc.text(`Total Learners: ${eczMetrics.onRoll.total}`, 180, yPos);
    
    yPos += 8;
    doc.text(`Term: Term ${selectedTerm.replace('term', '')}`, 10, yPos);
    doc.text(`Assessment: ${getAssessmentLabel(selectedAssessment)}`, 90, yPos);
    doc.text(`Assessed: ${eczMetrics.sat.total} (${eczMetrics.sat.rate}%)`, 180, yPos);
    
    // ===== GENDER PERFORMANCE SUMMARY =====
    yPos += 12;
    doc.setFont("helvetica", "bold");
    doc.text("GENDER PERFORMANCE SUMMARY:", 10, yPos);
    
    yPos += 6;
    doc.setDrawColor(200);
    doc.line(10, yPos, 285, yPos);
    yPos += 8;
    
    // Gender summary table headers - FIXED: TypeScript type issues
    const genderHeaders = [
      ["GENDER", "ON ROLL", "ASSESSED", "ASSESSMENT RATE", "AVERAGE SCORE", "QUALITY ACHIEVERS", "FAILED (UNSAT)", "QUALITY %", "FAIL %"]
    ];
    
    // Gender summary table body
    const genderBody = [
      [
        "👦 BOYS",
        eczMetrics.onRoll.boys.toString(),
        eczMetrics.sat.boys.toString(),
        eczMetrics.onRoll.boys > 0 ? `${Math.round((eczMetrics.sat.boys / eczMetrics.onRoll.boys) * 100)}%` : "0%",
        eczMetrics.genderDistribution.boys.average.toFixed(1),
        eczMetrics.quality.boys.toString(),
        eczMetrics.fail.boys.toString(),
        eczMetrics.sat.boys > 0 ? `${Math.round((eczMetrics.quality.boys / eczMetrics.sat.boys) * 100)}%` : "0%",
        eczMetrics.sat.boys > 0 ? `${Math.round((eczMetrics.fail.boys / eczMetrics.sat.boys) * 100)}%` : "0%",
      ],
      [
        "👧 GIRLS",
        eczMetrics.onRoll.girls.toString(),
        eczMetrics.sat.girls.toString(),
        eczMetrics.onRoll.girls > 0 ? `${Math.round((eczMetrics.sat.girls / eczMetrics.onRoll.girls) * 100)}%` : "0%",
        eczMetrics.genderDistribution.girls.average.toFixed(1),
        eczMetrics.quality.girls.toString(),
        eczMetrics.fail.girls.toString(),
        eczMetrics.sat.girls > 0 ? `${Math.round((eczMetrics.quality.girls / eczMetrics.sat.girls) * 100)}%` : "0%",
        eczMetrics.sat.girls > 0 ? `${Math.round((eczMetrics.fail.girls / eczMetrics.sat.girls) * 100)}%` : "0%",
      ],
      [
        "TOTAL",
        eczMetrics.onRoll.total.toString(),
        eczMetrics.sat.total.toString(),
        `${eczMetrics.sat.rate}%`,
        eczMetrics.averageScore.toFixed(1),
        eczMetrics.quality.total.toString(),
        eczMetrics.fail.total.toString(),
        `${eczMetrics.quality.pct}%`,
        `${eczMetrics.fail.pct}%`,
      ]
    ];
    
    // Generate gender table
    autoTable(doc, {
      startY: yPos,
      head: genderHeaders,
      body: genderBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 20, halign: 'center' },
      },
    });
    
    // ===== DETAILED GRADE DISTRIBUTION =====
    const genderTableY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DETAILED GRADE DISTRIBUTION BY GENDER:", 10, genderTableY);
    
    // Detailed grade distribution headers - FIXED: Simplified header structure
    const gradeHeaders = [
      ["ECZ GRADE", "RANGE", "DESCRIPTION", "BOYS", "GIRLS", "TOTAL", "PERCENTAGE"]
    ];
    
    // Detailed grade distribution body
    const gradeBody = ECZ_GRADING_SYSTEM.map(grade => {
      const gradeKey = grade.code;
      const boysCount = eczMetrics.gradeCounts[gradeKey]?.boys || 0;
      const girlsCount = eczMetrics.gradeCounts[gradeKey]?.girls || 0;
      const total = boysCount + girlsCount;
      const percentage = eczMetrics.sat.total > 0 ? Math.round((total / eczMetrics.sat.total) * 100) : 0;
      
      return [
        grade.code,
        grade.range,
        grade.grade,
        boysCount.toString(),
        girlsCount.toString(),
        total.toString(),
        `${percentage}%`
      ];
    });
    
    // Add total row
    gradeBody.push([
      "TOTAL",
      "",
      "",
      eczMetrics.sat.boys.toString(),
      eczMetrics.sat.girls.toString(),
      eczMetrics.sat.total.toString(),
      "100%"
    ]);
    
    // Generate grade distribution table
    autoTable(doc, {
      startY: genderTableY + 5,
      head: gradeHeaders,
      body: gradeBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 40 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
      },
    });
    
    // ===== TOP & BOTTOM PERFORMERS =====
    const gradeTableY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOP & BOTTOM PERFORMERS:", 10, gradeTableY);
    
    // Top performers table
    const topHeaders = [["🏆 TOP PERFORMERS", "SCORE", "GRADE", "GENDER"]];
    const topBody = topBottom.top3.map((learner, index) => [
      `${index + 1}. ${learner.name}`,
      learner.score?.toString() || "N/A",
      learner.score ? getECZGrade(learner.score).code : "N/A",
      learner.gender === "M" ? "👦 Boy" : "👧 Girl"
    ]);
    
    // Add if no top performers
    if (topBody.length === 0) {
      topBody.push(["No top performers", "N/A", "N/A", "N/A"]);
    }
    
    autoTable(doc, {
      startY: gradeTableY + 5,
      head: topHeaders,
      body: topBody,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [220, 252, 231], // Green background
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 10 },
    });
    
    // Bottom performers table
    const bottomStartY = (doc as any).lastAutoTable.finalY + 10;
    
    const bottomHeaders = [["📉 BOTTOM PERFORMERS (NEEDS SUPPORT)", "SCORE", "GRADE", "GENDER"]];
    const bottomBody = topBottom.bottom3.map((learner, index) => [
      `${topBottom.bottom3.length - index}. ${learner.name}`,
      learner.score?.toString() || "N/A",
      learner.score ? getECZGrade(learner.score).code : "N/A",
      learner.gender === "M" ? "👦 Boy" : "👧 Girl"
    ]);
    
    // Add if no bottom performers
    if (bottomBody.length === 0) {
      bottomBody.push(["No bottom performers", "N/A", "N/A", "N/A"]);
    }
    
    autoTable(doc, {
      startY: bottomStartY,
      head: bottomHeaders,
      body: bottomBody,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [254, 226, 226], // Red background
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 10 },
    });
    
    // ===== TEACHER'S COMMENTS & RECOMMENDATIONS =====
    const performersY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TEACHER'S ANALYSIS & RECOMMENDATIONS:", 10, performersY);
    
    // Analysis lines
    let commentY = performersY + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    const analyses = [
      `Overall Performance: ${eczMetrics.quality.pct >= 60 ? 'Satisfactory' : eczMetrics.quality.pct >= 40 ? 'Average' : 'Below Average'}`,
      `Gender Performance Gap: ${Math.abs(eczMetrics.genderDistribution.boys.average - eczMetrics.genderDistribution.girls.average).toFixed(1)} points`,
      `Major Area of Concern: ${eczMetrics.fail.pct > 30 ? 'High failure rate' : eczMetrics.sat.rate < 80 ? 'Low assessment rate' : 'Satisfactory'}`,
      `Recommended Action: ${eczMetrics.fail.pct > 30 ? 'Provide remedial lessons' : eczMetrics.quality.pct < 40 ? 'Enhance teaching methods' : 'Maintain current strategies'}`,
    ];
    
    analyses.forEach(analysis => {
      doc.text(analysis, 15, commentY);
      commentY += 6;
    });
    
    // ===== SIGNATURE SECTION =====
    const signatureY = commentY + 15;
    
    // Teacher signature
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Teacher's Signature", 50, signatureY);
    doc.line(50, signatureY + 2, 120, signatureY + 2);
    doc.text("Date", 50, signatureY + 10);
    doc.line(50, signatureY + 12, 90, signatureY + 12);
    
    // HOD signature
    doc.text("Head of Department's Signature", 170, signatureY);
    doc.line(170, signatureY + 2, 240, signatureY + 2);
    doc.text("Date", 170, signatureY + 10);
    doc.line(170, signatureY + 12, 210, signatureY + 12);
    
    // ===== FOOTER =====
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Generated by Kalabo School Management System", 148, 200, { align: "center" });
    
    // ===== SAVE PDF =====
    const fileName = `${selectedResults.subject}_${selectedResults.className}_Term${selectedTerm.replace('term', '')}_${selectedYear}_${currentDate.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    
    // Show success message
    setToastMessage("PDF report generated successfully!");
  };

  // PDF Export function - FIXED: Now actually exports PDF
  const handleExportPDF = async () => {
    try {
      setToastMessage("Generating analysis report...");
      
      // Always use the detailed PDF report function
      generateTeacherPDFReport();
      
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setToastMessage("Failed to generate report");
    }
  };

  // Handle term change
  const handleTermChange = (newTerm: Term) => {
    setSelectedTerm(newTerm);
  };

  // Handle assessment change
  const handleAssessmentChange = (newAssessment: AssessmentType) => {
    setSelectedAssessment(newAssessment);
  };

  // Handle class-subject selection
  const handleClassSubjectSelect = (classId: string, subject: string) => {
    setSelectedClassId(classId);
    setSelectedSubject(subject);
  };

  const isLoading = teacherLoading || classLoading || loading || marksLoading || !initialLoadDone;

  if (isLoading && !initialLoadDone) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Loading results analysis...</p>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Access Restricted</h2>
          <p className="text-slate-500">
            This page is only available for teachers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <ToastNotification 
          message={toastMessage} 
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Results Analysis</h1>
            <p className="text-muted-foreground mt-1">
              Analyze performance using ECZ grading system (Grades 1-9). 
              <span className="text-green-600 font-medium ml-2">✓ Gender breakdown included</span>
            </p>
          </div>
          
          {/* Update status indicator */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              {lastUpdate && (
                <span className="text-xs text-gray-500 block">
                  Updated: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {pendingUpdates > 0 && (
                <span className="text-xs text-blue-600 block">
                  Processing {pendingUpdates} update{pendingUpdates !== 1 ? 's' : ''}...
                </span>
              )}
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || !selectedResults}
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-5 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class & Subject</label>
            <select
              value={selectedClassId && selectedSubject ? `${selectedClassId}|${selectedSubject}` : ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setSelectedClassId("");
                  setSelectedSubject("");
                } else {
                  const [classId, subject] = value.split("|");
                  handleClassSubjectSelect(classId, subject);
                }
              }}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              disabled={classResults.length === 0}
            >
              <option value="">— Choose a class —</option>
              {classResults.map((result) => {
                const hasMarks = result.learners.some(l => l.score !== null);
                const markCount = result.learners.filter(l => l.score !== null).length;
                
                return (
                  <option 
                    key={`${result.id}-${result.subject}`} 
                    value={`${result.id}|${result.subject}`}
                  >
                    {result.className} — {result.subject} 
                    {hasMarks ? ` (${markCount} marks)` : ' (No marks)'}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {classResults.length} assignment{classResults.length !== 1 ? 's' : ''} available • 
              <span className="text-green-600 ml-1">ECZ grading system</span>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => handleTermChange(e.target.value as Term)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {TERM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment</label>
            <select
              value={selectedAssessment}
              onChange={(e) => handleAssessmentChange(e.target.value as AssessmentType)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              disabled={!selectedResults}
            >
              <option value="week4">Week 4</option>
              <option value="week8">Week 8</option>
              <option value="end_of_term">End of Term (Final)</option>
            </select>
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("simple")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                  viewMode === "simple"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <EyeOff className="w-4 h-4 inline mr-1" />
                Simple
              </button>
              <button
                onClick={() => setViewMode("detailed")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                  viewMode === "detailed"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Detailed
              </button>
            </div>
          </div>
          
          {/* Data freshness indicator */}
          {selectedResults && (
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {lastUpdate ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                    Data synced
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                    Loading data...
                  </>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {updateCount > 0 ? `${updateCount} update${updateCount !== 1 ? 's' : ''}` : 'No updates yet'}
              </div>
            </div>
          )}
        </div>
      </div>

      {classResults.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Results Available</h3>
          <p className="text-gray-500">
            You haven't entered any marks yet. Enter marks in the Results Entry page to see analysis here.
          </p>
          <button
            onClick={() => window.location.href = '/teacher/results-entry'}
            className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 font-medium"
          >
            Go to Results Entry
          </button>
        </div>
      ) : !selectedResults ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Select an Assignment</h3>
          <p className="text-gray-500">
            Choose from your {classResults.length} assignment{classResults.length !== 1 ? 's' : ''} to view analysis.
          </p>
        </div>
      ) : (
        <>
          {/* ECZ Grading Legend */}
          <div className="bg-white rounded-xl p-4 border border-border">
            <h3 className="font-bold text-gray-900 mb-3">ECZ Grading System (Grades 1-9)</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {ECZ_GRADING_SYSTEM.map((grade) => (
                <div key={grade.code} className="border rounded-lg p-2 text-center">
                  <div className="font-bold text-lg">{grade.code}</div>
                  <div className="text-xs font-medium">{grade.grade.split(' ')[0]}</div>
                  <div className="text-xs text-gray-600">{grade.range}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Summary with Gender Breakdown */}
          {eczMetrics && (
            <div className="space-y-4">
              {/* Main Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="On Roll"
                  value={`${eczMetrics.onRoll.total}`}
                  icon={<Users className="w-5 h-5 text-blue-600" />}
                  description={`👦 ${eczMetrics.onRoll.boys} | 👧 ${eczMetrics.onRoll.girls}`}
                  trend={performanceTrend?.completion}
                />
                <StatCard
                  title="Sat"
                  value={`${eczMetrics.sat.total}`}
                  icon={<Users className="w-5 h-5 text-green-600" />}
                  description={`👦 ${eczMetrics.sat.boys} | 👧 ${eczMetrics.sat.girls}`}
                  trend={eczMetrics.sat.total > 0 ? 'up' : 'neutral'}
                />
                <StatCard
                  title="Quality"
                  value={`${eczMetrics.quality.pct}%`}
                  icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                  description={`👦 ${eczMetrics.quality.boys} | 👧 ${eczMetrics.quality.girls}`}
                  trend={performanceTrend?.quality}
                />
                <StatCard
                  title="Fail"
                  value={`${eczMetrics.fail.pct}%`}
                  icon={<BarChart3 className="w-5 h-5 text-red-600" />}
                  description={`👦 ${eczMetrics.fail.boys} | 👧 ${eczMetrics.fail.girls}`}
                  trend={performanceTrend?.fail}
                />
              </div>
              
              {/* Gender Performance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">Boys Average</div>
                  <div className="text-xl font-bold text-blue-900">
                    {eczMetrics.genderDistribution.boys.average.toFixed(1)}
                  </div>
                  <div className="text-xs text-blue-600">
                    {eczMetrics.sat.boys}/{eczMetrics.onRoll.boys} assessed
                  </div>
                </div>
                <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                  <div className="text-xs text-pink-700 mb-1">Girls Average</div>
                  <div className="text-xl font-bold text-pink-900">
                    {eczMetrics.genderDistribution.girls.average.toFixed(1)}
                  </div>
                  <div className="text-xs text-pink-600">
                    {eczMetrics.sat.girls}/{eczMetrics.onRoll.girls} assessed
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">Class Average</div>
                  <div className="text-xl font-bold text-purple-900">
                    {eczMetrics.averageScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-purple-600">
                    Score range: {eczMetrics.lowestScore}-{eczMetrics.highestScore}
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="text-xs text-amber-700 mb-1">Gender Gap</div>
                  <div className={`text-xl font-bold ${Math.abs(eczMetrics.genderDistribution.boys.average - eczMetrics.genderDistribution.girls.average) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(eczMetrics.genderDistribution.boys.average - eczMetrics.genderDistribution.girls.average).toFixed(1)} pts
                  </div>
                  <div className="text-xs text-amber-600">
                    {eczMetrics.genderDistribution.boys.average > eczMetrics.genderDistribution.girls.average ? 'Boys lead' : 'Girls lead'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Distribution */}
            {gradeBandChartData && (
              <div className="bg-white p-5 rounded-xl border border-border">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Grade Distribution ({viewMode === "detailed" ? "By Gender" : "Total"})
                  </h3>
                  <span className="text-xs text-gray-500">
                    {lastUpdate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="h-80">
                  <Bar
                    data={gradeBandChartData}
                    options={{
                      indexAxis: "x",
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          title: { display: true, text: "ECZ Grade", font: { weight: 'bold' } },
                        },
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: "Number of Learners", font: { weight: 'bold' } },
                          ticks: { stepSize: 1 }
                        },
                      },
                      plugins: {
                        legend: { position: "top", labels: { font: { size: 12 } } },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const grade = ECZ_GRADING_SYSTEM[context.dataIndex];
                              return `${context.dataset.label}: ${context.raw} learner(s) (Grade ${grade.code})`;
                            }
                          }
                        }
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* Top & Bottom */}
            {selectedResults && (
              <div className="bg-white p-5 rounded-xl border border-border">
                <h3 className="font-semibold text-gray-900 mb-4">Top & Bottom Performers</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-green-700">🏆 Top Performers (Highest Score: {topBottom.top3[0]?.score || 0})</h4>
                      <span className="text-xs text-gray-500">
                        {lastUpdate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {topBottom.top3.length > 0 ? (
                        topBottom.top3.map((learner, index) => (
                          <li key={learner.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">#{index + 1}</span>
                              <span>
                                {learner.name} {learner.gender === "M" ? "👦" : "👧"}
                              </span>
                            </div>
                            <span className="font-medium bg-green-50 text-green-700 px-2 py-1 rounded">
                              {learner.score} (Grade {getECZGrade(learner.score!).code})
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500 p-2">No top performers available</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">📉 Needs Support (Lowest Score: {topBottom.bottom3[0]?.score || 0})</h4>
                    <ul className="space-y-2">
                      {topBottom.bottom3.length > 0 ? (
                        topBottom.bottom3.map((learner, index) => (
                          <li key={learner.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">#{topBottom.bottom3.length - index}</span>
                              <span>
                                {learner.name} {learner.gender === "M" ? "👦" : "👧"}
                              </span>
                            </div>
                            <span className="font-medium bg-red-50 text-red-700 px-2 py-1 rounded">
                              {learner.score} (Grade {getECZGrade(learner.score!).code})
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500 p-2">No bottom performers available</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              {pendingUpdates > 0 ? 
                `Processing ${pendingUpdates} update${pendingUpdates !== 1 ? 's' : ''}...` : 
                'Sync active'}
              • Updates: {updateCount}
            </div>
            <button
              onClick={handleExportPDF}
              disabled={!selectedResults || !eczMetrics}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Full Analysis Report (PDF)
            </button>
          </div>

          {/* Hidden PDF content for simple export (not used now) */}
          <div ref={pdfExportRef} className="hidden">
            {/* Content for simple PDF export if needed */}
          </div>
        </>
      )}
    </div>
  );
}