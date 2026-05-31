import { useState, useEffect } from 'react';
import { ref, onValue, set, remove, runTransaction, onDisconnect, update, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/FirebaseContext';

// Subscribe to room meta
export function useRoom(roomId) {
  const [room, setRoom] = useState(null);
  
  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}/meta`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoom(snapshot.val());
    });
    return () => unsubscribe();
  }, [roomId]);

  return room;
}

// Subscribe to sorted queue
export function useQueue(roomId) {
  const [queue, setQueue] = useState([]);
  
  useEffect(() => {
    if (!roomId) return;
    const queueRef = ref(db, `rooms/${roomId}/queue`);
    const unsubscribe = onValue(queueRef, (snapshot) => {
      const raw = snapshot.val() || {};
      const sorted = Object.values(raw).sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.addedAt - b.addedAt; // tie-break: oldest first
      });
      setQueue(sorted);
    });
    return () => unsubscribe();
  }, [roomId]);

  return queue;
}

// Subscribe to now playing
export function useNowPlaying(roomId) {
  const [nowPlaying, setNowPlaying] = useState(null);
  
  useEffect(() => {
    if (!roomId) return;
    const nowPlayingRef = ref(db, `rooms/${roomId}/nowPlaying`);
    const unsubscribe = onValue(nowPlayingRef, (snapshot) => {
      setNowPlaying(snapshot.val());
    });
    return () => unsubscribe();
  }, [roomId]);

  return nowPlaying;
}

// Subscribe to participant count
export function useParticipants(roomId) {
  const [count, setCount] = useState(0);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    if (!roomId || !currentUser) return;
    
    // Manage presence
    const participantRef = ref(db, `rooms/${roomId}/participants/${currentUser.uid}`);
    set(participantRef, { joinedAt: Date.now(), lastSeen: Date.now() });
    onDisconnect(participantRef).remove();
    
    const interval = setInterval(() => {
      update(participantRef, { lastSeen: Date.now() });
    }, 30000);

    // Subscribe to count
    const participantsRef = ref(db, `rooms/${roomId}/participants`);
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const p = snapshot.val() || {};
      setCount(Object.keys(p).length);
    });

    return () => {
      clearInterval(interval);
      remove(participantRef); // cleanup on leave
      unsubscribe();
    };
  }, [roomId, currentUser]);

  return count;
}

// Returns boolean if current user is host
export function useIsHost(roomId) {
  const room = useRoom(roomId);
  const { currentUser } = useAuth();
  
  if (!room || !currentUser) return false;
  return room.hostUid === currentUser.uid;
}

// Helper: Toggle Vote
export async function toggleVote(roomId, songId, uid) {
  const voteRef = ref(db, `rooms/${roomId}/queue/${songId}/votes/${uid}`);
  const countRef = ref(db, `rooms/${roomId}/queue/${songId}/voteCount`);

  const snapshot = await get(voteRef);
  if (snapshot.exists()) {
    // Remove vote
    await remove(voteRef);
    await runTransaction(countRef, (count) => (count || 1) - 1);
  } else {
    // Add vote
    await set(voteRef, true);
    await runTransaction(countRef, (count) => (count || 0) + 1);
  }
}
