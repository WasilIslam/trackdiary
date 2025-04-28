"use client";

import { useState, useEffect } from "react";
import { WiredCard } from "wired-elements-react";
import styles from "./WiredLoading.module.css";

export default function WiredLoading({ message = "Loading..." }) {
  const [mounted, setMounted] = useState(false);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    setMounted(true);

    // Animate the dots
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return <div className={styles.fallbackLoading}>{message}</div>;
  }

  const loadingText = `${message}${".".repeat(dots)}`;

  return (
    <div className={styles.loadingContainer}>
      <WiredCard elevation={3} className={styles.loadingCard}>
        <div className={styles.loadingContent}>
          <h2 className={styles.loadingTitle}>Track Daily</h2>
          <div className={styles.spinner}></div>
          <p className={styles.loadingMessage}>{loadingText}</p>
        </div>
      </WiredCard>
    </div>
  );
}
