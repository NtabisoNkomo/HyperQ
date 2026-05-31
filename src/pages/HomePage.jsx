import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/FirebaseContext';
import { motion } from 'framer-motion';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export default function HomePage() {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleCreateRoom = async () => {
    if (!currentUser) return;
    setIsCreating(true);
    let code = generateRoomCode();
    
    // Check if exists (simple loop, in reality you might want a better collision check)
    let exists = true;
    while (exists) {
      const snap = await get(ref(db, `rooms/${code}`));
      if (snap.exists()) {
        code = generateRoomCode();
      } else {
        exists = false;
      }
    }

    const roomRef = ref(db, `rooms/${code}/meta`);
    await set(roomRef, {
      createdAt: Date.now(),
      hostUid: currentUser.uid,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      name: "Party Session",
      isActive: true,
      participantCount: 0
    });
    
    navigate(`/room/${code}`);
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    const code = joinCode.toUpperCase();
    
    const metaRef = ref(db, `rooms/${code}/meta`);
    const snap = await get(metaRef);
    
    if (snap.exists()) {
      const room = snap.val();
      if (room.isActive && room.expiresAt > Date.now()) {
        navigate(`/room/${code}`);
      } else {
        setError("This session has ended.");
      }
    } else {
      setError("Room not found.");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-brand-bg opacity-90 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-3xl max-h-[800px] bg-brand-violet/20 rounded-full blur-[100px] mix-blend-screen animate-pulse pointer-events-none" />
      </div>

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-pink mb-4">
            HypeQueue
          </h1>
          <p className="text-xl text-gray-300 font-medium">The queue belongs to everyone.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full space-y-6"
        >
          <button 
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 transition-opacity disabled:opacity-50 glass-panel border-none"
          >
            {isCreating ? 'Creating...' : 'Create a Room'}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/40 text-sm font-medium">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="ENTER ROOM CODE"
                className="w-full text-center py-4 px-6 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-violet outline-none font-display text-2xl tracking-[0.2em] placeholder:text-white/20 transition-colors"
              />
            </div>
            {error && (
              <p className="text-brand-pink text-center text-sm font-medium">{error}</p>
            )}
            <button 
              type="submit"
              disabled={joinCode.length < 1}
              className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              Join a Room
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
