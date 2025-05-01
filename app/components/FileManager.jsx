import { useState, useEffect } from "react";
import styles from "./FileManager.module.css";
import Image from "next/image";

const FileManager = ({
  previews = [],
  onFileSelect,
  onRemoveFile,
  onDownloadFile,
  onCameraCapture,
  isUploading = false,
  isLoading = false,
  error = null,
  maxFiles = 5,
}) => {
  const [selectedImage, setSelectedImage] = useState(null);

  // Use a unique ID for each file input to prevent reloading issues
  const fileInputId =
    "file-upload-" + Math.random().toString(36).substring(2, 9);

  // Prevent default on form submission to avoid page reloads
  const handleFormSubmit = (e) => {
    e.preventDefault();
    return false;
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(Array.from(e.target.files));
      // Reset the input value to allow selecting the same file again
      e.target.value = "";
    }
  };

  const openImage = (url) => {
    setSelectedImage(url);
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

  return (
    <div className={styles.fileManager}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Loading overlay */}
      {isLoading && (
        <div className={styles.uploadingIndicator}>
          <div className={styles.spinner}></div>
          <span>Loading entries...</span>
        </div>
      )}

      {/* Display file previews */}
      {previews.length > 0 && (
        <div className={styles.filesList}>
          {previews.map((preview, index) => (
            <div
              key={`file-${index}-${preview.name || Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 9)}`}
              className={styles.fileItem}
            >
              {preview.type === "image" ? (
                <div
                  className={styles.imagePreviewContainer}
                  onClick={() => preview.url && openImage(preview.url)}
                >
                  <img
                    src={preview.url}
                    alt={preview.name || `File ${index + 1}`}
                    className={styles.imagePreview}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder-image.png";
                    }}
                  />
                </div>
              ) : (
                <div className={styles.documentPreview}>
                  <div className={styles.documentIcon}>📄</div>
                  <div className={styles.documentName}>
                    {preview.name || `Document ${index + 1}`}
                  </div>
                </div>
              )}

              <div className={styles.fileActions}>
                {preview.url && preview.type === "image" && (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.openButton}`}
                    onClick={() => openImage(preview.url)}
                    disabled={isUploading}
                  >
                    Open
                  </button>
                )}

                {preview.url && (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                    onClick={() => onDownloadFile(preview.url, preview.name)}
                    disabled={isUploading}
                  >
                    Get
                  </button>
                )}

                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => onRemoveFile(index)}
                  disabled={isUploading}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File upload controls - wrap in form to prevent reloading */}
      <form onSubmit={handleFormSubmit}>
        {previews.length < maxFiles && (
          <div className={styles.fileUploadControls}>
            <button
              type="button"
              className={styles.uploadButton}
              onClick={() => document.getElementById(fileInputId).click()}
              disabled={isUploading || isLoading}
            >
              Add File
            </button>

            <button
              type="button"
              className={styles.uploadButton}
              onClick={onCameraCapture}
              disabled={isUploading || isLoading}
            >
              Take Photo
            </button>

            <input
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileInputChange}
              className={styles.fileInput}
              id={fileInputId}
              multiple
              disabled={isUploading || isLoading}
            />
          </div>
        )}
      </form>

      {/* File counter */}
      <div className={styles.fileCounter}>
        {previews.length} of {maxFiles} files added
      </div>

      {isUploading && (
        <div className={styles.uploadingIndicator}>
          <div className={styles.spinner}></div>
          <span>Uploading files...</span>
        </div>
      )}

      {/* Image modal */}
      {selectedImage && (
        <div className={styles.imageModal} onClick={closeImage}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={closeImage}>
              ×
            </button>
            <img
              src={selectedImage}
              alt="Full size preview"
              className={styles.modalImage}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/placeholder-image.png";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
