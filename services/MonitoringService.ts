
import { db } from '../firebase';
import firebase from 'firebase/compat/app';

export interface AIErrorLog {
    id?: string;
    timestamp: any;
    model: string;
    error: string;
    context: 'chat' | 'interview' | 'matching' | 'import';
    userEmail?: string;
    status: 'new' | 'viewed' | 'resolved';
}

/**
 * MonitoringService handles tracking of system health, 
 * specifically AI model availability and failures.
 */
export class MonitoringService {
    private static readonly LOGS_COLLECTION = 'ai_health_logs';
    private static readonly STATUS_DOC = 'system_status/ai_health';

    /**
     * Logs a failed AI attempt to Firestore for admin review.
     */
    static async logAIError(model: string, error: string, context: AIErrorLog['context'], userEmail?: string) {
        try {
            const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);

            // 1. Add detailed log
            await db.collection(this.LOGS_COLLECTION).add({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                model: model || 'unknown',
                error: errorMsg.substring(0, 2000), // Safety cap
                context,
                userEmail: userEmail || 'unknown',
                status: 'new'
            });

            // 2. Update global health status
            await db.doc(this.STATUS_DOC).set({
                lastFailure: firebase.firestore.FieldValue.serverTimestamp(),
                lastError: errorMsg.substring(0, 500),
                lastModel: model,
                hasIssue: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`[Monitoring] Logged failure for model ${model} in ${context}`);
        } catch (e) {
            console.error("Critical: Failed to log AI error to monitoring service:", e);
        }
    }

    /**
     * Resets the health status after an admin has confirmed the fix.
     */
    static async markAsHealthy() {
        try {
            await db.doc(this.STATUS_DOC).update({
                hasIssue: false,
                resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to update health status:", e);
        }
    }

    /**
     * Subscribes to the current AI health status.
     */
    static subscribeToHealth(onUpdate: (data: any) => void) {
        return db.doc(this.STATUS_DOC).onSnapshot((doc) => {
            if (doc.exists) {
                onUpdate(doc.data());
            } else {
                onUpdate({ hasIssue: false });
            }
        });
    }

    /**
     * Gets the most recent failure logs.
     */
    static async getRecentLogs(limit = 10): Promise<AIErrorLog[]> {
        const snapshot = await db.collection(this.LOGS_COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AIErrorLog));
    }
}
