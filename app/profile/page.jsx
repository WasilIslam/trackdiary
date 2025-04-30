"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, getUserData, updateUserProfile } from "../firebase/auth";
import Header from "../components/Header";
import Loading from "../components/Loading";
import styles from "./profile.module.css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    emailReminders: false,
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    const fetchUserData = async (currentUser) => {
      try {
        setLoading(true);
        const result = await getUserData(currentUser.uid);

        if (result.success) {
          setUserData(result.data);
          setFormData({
            displayName:
              result.data.displayName || currentUser.displayName || "",
            phone: result.data.phone || "",
            emailReminders: result.data.emailReminders || false,
          });
        } else {
          console.error("Failed to fetch user data:", result.error);
          setMessage({
            text: "Failed to load profile data. Please try again.",
            type: "error",
          });
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        setMessage({
          text: "An error occurred while loading your profile.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserData(currentUser);
      } else {
        router.push("/login");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      if (!user) throw new Error("No authenticated user found");

      const result = await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        phone: formData.phone,
        emailReminders: formData.emailReminders,
      });

      if (result.success) {
        setUserData((prev) => ({
          ...prev,
          displayName: formData.displayName,
          phone: formData.phone,
          emailReminders: formData.emailReminders,
        }));

        setMessage({
          text: "Profile updated successfully!",
          type: "success",
        });

        setTimeout(() => {
          setMessage({ text: "", type: "" });
        }, 3000);
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        text: "Failed to update profile. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return <Loading message="Initializing profile..." />;
  }

  if (loading) {
    return <Loading message="Loading your profile data..." />;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.profileCard}>
          <h1 className={styles.title}>YOUR PROFILE</h1>

          <div className={styles.profileInfo}>
            <div
              className={styles.profilePic}
              style={{
                backgroundImage: `url(${
                  user?.photoURL || "/default-avatar.png"
                })`,
              }}
            ></div>

            <div className={styles.emailDisplay}>
              <p className={styles.label}>EMAIL</p>
              <p className={styles.email}>{user?.email}</p>
            </div>
          </div>

          {message.text && (
            <div
              className={`${styles.messageContainer} ${styles[message.type]}`}
            >
              <p className={styles.messageText}>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="displayName" className={styles.label}>
                NAME
              </label>
              <input
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Your name"
                className={styles.input}
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                PHONE
              </label>
              <input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Your phone number"
                className={styles.input}
                disabled={saving}
              />
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="emailReminders"
                name="emailReminders"
                checked={formData.emailReminders}
                onChange={handleChange}
                className={styles.checkbox}
                disabled={saving}
              />
              <label htmlFor="emailReminders" className={styles.checkboxLabel}>
                RECEIVE EMAIL REMINDERS
              </label>
            </div>

            <div className={styles.buttonContainer}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving}
              >
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
