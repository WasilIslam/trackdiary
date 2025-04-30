import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { app } from "./config";

// Initialize Firebase Storage
const storage = getStorage(app);

// Upload a file for a specific date and user
export const uploadImage = async (userId, fileId, file) => {
  if (!userId) throw new Error("User ID is required for upload");
  if (!fileId) throw new Error("File ID is required for upload");
  if (!file) throw new Error("No file provided for upload");

  try {
    // Determine file extension based on file type
    let extension = "file";
    if (file.type.startsWith("image/")) {
      extension = file.type.split("/")[1] || "jpg";
    } else if (file.type === "application/pdf") {
      extension = "pdf";
    } else if (
      file.type === "application/msword" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extension = "doc";
    } else if (file.type === "text/plain") {
      extension = "txt";
    }

    // Create a reference to the file location
    const filePath = `notes/${userId}/${fileId}.${extension}`;
    const storageRef = ref(storage, filePath);

    // Upload the file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    if (!snapshot) throw new Error("Upload failed - no snapshot returned");

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    if (!downloadURL) throw new Error("Failed to get download URL");

    return {
      url: downloadURL,
      path: filePath,
      name: file.name,
      type: file.type,
    };
  } catch (error) {
    console.error("Error uploading file:", error);

    // Provide more specific error messages based on Firebase error codes
    if (error.code === "storage/unauthorized") {
      throw new Error(
        "Permission denied: You don't have permission to upload files"
      );
    } else if (error.code === "storage/canceled") {
      throw new Error("Upload canceled");
    } else if (error.code === "storage/unknown") {
      throw new Error("Unknown error occurred during upload");
    } else if (error.code === "storage/quota-exceeded") {
      throw new Error("Storage quota exceeded");
    }

    throw error;
  }
};

// Delete a file
export const deleteImage = async (filePath) => {
  if (!filePath) throw new Error("File path is required for deletion");

  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);

    // Provide more specific error messages based on Firebase error codes
    if (error.code === "storage/object-not-found") {
      throw new Error("File not found: It may have been already deleted");
    } else if (error.code === "storage/unauthorized") {
      throw new Error(
        "Permission denied: You don't have permission to delete this file"
      );
    } else if (error.code === "storage/canceled") {
      throw new Error("Deletion canceled");
    } else if (error.code === "storage/unknown") {
      throw new Error("Unknown error occurred during deletion");
    }

    throw error;
  }
};

export default storage;
