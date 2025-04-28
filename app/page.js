"use client";

import React from "react";
import WiredWrapper from "./components/WiredWrapper";
import { WiredButton, WiredCard } from "wired-elements-react";
import styles from "./page.module.css";

const HomePage = () => {
  return (
    <div className={styles.container}>
      <h1>Track Daily</h1>

      <WiredWrapper fallback={<div>Loading wired elements...</div>}>
        <WiredCard elevation={3} className={styles.card}>
          <h2>Welcome to Track Daily</h2>
          <p>Your daily tracking companion with a hand-drawn feel.</p>

          <div className={styles.buttonContainer}>
            <WiredButton>Get Started</WiredButton>
          </div>
        </WiredCard>
      </WiredWrapper>
    </div>
  );
};

export default HomePage;
