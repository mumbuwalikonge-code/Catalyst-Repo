// client/types/firestore.ts

// Base documents (as stored in Firestore)
export interface ClassData {
  name: string;
  learnerIds: string[];
}

export interface UserData {
  email: string;
  name: string;
  role: "admin" | "teacher";
  schoolName?: string;
  createdAt?: Date;
}

export interface AssignmentData {
  classId: string;
  subject: string;
  teacherId: string;
}

export interface AssessmentData {
  classId: string;
  subject: string;
  assessmentType: "week4" | "week8" | "end_of_term";
  teacherId: string;
  status: "draft" | "submitted";
  scores: Record<string, number | null>;
  submittedAt?: Date;
}

export interface LearnerData {
  name: string;
  sex: "M" | "F";
  classId: string;
  parentPhone?: string;
  parentEmail?: string;
}

// Extended types that INCLUDE the Firestore document ID
export interface ClassDoc extends ClassData {
  id: string;
}

export interface UserDoc extends UserData {
  id: string;
}

export interface AssignmentDoc extends AssignmentData {
  id: string;
}

export interface AssessmentDoc extends AssessmentData {
  id: string;
}

export interface LearnerDoc extends LearnerData {
  id: string;
}