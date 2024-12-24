// firebase.js
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getAuth, FacebookAuthProvider } = require('firebase/auth');
const { getStorage } = require('firebase/storage');
require('dotenv').config();



// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
    
};

require('dotenv').config();


const app = initializeApp(firebaseConfig);

// Services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
// const FacebookAuthProvider= new FacebookAuthProvider();

module.exports = { FacebookAuthProvider,db, auth, storage };
