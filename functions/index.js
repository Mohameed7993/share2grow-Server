/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore();

exports.trackSublinkClick = functions.https.onRequest(async (req, res) => {
  const userIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const {campaignId, userId}= req.query;

  if (!campaignId || !userId) {
    res.status(400).send("Invalid request: Missing campaignId or userId");
    return;
  }

  try {
    // Reference to the user's campaign shares
    const campaignRef = doc(db, "campaigns", campaignId);
    const clicksRef = doc(db, "campaigns", campaignId, "clicks", userIp);

    // Check if the IP address has already clicked
    const clicksDoc = await getDoc(clicksRef);

    if (clicksDoc.exists()) {
      // IP already recorded
      res.status(200).send("Click already recorded.");
    } else {
      // Increment shares count for the user
      await updateDoc(campaignRef, {
        [`shares.${userId}`]: increment(1),
      });

      // Record the IP address in the clicks subcollection
      await setDoc(clicksRef, {
        timestamp: serverTimestamp(),
      });

      res.status(200).send("Click recorded successfully.");
    }
  } catch (error) {
    console.error("Error processing click:", error);
    res.status(500).send("Internal server error.");
  }
});
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
