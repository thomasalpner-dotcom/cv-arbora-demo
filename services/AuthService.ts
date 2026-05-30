import { auth, db } from '../firebase';
import firebase from "firebase/compat/app";
import { SettingsService } from './SettingsService';

export class AuthService {
    /**
     * Check if an email is allowed to register.
     * 1. Check if it belongs to the auto-approve domain.
     * 2. Check if it is in the whitelist (Firestore collection 'whitelist').
     */
    static async isEmailAllowed(email: string): Promise<boolean> {
        const lowerEmail = email.toLowerCase();

        // 1. Check dynamic auto-approve domains from settings
        try {
            const settings = await SettingsService.getSettings();
            if (settings.allowOpenAdminRegistration) {
                return true; // Demo: allow everyone
            }
            if (settings.allowedEmailDomains) {
                const domains = settings.allowedEmailDomains.split(',').map(d => d.trim().toLowerCase());
                if (domains.some(domain => lowerEmail.endsWith(domain))) {
                    return true;
                }
            }
        } catch (err) {
            console.warn("Could not fetch settings for domain check, falling back to whitelist only.");
        }

        // 2. Check whitelist in Firestore
        try {
            const whitelistDoc = await db.collection('whitelist').doc(lowerEmail).get();
            return whitelistDoc.exists;
        } catch (error) {
            console.error("Error checking whitelist:", error);
            // If we can't check the whitelist, safer to deny
            return false;
        }
    }

    /**
     * Register a new user.
     */
    static async register(email: string, password: string, displayName: string) {
        const allowed = await this.isEmailAllowed(email);
        if (!allowed) {
            throw new Error('Denna e-postadress har inte tillgång till verktyget. Kontakta admin.');
        }

        let finalRole = 'coach';
        try {
            const settings = await SettingsService.getSettings();
            if (settings.allowOpenAdminRegistration || email.toLowerCase() === 'thomas.alpner@aventus.se' || email.toLowerCase().includes('admin')) {
                finalRole = 'admin';
            }
        } catch (err) {
            if (email.toLowerCase() === 'thomas.alpner@aventus.se' || email.toLowerCase().includes('admin')) {
                finalRole = 'admin';
            }
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (user) {
            // Send verification email
            await user.sendEmailVerification();

            // Set display name in profile
            await user.updateProfile({ displayName });

            // Create initial user profile in Firestore
            await db.collection('profiles').doc(user.uid).set({
                uid: user.uid,
                email: email.toLowerCase(),
                displayName: displayName,
                role: finalRole, // Assigned based on settings or email
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                canUseInterview: false
            });
        }

        return user;
    }

    /**
     * Login existing user.
     */
    static async login(email: string, password: string) {
        return await auth.signInWithEmailAndPassword(email, password);
    }

    /**
     * Sign out.
     */
    static async logout() {
        return await auth.signOut();
    }

    /**
     * Reload current user to pick up email verification status changes.
     */
    static async reloadUser() {
        const user = auth.currentUser;
        if (user) {
            await user.reload();
            return auth.currentUser;
        }
        return null;
    }

    /**
     * Resend verification email.
     */
    static async resendVerificationEmail() {
        const user = auth.currentUser;
        if (user) {
            await user.sendEmailVerification();
        } else {
            throw new Error("Ingen användare inloggad.");
        }
    }

    /**
     * Send password reset email.
     */
    static async sendPasswordReset(email: string) {
        return await auth.sendPasswordResetEmail(email);
    }

    /**
     * Update current user's password.
     */
    static async updatePassword(newPassword: string) {
        const user = auth.currentUser;
        if (!user) throw new Error('Ingen användare inloggad');
        return await user.updatePassword(newPassword);
    }

    /**
     * Manage Whitelist (Admin only logic - will be used in AdminPanel)
     */
    static async addToWhitelist(email: string, addedBy: string) {
        const lowerEmail = email.toLowerCase();
        return await db.collection('whitelist').doc(lowerEmail).set({
            email: lowerEmail,
            addedBy,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    static async removeFromWhitelist(email: string) {
        return await db.collection('whitelist').doc(email.toLowerCase()).delete();
    }

    static async getWhitelist() {
        const snapshot = await db.collection('whitelist').get();
        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Update user's profile photo in Firestore.
     */
    static async updateProfilePhoto(uid: string, photoUrl: string) {
        return await db.collection('profiles').doc(uid).set({
            photoUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
}
