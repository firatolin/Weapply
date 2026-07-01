import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase/config';
import { toast } from 'sonner';
import { syncUser } from '../api/auth';

// Extended user type with role (for backend permissions only)
export interface AppUser extends FirebaseUser {
  role?: string;
  dbId?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to extend Firebase user with role from backend
  const extendUserWithRole = async (firebaseUser: FirebaseUser): Promise<AppUser> => {
    try {
      const token = await firebaseUser.getIdToken();
      const syncedUser = await syncUser(token);
      
      // Return extended user with role and dbId
      return {
        ...firebaseUser,
        role: syncedUser.role || 'VIEWER',
        dbId: syncedUser.id,
      } as AppUser;
    } catch (error) {
      console.error('❌ Failed to get user role:', error);
      // Return user with default role
      return {
        ...firebaseUser,
        role: 'VIEWER',
      } as AppUser;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const extendedUser = await extendUserWithRole(firebaseUser);
          setUser(extendedUser);
        } catch (error) {
          console.error('❌ Failed to extend user:', error);
          setUser({
            ...firebaseUser,
            role: 'VIEWER',
          } as AppUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      try {
        const extendedUser = await extendUserWithRole(auth.currentUser);
        setUser(extendedUser);
      } catch (error) {
        console.error('❌ Failed to refresh user:', error);
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        toast.warning('Please verify your email before logging in.');
        await signOut(auth);
        return;
      }

      // Sync user with backend and get role
      try {
        const token = await result.user.getIdToken();
        const syncedUser = await syncUser(token);
        const extendedUser = {
          ...result.user,
          role: syncedUser.role || 'VIEWER',
          dbId: syncedUser.id,
        } as AppUser;
        setUser(extendedUser);
        console.log('✅ User synced with backend');
      } catch (syncError) {
        console.error('❌ Failed to sync user:', syncError);
      }

      toast.success('Welcome back! 🎉');
    } catch (error: any) {
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      toast.error(message);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);

      // Sync user with backend
      try {
        const token = await result.user.getIdToken();
        const syncedUser = await syncUser(token);
        const extendedUser = {
          ...result.user,
          role: syncedUser.role || 'VIEWER',
          dbId: syncedUser.id,
        } as AppUser;
        setUser(extendedUser);
        console.log('✅ User synced with backend');
      } catch (syncError) {
        console.error('❌ Failed to sync user:', syncError);
      }

      toast.success('Account created! Please verify your email.');
    } catch (error: any) {
      let message = 'Signup failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      toast.error(message);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('🔄 Starting Google sign-in...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign-in successful:', result.user.email);

      // Sync user with backend
      try {
        const token = await result.user.getIdToken();
        const syncedUser = await syncUser(token);
        const extendedUser = {
          ...result.user,
          role: syncedUser.role || 'VIEWER',
          dbId: syncedUser.id,
        } as AppUser;
        setUser(extendedUser);
        console.log('✅ User synced with backend');
      } catch (syncError) {
        console.error('❌ Failed to sync user:', syncError);
        toast.error('Failed to sync account with server. Please try again.');
        throw syncError;
      }

      toast.success(`Welcome ${result.user.displayName || 'User'}! 🎉`);
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      let message = 'Google sign-in failed. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'An account already exists with this email using a different sign-in method.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized. Please check Firebase settings.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Google sign-in is not enabled. Please check Firebase settings.';
      }
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      let message = 'Failed to send reset email.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      }
      toast.error(message);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        toast.success('Verification email sent! Check your inbox.');
      } catch (error) {
        toast.error('Failed to send verification email.');
      }
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    sendVerificationEmail,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}