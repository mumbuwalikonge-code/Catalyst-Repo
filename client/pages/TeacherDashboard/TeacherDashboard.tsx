// client/pages/teacher/TeacherDashboard.tsx
import { BookOpen, Award, Users, Pencil, BarChart3, Download, Calendar, Clock, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import { useTeacherManagement } from "@/hooks/useTeacherManagement";
import { useClassManagement } from "@/hooks/useClasses";
import { useAuth } from "@/contexts/AuthContext";

// Type for class-subject assignment
interface TeacherClassSubject {
  classId: string;
  className: string;
  subject: string;
  totalLearners: number;
  submitted: number;
}

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const { 
    teachers, 
    assignments, 
    loading: teacherLoading,
    getTeacherClassSubjects,
    getAssignmentsByTeacherId 
  } = useTeacherManagement();
  
  const { 
    classes: allClasses, 
    loading: classLoading,
    getClassLearners 
  } = useClassManagement();
  
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<TeacherClassSubject[]>([]);
  const [totalLearners, setTotalLearners] = useState(0);
  const [totalSubmitted, setTotalSubmitted] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch teacher's assigned classes and subjects
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!currentUser || currentUser.role !== 'teacher' || teacherLoading || classLoading) {
        return;
      }

      setLoading(true);
      
      try {
        // Get teacher's class-subject combinations using the new helper
        const classSubjectCombos = getTeacherClassSubjects(currentUser.uid);
        
        // Process each class-subject assignment
        const assignmentPromises = classSubjectCombos.map(async (combo) => {
          // Get learners for this class
          const learners = await getClassLearners(combo.classId);
          
          // For now, use mock submission data
          // In a real app, you'd fetch actual submission data from Firestore
          const mockSubmitted = Math.floor(Math.random() * learners.length);
          
          return {
            classId: combo.classId,
            className: combo.className,
            subject: combo.subject,
            totalLearners: learners.length,
            submitted: mockSubmitted,
          };
        });

        const resolvedAssignments = await Promise.all(assignmentPromises);
        setTeacherClassSubjects(resolvedAssignments);
        
        // Calculate totals
        const totalL = resolvedAssignments.reduce((sum, assignment) => sum + assignment.totalLearners, 0);
        const totalS = resolvedAssignments.reduce((sum, assignment) => sum + assignment.submitted, 0);
        
        setTotalLearners(totalL);
        setTotalSubmitted(totalS);
        
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [currentUser, teacherLoading, classLoading, getTeacherClassSubjects, getClassLearners]);

  // Stats calculations
  const totalAssignments = teacherClassSubjects.length;
  const overallCompletion = totalLearners > 0 ? Math.round((totalSubmitted / totalLearners) * 100) : 0;
  
  // Group assignments by class
  const groupedByClass = useMemo(() => {
    const groups: Record<string, {
      classId: string;
      className: string;
      totalLearners: number;
      totalSubmitted: number;
      subjects: Array<{
        name: string;
        totalLearners: number;
        submitted: number;
      }>;
    }> = {};
    
    teacherClassSubjects.forEach(assignment => {
      if (!groups[assignment.classId]) {
        groups[assignment.classId] = {
          classId: assignment.classId,
          className: assignment.className,
          totalLearners: assignment.totalLearners,
          totalSubmitted: 0,
          subjects: [],
        };
      }
      
      groups[assignment.classId].subjects.push({
        name: assignment.subject,
        totalLearners: assignment.totalLearners,
        submitted: assignment.submitted,
      });
      
      groups[assignment.classId].totalSubmitted += assignment.submitted;
    });
    
    return groups;
  }, [teacherClassSubjects]);

  const stats = [
    {
      label: "Class Assignments",
      value: totalAssignments.toString(),
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description: "Class-subject combinations",
    },
    {
      label: "Total Learners",
      value: totalLearners.toString(),
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
      description: "Across all classes",
    },
    {
      label: "Marks Entered",
      value: `${totalSubmitted}/${totalLearners}`,
      icon: FileText,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      description: `${overallCompletion}% completed`,
    },
    {
      label: "Average Performance",
      value: totalAssignments > 0 ? "4.2/5" : "N/A",
      icon: Award,
      color: "text-orange-600",
      bg: "bg-orange-50",
      description: "Across subjects",
    },
  ];

  // Get teacher's subjects from auth context
  const teacherSubjects = currentUser?.subjects || [];

  const handleDownloadTemplate = () => {
    const csvContent = "Admission No,Full Name,Score (0-100)\n12345,John Doe,85\n67890,Jane Smith,92";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mark_entry_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || teacherLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not a teacher
  if (currentUser && currentUser.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Access Restricted</h2>
          <p className="text-slate-500">
            This dashboard is only available for teachers.
          </p>
          <Link 
            to="/" 
            className="inline-block mt-4 text-primary hover:text-primary/80 font-medium"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Welcome Message */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          Welcome, {currentUser?.name || "Teacher"}
        </h1>
        <p className="text-slate-600 mt-2">
          Manage your class assignments and enter marks for your subjects.
        </p>
        
        {/* Teacher Subjects */}
        {teacherSubjects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-slate-500">Subjects you teach:</span>
            {teacherSubjects.map((subject, idx) => (
              <span 
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {subject}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-heading font-bold text-slate-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Classes Section - Grouped by Class */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-heading font-bold text-slate-900">
            Your Class Assignments
          </h2>
          <span className="text-sm text-slate-500">
            {Object.keys(groupedByClass).length} class{Object.keys(groupedByClass).length !== 1 ? 'es' : ''}, {totalAssignments} subject{totalAssignments !== 1 ? 's' : ''}
          </span>
        </div>
        
        {Object.keys(groupedByClass).length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No class assignments yet</h3>
            <p className="text-slate-500">
              You haven't been assigned to any classes. Contact your administrator.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {Object.values(groupedByClass).map((classGroup) => {
              const classCompletion = classGroup.totalLearners > 0 
                ? Math.round((classGroup.totalSubmitted / classGroup.totalLearners) * 100) 
                : 0;
              
              return (
                <Card key={classGroup.classId} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-slate-900">
                        {classGroup.className}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {classGroup.subjects.map((subject, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                          >
                            {subject.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Users className="w-4 h-4 mr-1" />
                      {classGroup.totalLearners}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Overall progress for this class */}
                    <div>
                      <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>Overall Marks Entered</span>
                        <span>{classGroup.totalSubmitted}/{classGroup.totalLearners * classGroup.subjects.length}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${classCompletion === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${classCompletion}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Subject breakdown */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-700">Subject Progress</h4>
                      {classGroup.subjects.map((subject, idx) => {
                        const subjectCompletion = subject.totalLearners > 0 
                          ? Math.round((subject.submitted / subject.totalLearners) * 100)
                          : 0;
                        
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-700">{subject.name}</span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${subjectCompletion === 100 ? 'bg-green-500' : subjectCompletion >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                  style={{ width: `${subjectCompletion}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500">
                                {subject.submitted}/{subject.totalLearners}
                              </span>
                              <Link
                                to={`/teacher/results-entry?class=${classGroup.classId}&subject=${encodeURIComponent(subject.name)}`}
                                className="text-primary hover:text-primary/80 text-sm font-medium"
                              >
                                Enter
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex justify-between pt-3 border-t border-slate-100">
                      <Link
                        to={`/teacher/results-analysis?class=${classGroup.classId}`}
                        className="text-slate-600 hover:text-slate-900 text-sm flex items-center"
                      >
                        <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                        View Analysis
                      </Link>
                      {classGroup.subjects.length === 1 && (
                        <button
                          onClick={() => {
                            const subject = classGroup.subjects[0].name;
                            alert(`Downloading template for ${classGroup.className} - ${subject}`);
                          }}
                          className="text-slate-600 hover:text-slate-900 text-sm flex items-center"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Template
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          {totalAssignments > 0 ? (
            <>
              <Link
                to="/teacher/results-entry"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 font-medium"
              >
                <Pencil className="w-4 h-4" />
                Enter Results
              </Link>
              <Link
                to="/teacher/results-analysis"
                className="inline-flex items-center gap-2 border border-primary text-primary px-4 py-2.5 rounded-lg hover:bg-primary/5 font-medium"
              >
                <BarChart3 className="w-4 h-4" />
                View Performance
              </Link>
            </>
          ) : (
            <>
              <button
                disabled
                className="inline-flex items-center gap-2 bg-slate-100 text-slate-400 px-4 py-2.5 rounded-lg font-medium cursor-not-allowed"
              >
                <Pencil className="w-4 h-4" />
                Enter Results (No Assignments)
              </button>
              <button
                disabled
                className="inline-flex items-center gap-2 border border-slate-200 text-slate-400 px-4 py-2.5 rounded-lg font-medium cursor-not-allowed"
              >
                <BarChart3 className="w-4 h-4" />
                View Performance (No Assignments)
              </button>
            </>
          )}
          
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          
          <Link
            to="/teacher/schedule"
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
          >
            <Calendar className="w-4 h-4" />
            View Schedule
          </Link>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">
          Recent Activity
        </h2>
        <Card className="p-6">
          <div className="flex items-center justify-center py-8 text-slate-500">
            <div className="text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No recent activity to display</p>
              <p className="text-sm mt-1">Your recent mark entries will appear here</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}