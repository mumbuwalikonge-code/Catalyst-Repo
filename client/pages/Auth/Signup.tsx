// src/pages/Signup.tsx
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  School,
  UserCheck,
  Check,
} from "lucide-react"; // ADD Check icon
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

// Define available subjects
const AVAILABLE_SUBJECTS = [
  "Mathematics",
  "English",
  "Silozi",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "CRE",
  "Agriculture",
  "Business Studies",
  "Computer Studies",
];

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [userType, setUserType] = useState<"admin" | "teacher">("teacher");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    subjects: [] as string[], // ADD subjects array
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!formData.schoolName.trim()) {
      setError("School name is required");
      return;
    }

    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return;
    }

    // Additional validation for teachers
    if (userType === "teacher" && formData.subjects.length === 0) {
      setError("Please select at least one subject you teach");
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the centralized signup function from AuthContext
      await signup(
        formData.email,
        formData.password,
        userType,
        formData.schoolName,
        formData.fullName,
        userType === "teacher" ? formData.subjects : [] // Pass subjects
      );
      
      // Show success modal
      setShowSuccess(true);
      
    } catch (err: any) {
      console.error("Signup error:", err);
      
      // Handle Firebase errors
      let message = "Failed to create account. Please try again.";
      
      if (err.code === "auth/email-already-in-use") {
        message = "This email is already registered.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak (min 6 characters).";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    const newSubjects = formData.subjects.includes(subject)
      ? formData.subjects.filter((s) => s !== subject)
      : [...formData.subjects, subject];
    
    setFormData({ ...formData, subjects: newSubjects });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-4">
      {/* Back to home */}
      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary mb-4">
            <span className="text-white font-heading font-bold">KB</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">
            Create Account
          </h1>
          <p className="text-slate-600 mt-2">
            Join KalaboBoarding and transform school management
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            {/* User Type Selection */}
            <div>
              <Label className="text-slate-700 font-medium mb-3 block">
                Register As
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUserType("teacher");
                    // Don't clear subjects when switching to teacher
                  }}
                  className={`p-3 rounded-lg border-2 font-medium transition-all text-sm ${
                    userType === "teacher"
                      ? "border-secondary bg-secondary/5 text-secondary"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center gap-1">
                    <UserCheck className="w-4 h-4" />
                    Teacher
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserType("admin");
                    // Clear subjects when switching to admin
                    setFormData({ ...formData, subjects: [] });
                  }}
                  className={`p-3 rounded-lg border-2 font-medium transition-all text-sm ${
                    userType === "admin"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center gap-1">
                    <School className="w-4 h-4" />
                    Admin
                  </div>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" className="text-slate-700 font-medium">
                Full Name
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50 border-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* School Name */}
            <div>
              <Label htmlFor="schoolName" className="text-slate-700 font-medium">
                School Name
              </Label>
              <div className="relative mt-2">
                <School className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  placeholder="Your School Name"
                  value={formData.schoolName}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50 border-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Subjects Selection - Only for Teachers */}
            {userType === "teacher" && (
              <div>
                <Label className="text-slate-700 font-medium mb-3 block">
                  Subjects You Teach
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50 max-h-48 overflow-y-auto">
                  {AVAILABLE_SUBJECTS.map((subject) => (
                    <label
                      key={subject}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        formData.subjects.includes(subject)
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-slate-100"
                      }`}
                      onClick={() => toggleSubject(subject)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        formData.subjects.includes(subject)
                          ? "bg-primary border-primary"
                          : "border-slate-300"
                      }`}>
                        {formData.subjects.includes(subject) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm">{subject}</span>
                    </label>
                  ))}
                </div>
                {formData.subjects.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Please select at least one subject you teach
                  </p>
                )}
                {formData.subjects.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Selected: {formData.subjects.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email Address
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50 border-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Password
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50 border-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label
                htmlFor="confirmPassword"
                className="text-slate-700 font-medium"
              >
                Confirm Password
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50 border-slate-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-slate-300 mt-1" 
                required 
                disabled={isLoading}
              />
              <span className="text-sm text-slate-600">
                I agree to the Terms of Service and Privacy Policy
              </span>
            </label>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium py-2 h-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              Signup Successful!
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Your account has been created successfully. You will now be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              onClick={() => {
                setShowSuccess(false);
                navigate("/login");
              }}
              className="w-full bg-gradient-to-r from-primary to-secondary"
            >
              Go to Login
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}