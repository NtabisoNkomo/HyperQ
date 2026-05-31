import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FirebaseProvider } from './context/FirebaseContext';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </FirebaseProvider>
  );
}

export default App;
