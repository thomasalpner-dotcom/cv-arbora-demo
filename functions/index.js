const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cloud Function to delete a user account
 * Deletes from Firebase Auth, Firestore profiles, and whitelist
 */
exports.deleteUser = onCall(async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Verify admin role
    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore()
        .collection("profiles")
        .doc(callerUid)
        .get();

    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
        throw new HttpsError(
            "permission-denied",
            "Only admins can delete users",
        );
    }

    // Get user data from request
    const { uid, email } = request.data;

    if (!uid || !email) {
        throw new HttpsError(
            "invalid-argument",
            "uid and email are required",
        );
    }

    try {
        // Delete from Firebase Auth
        try {
            await admin.auth().deleteUser(uid);
            console.log(`Deleted Auth user: ${uid}`);
        } catch (authError) {
            // User might not exist in Auth, continue anyway
            console.warn(`Auth user ${uid} not found or already deleted`);
        }

        // Delete from Firestore profiles
        try {
            await admin.firestore().collection("profiles").doc(uid).delete();
            console.log(`Deleted profile: ${uid}`);
        } catch (profileError) {
            console.warn(`Profile ${uid} not found or already deleted`);
        }

        // Delete from whitelist
        try {
            await admin.firestore()
                .collection("whitelist")
                .doc(email.toLowerCase())
                .delete();
            console.log(`Deleted whitelist entry: ${email}`);
        } catch (whitelistError) {
            console.warn(`Whitelist entry ${email} not found or already deleted`);
        }

        return {
            success: true,
            message: `User ${email} deleted successfully`,
        };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new HttpsError(
            "internal",
            `Failed to delete user: ${error.message}`,
        );
    }
});
