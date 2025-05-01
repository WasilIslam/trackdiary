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
import {
  ACTIVITY_TYPES,
  ACTIVITY_TEMPLATES,
  formatDateDisplay,
  renderActivityValue,
  validateDateRange,
  getEmptyEntry,
  getCurrentMonth,
  getDaysInMonth,
  isToday,
  createEntriesMap,
} from "./helper.write";

// Import chart components
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Import graph utilities
import {
  prepareActivityData,
  prepareNotesCompletionData,
  getChartOptions,
} from "./graphs.write";

// Import image utilities
import { uploadImage, deleteImage } from "../firebase/storage";
import Image from "next/image";

// Import FileModal component
import FileModal from "../components/FileModal";

// Import FileManager component
import FileManager from "../components/FileManager";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const WritePage = () => {
  const [activeTab, setActiveTab] = useState("entry");
  const [viewMode, setViewMode] = useState("single"); // "single" or "multiple"
  const [monthViewTab, setMonthViewTab] = useState("calendar"); // "calendar" or "graphs"
  const [activities, setActivities] = useState([]);
  const [entry, setEntry] = useState(getEmptyEntry());
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
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [chartType, setChartType] = useState("line"); // "line", "bar", or "pie"

  // Simplified file state management
  const [fileState, setFileState] = useState({
    files: [],
    previews: [],
    isUploading: false,
    selectedFiles: [],
  });

  // Add these new state variables
  const [showFileModal, setShowFileModal] = useState(false);
  const [allEntries, setAllEntries] = useState([]);

  // Load user's activities and today's entry on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const user = getCurrentUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Load user's activities
        const activitiesRef = collection(db, `users/${user.uid}/activities`);
        const activitiesSnapshot = await getDocs(activitiesRef);
        const activitiesData = activitiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setActivities(activitiesData);

        // Load today's entry
        const today = new Date().toISOString().split("T")[0];
        await loadEntry(today);

        setLoading(false);
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Failed to load your data. Please try again.");
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
    try {
      setLoading(true);
      setError(null);
      // Reset file state
      setFileState({
        files: [],
        previews: [],
        isUploading: false,
        selectedFiles: [],
      });

      const user = getCurrentUser();

      if (!user) {
        setEntry({
          date,
          note: "",
          activities: {},
          files: [],
          filePaths: [],
          fileMetadata: [],
        });
        setLoading(false);
        return;
      }

      // Query for entry with the given date
      const entriesRef = collection(db, `users/${user.uid}/entries`);
      const q = query(entriesRef, where("date", "==", date));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Entry exists
        const entryDoc = querySnapshot.docs[0];
        const entryData = entryDoc.data();

        setEntry({
          id: entryDoc.id,
          ...entryData,
          date, // Ensure date is in the correct format
        });

        // Create previews for existing files with unique identifiers
        if (entryData.files && entryData.files.length > 0) {
          const previews = entryData.files.map((url, index) => {
            const metadata =
              entryData.fileMetadata && entryData.fileMetadata[index];
            const isImage = metadata
              ? metadata.type.startsWith("image/")
              : url.includes(".jpg") ||
                url.includes(".jpeg") ||
                url.includes(".png") ||
                url.includes(".gif") ||
                url.includes(".webp");

            return {
              url,
              type: isImage ? "image" : "document",
              name: metadata?.name || `File ${index + 1}`,
              path: entryData.filePaths?.[index] || null,
              metadata: metadata || null,
              id: `existing-${index}-${Date.now()}`, // Add unique ID
              isNew: false,
            };
          });

          setFileState((prev) => ({
            ...prev,
            previews,
          }));
        }
      } else {
        // No entry for this date
        setEntry({
          date,
          note: "",
          activities: {},
          files: [],
          filePaths: [],
          fileMetadata: [],
        });
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading entry:", err);
      setError(`Failed to load entry: ${err.message || "Please try again"}`);
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const validation = validateDateRange(newDate);

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setError(null);
    loadEntry(newDate);
  };

  const navigateDate = (direction) => {
    const currentDate = new Date(entry.date);
    currentDate.setDate(currentDate.getDate() + direction);

    const validation = validateDateRange(currentDate);

    if (!validation.valid) {
      setError(validation.message);
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
      const validation = validateDateRange(entry.date);
      if (!validation.valid) {
        setError(validation.message);
        setLoading(false);
        return;
      }

      // Handle file uploads if there are new files
      let uploadedFiles = [];
      let uploadedFilePaths = [];
      let fileMetadata = [];

      if (fileState.selectedFiles.length > 0) {
        setFileState((prev) => ({ ...prev, isUploading: true }));

        try {
          // Upload each file
          for (let i = 0; i < fileState.selectedFiles.length; i++) {
            const file = fileState.selectedFiles[i];
            const fileData = await uploadImage(
              user.uid,
              `${entry.date}_${Date.now()}_${i}`,
              file
            );

            if (!fileData || !fileData.url) {
              throw new Error(`Failed to upload file ${i + 1}`);
            }

            uploadedFiles.push(fileData.url);
            uploadedFilePaths.push(fileData.path);
            fileMetadata.push({
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              url: fileData.url,
              path: fileData.path,
            });
          }
        } catch (imgError) {
          console.error("Error uploading files:", imgError);
          setError(
            `Failed to upload files: ${imgError.message || "Unknown error"}`
          );
          setLoading(false);
          setFileState((prev) => ({ ...prev, isUploading: false }));
          return;
        }

        setFileState((prev) => ({
          ...prev,
          isUploading: false,
          selectedFiles: [],
        }));
      }

      // Prepare entry data
      const entryData = {
        date: entry.date,
        note: entry.note || "",
        activities: entry.activities || {},
        updatedAt: serverTimestamp(),
      };

      // Combine existing files with new uploads
      const existingFiles = entry.files || [];
      const existingPaths = entry.filePaths || [];
      const existingMetadata = entry.fileMetadata || [];

      const allFiles = [...existingFiles, ...uploadedFiles];
      const allPaths = [...existingPaths, ...uploadedFilePaths];
      const allMetadata = [...existingMetadata, ...fileMetadata];

      // Add files and paths to entry data
      if (allFiles.length > 0) {
        entryData.files = allFiles;
        entryData.filePaths = allPaths;
        entryData.fileMetadata = allMetadata;
      }

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
        entryData.id = docRef.id;
      }

      // Update local state with the new files
      setEntry({
        ...entry,
        ...entryData,
        id: entryData.id || entry.id,
      });

      setLoading(false);
      alert("Entry saved successfully!");
    } catch (err) {
      console.error("Error saving entry:", err);
      setError(`Failed to save entry: ${err.message || "Please try again."}`);
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

  const renderMonthView = () => {
    return (
      <div className={styles.monthView}>
        <div className={styles.monthSelector}>
          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            max={getCurrentMonth()}
            className={styles.monthInput}
          />
        </div>

        <div className={styles.monthViewTabs}>
          <button
            className={`${styles.monthViewTab} ${
              monthViewTab === "calendar" ? styles.activeMonthViewTab : ""
            }`}
            onClick={() => setMonthViewTab("calendar")}
          >
            Calendar View
          </button>
          <button
            className={`${styles.monthViewTab} ${
              monthViewTab === "graphs" ? styles.activeMonthViewTab : ""
            }`}
            onClick={() => setMonthViewTab("graphs")}
          >
            Graph View
          </button>
        </div>

        {monthViewTab === "calendar"
          ? renderMonthCalendar()
          : renderMonthGraphs()}

        <div className={styles.viewAllFilesContainer}>
          <button
            className={styles.uploadButton}
            onClick={() => {
              loadAllEntriesWithFiles();
              setShowFileModal(true);
            }}
          >
            View All Files
          </button>
        </div>
      </div>
    );
  };

  const renderMonthCalendar = () => {
    // Get all days in the selected month
    const days = getDaysInMonth(selectedMonth);

    // Create a map of date -> entry for quick lookup
    const entriesMap = createEntriesMap(monthEntries);

    // Extract year and month for date formatting
    const [year, month] = selectedMonth.split("-");

    return (
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
              const todayCheck = isToday(dateStr);
              const entry = entriesMap[dateStr];

              return (
                <div key={day} className={styles.gridRow}>
                  <div
                    className={`${styles.dayCell} ${
                      todayCheck ? styles.today : ""
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
    );
  };

  const renderMonthGraphs = () => {
    // Get all days in the selected month
    const days = getDaysInMonth(selectedMonth);
    const [year, month] = selectedMonth.split("-");

    // Create a map of date -> entry for quick lookup
    const entriesMap = createEntriesMap(monthEntries);

    // Notes completion chart
    const notesCompletionData = prepareNotesCompletionData(monthEntries, days);

    // If no activities, show a message
    if (activities.length === 0) {
      return (
        <div className={styles.graphsContainer}>
          <div className={styles.emptyState}>
            No activities to display. Add some activities in Settings!
          </div>

          <div className={styles.graphSection}>
            <h3 className={styles.graphTitle}>Notes Completion</h3>
            <div className={styles.graphWrapper}>
              <Pie data={notesCompletionData} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.graphsContainer}>
        <div className={styles.graphSection}>
          <h3 className={styles.graphTitle}>Notes Completion</h3>
          <div className={styles.graphWrapper}>
            <Pie data={notesCompletionData} />
          </div>
        </div>

        {activities.map((activity) => {
          const activityData = prepareActivityData(
            activity,
            entriesMap,
            days,
            selectedMonth
          );

          if (!activityData) return null;

          return (
            <div key={activity.id} className={styles.activityGraphSection}>
              <h3 className={styles.graphTitle}>{activity.title}</h3>

              <div className={styles.graphsRow}>
                <div className={styles.graphCard}>
                  <h4 className={styles.graphSubtitle}>Distribution</h4>
                  <div className={styles.pieChartWrapper}>
                    <Pie
                      data={activityData.pieData}
                      options={getChartOptions(
                        `${activity.title} Distribution`
                      )}
                    />
                  </div>
                </div>

                <div className={styles.graphCard}>
                  <h4 className={styles.graphSubtitle}>Trend</h4>
                  <div className={styles.lineChartWrapper}>
                    <Line
                      data={activityData.lineData}
                      options={getChartOptions(`${activity.title} Trend`)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Improved file handling functions
  const handleFileSelect = (files) => {
    if (!files || !files.length) return;

    // Check if adding these files would exceed the limit
    const totalFiles = fileState.selectedFiles.length + files.length;
    const totalPreviews = fileState.previews.length + files.length;

    if (totalPreviews > 5) {
      setError(
        `You can only upload up to 5 files. You've selected ${totalPreviews} files.`
      );
      return;
    }

    // Validate each file
    const validFiles = Array.from(files).filter((file) => {
      // Check file type (image or common document types)
      const isImage = file.type.startsWith("image/");
      const isDocument = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].includes(file.type);

      if (!isImage && !isDocument) {
        setError("Only images and documents (PDF, DOC, DOCX, TXT) are allowed");
        return false;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return false;
      }

      return true;
    });

    if (!validFiles.length) return;

    // Add new files to state
    setFileState((prev) => ({
      ...prev,
      selectedFiles: [...prev.selectedFiles, ...validFiles],
    }));

    // Create previews for all files with unique identifiers
    const newPreviews = validFiles.map((file) => {
      const uniqueId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      if (file.type.startsWith("image/")) {
        return {
          url: URL.createObjectURL(file),
          type: "image",
          name: file.name,
          isNew: true,
          file,
          id: uniqueId,
        };
      } else {
        return {
          url: null,
          type: "document",
          name: file.name,
          isNew: true,
          file,
          id: uniqueId,
        };
      }
    });

    setFileState((prev) => ({
      ...prev,
      previews: [...prev.previews, ...newPreviews],
    }));
  };

  const handleRemoveFile = (index) => {
    // Check if it's a new file or an existing one
    const preview = fileState.previews[index];

    if (preview.isNew) {
      // For new files, remove from both selectedFiles and previews
      const fileToRemove = preview.file;

      setFileState((prev) => ({
        ...prev,
        selectedFiles: prev.selectedFiles.filter((f) => f !== fileToRemove),
        previews: prev.previews.filter((_, i) => i !== index),
      }));

      // Revoke object URL to prevent memory leaks
      if (preview.url && preview.type === "image") {
        URL.revokeObjectURL(preview.url);
      }
    } else {
      // For existing files, we'll handle deletion in a separate function
      handleDeleteFile(index);
    }
  };

  const handleDeleteFile = async (index) => {
    const user = getCurrentUser();
    if (!user) {
      setError("Please sign in to delete files");
      return;
    }

    if (!entry.id) {
      setError("Cannot delete files from an unsaved entry");
      return;
    }

    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      setFileState((prev) => ({ ...prev, isUploading: true }));
      setError(null);

      // Get the file path if it exists
      const filePath = entry.filePaths && entry.filePaths[index];

      // Try to delete the file from Firebase Storage if path exists
      if (filePath) {
        try {
          await deleteImage(filePath);
        } catch (storageError) {
          // Log the error but continue with database update
          console.warn("Could not delete file from storage:", storageError);
          // We'll still remove it from the database
        }
      }

      // Remove the file from arrays
      const updatedFiles = [...(entry.files || [])];
      updatedFiles.splice(index, 1);

      const updatedPaths = [...(entry.filePaths || [])];
      if (updatedPaths.length > index) {
        updatedPaths.splice(index, 1);
      }

      const updatedMetadata = [...(entry.fileMetadata || [])];
      if (updatedMetadata.length > index) {
        updatedMetadata.splice(index, 1);
      }

      // Update the entry in Firestore
      await updateDoc(doc(db, `users/${user.uid}/entries`, entry.id), {
        files: updatedFiles,
        filePaths: updatedPaths,
        fileMetadata: updatedMetadata,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setEntry({
        ...entry,
        files: updatedFiles,
        filePaths: updatedPaths,
        fileMetadata: updatedMetadata,
      });

      // Update previews
      setFileState((prev) => ({
        ...prev,
        previews: prev.previews.filter((_, i) => i !== index),
        isUploading: false,
      }));

      alert("File deleted successfully!");
    } catch (err) {
      console.error("Error deleting file:", err);
      setError(`Failed to delete file: ${err.message || "Unknown error"}`);
      setFileState((prev) => ({ ...prev, isUploading: false }));
    }
  };

  // Improved download function
  const handleDownloadFile = (url, fileName) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "download";
      a.target = "_blank"; // Open in new tab if download fails
      document.body.appendChild(a);
      a.click();

      // Small delay before removing the element
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error("Download error:", error);
      setError(
        "Failed to download file. Try right-clicking and selecting 'Save link as'."
      );

      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  // Improved camera capture function
  const handleCameraCapture = () => {
    try {
      const cameraInput = document.createElement("input");
      cameraInput.type = "file";
      cameraInput.accept = "image/*";
      cameraInput.capture = "environment"; // This will open the camera on mobile devices

      cameraInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileSelect(Array.from(e.target.files));
        }
      };

      cameraInput.click();
    } catch (error) {
      console.error("Camera error:", error);
      setError(
        "Failed to access camera. Please check your device permissions."
      );
    }
  };

  // Add this function to load all entries with files
  const loadAllEntriesWithFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = getCurrentUser();
      if (!user) {
        setError("Please sign in to view files");
        setLoading(false);
        return;
      }

      // Query for all entries that have files
      const entriesRef = collection(db, `users/${user.uid}/entries`);
      const q = query(entriesRef);
      const querySnapshot = await getDocs(q);

      const entriesWithFiles = [];

      querySnapshot.forEach((doc) => {
        const entryData = doc.data();
        if (entryData.files && entryData.files.length > 0) {
          entriesWithFiles.push({
            id: doc.id,
            ...entryData,
          });
        }
      });

      // Sort by date (newest first)
      entriesWithFiles.sort((a, b) => b.date.localeCompare(a.date));

      setAllEntries(entriesWithFiles);
      setLoading(false);
    } catch (err) {
      console.error("Error loading entries with files:", err);
      setError(`Failed to load files: ${err.message || "Please try again"}`);
      setLoading(false);
    }
  };

  // Add this function to handle file deletion from the modal
  const handleDeleteFileFromModal = async (entryId, fileIndex) => {
    try {
      setFileState((prev) => ({ ...prev, isUploading: true }));
      setError(null);

      const user = getCurrentUser();
      if (!user) {
        setError("Please sign in to delete files");
        setFileState((prev) => ({ ...prev, isUploading: false }));
        return;
      }

      // Find the entry
      const entryToUpdate = allEntries.find((entry) => entry.id === entryId);
      if (!entryToUpdate) {
        setError("Entry not found");
        setFileState((prev) => ({ ...prev, isUploading: false }));
        return;
      }

      // Delete the file from Firebase Storage if path exists
      if (entryToUpdate.filePaths && entryToUpdate.filePaths[fileIndex]) {
        await deleteImage(entryToUpdate.filePaths[fileIndex]);
      }

      // Remove the file from arrays
      const updatedFiles = [...entryToUpdate.files];
      updatedFiles.splice(fileIndex, 1);

      const updatedPaths = [...(entryToUpdate.filePaths || [])];
      if (updatedPaths.length > fileIndex) {
        updatedPaths.splice(fileIndex, 1);
      }

      const updatedMetadata = [...(entryToUpdate.fileMetadata || [])];
      if (updatedMetadata.length > fileIndex) {
        updatedMetadata.splice(fileIndex, 1);
      }

      // Update the entry in Firestore
      await updateDoc(doc(db, `users/${user.uid}/entries`, entryId), {
        files: updatedFiles,
        filePaths: updatedPaths,
        fileMetadata: updatedMetadata,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setAllEntries((prevEntries) => {
        return prevEntries.map((entry) => {
          if (entry.id === entryId) {
            return {
              ...entry,
              files: updatedFiles,
              filePaths: updatedPaths,
              fileMetadata: updatedMetadata,
            };
          }
          return entry;
        });
      });

      // If the current entry is being updated, also update that state
      if (entry.id === entryId) {
        setEntry({
          ...entry,
          files: updatedFiles,
          filePaths: updatedPaths,
          fileMetadata: updatedMetadata,
        });

        // Update previews if we're viewing this entry
        setFileState((prev) => ({
          ...prev,
          previews: prev.previews.filter((_, i) => i !== fileIndex),
          isUploading: false,
        }));
      }

      setFileState((prev) => ({ ...prev, isUploading: false }));
      alert("File deleted successfully!");
    } catch (err) {
      console.error("Error deleting file:", err);
      setError(`Failed to delete file: ${err.message || "Unknown error"}`);
      setFileState((prev) => ({ ...prev, isUploading: false }));
    }
  };

  // Render loading state
  const renderLoading = () => {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Loading diary...</div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ position: "relative" }}>
        {/* Show loading indicator when needed, but don't hide content */}
        {(loading || fileState.isUploading) && renderLoading()}

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

                {/* Replace the files section with the FileManager component */}
                <div className={styles.filesSection}>
                  <h2 className={styles.sectionTitle}>FILES & IMAGES</h2>

                  <FileManager
                    previews={fileState.previews}
                    onFileSelect={handleFileSelect}
                    onRemoveFile={handleRemoveFile}
                    onDownloadFile={handleDownloadFile}
                    onCameraCapture={handleCameraCapture}
                    isUploading={fileState.isUploading}
                    isLoading={loading}
                    error={error}
                    maxFiles={5}
                  />
                </div>

                <button
                  className={styles.button}
                  onClick={handleSaveEntry}
                  disabled={loading || fileState.isUploading}
                >
                  {loading || fileState.isUploading
                    ? "SAVING..."
                    : "SAVE ENTRY"}
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

      {/* File Modal */}
      <FileModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        entries={allEntries}
        onDownload={handleDownloadFile}
        onDelete={handleDeleteFileFromModal}
        loading={loading || fileState.isUploading}
      />
    </div>
  );
};

export default WritePage;
