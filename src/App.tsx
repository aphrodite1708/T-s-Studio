import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import PasswordGate from './components/PasswordGate'
import Nav from './components/Nav'
import Home from './pages/Home'
import MusicMaker from './pages/MusicMaker'
import LyricsWriter from './pages/LyricsWriter'

function Inner() {
  const { unlocked } = useApp()
  if (!unlocked) return <PasswordGate />
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/music" element={<MusicMaker />} />
        <Route path="/lyrics" element={<LyricsWriter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
