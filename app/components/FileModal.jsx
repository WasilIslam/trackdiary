import { useState, useEffect } from "react";
import styles from "./FileModal.module.css";

const FileModal = ({
  isOpen,
  onClose,
  entries,
  onDownload,
  onDelete,
  loading,
}) => {
  const [activeDate, setActiveDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'

  useEffect(() => {
    // Set the first date as active by default
    if (entries.length > 0 && !activeDate) {
      setActiveDate(entries[0].date);
    }

    // Filter entries based on search term
    if (searchTerm) {
      const filtered = entries.filter((entry) => {
        // Search in date
        if (entry.date.includes(searchTerm)) return true;

        // Search in file names
        if (
          entry.fileMetadata &&
          entry.fileMetadata.some((meta) =>
            meta.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        ) {
          return true;
        }

        return false;
      });
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(entries);
    }
  }, [entries, searchTerm, activeDate]);

  if (!isOpen) return null;

  // Group entries by month for the sidebar
  const entriesByMonth = {};
  filteredEntries.forEach((entry) => {
    const [year, month] = entry.date.split("-");
    const monthKey = `${year}-${month}`;
    if (!entriesByMonth[monthKey]) {
      entriesByMonth[monthKey] = [];
    }
    entriesByMonth[monthKey].push(entry);
  });

  // Get the active entry
  const activeEntry =
    filteredEntries.find((entry) => entry.date === activeDate) ||
    filteredEntries[0];

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Determine file type icon/preview
  const getFileTypeInfo = (file, metadata) => {
    if (!file) return { icon: "📄", type: "document" };

    const isImage =
      metadata?.type?.startsWith("image/") ||
      file.includes(".jpg") ||
      file.includes(".jpeg") ||
      file.includes(".png") ||
      file.includes(".gif") ||
      file.includes(".webp");

    if (isImage) {
      return { icon: "🖼️", type: "image" };
    }

    if (file.includes(".pdf")) {
      return { icon: "📑", type: "pdf" };
    }

    if (file.includes(".doc") || file.includes(".docx")) {
      return { icon: "📝", type: "document" };
    }

    if (file.includes(".txt")) {
      return { icon: "📄", type: "text" };
    }

    return { icon: "📁", type: "other" };
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>All Files</h2>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${
                viewMode === "grid" ? styles.active : ""
              }`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              className={`${styles.viewButton} ${
                viewMode === "list" ? styles.active : ""
              }`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.sidebar}>
            {Object.entries(entriesByMonth).map(([monthKey, monthEntries]) => (
              <div key={monthKey} className={styles.monthGroup}>
                <h3 className={styles.monthHeader}>
                  {new Date(`${monthKey}-01`).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </h3>
                <ul className={styles.dateList}>
                  {monthEntries.map((entry) => (
                    <li
                      key={entry.date}
                      className={`${styles.dateItem} ${
                        entry.date === activeDate ? styles.active : ""
                      }`}
                      onClick={() => setActiveDate(entry.date)}
                    >
                      <span className={styles.dateText}>
                        {formatDate(entry.date)}
                      </span>
                      <span className={styles.fileCount}>
                        {entry.files?.length || 0} files
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={styles.fileArea}>
            {activeEntry ? (
              <>
                <h3 className={styles.dateHeader}>
                  {formatDate(activeEntry.date)}
                </h3>

                {activeEntry.files && activeEntry.files.length > 0 ? (
                  <div
                    className={
                      viewMode === "grid" ? styles.filesGrid : styles.filesList
                    }
                  >
                    {activeEntry.files.map((file, index) => {
                      const metadata = activeEntry.fileMetadata?.[index];
                      const { type, icon } = getFileTypeInfo(file, metadata);
                      const fileName = metadata?.name || `File ${index + 1}`;

                      return (
                        <div key={index} className={styles.fileItem}>
                          {type === "image" ? (
                            <div className={styles.filePreview}>
                              <img
                                src={file}
                                alt={fileName}
                                className={styles.imagePreview}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/placeholder-image.png";
                                }}
                              />
                            </div>
                          ) : (
                            <div className={styles.fileIcon}>{icon}</div>
                          )}

                          <div className={styles.fileName}>{fileName}</div>

                          <div className={styles.fileActions}>
                            <button
                              className={styles.actionButton}
                              onClick={() => onDownload(file, fileName)}
                              disabled={loading}
                            >
                              Download
                            </button>
                            <button
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={() => onDelete(activeEntry.id, index)}
                              disabled={loading}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    No files for this date
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>No entries found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileModal;
