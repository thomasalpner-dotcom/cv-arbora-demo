
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/functions";


const firebaseConfig = {
  apiKey: "AIzaSyBmwDPiy_Agggcb1rp555OAQxhg4IUTzhs",
  authDomain: "cv-arbora-demo.firebaseapp.com",
  projectId: "cv-arbora-demo",
  storageBucket: "cv-arbora-demo.firebasestorage.app",
  messagingSenderId: "808616706653",
  appId: "1:808616706653:web:2c924bc454fa6f4a4383b4"
};

// Singleton-initiering för att undvika dubbla appar
const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("%c 🚀 Firebase Cloud: CONNECTED ", "background: #2b7cf4; color: #fff; font-weight: bold;");

export { auth, db, storage };
