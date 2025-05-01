export const deleteImage = async (path) => {
  if (!path) {
    console.warn("No file path provided for deletion");
    return Promise.resolve(); // Resolve immediately if no path
  }

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    // Check if the error is because the file doesn't exist
    if (error.code === "storage/object-not-found") {
      console.warn(
        `File at path ${path} not found in storage, but will be removed from database`
      );
      return true; // Return success so we can still update the database
    }

    // For other errors, throw so they can be handled by the caller
    throw error;
  }
};
