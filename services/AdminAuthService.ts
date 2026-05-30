import { db } from '../firebase';
import firebase from 'firebase/compat/app';

/**
 * AdminAuthService - Handles admin-level user account operations
 * Note: These operations use client-side Firebase SDK with a workaround for creating accounts
 */
export class AdminAuthService {
    /**
     * Create a guest account with email and password
     * This creates both a Firebase Auth user and a Firestore profile
     */
    static async createGuestAccount(
        email: string,
        password: string,
        displayName: string,
        createdBy: string
    ): Promise<{ uid: string; email: string }> {
        try {
            // For client-side, we'll use a workaround:
            // 1. Create the user in Firebase Auth using the regular SDK
            // 2. Immediately sign out to avoid affecting current session
            // 3. Create the profile in Firestore

            const currentUser = firebase.auth().currentUser;

            // Create the user account
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (!user) {
                throw new Error('Failed to create user account');
            }

            // Update display name
            await user.updateProfile({ displayName });

            // Create user profile in Firestore
            await db.collection('profiles').doc(user.uid).set({
                uid: user.uid,
                email: email.toLowerCase(),
                displayName: displayName,
                role: 'coach',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                canUseInterview: false,
                canUseMatching: false,
                isGuestAccount: true, // Mark as guest account
                createdBy: createdBy,
                emailVerified: true // Skip email verification for guest accounts
            });

            // Add to whitelist collection for tracking
            await db.collection('whitelist').doc(email.toLowerCase()).set({
                email: email.toLowerCase(),
                displayName: displayName,
                addedBy: createdBy,
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                uid: user.uid,
                isGuestAccount: true
            });

            // Sign out the newly created user and restore previous session
            await firebase.auth().signOut();

            // Re-authenticate the admin if there was a previous user
            // Note: The admin will need to handle re-authentication in the UI

            return {
                uid: user.uid,
                email: user.email || email
            };
        } catch (error: any) {
            console.error('Error creating guest account:', error);

            // Translate Firebase errors
            let errorMessage = 'Kunde inte skapa gästkonto';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'E-postadressen används redan';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Ogiltig e-postadress';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Lösenordet är för svagt (minst 6 tecken krävs)';
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }

    /**
     * Update a user's password
     * Note: This requires the user's UID
     */
    static async updateUserPassword(uid: string, newPassword: string): Promise<void> {
        try {
            // Client-side approach: We need to use Firebase Auth's updatePassword
            // This requires the user to be signed in, so we'll need a different approach

            // For now, we'll update the whitelist entry and provide instructions
            // The actual password update will need to be done via Firebase Console or Cloud Functions

            throw new Error('Lösenordsändring kräver Firebase Cloud Functions. Använd Firebase Console för att ändra lösenord.');
        } catch (error: any) {
            console.error('Error updating user password:', error);
            throw error;
        }
    }

    /**
     * Delete a user account completely
     * Removes from Firebase Auth and Firestore
     */
    static async deleteUserAccount(uid: string, email: string): Promise<void> {
        try {
            // Call Cloud Function to delete user using compat SDK
            const deleteUser = firebase.functions().httpsCallable('deleteUser');
            const result = await deleteUser({ uid, email });

            console.log('User deleted successfully:', result.data);
        } catch (error: any) {
            console.error('Error deleting user account:', error);

            // Provide helpful error messages
            let errorMessage = 'Kunde inte ta bort användarkonto';
            if (error.code === 'unauthenticated') {
                errorMessage = 'Du måste vara inloggad för att radera användare';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Endast administratörer kan radera användare';
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }


    /**
     * Update user's display name
     */
    static async updateUserDisplayName(uid: string, email: string, displayName: string): Promise<void> {
        try {
            // Update in Firestore profile
            await db.collection('profiles').doc(uid).update({
                displayName: displayName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update in whitelist
            await db.collection('whitelist').doc(email.toLowerCase()).update({
                displayName: displayName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error: any) {
            console.error('Error updating display name:', error);
            throw new Error('Kunde inte uppdatera namn');
        }
    }
}
