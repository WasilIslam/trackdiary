"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, auth } from "../firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import styles from "./login.module.css";
import SafeWiredCard from "../components/SafeWiredCard";
import SafeWiredButton from "../components/SafeWiredButton";
import SafeWiredDivider from "../components/SafeWiredDivider";
import WiredLoading from "../components/WiredLoading";

export default function Login() {
  const [authState, setAuthState] = useState({
    isLoading: true, // Initial loading while checking auth
    isSigningIn: false, // When actively signing in
    error: null, // Any auth errors
  });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Mark component as mounted
    setMounted(true);

    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/write"); // Redirect to write page if logged in
      } else {
        // User is not logged in, ready to show login UI
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    // Update state to show signing in
    setAuthState((prev) => ({
      ...prev,
      isSigningIn: true,
      error: null,
    }));

    try {
      const result = await signInWithGoogle();

      if (result.success) {
        // Success - router.push will happen in the onAuthStateChanged listener
      } else {
        throw new Error(result.error || "Failed to sign in with Google");
      }
    } catch (err) {
      console.error("Error during sign in:", err);
      setAuthState((prev) => ({
        ...prev,
        isSigningIn: false,
        error: "Failed to sign in. Please try again.",
      }));
    }
  };

  // Show loading while component is mounting or checking auth
  if (!mounted || authState.isLoading) {
    return <WiredLoading message="Checking authentication status..." />;
  }

  return (
    <div className={styles.container}>
      <SafeWiredCard elevation={3} className={styles.loginCard}>
        <h1 className={styles.title}>Track Daily</h1>
        <SafeWiredDivider />

        <div className={styles.content}>
          <p className={styles.description}>
            Sign in to track your daily activities and progress
          </p>
          {authState.error && (
            <div className={styles.errorContainer}>
              <p className={styles.error}>{authState.error}</p>
            </div>
          )}
          <SafeWiredButton
            className={styles.googleButton}
            onClick={handleGoogleSignIn}
          >
            {authState.isSigningIn ? "Signing in..." : "Sign in with Google"}
          </SafeWiredButton>
        </div>
      </SafeWiredCard>
    </div>
  );
}
