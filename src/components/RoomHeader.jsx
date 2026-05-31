import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, X, Users, Settings, Palette, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParticipants, useIsHost, useRoom } from '../hooks/useFirebase';
import { useAuth } from '../context/FirebaseContext';
import { ref, update, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

const THEMES = [
  { name: 'Neon Violet', color: '#7C3AED' },
  { name: 'Cyberpunk Blue', color: '#06B6D4' },
  { name: 'Acid Green', color: '#84CC16' },
  { name: 'Crimson Red', color: '#E11D48' }
];

export default function RoomHeader({ roomId }) {
  const [showQR, setShowQR] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  
  const participantCount = useParticipants(roomId);
  const isHost = useIsHost(roomId);
  const room = useRoom(roomId);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const roomUrl = window.location.href;

  useEffect(() => {
    if (isHost && showSettings) {
      const pRef = ref(db, `rooms/${roomId}/participants`);
      const unsub = onValue(pRef, (snap) => {
        const val = snap.val() || {};
        const list = Object.keys(val).map(uid => ({
          uid,
          ...val[uid]
        }));
        setParticipantsList(list);
      });
      return () => unsub();
    }
  }, [roomId, isHost, showSettings]);

  const handleChangeTheme = async (color) => {
    await update(ref(db, `rooms/${roomId}/meta`), { themeColor: color });
  };

  const handleTransferHost = async (newUid) => {
    if (window.confirm("Are you sure you want to transfer host powers? You will become a regular participant.")) {
      await update(ref(db, `rooms/${roomId}/meta`), { hostUid: newUid });
      setShowSettings(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-panel border-x-0 border-t-0 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Room Code</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
              title="Copy Room Code"
            >
              <span className="font-display font-bold tracking-widest">{roomId}</span>
            </button>
            <button 
              onClick={() => setShowQR(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/60 hover:text-white"
              title="Show QR Code"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse" />
            <Users className="w-4 h-4" />
            {participantCount}
          </div>
          
          {isHost && (
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded bg-white/5 hover:bg-white/10 transition-colors text-[var(--color-brand-violet)] hover:text-white" 
              title="Host Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={() => navigate('/')}
            className="text-xs font-bold text-white/60 hover:text-white px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowQR(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-surface border border-white/10 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between">
                <h3 className="font-display font-bold text-xl">Join Room</h3>
                <button onClick={() => setShowQR(false)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={roomUrl} size={200} />
              </div>
              
              <p className="text-center text-white/60 text-sm">
                Scan this code with your camera to join the queue instantly.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Settings Modal */}
      <AnimatePresence>
        {showSettings && isHost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-surface border border-white/10 rounded-3xl p-6 max-w-md w-full flex flex-col gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Settings className="w-5 h-5 text-white/60" />
                  Host Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Theme Picker */}
              <div>
                <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Room Theme
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map(theme => (
                    <button
                      key={theme.color}
                      onClick={() => handleChangeTheme(theme.color)}
                      className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all ${
                        room?.themeColor === theme.color 
                          ? 'border-white/40 bg-white/10' 
                          : 'border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }} />
                      <span className="text-sm font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Transfer */}
              <div>
                <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4" /> Transfer Host
                </h4>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {participantsList.map(p => (
                    <div key={p.uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                      <span className="text-sm font-medium text-white/80">
                        {p.uid === currentUser?.uid ? 'You' : `Guest_${p.uid.substring(0, 5)}`}
                      </span>
                      {p.uid !== currentUser?.uid && (
                        <button
                          onClick={() => handleTransferHost(p.uid)}
                          className="text-xs px-2 py-1 bg-white/10 hover:bg-brand-pink text-white rounded font-bold transition-colors"
                        >
                          Make Host
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
