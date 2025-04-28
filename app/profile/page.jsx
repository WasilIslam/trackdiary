"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, getUserData, updateUserProfile } from "../firebase/auth";
import SafeWiredCard from "../components/SafeWiredCard";
import SafeWiredInput from "../components/SafeWiredInput";
import SafeWiredButton from "../components/SafeWiredButton";
import Header from "../components/Header";
import WiredLoading from "../components/WiredLoading";
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
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      });

      if (result.success) {
        // Update local state
        setUserData((prev) => ({
          ...prev,
          displayName: formData.displayName,
          phone: formData.phone,
        }));

        setMessage({
          text: "Profile updated successfully!",
          type: "success",
        });

        // Clear success message after 3 seconds
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
    return <WiredLoading message="Initializing profile..." />;
  }

  if (loading) {
    return <WiredLoading message="Loading your profile data..." />;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <SafeWiredCard elevation={3} className={styles.profileCard}>
          <h1 className={styles.title}>Your Profile</h1>

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
              <p className={styles.label}>Email</p>
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
                Name
              </label>
              <SafeWiredInput
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
                Phone
              </label>
              <SafeWiredInput
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Your phone number"
                className={styles.input}
                disabled={saving}
              />
            </div>

            <div className={styles.buttonContainer}>
              <SafeWiredButton
                type="submit"
                className={styles.saveButton}
                onClick={handleSubmit}
              >
                {saving ? "Saving..." : "Save Changes"}
              </SafeWiredButton>
            </div>
          </form>
        </SafeWiredCard>
      </div>
    </>
  );
}
