"use client";

import { useState, useEffect } from "react";
import SafeWiredCard from "./SafeWiredCard";
import styles from "./WiredLoading.module.css";

export default function WiredLoading({ message = "Loading..." }) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    // Animate the dots
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const loadingText = `${message}${".".repeat(dots)}`;

  const fallbackContent = (
    <div className={styles.fallbackLoading}>
      <div className={styles.fallbackCard}>
        <h2 className={styles.loadingTitle}>Track Daily</h2>
        <div className={styles.spinner}></div>
        <p className={styles.loadingMessage}>{loadingText}</p>
      </div>
    </div>
  );

  return (
    <div className={styles.loadingContainer}>
      <SafeWiredCard elevation={3} className={styles.loadingCard}>
        <div className={styles.loadingContent}>
          <h2 className={styles.loadingTitle}>Track Daily</h2>
          <div className={styles.spinner}></div>
          <p className={styles.loadingMessage}>{loadingText}</p>
        </div>
      </SafeWiredCard>
    </div>
  );
}
