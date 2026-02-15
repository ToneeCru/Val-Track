import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import LoginPage from './Patron/Library Visitor/LoginPage';
import SignUp from './Patron/Library Visitor/SignUp';

export default function Index() {
  const router = useRouter();
  const [showSignUp, setShowSignUp] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // TEMPORARY: Force logout to test registration - REMOVE THIS AFTER TESTING
      await supabase.auth.signOut();

      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user) {
        if (session.user.email_confirmed_at) {
          // Already verified, go to Dashboard
          router.replace('/Patron/Home/Dashboard' as any);
        }
      }
      setIsReady(true);
    };

    checkSession();

    // Note: Removed onAuthStateChange listener to prevent auto-redirect during registration
    // Users must complete the full registration flow including password creation
  }, []);


  if (!isReady) return null;

  if (showSignUp) {
    return <SignUp onCancel={() => setShowSignUp(false)} />;
  }

  return (
    <LoginPage
      onSignUpPress={() => {
        setShowSignUp(true);
      }}
    />
  );
}
