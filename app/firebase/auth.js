import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { app } from "./config";

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Collection name constant to avoid confusion
const USERS_COLLECTION = "User";

// Sign in with Google and handle user creation if needed
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Firestore
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    // If user doesn't exist, create a new user document
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phone: "",
        createdAt: new Date(),
      });
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return { success: false, error };
  }
};

// Get current auth state
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Sign out user
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error };
  }
};

// Get user data from Firestore
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { success: true, data: userSnap.data() };
    } else {
      return { success: false, error: "User not found" };
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    return { success: false, error };
  }
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    // Add updatedAt timestamp
    const dataToUpdate = {
      ...profileData,
      updatedAt: new Date(),
    };

    await updateDoc(userRef, dataToUpdate);
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error };
  }
};

// Export auth and db for use in other components
export { auth, db, USERS_COLLECTION };
