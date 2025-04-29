"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, auth } from "../firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import styles from "./login.module.css";
import Loading from "../components/Loading";

export default function Login() {
  const [authState, setAuthState] = useState({
    isLoading: true,
    isSigningIn: false,
    error: null,
  });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/write");
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setAuthState((prev) => ({
      ...prev,
      isSigningIn: true,
      error: null,
    }));

    try {
      const result = await signInWithGoogle();

      if (!result.success) {
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

  if (!mounted || authState.isLoading) {
    return <Loading message="Checking authentication status..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>TRACK DAILY</h1>
        <div className={styles.divider}></div>

        <div className={styles.content}>
          <p className={styles.description}>
            Sign in to track your daily activities and progress
          </p>
          {authState.error && (
            <div className={styles.errorContainer}>
              <p className={styles.error}>{authState.error}</p>
            </div>
          )}
          <button
            className={styles.googleButton}
            onClick={handleGoogleSignIn}
            disabled={authState.isSigningIn}
          >
            {authState.isSigningIn ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}
          </button>
        </div>
      </div>
    </div>
  );
}
