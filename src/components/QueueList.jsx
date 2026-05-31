import { useQueue, useIsHost, toggleVote } from '../hooks/useFirebase';
import { useAuth } from '../context/FirebaseContext';
import { ref, remove, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, X, Flame, Skull, PartyPopper } from 'lucide-react';

const REACTIONS = [
  { id: 'fire', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  { id: 'skull', icon: Skull, color: 'text-gray-300', bg: 'bg-gray-500/20' },
  { id: 'party', icon: PartyPopper, color: 'text-yellow-400', bg: 'bg-yellow-400/20' }
];

export default function QueueList({ roomId }) {
  const queue = useQueue(roomId);
  const isHost = useIsHost(roomId);
  const { currentUser } = useAuth();

  const handleRemove = async (songId) => {
    if (!isHost) return;
    await remove(ref(db, `rooms/${roomId}/queue/${songId}`));
  };

  const handleVote = (songId) => {
    if (!currentUser) return;
    toggleVote(roomId, songId, currentUser.uid);
  };

  const handleReaction = async (songId, reactionId) => {
    if (!currentUser) return;
    const reactionRef = ref(db, `rooms/${roomId}/queue/${songId}/reactions/${reactionId}/${currentUser.uid}`);
    
    // Quick toggle
    const song = queue.find(s => s.id === songId);
    const hasReacted = song?.reactions?.[reactionId]?.[currentUser.uid];
    
    if (hasReacted) {
      await remove(reactionRef);
    } else {
      await set(reactionRef, true);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/40 p-6">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <ThumbsUp className="w-8 h-8 opacity-50" />
        </div>
        <p className="font-medium text-lg">The queue is empty.</p>
        <p className="text-sm">Search and add some songs below!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-3">
        <AnimatePresence>
          {queue.map((song, index) => {
            const hasVoted = song.votes && currentUser && song.votes[currentUser.uid];
            
            return (
              <motion.div
                layout // Enables automatic animation when position changes
                key={song.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-brand-surface border border-white/5 rounded-2xl p-3 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors relative group overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  {/* Ranking Number */}
                  <div className="w-8 shrink-0 text-center font-display font-bold text-white/20">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-lg overflow-hidden relative">
                    <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-white text-sm md:text-base truncate" title={song.title}>
                      {song.title}
                    </h3>
                    <p className="text-white/50 text-xs md:text-sm truncate" title={song.artist}>
                      {song.artist} • {song.duration}
                    </p>
                  </div>

                  {/* Controls Area */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Vote Button */}
                    <button 
                      onClick={() => handleVote(song.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                        hasVoted 
                          ? 'bg-brand-violet/20 text-brand-violet' 
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <motion.div
                        key={song.voteCount} // Triggers animation on count change
                        initial={{ scale: 1.5, color: '#EC4899' }}
                        animate={{ scale: 1, color: hasVoted ? 'var(--color-brand-violet)' : '' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="flex items-center gap-2"
                      >
                        <ThumbsUp className={`w-5 h-5 ${hasVoted ? 'fill-current' : ''}`} />
                        <span className="font-bold text-lg min-w-[1ch] text-center">
                          {song.voteCount || 0}
                        </span>
                      </motion.div>
                    </button>

                    {/* Host Remove Button */}
                    {isHost && (
                      <button
                        onClick={() => handleRemove(song.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/40 hover:bg-brand-pink/20 hover:text-brand-pink transition-colors"
                        title="Remove from queue"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Emoji Reactions Bar */}
                <div className="flex flex-wrap items-center gap-2 pl-12 ml-4">
                  {REACTIONS.map(reaction => {
                    const reactCount = song.reactions?.[reaction.id] ? Object.keys(song.reactions[reaction.id]).length : 0;
                    const hasReacted = song.reactions?.[reaction.id]?.[currentUser?.uid];
                    const Icon = reaction.icon;
                    
                    return (
                      <button
                        key={reaction.id}
                        onClick={() => handleReaction(song.id, reaction.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold transition-all ${
                          hasReacted ? `${reaction.bg} ${reaction.color}` : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${hasReacted ? 'fill-current' : ''}`} />
                        {reactCount > 0 && <span>{reactCount}</span>}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
