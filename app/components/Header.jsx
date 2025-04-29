"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, signOut } from "../firebase/auth";
import styles from "./Header.module.css";
import Link from "next/link";

export default function Header() {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    // Handle clicks outside dropdown to close it
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        router.push("/login");
      } else {
        console.error("Error signing out:", result.error);
      }
    } catch (error) {
      console.error("Error in handleLogout:", error);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/write">TRACK DAILY</Link>
      </div>

      {user && (
        <div className={styles.profileContainer} ref={dropdownRef}>
          <div
            className={styles.profilePic}
            onClick={toggleDropdown}
            style={{
              backgroundImage: `url(${user.photoURL || "/default-avatar.png"})`,
            }}
          ></div>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <ul className={styles.dropdownMenu}>
                <li className={styles.dropdownItem}>
                  <Link href="/profile">PROFILE</Link>
                </li>
                <li className={styles.dropdownItem}>
                  <button
                    onClick={handleLogout}
                    className={styles.logoutButton}
                  >
                    LOGOUT
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
