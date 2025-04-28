"use client";

import { useEffect, useState } from "react";
import { auth } from "../firebase/auth";
import styles from "./write.module.css";
import { WiredCard } from "wired-elements-react";

export default function Write() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark component as mounted
    setMounted(true);

    // Get current user
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  if (!mounted) {
    return null; // Layout handles loading state
  }

  return (
    <div className={styles.container}>
      <WiredCard elevation={2} className={styles.welcomeCard}>
        <h1 className={styles.title}>Welcome to Track Daily</h1>
        <p className={styles.welcomeText}>
          Hello, {user?.displayName || "User"}!
        </p>
        <p>You are now logged in and ready to track your daily activities.</p>
      </WiredCard>
    </div>
  );
}
