import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useFirebase';
import RoomHeader from '../components/RoomHeader';
import NowPlayingBanner from '../components/NowPlayingBanner';
import QueueList from '../components/QueueList';
import AddSongBar from '../components/AddSongBar';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const room = useRoom(roomId);

  useEffect(() => {
    if (room !== null) {
      if (!room.isActive || room.expiresAt < Date.now()) {
        alert("This session has ended.");
        navigate('/');
      }
    }
  }, [room, navigate]);

  if (room === null) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">Loading room...</div>;
  }

  // Dynamic Room Theming
  const themeColor = room.themeColor || '#7C3AED'; // Default Violet

  return (
    <div 
      className="min-h-screen h-screen flex flex-col bg-brand-bg relative overflow-hidden transition-colors duration-1000"
      style={{ '--color-brand-violet': themeColor }}
    >
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000" 
        style={{ backgroundColor: `${themeColor}20` }} // 20 represents opacity in hex
      />

      <RoomHeader roomId={roomId} />

      <NowPlayingBanner roomId={roomId} />

      <QueueList roomId={roomId} />

      <div className="p-4 z-50 bg-gradient-to-t from-brand-bg via-brand-bg to-transparent pt-12 pb-6 px-4 md:px-8 w-full border-t border-white/5">
         <AddSongBar roomId={roomId} />
      </div>
    </div>
  );
}
