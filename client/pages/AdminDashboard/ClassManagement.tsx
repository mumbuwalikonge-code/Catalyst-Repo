// client/pages/AdminDashboard/ClassManagement.tsx
import React, { useState, useEffect } from "react";
import {
  BookOpen,
  UserPlus,
  Upload,
  Download,
  Search,
  X,
  Users,
  GraduationCap,
  FileText,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  useClassManagement,
  LearnerDoc,
  Teacher,
} from "@/hooks/useClasses";
import { Loader2 } from "lucide-react";

// --- Modal Component ---
interface ModalProps {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  size?: "md" | "lg";
}

const Modal: React.FC<ModalProps> = ({ children, title, onClose, size = "md" }) => {
  const sizeClasses = size === "lg" ? "max-w-4xl" : "max-w-md";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ✅ Robust CSV parser (handles basic quoted values)
const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter(line => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map(h => h.trim().replace(/^"(.*)"$/, "$1"));

  return lines.slice(1).map(line => {
    const values = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map(v => v.trim().replace(/^"(.*)"$/, "$1"));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
};

export default function ClassManagement() {
  const {
    classes,
    loading,
    error,
    addClass,
    addLearner,
    deleteClass,
    getClassLearners,
    getAssignedSubjects,
    getAssignedTeachers,
  } = useClassManagement();

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddLearnerModalOpen, setIsAddLearnerModalOpen] = useState(false);
  const [isViewClassModalOpen, setIsViewClassModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [newClassName, setNewClassName] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");

  // Bulk import states
  const [isBulkImportClassesModalOpen, setIsBulkImportClassesModalOpen] = useState(false);
  const [isBulkImportLearnersModalOpen, setIsBulkImportLearnersModalOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportPreview, setBulkImportPreview] = useState<Record<string, string>[]>([]);
  const [bulkImportStatus, setBulkImportStatus] = useState<"idle" | "preview" | "processing">("idle");

  // View class data
  const [viewClassData, setViewClassData] = useState<{
    subjects: string[];
    learners: LearnerDoc[];
    teachers: Teacher[];
  } | null>(null);

  // --- Add Class ---
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;

    try {
      await addClass(name);
      setNewClassName("");
      setIsAddClassModalOpen(false); // ✅ Closes immediately on success
    } catch (err: any) {
      console.error("Add class error:", err);
      alert("Failed to create class: " + (err.message || "Unknown error"));
    }
  };

  // --- Delete Class ---
  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete "${className}"? This cannot be undone.`)) return;

    try {
      await deleteClass(classId);
      // UI auto-updates via onSnapshot
    } catch (err: any) {
      console.error("Delete class error:", err);
      alert("Failed to delete class: " + (err.message || "Please try again"));
    }
  };

  // --- Add Learner (Manual) ---
  const handleAddLearner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClassId) return;

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();
    const sex = formData.get("sex") === "Female" ? "F" : "M";
    const parentPhone = (formData.get("parentPhone") as string)?.trim() || "";
    const parentEmail = (formData.get("parentEmail") as string)?.trim() || "";

    if (!name) {
      alert("Learner name is required");
      return;
    }

    try {
      await addLearner(name, sex, selectedClassId, parentPhone, parentEmail);
      (e.target as HTMLFormElement).reset();

      // Refresh learners in view modal if open
      if (isViewClassModalOpen && selectedClassId) {
        const learners = await getClassLearners(selectedClassId);
        setViewClassData(prev => prev ? { ...prev, learners } : null);
      }

      setIsAddLearnerModalOpen(false); // ✅ Close modal
    } catch (err: any) {
      console.error("Add learner error:", err);
      alert("Failed to add learner: " + (err.message || "Please try again"));
    }
  };

  // --- View Class Details ---
  const openViewModal = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const [learners, subjects, teachers] = await Promise.all([
        getClassLearners(classId),
        getAssignedSubjects(classId),
        getAssignedTeachers(classId),
      ]);
      setViewClassData({ subjects, learners, teachers });
      setIsViewClassModalOpen(true);
    } catch (err: any) {
      console.error("View class error:", err);
      alert("Failed to load class details: " + (err.message || "Try again"));
    }
  };

  // --- Bulk Import: Classes ---
  const handleBulkImportClasses = async () => {
    if (!bulkImportFile) return;

    try {
      const text = await bulkImportFile.text();
      if (!text.trim()) {
        alert("CSV file is empty.");
        return;
      }
      const data = parseCSV(text);
      const validRows = data.filter(row => row["Class Name"]?.trim());
      if (validRows.length === 0) {
        alert("No valid class names found. Ensure your CSV has a 'Class Name' column.");
        return;
      }
      setBulkImportPreview(validRows);
      setBulkImportStatus("preview");
    } catch (err) {
      console.error("CSV parse error:", err);
      alert("Invalid CSV format. Please check your file.");
    }
  };

  const confirmBulkImportClasses = async () => {
    setBulkImportStatus("processing");
    try {
      const classNames = bulkImportPreview.map(r => r["Class Name"].trim());
      const uniqueNames = [...new Set(classNames)];
      for (const name of uniqueNames) {
        if (!classes.some(c => c.name === name)) {
          await addClass(name);
        }
      }
      // ✅ Close modal immediately on success
      setIsBulkImportClassesModalOpen(false);
    } catch (err: any) {
      console.error("Bulk import classes error:", err);
      alert("Failed to import classes: " + (err.message || "Check your CSV"));
      setBulkImportStatus("preview");
    }
  };

  // --- Bulk Import: Learners ---
  const handleBulkImportLearners = async () => {
    if (!bulkImportFile) return;

    try {
      const text = await bulkImportFile.text();
      if (!text.trim()) {
        alert("CSV file is empty.");
        return;
      }
      const data = parseCSV(text);
      const validRows = data.filter(row => row.name?.trim());
      if (validRows.length === 0) {
        alert("No valid learner data found. Ensure columns: name, sex (Male/Female).");
        return;
      }
      setBulkImportPreview(validRows);
      setBulkImportStatus("preview");
    } catch (err) {
      console.error("CSV parse error:", err);
      alert("Invalid CSV format.");
    }
  };

  const confirmBulkImportLearners = async () => {
    if (!selectedClassId) return;

    setBulkImportStatus("processing");
    try {
      for (const row of bulkImportPreview) {
        await addLearner(
          row.name.trim(),
          row.sex === "Female" ? "F" : "M",
          selectedClassId,
          row.parentPhone?.trim() || "",
          row.parentEmail?.trim() || ""
        );
      }

      // Refresh view if open
      if (isViewClassModalOpen) {
        const learners = await getClassLearners(selectedClassId);
        setViewClassData(prev => prev ? { ...prev, learners } : null);
      }

      // ✅ Close modal immediately
      setIsBulkImportLearnersModalOpen(false);
    } catch (err: any) {
      console.error("Bulk import learners error:", err);
      alert("Failed to import learners: " + (err.message || "Check your CSV"));
      setBulkImportStatus("preview");
    }
  };

  // --- Filter logic ---
  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(classSearch.toLowerCase())
  );

  const selectedClass = classes.find(cls => cls.id === selectedClassId);
  const filteredLearners = viewClassData?.learners.filter(l =>
    l.name.toLowerCase().includes(learnerSearch.toLowerCase())
  ) || [];

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-3 mb-8">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold text-gray-900">Manage Classes & Learners</h2>
        <p className="text-muted-foreground mt-1">
          Create classes, then add learners. Subjects and teachers are assigned separately.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setIsAddClassModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 font-medium"
        >
          <BookOpen className="w-4 h-4" />
          Add Class
        </button>
        <button
          onClick={() => setIsBulkImportClassesModalOpen(true)}
          className="inline-flex items-center gap-2 border border-primary text-primary px-4 py-2.5 rounded-lg hover:bg-primary/5 font-medium"
        >
          <Upload className="w-4 h-4" />
          Bulk Import Classes (CSV)
        </button>
        <button
          onClick={() => {
            const csvContent = "Class Name\nForm 4A\nForm 4B\nGrade 10C";
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "class_template.csv";
            link.click();
            URL.revokeObjectURL(link.href);
          }}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search classes..."
          value={classSearch}
          onChange={(e) => setClassSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>

      {filteredClasses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No classes found. Create your first class!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="border border-border rounded-xl p-5 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{cls.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setIsAddLearnerModalOpen(true);
                    }}
                    className="text-primary hover:text-primary/80"
                    title="Add Learner"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openViewModal(cls.id)}
                    className="text-gray-500 hover:text-gray-700"
                    title="View Class Details"
                  >
                    <EyeIcon />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete Class"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === MODALS === */}
      {/* Add Class */}
      {isAddClassModalOpen && (
        <Modal onClose={() => setIsAddClassModalOpen(false)} title="Add New Class" size="lg">
          <form onSubmit={handleAddClass} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
              <input
                type="text"
                placeholder="e.g., Form 4A"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90"
              >
                Create Class
              </button>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="flex-1 border border-border py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Learner (Manual) */}
      {isAddLearnerModalOpen && selectedClass && (
        <Modal
          onClose={() => setIsAddLearnerModalOpen(false)}
          title={`Add Learner to ${selectedClass.name}`}
        >
          <form onSubmit={handleAddLearner} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g., John Doe"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <select
                name="sex"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                defaultValue="Male"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
              <input
                name="parentPhone"
                type="tel"
                placeholder="+254712345678"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Email (Optional)
              </label>
              <input
                name="parentEmail"
                type="email"
                placeholder="parent@example.com"
                className="w-full p-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90"
              >
                Add Learner
              </button>
              <button
                type="button"
                onClick={() => setIsAddLearnerModalOpen(false)}
                className="flex-1 border border-border py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Class */}
      {isViewClassModalOpen && selectedClass && (
        <Modal onClose={() => setIsViewClassModalOpen(false)} title={selectedClass.name} size="lg">
          {viewClassData ? (
            <div className="space-y-6">
              {/* Subjects */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">
                    Subjects ({viewClassData.subjects.length})
                  </h4>
                </div>
                {viewClassData.subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subjects assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {viewClassData.subjects.map((subj, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {subj}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Teachers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">
                    Teachers ({viewClassData.teachers.length})
                  </h4>
                </div>
                {viewClassData.teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teachers assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {viewClassData.teachers.map((t) => (
                      <div key={t.id} className="flex justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-sm text-muted-foreground">{t.subject}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Learners */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-800">
                      Learners ({viewClassData.learners.length})
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search learners..."
                        value={learnerSearch}
                        onChange={(e) => setLearnerSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setIsBulkImportLearnersModalOpen(true);
                        setBulkImportStatus("idle");
                        setBulkImportFile(null);
                        setBulkImportPreview([]);
                      }}
                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                    >
                      Bulk Add
                    </button>
                  </div>
                </div>
                {filteredLearners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {learnerSearch ? "No learners match your search." : "No learners in this class."}
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredLearners.map((l) => (
                      <div key={l.id} className="flex justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-sm">{l.sex === "M" ? "Male" : "Female"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-red-500">Failed to load class details.</p>
          )}
        </Modal>
      )}

      {/* Bulk Import Classes Modal */}
      {isBulkImportClassesModalOpen && (
        <Modal
          title="Bulk Import Classes"
          onClose={() => {
            setIsBulkImportClassesModalOpen(false);
            setBulkImportFile(null);
            setBulkImportPreview([]);
            setBulkImportStatus("idle");
          }}
          size="lg"
        >
          {bulkImportStatus === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with a header row containing <code className="bg-gray-100 px-1 rounded">Class Name</code>.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setBulkImportFile(file);
                }}
                className="w-full"
              />
              {bulkImportFile && (
                <button
                  onClick={handleBulkImportClasses}
                  className="bg-primary text-white px-4 py-2 rounded-lg mt-2"
                >
                  Preview Import
                </button>
              )}
            </div>
          )}

          {bulkImportStatus === "preview" && (
            <div className="space-y-4">
              <p>Preview of <strong>{bulkImportPreview.length}</strong> classes to import:</p>
              <div className="max-h-60 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr><th className="p-2 text-left">Class Name</th></tr>
                  </thead>
                  <tbody>
                    {bulkImportPreview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row["Class Name"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={confirmBulkImportClasses}
                  className="flex-1 bg-primary text-white py-2 rounded-lg"
                >
                  Import {bulkImportPreview.length} Classes
                </button>
                <button
                  onClick={() => setBulkImportStatus("idle")}
                  className="flex-1 border border-border py-2 rounded-lg"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {bulkImportStatus === "processing" && (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="mt-2">Importing classes...</p>
            </div>
          )}
        </Modal>
      )}

      {/* Bulk Import Learners Modal */}
      {isBulkImportLearnersModalOpen && selectedClassId && (
        <Modal
          title={`Bulk Import Learners to ${classes.find(c => c.id === selectedClassId)?.name}`}
          onClose={() => {
            setIsBulkImportLearnersModalOpen(false);
            setBulkImportFile(null);
            setBulkImportPreview([]);
            setBulkImportStatus("idle");
          }}
          size="lg"
        >
          {bulkImportStatus === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                CSV must include headers: <code>name</code>, <code>sex</code> (Male/Female). Optional: <code>parentPhone</code>, <code>parentEmail</code>.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setBulkImportFile(file);
                }}
                className="w-full"
              />
              {bulkImportFile && (
                <button
                  onClick={handleBulkImportLearners}
                  className="bg-primary text-white px-4 py-2 rounded-lg mt-2"
                >
                  Preview Import
                </button>
              )}
            </div>
          )}

          {bulkImportStatus === "preview" && (
            <div className="space-y-4">
              <p>Preview of <strong>{bulkImportPreview.length}</strong> learners:</p>
              <div className="max-h-60 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Sex</th>
                      <th className="p-2 text-left">Phone</th>
                      <th className="p-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkImportPreview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.sex || "—"}</td>
                        <td className="p-2">{row.parentPhone || "—"}</td>
                        <td className="p-2">{row.parentEmail || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={confirmBulkImportLearners}
                  className="flex-1 bg-primary text-white py-2 rounded-lg"
                >
                  Import {bulkImportPreview.length} Learners
                </button>
                <button
                  onClick={() => setBulkImportStatus("idle")}
                  className="flex-1 border border-border py-2 rounded-lg"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {bulkImportStatus === "processing" && (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="mt-2">Importing learners...</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}