// src/types/schemeOfWork.ts

export interface SchemeOfWork {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subject: string;
  gradeLevel: string;
  term: number;
  academicYear: string;
  title: string;
  description?: string;
  topics: Topic[];
  objectives: string[];
  resources: Resource[];
  assessmentCriteria: AssessmentCriterion[];
  totalWeeks: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  version: number;
  isTemplate: boolean;
  templateName?: string;
}

export interface Topic {
  id: string;
  week: number;
  title: string;
  subtopics: string[];
  duration: number; // in hours
  learningObjectives: string[];
  teachingMethods: string[];
  activities: Activity[];
  assessmentMethods: string[];
  resources: Resource[];
  notes?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  completedDate?: Date;
}

export interface Activity {
  id: string;
  title: string;
  type: 'individual' | 'group' | 'pair' | 'class';
  description: string;
  duration: number; // in minutes
  materials: string[];
  objectives: string[];
}

export interface Resource {
  id: string;
  type: 'textbook' | 'worksheet' | 'digital' | 'material' | 'other';
  title: string;
  description?: string;
  url?: string;
  quantity?: number;
  available: boolean;
}

export interface AssessmentCriterion {
  id: string;
  type: 'formative' | 'summative' | 'diagnostic';
  description: string;
  weight: number; // percentage
  assessmentMethod: string;
  dueWeek: number;
}

export interface SchemeStats {
  totalSchemes: number;
  publishedSchemes: number;
  draftSchemes: number;
  averageCompletionRate: number;
  totalTopics: number;
  completedTopics: number;
  upcomingTopics: number;
}

export interface CreateSchemeDTO {
  classId: string;
  className: string;
  subject: string;
  gradeLevel: string;
  term: number;
  academicYear: string;
  title: string;
  description?: string;
  totalWeeks: number;
  isTemplate?: boolean;
  templateName?: string;
}