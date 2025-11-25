// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDTouAX8vmanfuhLpOiqNOLYpnj3SRMyI8",
  authDomain: "eduction-f0a99.firebaseapp.com",
  databaseURL: "https://eduction-f0a99-default-rtdb.firebaseio.com",
  projectId: "eduction-f0a99",
  storageBucket: "eduction-f0a99.firebasestorage.app",
  messagingSenderId: "945587862806",
  appId: "1:945587862806:web:2c7610ce094fbf5477a437",
  measurementId: "G-3HSSN3ERKD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
