// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Define user type with role
export type AppUser = User & {
  role?: 'admin' | 'teacher';
  schoolName?: string;
  name?: string;
  subjects?: string[]; // ADD THIS
};

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string, 
    password: string, 
    role: 'admin' | 'teacher', 
    schoolName: string,
    fullName: string,
    subjects?: string[] // ADD THIS
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from Firestore
  const fetchUserRole = async (user: User): Promise<AppUser> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          ...user,
          role: userData.role,
          schoolName: userData.schoolName,
          name: userData.name,
          subjects: userData.subjects || [] // ADD THIS
        };
      }
      // If no user document exists, it's a new user
      return { 
        ...user,
        name: user.displayName || '',
        subjects: [] // ADD DEFAULT
      };
    } catch (error) {
      console.error('Error fetching user role:', error);
      return { 
        ...user,
        name: user.displayName || '',
        subjects: [] // ADD DEFAULT
      };
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, fetch their role
        const appUser = await fetchUserRole(user);
        setCurrentUser(appUser);
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const appUser = await fetchUserRole(userCredential.user);
      setCurrentUser(appUser);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Signup function - UPDATED WITH SUBJECTS
  const signup = async (
    email: string, 
    password: string, 
    role: 'admin' | 'teacher', 
    schoolName: string,
    fullName: string,
    subjects: string[] = [] // ADD THIS PARAMETER WITH DEFAULT
  ) => {
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        name: fullName,
        role: role,
        schoolName: schoolName,
        subjects: subjects, // ADD THIS
        createdAt: new Date().toISOString()
      });

      // 3. If teacher, also create teacher document with subjects
      if (role === 'teacher') {
        await setDoc(doc(db, 'teachers', user.uid), {
          subjects: subjects,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 4. Sign out immediately (so they can log in fresh)
      await firebaseSignOut(auth);
      
      // Note: We DON'T set currentUser here because we want them to log in manually
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};