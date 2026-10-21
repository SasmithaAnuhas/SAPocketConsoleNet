/**
 * Google OAuth & Firebase Realtime Database Global Leaderboard
 * Handles Google authentication, live player ranking, and highscore synchronization.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  runTransaction,
  set,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyANEuAY3tzLEJvpxalLNRMp4BeTTzj25rI",
  authDomain: "pocketconsole-cde70.firebaseapp.com",
  projectId: "pocketconsole-cde70",
  storageBucket: "pocketconsole-cde70.firebasestorage.app",
  messagingSenderId: "85026527206",
  appId: "1:85026527206:web:67bffb25c7f7e059fc2827",
  databaseURL: "https://pocketconsole-cde70-default-rtdb.asia-southeast1.firebasedatabase.app"
};

class TypeWriterAuthLeaderboard {
  constructor() {
    this.app = null;
    this.auth = null;
    this.database = null;
    this.provider = null;
    this.currentUser = null;
    this.leaderboardEntries = [];
    this.currentPlayerRank = null;
    this.listeners = {
      authChange: [],
      leaderboardChange: [],
      rankChange: []
    };

    this.init();
  }

  init() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.database = getDatabase(this.app);
      this.provider = new GoogleAuthProvider();
      this.provider.setCustomParameters({ prompt: 'select_account' });

      // Listen for auth changes
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        this.notifyAuthChange(user);
        this.recalculatePlayerRank();

        // If user logged in and has an existing local high score, submit it
        if (user) {
          this.syncLocalHighScore();
        }
      });

      // Start live leaderboard listener
      this.listenToLeaderboard();
    } catch (err) {
      console.error('[TypeWriterAuth] Failed to initialize Firebase:', err);
    }
  }

  // Google OAuth Login via Popup
  async login() {
    if (!this.auth || !this.provider) return null;
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      return result.user;
    } catch (error) {
      // Ignore user closed popup cancellation
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('[TypeWriterAuth] Login error:', error);
        alert('Could not sign in with Google: ' + error.message);
      }
      return null;
    }
  }

  // Sign out
  async logout() {
    if (!this.auth) return;
    try {
      await signOut(this.auth);
      this.currentUser = null;
      this.currentPlayerRank = null;
      this.notifyRankChange(null);
    } catch (error) {
      console.error('[TypeWriterAuth] Sign out error:', error);
    }
  }

  // Subscribe to auth state changes
  onAuthChange(callback) {
    this.listeners.authChange.push(callback);
    if (this.currentUser !== undefined) {
      callback(this.currentUser);
    }
  }

  notifyAuthChange(user) {
    this.listeners.authChange.forEach(cb => {
      try { cb(user); } catch (e) { console.error(e); }
    });
  }

  // Subscribe to leaderboard updates
  onLeaderboardChange(callback) {
    this.listeners.leaderboardChange.push(callback);
    if (this.leaderboardEntries.length > 0) {
      callback(this.leaderboardEntries, this.currentPlayerRank);
    }
  }

  onRankChange(callback) {
    this.listeners.rankChange.push(callback);
    if (this.currentPlayerRank !== null) {
      callback(this.currentPlayerRank);
    }
  }

  notifyLeaderboardChange() {
    this.listeners.leaderboardChange.forEach(cb => {
      try { cb(this.leaderboardEntries, this.currentPlayerRank); } catch (e) { console.error(e); }
    });
  }

  notifyRankChange(rankInfo) {
    this.listeners.rankChange.forEach(cb => {
      try { cb(rankInfo); } catch (e) { console.error(e); }
    });
  }

  // Listen to typewriterLeaderboard in Realtime Database
  listenToLeaderboard() {
    if (!this.database) return;
    const leaderboardRef = ref(this.database, 'typewriterLeaderboard');

    onValue(leaderboardRef, (snapshot) => {
      const entries = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (val && typeof val.wpm === 'number') {
          entries.push({
            uid: child.key,
            displayName: val.displayName || 'Java Student',
            photoURL: val.photoURL || null,
            wpm: Number(val.wpm) || 0,
            accuracy: Number(val.accuracy) || 0,
            rankTitle: val.rankTitle || 'Java Typist',
            rankBadge: val.rankBadge || '☕',
            testsCompleted: Number(val.testsCompleted) || 1,
            updatedAt: val.updatedAt || null
          });
        }
      });

      // Sort by WPM descending, then accuracy descending
      entries.sort((a, b) => {
        if (b.wpm !== a.wpm) {
          return b.wpm - a.wpm;
        }
        return b.accuracy - a.accuracy;
      });

      this.leaderboardEntries = entries;
      this.recalculatePlayerRank();
      this.notifyLeaderboardChange();
    }, (error) => {
      console.warn('[TypeWriterLeaderboard] Error fetching online scores (check database.rules.json):', error);
      if (this.leaderboardEntries.length === 0) {
        this.buildLocalFallbackLeaderboard();
      }
    });
  }

  // Gracefully fallback to showing local player's best record if online rules are restricted
  buildLocalFallbackLeaderboard() {
    try {
      const stats = JSON.parse(localStorage.getItem('typewriter_stats') || '{}');
      if (stats.highWpm && stats.highWpm > 0) {
        const user = this.currentUser;
        const entry = {
          uid: user ? user.uid : 'local_device',
          displayName: (user ? user.displayName : 'You') + ' (Local Device)',
          photoURL: user ? user.photoURL : null,
          wpm: stats.highWpm,
          accuracy: 96,
          rankTitle: 'Java Byte Coder',
          rankBadge: '🌱☕',
          testsCompleted: stats.testsCompleted || 1,
          updatedAt: Date.now()
        };
        this.leaderboardEntries = [entry];
        this.recalculatePlayerRank();
        this.notifyLeaderboardChange();
      }
    } catch (_) {}
  }

  // Calculate current signed-in player rank
  recalculatePlayerRank() {
    if (!this.currentUser) {
      this.currentPlayerRank = null;
      this.notifyRankChange(null);
      return;
    }

    const uid = this.currentUser.uid;
    const index = this.leaderboardEntries.findIndex(e => e.uid === uid);

    if (index !== -1) {
      this.currentPlayerRank = {
        rank: index + 1,
        totalPlayers: this.leaderboardEntries.length,
        entry: this.leaderboardEntries[index]
      };
    } else {
      this.currentPlayerRank = {
        rank: null, // Unranked yet
        totalPlayers: this.leaderboardEntries.length,
        entry: null
      };
    }

    this.notifyRankChange(this.currentPlayerRank);
  }

  // Submit test score to global leaderboard
  async submitScore(wpm, accuracy, rankTitle = 'Java Typist', rankBadge = '☕') {
    if (!this.currentUser || !this.database) return false;
    if (!Number.isFinite(wpm) || wpm <= 0) return false;

    const user = this.currentUser;
    const scoreRef = ref(this.database, `typewriterLeaderboard/${user.uid}`);
    const displayName = user.displayName || 'Java Student';
    const photoURL = user.photoURL || null;

    // Get user stats from localStorage to get test count
    let testsCompleted = 1;
    try {
      const stats = JSON.parse(localStorage.getItem('typewriter_stats') || '{}');
      testsCompleted = stats.testsCompleted || 1;
    } catch (_) {}

    const payload = {
      uid: user.uid,
      displayName,
      photoURL,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy),
      rankTitle,
      rankBadge,
      testsCompleted,
      updatedAt: serverTimestamp()
    };

    try {
      await runTransaction(scoreRef, (current) => {
        // Only update if new WPM is higher, or if same WPM and higher accuracy
        if (current && typeof current.wpm === 'number') {
          if (current.wpm > wpm) return;
          if (current.wpm === wpm && (current.accuracy || 0) >= accuracy) return;
        }
        return payload;
      });
      console.info('[TypeWriterLeaderboard] Score committed to Firebase successfully:', payload);
      return true;
    } catch (txErr) {
      console.warn('[TypeWriterLeaderboard] Transaction failed, trying direct set fallback:', txErr);
      try {
        await set(scoreRef, payload);
        console.info('[TypeWriterLeaderboard] Score uploaded to Firebase via set fallback:', payload);
        return true;
      } catch (setErr) {
        console.error('[TypeWriterLeaderboard] Failed to upload score to Firebase (permission denied):', setErr);
        return false;
      }
    }
  }

  // Sync personal best from localStorage upon login
  syncLocalHighScore() {
    try {
      const stats = JSON.parse(localStorage.getItem('typewriter_stats') || '{}');
      if (stats.highWpm && stats.highWpm > 0) {
        this.submitScore(stats.highWpm, 95, 'Java Byte Coder', '🌱☕');
      }
    } catch (e) {
      console.warn(e);
    }
  }
}

// Global instance exposed on window for access across app.js and UI
window.typeWriterAuth = new TypeWriterAuthLeaderboard();
