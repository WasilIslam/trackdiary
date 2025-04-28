"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import styles from "./dashboard.module.css";
import { WiredCard } from "wired-elements-react";
import Header from "../components/Header";
import WiredLoading from "../components/WiredLoading";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Mark component as mounted
    setMounted(true);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading || !mounted) {
    return <WiredLoading message="Preparing your dashboard..." />;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <WiredCard elevation={2} className={styles.welcomeCard}>
          <h1 className={styles.title}>Welcome to Track Daily</h1>
          <p className={styles.welcomeText}>
            Hello, {user?.displayName || "User"}!
          </p>
          <p>You are now logged in and ready to track your daily activities.</p>
        </WiredCard>
      </div>
    </>
  );
}
