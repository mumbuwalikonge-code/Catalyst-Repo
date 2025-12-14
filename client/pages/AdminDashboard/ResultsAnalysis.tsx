// src/pages/AdminDashboard/AdminResultsAnalysis.tsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Download,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
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
import { useMarksData, type Term, type AssessmentType } from "@/hooks/useMarksData";
import { useClassManagement } from "@/hooks/useClasses";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

// ===== TYPES =====
type ClassPerformance = {
  classId: string;
  className: string;
  form: string;
  subjectCount: number;
  totalLearners: number;
  totalAssessed: number;
  gradeDistribution: Record<string, number>;
  qualityPct: number;
  failPct: number;
  subjects: {
    name: string;
    totalLearners: number;
    totalAssessed: number;
    gradeDistribution: Record<string, number>;
    qualityPct: number;
    failPct: number;
  }[];
};

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
  trend?: 'up' | 'down' | 'neutral';
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

// ===== Main Component =====
export default function AdminResultsAnalysis() {
  const { 
    subjectClasses, 
    loading, 
    error,
    refreshData,
    getAssessmentLabel,
  } = useMarksData();
  
  const { classes: allClasses } = useClassManagement();
  
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("end_of_term");
  const [selectedTerm, setSelectedTerm] = useState<Term>("term1");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("");

  // Refresh data when term or assessment changes
  useEffect(() => {
    refreshData(selectedTerm, assessmentType);
  }, [selectedTerm, assessmentType]);

  // Calculate class performance data
  const classPerformanceData = useMemo(() => {
    const performanceMap: Record<string, ClassPerformance> = {};
    
    subjectClasses.forEach(subjectClass => {
      const classId = subjectClass.classId;
      const className = subjectClass.className || "Unknown Class";
      
      if (!performanceMap[classId]) {
        // Extract form number from class name
        const formMatch = className.match(/form\s*(\d+)/i) || className.match(/(\d+)/);
        const formNumber = formMatch ? parseInt(formMatch[1]) : 1;
        const form = formNumber <= 5 ? `Form ${formNumber}` : `Grade ${formNumber + 7}`;
        
        performanceMap[classId] = {
          classId,
          className,
          form,
          subjectCount: 0,
          totalLearners: 0,
          totalAssessed: 0,
          gradeDistribution: {},
          qualityPct: 0,
          failPct: 0,
          subjects: [],
        };
      }
      
      const learners = subjectClass.learners;
      const totalLearners = learners.length;
      const assessedLearners = learners.filter(l => l.score !== null);
      const totalAssessed = assessedLearners.length;
      
      // Calculate grade distribution
      const gradeDistribution: Record<string, number> = {};
      ECZ_GRADING_SYSTEM.forEach(grade => {
        gradeDistribution[grade.code] = 0;
      });
      
      assessedLearners.forEach(learner => {
        const grade = getECZGrade(learner.score || 0);
        gradeDistribution[grade.code]++;
      });
      
      // Calculate quality percentage (Distinction 1-4: grades 1-4)
      const qualityCount = ['1', '2', '3', '4'].reduce((sum, code) => sum + gradeDistribution[code], 0);
      const qualityPct = totalAssessed > 0 ? Math.round((qualityCount / totalAssessed) * 100) : 0;
      
      // Calculate fail percentage (Unsatisfactory: grade 9)
      const failCount = gradeDistribution['9'] || 0;
      const failPct = totalAssessed > 0 ? Math.round((failCount / totalAssessed) * 100) : 0;
      
      const classData = performanceMap[classId];
      classData.subjectCount++;
      classData.totalLearners = Math.max(classData.totalLearners, totalLearners);
      classData.totalAssessed += totalAssessed;
      
      // Update overall grade distribution
      Object.entries(gradeDistribution).forEach(([code, count]) => {
        classData.gradeDistribution[code] = (classData.gradeDistribution[code] || 0) + count;
      });
      
      // Add subject data
      classData.subjects.push({
        name: subjectClass.subject,
        totalLearners,
        totalAssessed,
        gradeDistribution,
        qualityPct,
        failPct,
      });
    });
    
    // Calculate overall percentages for each class
    Object.values(performanceMap).forEach(classData => {
      const totalGrades = Object.values(classData.gradeDistribution).reduce((a, b) => a + b, 0);
      const qualityCount = ['1', '2', '3', '4'].reduce((sum, code) => sum + (classData.gradeDistribution[code] || 0), 0);
      const failCount = classData.gradeDistribution['9'] || 0;
      
      classData.qualityPct = totalGrades > 0 ? Math.round((qualityCount / totalGrades) * 100) : 0;
      classData.failPct = totalGrades > 0 ? Math.round((failCount / totalGrades) * 100) : 0;
    });
    
    return Object.values(performanceMap);
  }, [subjectClasses]);

  // Calculate school-wide statistics
  const schoolMetrics = useMemo(() => {
    let totalLearners = 0;
    let totalAssessed = 0;
    const gradeDistribution: Record<string, number> = {};
    
    classPerformanceData.forEach(classData => {
      totalLearners += classData.totalLearners;
      totalAssessed += classData.totalAssessed;
      Object.entries(classData.gradeDistribution).forEach(([code, count]) => {
        gradeDistribution[code] = (gradeDistribution[code] || 0) + count;
      });
    });
    
    const totalGrades = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
    const qualityCount = ['1', '2', '3', '4'].reduce((sum, code) => sum + (gradeDistribution[code] || 0), 0);
    const failCount = gradeDistribution['9'] || 0;
    
    const qualityPct = totalGrades > 0 ? Math.round((qualityCount / totalGrades) * 100) : 0;
    const failPct = totalGrades > 0 ? Math.round((failCount / totalGrades) * 100) : 0;
    
    return {
      totalLearners,
      totalAssessed,
      qualityPct,
      failPct,
      gradeDistribution,
    };
  }, [classPerformanceData]);

  // Filter classes by subject
  const filteredClasses = useMemo(() => {
    if (!filterSubject) return classPerformanceData;
    
    return classPerformanceData.filter(classData => 
      classData.subjects.some(subject => 
        subject.name.toLowerCase().includes(filterSubject.toLowerCase())
      )
    );
  }, [classPerformanceData, filterSubject]);

  // Generate PDF Report
  const generatePDFReport = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    
    // ===== HEADER SECTION =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("KALABO SECONDARY SCHOOL EDUCATION BOARD", 148, 10, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`RESULT ANALYSIS – TERM ${selectedTerm.replace('term', '')} – ${selectedYear}`, 148, 17, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(getAssessmentLabel(assessmentType).toUpperCase(), 148, 24, { align: "center" });
    
    doc.setFontSize(10);
    doc.text("PERFORMANCE PER CLASS", 148, 31, { align: "center" });
    
    // Header line
    doc.setDrawColor(0);
    doc.line(10, 35, 285, 35);
    
    // ===== TABLE HEADERS =====
    const headers = [
      [
        { content: "CLASS/SUBJECT", rowSpan: 2, styles: { halign: 'center' } },
        { content: "ON ROLL", colSpan: 1, styles: { halign: 'center' } },
        { content: "NO. SAT", colSpan: 1, styles: { halign: 'center' } },
        { content: "DISTINCTION", colSpan: 2, styles: { halign: 'center' } },
        { content: "MERIT", colSpan: 2, styles: { halign: 'center' } },
        { content: "CREDIT", colSpan: 2, styles: { halign: 'center' } },
        { content: "PASS", colSpan: 3, styles: { halign: 'center' } },
        { content: "UNSAT", rowSpan: 2, styles: { halign: 'center' } },
        { content: "ABSENT", rowSpan: 2, styles: { halign: 'center' } },
        { content: "QUALITY", rowSpan: 2, styles: { halign: 'center' } },
        { content: "QUANTITY", rowSpan: 2, styles: { halign: 'center' } },
        { content: "FAIL", rowSpan: 2, styles: { halign: 'center' } },
        { content: "OVERALL", colSpan: 2, styles: { halign: 'center' } },
      ],
      [
        "", // Empty for CLASS/SUBJECT
        "", // Empty for ON ROLL
        "", // Empty for NO. SAT
        { content: "75-100", styles: { halign: 'center' } },
        { content: "70-74", styles: { halign: 'center' } },
        { content: "65-69", styles: { halign: 'center' } },
        { content: "60-64", styles: { halign: 'center' } },
        { content: "55-59", styles: { halign: 'center' } },
        { content: "50-54", styles: { halign: 'center' } },
        { content: "45-49", styles: { halign: 'center' } },
        { content: "40-44", styles: { halign: 'center' } },
        { content: "35-39", styles: { halign: 'center' } },
        "", // Empty for UNSAT
        "", // Empty for ABSENT
        "", // Empty for QUALITY
        "", // Empty for QUANTITY
        "", // Empty for FAIL
        { content: "ANALYSIS", styles: { halign: 'center' } },
        { content: "PERC(%)", styles: { halign: 'center' } },
      ]
    ];
    
    // ===== TABLE BODY =====
    const body: any[] = [];
    
    filteredClasses.forEach(classData => {
      // Add class row
      body.push([
        { 
          content: `${classData.className} (${classData.form})`, 
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } 
        },
        { content: classData.totalLearners.toString(), styles: { halign: 'center' } },
        { content: classData.totalAssessed.toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['1'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['2'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['3'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['4'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['5'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['6'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['7'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.gradeDistribution['8'] || 0).toString(), styles: { halign: 'center' } },
        { content: "0", styles: { halign: 'center' } }, // 35-39 not in ECZ system
        { content: (classData.gradeDistribution['9'] || 0).toString(), styles: { halign: 'center' } },
        { content: (classData.totalLearners - classData.totalAssessed).toString(), styles: { halign: 'center' } },
        { content: `${classData.qualityPct}%`, styles: { halign: 'center' } },
        { content: "N/A", styles: { halign: 'center' } },
        { content: `${classData.failPct}%`, styles: { halign: 'center' } },
        { content: "Satisfactory", styles: { halign: 'center' } },
        { content: classData.qualityPct >= 60 ? "High" : classData.qualityPct >= 40 ? "Medium" : "Low", styles: { halign: 'center' } },
      ]);
      
      // Add subject rows
      classData.subjects.forEach(subject => {
        const absent = subject.totalLearners - subject.totalAssessed;
        body.push([
          `  ${subject.name}`,
          subject.totalLearners.toString(),
          subject.totalAssessed.toString(),
          (subject.gradeDistribution['1'] || 0).toString(),
          (subject.gradeDistribution['2'] || 0).toString(),
          (subject.gradeDistribution['3'] || 0).toString(),
          (subject.gradeDistribution['4'] || 0).toString(),
          (subject.gradeDistribution['5'] || 0).toString(),
          (subject.gradeDistribution['6'] || 0).toString(),
          (subject.gradeDistribution['7'] || 0).toString(),
          (subject.gradeDistribution['8'] || 0).toString(),
          "0",
          (subject.gradeDistribution['9'] || 0).toString(),
          absent.toString(),
          `${subject.qualityPct}%`,
          "N/A",
          `${subject.failPct}%`,
          "Satisfactory",
          subject.qualityPct >= 60 ? "High" : subject.qualityPct >= 40 ? "Medium" : "Low",
        ]);
      });
      
      // Add empty row for spacing
      body.push([
        { content: "", colSpan: 19, styles: { fillColor: [250, 250, 250] } }
      ]);
    });
    
    // ===== GENERATE TABLE =====
    autoTable(doc, {
      startY: 40,
      head: headers,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 40 }, // CLASS/SUBJECT
        1: { cellWidth: 15 }, // ON ROLL
        2: { cellWidth: 15 }, // NO. SAT
        3: { cellWidth: 15 }, // DIST 75-100
        4: { cellWidth: 15 }, // DIST 70-74
        5: { cellWidth: 15 }, // MERIT 65-69
        6: { cellWidth: 15 }, // MERIT 60-64
        7: { cellWidth: 15 }, // CREDIT 55-59
        8: { cellWidth: 15 }, // CREDIT 50-54
        9: { cellWidth: 15 }, // PASS 45-49
        10: { cellWidth: 15 }, // PASS 40-44
        11: { cellWidth: 15 }, // PASS 35-39
        12: { cellWidth: 15 }, // UNSAT
        13: { cellWidth: 15 }, // ABSENT
        14: { cellWidth: 15 }, // QUALITY
        15: { cellWidth: 15 }, // QUANTITY
        16: { cellWidth: 15 }, // FAIL
        17: { cellWidth: 20 }, // ANALYSIS
        18: { cellWidth: 15 }, // PERC(%)
      },
      margin: { top: 40, right: 10, bottom: 10, left: 10 },
    });
    
    // ===== TEACHER'S COMMENTS SECTION =====
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TEACHER'S COMMENTS", 10, finalY);
    
    // Draw comment lines
    let yPos = finalY + 5;
    for (let i = 0; i < 6; i++) {
      doc.line(10, yPos, 285, yPos);
      yPos += 8;
    }
    
    // ===== SIGNATURE SECTION =====
    const signatureY = yPos + 10;
    
    // Left signature block
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("HOD's Signature", 20, signatureY);
    doc.text("_____________________", 20, signatureY + 5);
    doc.text("Date", 20, signatureY + 15);
    doc.text("_____________________", 20, signatureY + 20);
    doc.text("Official Stamp", 20, signatureY + 30);
    
    // Right signature block
    doc.text("HEAD TEACHER'S Signature", 220, signatureY);
    doc.text("_____________________", 220, signatureY + 5);
    doc.text("Date", 220, signatureY + 15);
    doc.text("_____________________", 220, signatureY + 20);
    doc.text("Official Stamp", 220, signatureY + 30);
    
    // ===== SAVE PDF =====
    doc.save(`Kalabo_Results_Analysis_Term${selectedTerm.replace('term', '')}_${selectedYear}.pdf`);
  };

  // Handle term change
  const handleTermChange = (newTerm: Term) => {
    setSelectedTerm(newTerm);
  };

  // Handle assessment change
  const handleAssessmentChange = (newAssessment: AssessmentType) => {
    setAssessmentType(newAssessment);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-red-200">
        <BarChart3 className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 mb-2">Error Loading Data</h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Results Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive analysis of school performance using ECZ Grading System.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-5 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              value={assessmentType}
              onChange={(e) => handleAssessmentChange(e.target.value as AssessmentType)}
              className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="week4">Week 4</option>
              <option value="week8">Week 8</option>
              <option value="end_of_term">End of Term</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Subject</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Subject name..."
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full pl-10 p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("simple")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
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
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
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
          
          <button
            onClick={generatePDFReport}
            disabled={filteredClasses.length === 0}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Generate Analysis PDF
          </button>
        </div>
      </div>

      {/* School Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total On Roll"
          value={schoolMetrics.totalLearners}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          description="All learners across school"
        />
        <StatCard
          title="Total Assessed"
          value={schoolMetrics.totalAssessed}
          icon={<Users className="w-5 h-5 text-green-600" />}
          description="Learners with marks"
        />
        <StatCard
          title="Quality %"
          value={`${schoolMetrics.qualityPct}%`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          description="Distinction 1-4 (Grades 1-4)"
        />
        <StatCard
          title="Fail %"
          value={`${schoolMetrics.failPct}%`}
          icon={<BarChart3 className="w-5 h-5 text-red-600" />}
          description="Unsatisfactory (Grade 9)"
        />
      </div>

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

      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Results Available</h3>
          <p className="text-gray-500">
            {filterSubject 
              ? `No results found for subject "${filterSubject}"`
              : "No marks have been entered for the selected term and assessment type."
            }
          </p>
        </div>
      ) : (
        <>
          {/* Class Performance List */}
          <div className="space-y-4">
            {filteredClasses.map((classData) => (
              <div key={classData.classId} className="bg-white rounded-xl border border-border overflow-hidden">
                <div 
                  className="p-5 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                  onClick={() => setExpandedClass(expandedClass === classData.classId ? null : classData.classId)}
                >
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{classData.className}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-600">{classData.form}</span>
                      <span className="text-sm text-gray-600">{classData.subjectCount} subjects</span>
                      <span className="text-sm text-gray-600">{classData.totalAssessed} of {classData.totalLearners} assessed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">Quality: {classData.qualityPct}%</div>
                      <div className="text-sm font-medium text-red-600">Fail: {classData.failPct}%</div>
                    </div>
                    {expandedClass === classData.classId ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {expandedClass === classData.classId && (
                  <div className="border-t border-gray-200 p-5">
                    {/* Grade Distribution Chart */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-800 mb-3">Grade Distribution</h4>
                      <div className="h-64">
                        <Bar
                          data={{
                            labels: ECZ_GRADING_SYSTEM.map(g => `${g.code}: ${g.grade.split(' ')[0]}`),
                            datasets: [{
                              label: 'Number of Learners',
                              data: ECZ_GRADING_SYSTEM.map(g => classData.gradeDistribution[g.code] || 0),
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
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: { 
                                beginAtZero: true,
                                title: { display: true, text: 'Number of Learners' }
                              },
                              x: { 
                                title: { display: true, text: 'ECZ Grade' }
                              }
                            },
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const grade = ECZ_GRADING_SYSTEM[context.dataIndex];
                                    return `${grade.grade}: ${context.raw} learner(s)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Subject Performance */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Subject Performance</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left p-3 text-sm font-medium text-gray-700">Subject</th>
                              <th className="text-left p-3 text-sm font-medium text-gray-700">On Roll</th>
                              <th className="text-left p-3 text-sm font-medium text-gray-700">Assessed</th>
                              <th className="text-left p-3 text-sm font-medium text-gray-700">Quality %</th>
                              <th className="text-left p-3 text-sm font-medium text-gray-700">Fail %</th>
                              <th className="text-left p-3 text-sm font-medium text-gray-700">Top Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classData.subjects.map((subject, idx) => {
                              // Find the grade with highest count
                              const topGradeCode = Object.entries(subject.gradeDistribution)
                                .filter(([_, count]) => count > 0)
                                .sort(([, a], [, b]) => b - a)[0]?.[0];
                              
                              const topGrade = topGradeCode ? ECZ_GRADING_SYSTEM.find(g => g.code === topGradeCode) : null;
                              
                              return (
                                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="p-3 font-medium">{subject.name}</td>
                                  <td className="p-3">{subject.totalLearners}</td>
                                  <td className="p-3">{subject.totalAssessed}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      subject.qualityPct >= 70 ? 'bg-green-100 text-green-800' :
                                      subject.qualityPct >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {subject.qualityPct}%
                                    </span>
                                  </td>
                                  <td className="p-3">{subject.failPct}%</td>
                                  <td className="p-3">
                                    {topGrade ? (
                                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-medium">
                                        {topGrade.code} ({topGrade.grade})
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 text-xs">No data</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-xl p-5 border border-border">
            <h3 className="font-bold text-gray-900 mb-4">School Performance Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{filteredClasses.length}</div>
                <div className="text-sm text-gray-600">Classes Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredClasses.filter(c => c.qualityPct >= 60).length}
                </div>
                <div className="text-sm text-gray-600">High Quality Classes (≥60%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredClasses.filter(c => c.failPct >= 30).length}
                </div>
                <div className="text-sm text-gray-600">High Fail Classes (≥30%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredClasses.reduce((sum, c) => sum + c.subjectCount, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Subjects</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}