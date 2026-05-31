import { useState } from 'react';
import { useNowPlaying, useIsHost, useQueue } from '../hooks/useFirebase';
import { ref, set, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { SkipForward, Music, PlayCircle, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';

export default function NowPlayingBanner({ roomId }) {
  const nowPlaying = useNowPlaying(roomId);
  const isHost = useIsHost(roomId);
  const queue = useQueue(roomId);
  
  const [jukeboxStarted, setJukeboxStarted] = useState(false);
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSkip = async () => {
    if (queue.length === 0) {
      alert("Queue is empty — add a song!");
      return;
    }

    const topSong = queue[0];
    
    // Log current song to history before skipping (Replay Protection prep)
    if (nowPlaying) {
      await set(ref(db, `rooms/${roomId}/history/${nowPlaying.videoId}`), true);
    }

    // Set next song
    await set(ref(db, `rooms/${roomId}/nowPlaying`), {
      ...topSong,
      startedAt: Date.now()
    });

    // Remove from queue
    await remove(ref(db, `rooms/${roomId}/queue/${topSong.id}`));
  };

  const onPlayerEnd = () => {
    if (isHost) {
      handleSkip();
    }
  };

  const onPlayerReady = (event) => {
    setPlayer(event.target);
    event.target.playVideo();
  };

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  return (
    <div className="relative w-full overflow-hidden p-6 border-b border-white/5 bg-brand-surface/40 backdrop-blur-md">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[150%] bg-brand-violet/5 blur-[50px] pointer-events-none" />
      
      {/* Invisible YouTube Player for Host */}
      {isHost && jukeboxStarted && nowPlaying && (
        <div className="hidden">
          <YouTube
            videoId={nowPlaying.videoId}
            opts={{
              height: '0',
              width: '0',
              playerVars: {
                autoplay: 1,
                controls: 0,
              },
            }}
            onReady={onPlayerReady}
            onEnd={onPlayerEnd}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between gap-4">
        <AnimatePresence mode="wait">
          {nowPlaying ? (
            <motion.div 
              key={nowPlaying.id || nowPlaying.videoId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img 
                  src={nowPlaying.thumbnail} 
                  alt={nowPlaying.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                {/* Playing Indicator */}
                {isPlaying && (
                  <div className="absolute bottom-2 right-2 flex items-end gap-0.5 h-3">
                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }} className="w-1 bg-brand-pink rounded-full" />
                    <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.2 }} className="w-1 bg-brand-pink rounded-full" />
                    <motion.div animate={{ height: [6, 10, 6] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.4 }} className="w-1 bg-brand-pink rounded-full" />
                  </div>
                )}
                {!isPlaying && jukeboxStarted && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-brand-pink uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  Now Playing {(!isPlaying && jukeboxStarted) && <span className="text-white/40">(Paused)</span>}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-white truncate" title={nowPlaying.title}>
                  {nowPlaying.title}
                </h2>
                <p className="text-white/60 text-sm truncate" title={nowPlaying.artist}>
                  {nowPlaying.artist} • {nowPlaying.duration}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 flex-1 py-2 opacity-50"
            >
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                <Music className="w-6 h-6 text-white/40" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white/60">No song playing yet</h2>
                <p className="text-white/40 text-sm">Add one to the queue!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="shrink-0 flex items-center gap-2">
          {isHost && !jukeboxStarted && (
            <button 
              onClick={() => setJukeboxStarted(true)}
              className="flex items-center gap-2 px-4 py-3 bg-brand-pink hover:bg-brand-pink/80 text-white rounded-xl transition-colors shadow-[0_0_15px_rgba(236,72,153,0.5)]"
            >
              <PlayCircle className="w-5 h-5" />
              <span className="font-bold text-sm hidden md:inline">Start Jukebox</span>
            </button>
          )}

          {isHost && jukeboxStarted && nowPlaying && (
            <button 
              onClick={togglePlayPause}
              className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-colors text-white"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
          )}

          {isHost && (
            <button 
              onClick={handleSkip}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group"
              title="Skip"
            >
              <SkipForward className="w-5 h-5 text-white/60 group-hover:text-white" />
              <span className="font-bold text-sm hidden md:inline group-hover:text-white text-white/60">Skip</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
