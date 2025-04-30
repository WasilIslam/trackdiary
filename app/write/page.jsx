"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, getCurrentUser } from "../firebase/auth";
import styles from "./write.module.css";

const ACTIVITY_TYPES = {
  BOOLEAN: "boolean", // yes/no
  SCALE: "scale", // 1-5 points
  OPTIONS: "options", // select from predefined options
  MULTI_SELECT: "multi_select", // multiple options can be selected
};

// Example activity templates (not added by default)
const ACTIVITY_TEMPLATES = [
  { code: "EXERCISE", title: "Exercise", type: ACTIVITY_TYPES.BOOLEAN },
  { code: "STUDY", title: "Study", type: ACTIVITY_TYPES.SCALE, max: 5 },
  {
    code: "NAMAZ",
    title: "Namaz",
    type: ACTIVITY_TYPES.MULTI_SELECT,
    options: ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"],
  },
  { code: "WATER", title: "Water Intake", type: ACTIVITY_TYPES.SCALE, max: 8 },
  {
    code: "MOOD",
    title: "Mood",
    type: ACTIVITY_TYPES.OPTIONS,
    options: ["Great", "Good", "Neutral", "Bad", "Terrible"],
  },
];

const WritePage = () => {
  const [activeTab, setActiveTab] = useState("entry");
  const [viewMode, setViewMode] = useState("single"); // "single" or "multiple"
  const [activities, setActivities] = useState([]);
  const [entry, setEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    note: "",
    activities: {},
  });
  const [newActivity, setNewActivity] = useState({
    title: "",
    type: ACTIVITY_TYPES.BOOLEAN,
    options: [],
    max: 5,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [monthEntries, setMonthEntries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7) // YYYY-MM format
  );

  // Load user's activities and today's entry on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = getCurrentUser();

        if (!user) {
          setError("Please sign in to use this feature");
          setLoading(false);
          return;
        }

        // Load user's activities with proper error handling
        try {
          const activitiesRef = collection(db, `users/${user.uid}/activities`);
          const activitiesSnapshot = await getDocs(activitiesRef);

          // Use user's existing activities (no default activities added)
          const userActivities = activitiesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Validate each activity has required fields
          const validActivities = userActivities.filter((activity) => {
            return activity.title && activity.type;
          });

          setActivities(validActivities);
        } catch (actErr) {
          console.error("Error loading activities:", actErr);
          setError("Failed to load your activities");
          setActivities([]);
        }

        // Load today's entry if it exists
        try {
          await loadEntry(new Date().toISOString().split("T")[0]);
        } catch (entryErr) {
          console.error("Error loading entry:", entryErr);
          setError((prev) =>
            prev
              ? `${prev}. Also failed to load today's entry.`
              : "Failed to load today's entry"
          );

          // Reset entry to empty state
          setEntry({
            date: new Date().toISOString().split("T")[0],
            note: "",
            activities: {},
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Error in loadUserData:", err);
        setError(
          "An unexpected error occurred. Please try refreshing the page."
        );
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Load month data when month changes or view mode changes to multiple
  useEffect(() => {
    if (viewMode === "multiple") {
      loadMonthData(selectedMonth);
    }
  }, [selectedMonth, viewMode]);

  const loadMonthData = async (monthStr) => {
    try {
      setLoading(true);
      const user = getCurrentUser();
      if (!user) {
        setError("Please sign in to view monthly data");
        setLoading(false);
        return;
      }

      // Calculate start and end dates for the selected month
      const [year, month] = monthStr.split("-");
      const startDate = `${year}-${month}-01`;

      // Calculate last day of month
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      // Query entries for the month
      const entriesRef = collection(db, `users/${user.uid}/entries`);
      const q = query(
        entriesRef,
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );

      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMonthEntries(entries);
      setLoading(false);
    } catch (err) {
      console.error("Error loading month data:", err);
      setError("Failed to load monthly data");
      setLoading(false);
    }
  };

  const loadEntry = async (date) => {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const entriesRef = collection(db, `users/${user.uid}/entries`);
    const q = query(entriesRef, where("date", "==", date));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const entryData = querySnapshot.docs[0].data();
      setEntry({
        id: querySnapshot.docs[0].id,
        date,
        note: entryData.note || "",
        activities: entryData.activities || {},
      });
    } else {
      // Reset entry for new date
      setEntry({
        date,
        note: "",
        activities: {},
      });
    }
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    const today = new Date().toISOString().split("T")[0];
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const minDate = fiveDaysAgo.toISOString().split("T")[0];

    if (selectedDate > today) {
      setError("Cannot select future dates");
      return;
    }

    if (selectedDate < minDate) {
      setError("Cannot edit entries older than 5 days");
      return;
    }

    setError(null);
    loadEntry(selectedDate);
  };

  const navigateDate = (direction) => {
    const currentDate = new Date(entry.date);
    currentDate.setDate(currentDate.getDate() + direction);

    // Don't allow future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compare dates properly by converting to timestamps
    if (currentDate.getDay() > today.getDay()) {
      setError("Cannot select future dates");
      return;
    }

    // Don't allow dates older than 5 days
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    fiveDaysAgo.setHours(0, 0, 0, 0);

    if (currentDate.getTime() < fiveDaysAgo.getTime()) {
      setError("Cannot edit entries older than 5 days");
      return;
    }

    setError(null);
    loadEntry(currentDate.toISOString().split("T")[0]);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleActivityChange = (activityId, value) => {
    setEntry((prev) => ({
      ...prev,
      activities: {
        ...prev.activities,
        [activityId]: value,
      },
    }));
  };

  const handleSaveEntry = async () => {
    const user = getCurrentUser();
    if (!user) {
      setError("Please sign in to save your entry");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate entry data
      if (entry.date > new Date().toISOString().split("T")[0]) {
        setError("Cannot save entries for future dates");
        setLoading(false);
        return;
      }

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const minDate = fiveDaysAgo.toISOString().split("T")[0];

      if (entry.date < minDate) {
        setError("Cannot save entries older than 5 days");
        setLoading(false);
        return;
      }

      // Prepare entry data
      const entryData = {
        date: entry.date,
        note: entry.note || "",
        activities: entry.activities || {},
        updatedAt: serverTimestamp(),
      };

      if (entry.id) {
        // Update existing entry
        await updateDoc(
          doc(db, `users/${user.uid}/entries`, entry.id),
          entryData
        );
      } else {
        // Create new entry
        entryData.createdAt = serverTimestamp();
        const docRef = await addDoc(
          collection(db, `users/${user.uid}/entries`),
          entryData
        );

        // Update local state with the new ID
        setEntry((prev) => ({
          ...prev,
          id: docRef.id,
        }));
      }

      setLoading(false);
      alert("Entry saved successfully!");
    } catch (err) {
      console.error("Error saving entry:", err);
      setError("Failed to save entry. Please try again.");
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.title || newActivity.title.trim() === "") {
      setError("Activity title is required");
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setError("Please sign in to add activities");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check for duplicate titles
      const duplicateActivity = activities.find(
        (a) => a.title.toLowerCase() === newActivity.title.toLowerCase()
      );

      if (duplicateActivity) {
        setError("An activity with this title already exists");
        setLoading(false);
        return;
      }

      // Generate a code for the activity (uppercase with no spaces)
      const code = newActivity.title
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10);

      // Check for duplicate codes
      const duplicateCode = activities.find((a) => a.code === code);
      const finalCode = duplicateCode
        ? `${code}${Math.floor(Math.random() * 100)}`
        : code;

      const activityData = {
        title: newActivity.title.trim(),
        type: newActivity.type,
        code: finalCode,
        createdAt: serverTimestamp(),
      };

      if (newActivity.type === ACTIVITY_TYPES.SCALE) {
        activityData.max = Math.max(2, Math.min(10, newActivity.max || 5));
      } else if (
        newActivity.type === ACTIVITY_TYPES.OPTIONS ||
        newActivity.type === ACTIVITY_TYPES.MULTI_SELECT
      ) {
        const options = newActivity.options
          .filter((opt) => opt.trim() !== "")
          .map((opt) => opt.trim());

        if (options.length === 0) {
          setError("Please add at least one option");
          setLoading(false);
          return;
        }

        activityData.options = options;
      }

      const docRef = await addDoc(
        collection(db, `users/${user.uid}/activities`),
        activityData
      );

      // Add to state with the ID from Firestore
      setActivities((prev) => [...prev, { id: docRef.id, ...activityData }]);

      // Reset form
      setNewActivity({
        title: "",
        type: ACTIVITY_TYPES.BOOLEAN,
        options: [],
        max: 5,
      });
      setSelectedTemplate("");

      setLoading(false);
    } catch (err) {
      console.error("Error adding activity:", err);
      setError("Failed to add activity. Please try again.");
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (
      !confirm(
        "Are you sure you want to delete this activity? All related data will be lost."
      )
    ) {
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setError("Please sign in to delete activities");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete the activity document
      await deleteDoc(doc(db, `users/${user.uid}/activities`, activityId));

      // Remove from state
      setActivities((prev) =>
        prev.filter((activity) => activity.id !== activityId)
      );

      // Remove from current entry if present
      if (entry.activities && entry.activities[activityId]) {
        const updatedActivities = { ...entry.activities };
        delete updatedActivities[activityId];

        setEntry((prev) => ({
          ...prev,
          activities: updatedActivities,
        }));

        // If this is an existing entry, update it in Firestore
        if (entry.id) {
          await updateDoc(doc(db, `users/${user.uid}/entries`, entry.id), {
            activities: updatedActivities,
            updatedAt: serverTimestamp(),
          });
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error deleting activity:", err);
      setError("Failed to delete activity. Please try again.");
      setLoading(false);
    }
  };

  const renderActivityInput = (activity) => {
    if (!activity) return null;

    switch (activity.type) {
      case ACTIVITY_TYPES.BOOLEAN:
        return (
          <div className={styles.activityInput}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={entry.activities[activity.id] === true}
                onChange={(e) =>
                  handleActivityChange(activity.id, e.target.checked)
                }
                className={styles.checkbox}
              />
              <span className={styles.checkmark}></span>
              {activity.title}
            </label>
          </div>
        );

      case ACTIVITY_TYPES.SCALE:
        const max = activity.max || 5;
        return (
          <div className={styles.activityInput}>
            <label className={styles.activityLabel}>{activity.title}</label>
            <div className={styles.scaleInputs}>
              {[...Array(max)].map((_, i) => (
                <label key={i} className={styles.scaleOption}>
                  <input
                    type="radio"
                    name={`scale-${activity.id}`}
                    checked={entry.activities[activity.id] === i + 1}
                    onChange={() => handleActivityChange(activity.id, i + 1)}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioButton}>{i + 1}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case ACTIVITY_TYPES.OPTIONS:
        const options = activity.options || [];
        return (
          <div className={styles.activityInput}>
            <label className={styles.activityLabel}>{activity.title}</label>
            <select
              value={entry.activities[activity.id] || ""}
              onChange={(e) =>
                handleActivityChange(activity.id, e.target.value)
              }
              className={styles.select}
            >
              <option value="">Select...</option>
              {options.map((option, i) => (
                <option key={i} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case ACTIVITY_TYPES.MULTI_SELECT:
        const multiOptions = activity.options || [];
        const selectedOptions = entry.activities[activity.id] || [];
        return (
          <div className={styles.activityInput}>
            <label className={styles.activityLabel}>{activity.title}</label>
            <div className={styles.multiSelectOptions}>
              {multiOptions.map((option, i) => (
                <label key={i} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={(e) => {
                      const newSelected = e.target.checked
                        ? [...selectedOptions, option]
                        : selectedOptions.filter((item) => item !== option);
                      handleActivityChange(activity.id, newSelected);
                    }}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkmark}></span>
                  {option}
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleTemplateSelect = (e) => {
    const code = e.target.value;
    if (!code) return;

    const template = ACTIVITY_TEMPLATES.find((t) => t.code === code);
    if (template) {
      setNewActivity({
        title: template.title,
        type: template.type,
        options: template.options || [],
        max: template.max || 5,
      });
    }
    setSelectedTemplate(code);
  };

  const clearAllActivities = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL activities? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = getCurrentUser();

      if (!user) {
        setError("Please sign in to perform this action");
        setLoading(false);
        return;
      }

      // Get all activities
      const activitiesRef = collection(db, `users/${user.uid}/activities`);
      const activitiesSnapshot = await getDocs(activitiesRef);

      if (activitiesSnapshot.empty) {
        setLoading(false);
        alert("No activities to clear");
        return;
      }

      // Use batch operation for better performance and atomicity
      const batch = writeBatch(db);
      activitiesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Clear activities from state
      setActivities([]);
      setEntry((prev) => ({
        ...prev,
        activities: {},
      }));

      setLoading(false);
      alert("All activities have been cleared");
    } catch (err) {
      console.error("Error clearing activities:", err);
      setError("Failed to clear activities. Please try again.");
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderMonthView = () => {
    // Get all days in the selected month
    const [year, month] = selectedMonth.split("-");
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Create a map of date -> entry for quick lookup
    const entriesMap = {};
    monthEntries.forEach((entry) => {
      entriesMap[entry.date] = entry;
    });

    return (
      <div className={styles.monthView}>
        <div className={styles.monthSelector}>
          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            max={new Date().toISOString().substring(0, 7)}
            className={styles.monthInput}
          />
        </div>

        <div className={styles.monthGridContainer}>
          <div className={styles.monthGrid}>
            <div className={styles.columnHeaders}>
              <div className={styles.dayColumnHeader}>Day</div>
              {activities.map((activity) => (
                <div key={activity.id} className={styles.activityColumnHeader}>
                  {activity.title}
                </div>
              ))}
              <div className={styles.notesColumnHeader}>Notes</div>
            </div>

            <div className={styles.gridRows}>
              {days.map((day) => {
                const dateStr = `${year}-${month}-${day
                  .toString()
                  .padStart(2, "0")}`;
                const isToday =
                  dateStr === new Date().toISOString().split("T")[0];
                const entry = entriesMap[dateStr];

                return (
                  <div key={day} className={styles.gridRow}>
                    <div
                      className={`${styles.dayCell} ${
                        isToday ? styles.today : ""
                      }`}
                      onClick={() => {
                        setViewMode("single");
                        loadEntry(dateStr);
                      }}
                    >
                      {day}
                    </div>

                    {activities.map((activity) => {
                      const value = entry?.activities?.[activity.id];

                      return (
                        <div key={activity.id} className={styles.activityCell}>
                          {renderActivityValue(activity, value)}
                        </div>
                      );
                    })}

                    <div
                      className={styles.notesCell}
                      onClick={() => {
                        if (entry?.note) {
                          setViewMode("single");
                          loadEntry(dateStr);
                        }
                      }}
                    >
                      {entry?.note ? (
                        <div className={styles.notePreview}>{entry.note}</div>
                      ) : (
                        <span className={styles.emptyNote}>-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityValue = (activity, value) => {
    if (value === undefined || value === null) return "-";

    switch (activity.type) {
      case ACTIVITY_TYPES.BOOLEAN:
        return value === true ? "✓" : "✗";

      case ACTIVITY_TYPES.SCALE:
        return value;

      case ACTIVITY_TYPES.OPTIONS:
        return value;

      case ACTIVITY_TYPES.MULTI_SELECT:
        return Array.isArray(value) ? value.length : 0;

      default:
        return "-";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "entry" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("entry")}
          >
            Entry
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "settings" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("settings")}
          >
            SETTINGS
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {activeTab === "entry" ? (
          <div className={styles.entryTab}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewToggleButton} ${
                  viewMode === "single" ? styles.activeViewToggle : ""
                }`}
                onClick={() => setViewMode("single")}
              >
                Day View
              </button>
              <button
                className={`${styles.viewToggleButton} ${
                  viewMode === "multiple" ? styles.activeViewToggle : ""
                }`}
                onClick={() => setViewMode("multiple")}
              >
                Month View
              </button>
            </div>

            {viewMode === "single" ? (
              <>
                <div className={styles.dateSelector}>
                  <button
                    className={styles.dateNavButton}
                    onClick={() => navigateDate(-1)}
                  >
                    ←
                  </button>
                  <div className={styles.dateControls}>
                    <div className={styles.currentDate}>
                      {formatDateDisplay(entry.date)}
                    </div>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={handleDateChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={styles.dateInput}
                    />
                  </div>
                  <button
                    className={styles.dateNavButton}
                    onClick={() => navigateDate(1)}
                    disabled={
                      entry.date === new Date().toISOString().split("T")[0]
                    }
                  >
                    →
                  </button>
                </div>

                <div className={styles.activitiesSection}>
                  <h2 className={styles.sectionTitle}>DAILY ACTIVITIES</h2>
                  {activities.length === 0 ? (
                    <div className={styles.emptyState}>
                      No activities yet. Go to Settings to add some!
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className={styles.activityItem}>
                        {renderActivityInput(activity)}
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.noteSection}>
                  <h2 className={styles.sectionTitle}>NOTES</h2>
                  <textarea
                    className={styles.textarea}
                    placeholder="What did you accomplish today?"
                    rows={5}
                    value={entry.note}
                    onChange={(e) =>
                      setEntry((prev) => ({ ...prev, note: e.target.value }))
                    }
                  />
                </div>

                <button
                  className={styles.button}
                  onClick={handleSaveEntry}
                  disabled={loading}
                >
                  {loading ? "SAVING..." : "SAVE ENTRY"}
                </button>
              </>
            ) : (
              renderMonthView()
            )}
          </div>
        ) : (
          <div className={styles.settingsTab}>
            <h2 className={styles.sectionTitle}>YOUR ACTIVITIES</h2>
            {activities.length === 0 ? (
              <div className={styles.emptyState}>
                No activities yet. Add your first activity below!
              </div>
            ) : (
              <div className={styles.activitiesList}>
                {activities.map((activity) => (
                  <div key={activity.id} className={styles.activityListItem}>
                    <div className={styles.activityHeader}>
                      <div className={styles.activityTitle}>
                        {activity.title}
                      </div>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteActivity(activity.id)}
                        disabled={loading}
                      >
                        DELETE
                      </button>
                    </div>
                    <div className={styles.activityCode}>
                      Code: {activity.code || "N/A"}
                    </div>
                    <div className={styles.activityType}>
                      {activity.type === ACTIVITY_TYPES.BOOLEAN && "Yes/No"}
                      {activity.type === ACTIVITY_TYPES.SCALE &&
                        `Scale (1-${activity.max || 5})`}
                      {activity.type === ACTIVITY_TYPES.OPTIONS &&
                        "Single Choice"}
                      {activity.type === ACTIVITY_TYPES.MULTI_SELECT &&
                        "Multiple Choice"}
                    </div>
                    {(activity.type === ACTIVITY_TYPES.OPTIONS ||
                      activity.type === ACTIVITY_TYPES.MULTI_SELECT) && (
                      <div className={styles.activityOptions}>
                        {(activity.options || []).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <h2 className={styles.sectionTitle}>ADD NEW ACTIVITY</h2>
            <div className={styles.addActivityForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>QUICK TEMPLATES:</label>
                <select
                  value={selectedTemplate}
                  onChange={handleTemplateSelect}
                  className={styles.select}
                >
                  <option value="">Select a template...</option>
                  {ACTIVITY_TEMPLATES.map((template) => (
                    <option key={template.code} value={template.code}>
                      {template.title} ({template.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>TITLE:</label>
                <input
                  type="text"
                  value={newActivity.title}
                  onChange={(e) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Activity name"
                  className={styles.textInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>TYPE:</label>
                <select
                  value={newActivity.type}
                  onChange={(e) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className={styles.select}
                >
                  <option value={ACTIVITY_TYPES.BOOLEAN}>Yes/No</option>
                  <option value={ACTIVITY_TYPES.SCALE}>Scale (1-5)</option>
                  <option value={ACTIVITY_TYPES.OPTIONS}>Single Choice</option>
                  <option value={ACTIVITY_TYPES.MULTI_SELECT}>
                    Multiple Choice
                  </option>
                </select>
              </div>

              {newActivity.type === ACTIVITY_TYPES.SCALE && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    MAXIMUM SCALE VALUE:
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={newActivity.max}
                    onChange={(e) =>
                      setNewActivity((prev) => ({
                        ...prev,
                        max: parseInt(e.target.value),
                      }))
                    }
                    className={styles.numberInput}
                  />
                </div>
              )}

              {(newActivity.type === ACTIVITY_TYPES.OPTIONS ||
                newActivity.type === ACTIVITY_TYPES.MULTI_SELECT) && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    OPTIONS (COMMA SEPARATED):
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={newActivity.options.join(", ")}
                    onChange={(e) =>
                      setNewActivity((prev) => ({
                        ...prev,
                        options: e.target.value
                          .split(",")
                          .map((opt) => opt.trim())
                          .filter((opt) => opt),
                      }))
                    }
                    className={styles.textInput}
                  />
                </div>
              )}

              <button
                className={styles.button}
                onClick={handleAddActivity}
                disabled={loading}
              >
                ADD ACTIVITY
              </button>
            </div>

            <button
              className={`${styles.button} ${styles.dangerButton}`}
              onClick={clearAllActivities}
              disabled={loading}
            >
              CLEAR ALL ACTIVITIES
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WritePage;
