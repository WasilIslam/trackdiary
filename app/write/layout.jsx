"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import Header from "../components/Header";
import WiredLoading from "../components/WiredLoading";

export default function WriteLayout({ children }) {
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
        setLoading(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading || !mounted) {
    return <WiredLoading message="Loading your workspace..." />;
  }

  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
