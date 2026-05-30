
import { db } from '../firebase';
import { SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';

export class SettingsService {
    private static COLLECTION = 'settings';
    private static DOCUMENT_ID = 'system';
    private static LOCAL_STORAGE_KEY = 'aventus_system_settings';
    private static callbacks: ((settings: SystemSettings) => void)[] = [];

    private static notifySubscribers(settings: SystemSettings) {
        this.callbacks.forEach(callback => {
            try {
                callback(settings);
            } catch (e) {
                console.error("Error in settings subscriber callback:", e);
            }
        });
    }

    static async getSettings(): Promise<SystemSettings> {
        try {
            // Try localStorage first for instant load
            const local = localStorage.getItem(this.LOCAL_STORAGE_KEY);
            let settings = local ? JSON.parse(local) : INITIAL_SYSTEM_SETTINGS;

            // Try to get from Firestore with a short timeout
            const firestorePromise = db.collection(this.COLLECTION).doc(this.DOCUMENT_ID).get();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));

            try {
                const doc: any = await Promise.race([firestorePromise, timeoutPromise]);
                if (doc.exists) {
                    settings = { ...settings, ...doc.data() };
                    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(settings));
                }
            } catch (e) {
                console.warn("Using local settings (Firestore unreachable/timeout)");
            }

            return settings;
        } catch (error) {
            console.error("Error fetching settings:", error);
            return INITIAL_SYSTEM_SETTINGS;
        }
    }

    static async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
        try {
            // Always update localStorage immediately
            const current = await this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(updated));

            // Notify local subscribers immediately for snappy UI
            this.notifySubscribers(updated);

            // Try to update Firestore with a timeout
            const firestorePromise = db.collection(this.COLLECTION).doc(this.DOCUMENT_ID).set(settings, { merge: true });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));

            try {
                await Promise.race([firestorePromise, timeoutPromise]);
            } catch (error) {
                console.error("Firestore update timed out/failed, settings saved locally only.");
                // We don't throw here so the UI can proceed with local success
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            throw error;
        }
    }

    static subscribe(callback: (settings: SystemSettings) => void): () => void {
        // Add to active callbacks
        this.callbacks.push(callback);

        // Initial callback with local data
        const local = localStorage.getItem(this.LOCAL_STORAGE_KEY);
        if (local) {
            callback(JSON.parse(local));
        } else {
            callback(INITIAL_SYSTEM_SETTINGS);
        }

        const unsubFirestore = db.collection(this.COLLECTION).doc(this.DOCUMENT_ID).onSnapshot(
            (doc) => {
                if (doc.exists) {
                    const settings = doc.data() as SystemSettings;
                    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(settings));
                    this.notifySubscribers(settings);
                }
            },
            (error) => {
                console.error("Settings subscription error (likely quota):", error);
            }
        );

        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
            unsubFirestore();
        };
    }
}
