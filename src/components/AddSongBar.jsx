import { useState } from 'react';
import { Search, Plus, Loader2, ListPlus } from 'lucide-react';
import { ref, set, update, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../context/FirebaseContext';
import { useQueue } from '../hooks/useFirebase';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export default function AddSongBar({ roomId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { currentUser } = useAuth();
  const queue = useQueue(roomId);

  const fetchYoutubeSearch = async (searchQuery) => {
    if (!YOUTUBE_API_KEY) throw new Error("No API Key");
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=6&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    return data.items.map(item => ({
      id: `yt_${item.id.videoId}`,
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      duration: "0:00", // Would need another API call to get duration, keeping simple
    }));
  };

  const fetchYoutubePlaylist = async (playlistId) => {
    if (!YOUTUBE_API_KEY) throw new Error("No API Key");
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    return data.items
      .filter(item => item.snippet.title !== "Private video" && item.snippet.title !== "Deleted video")
      .map(item => ({
        id: `yt_${item.snippet.resourceId.videoId}`,
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url || '',
        duration: "0:00"
      }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResults([]);

    try {
      // Check if it's a playlist URL
      const playlistMatch = query.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      
      if (playlistMatch && playlistMatch[1]) {
        // Handle Playlist
        const items = await fetchYoutubePlaylist(playlistMatch[1]);
        await handleImportPlaylist(items);
        setQuery('');
      } else {
        // Handle normal search
        if (YOUTUBE_API_KEY) {
          const items = await fetchYoutubeSearch(query);
          setResults(items);
        } else {
          // Fallback mock
          setTimeout(() => {
            setResults([{
              id: `mock_${Date.now()}_1`,
              videoId: `dQw4w9WgXcQ`,
              title: `Result for "${query}" (Mock - No API Key)`,
              artist: "Demo Artist",
              thumbnail: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&q=80",
              duration: "3:45"
            }]);
            setIsSearching(false);
          }, 600);
          return;
        }
      }
    } catch (err) {
      console.error(err);
      alert("Search failed. Check your API key or quota.");
    } finally {
      setIsSearching(false);
    }
  };

  const checkReplayProtection = async (videoId) => {
    const snap = await get(ref(db, `rooms/${roomId}/history/${videoId}`));
    return snap.exists();
  };

  const handleAddSong = async (song) => {
    if (!currentUser) return;

    // Check Replay Protection
    const isPlayed = await checkReplayProtection(song.videoId);
    if (isPlayed) {
      alert("This song was already played in this session!");
      return;
    }

    // Check limit (max 3 per user)
    const userSongs = queue.filter(q => q.addedBy === currentUser.uid);
    if (userSongs.length >= 3) {
      alert("You've added your max (3) songs. Wait for them to play!");
      return;
    }

    const newSongId = `song_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const songRef = ref(db, `rooms/${roomId}/queue/${newSongId}`);
    
    await set(songRef, {
      id: newSongId,
      videoId: song.videoId,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      duration: song.duration,
      addedBy: currentUser.uid,
      addedAt: Date.now(),
      voteCount: 1,
      votes: {
        [currentUser.uid]: true
      }
    });

    setQuery('');
    setResults([]);
  };

  const handleImportPlaylist = async (items) => {
    if (!currentUser) return;
    
    const updates = {};
    let addedCount = 0;

    for (const song of items) {
      // Basic replay protection check (for simplicity, we might skip checking all 50 in real time, but let's do a quick one)
      const isPlayed = await checkReplayProtection(song.videoId);
      if (!isPlayed) {
        const newSongId = `song_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        updates[newSongId] = {
          id: newSongId,
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          duration: song.duration,
          addedBy: currentUser.uid,
          addedAt: Date.now() + addedCount, // stagger slightly
          voteCount: 0,
          votes: {}
        };
        addedCount++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(db, `rooms/${roomId}/queue`), updates);
      alert(`Imported ${addedCount} songs from playlist!`);
    } else {
      alert("No new songs to import (they might all be in history).");
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Search Results Dropdown */}
      {results.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-4 bg-brand-surface border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 max-h-[60vh] overflow-y-auto z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-1">
            <span className="text-xs font-bold text-white/40 uppercase">Search Results</span>
            <button 
              onClick={() => setResults([])}
              className="text-xs text-white/40 hover:text-white"
            >
              Clear
            </button>
          </div>
          
          {results.map(song => (
            <div key={song.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
              <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{song.title}</p>
                <p className="text-xs text-white/50">{song.artist}</p>
              </div>
              <button
                onClick={() => handleAddSong(song)}
                className="shrink-0 w-10 h-10 rounded-full bg-brand-violet/20 text-brand-violet flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-violet hover:text-white focus:opacity-100"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative flex items-center bg-[#1E1E2A] rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-brand-violet/50 transition-colors">
        <div className="pl-5 text-white/40">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song or paste a YouTube Playlist URL..."
          className="flex-1 bg-transparent border-none py-5 px-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-0 font-medium"
        />
        <button 
          type="submit" 
          disabled={isSearching || !query.trim()}
          className="mr-2 px-6 py-3 bg-brand-violet hover:bg-brand-violet/80 disabled:bg-white/10 disabled:text-white/30 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
        >
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            query.includes('list=') ? <ListPlus className="w-5 h-5" /> : 'Search'
          )}
        </button>
      </form>
    </div>
  );
}
