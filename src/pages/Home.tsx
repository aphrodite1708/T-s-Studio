import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Home() {
  const { userName } = useApp()

  return (
    <div className="home">
      <div className="home-glow" aria-hidden />
      <div className="home-content">
        <p className="home-eyebrow">Welcome back</p>
        <h1 className="home-heading">
          Hey {userName || 'you'},<br />ready to create?
        </h1>
        <p className="home-sub">What are we making today?</p>

        <div className="home-cards">
          <Link to="/music" className="mode-card mode-card-music">
            <div className="mode-card-icon">🎛️</div>
            <div className="mode-card-body">
              <h2>Make My Music</h2>
              <p>Describe your vibe or drop an artist reference — AI builds your sound inspiration.</p>
            </div>
            <span className="mode-card-arrow">→</span>
          </Link>

          <Link to="/lyrics" className="mode-card mode-card-lyrics">
            <div className="mode-card-icon">✍️</div>
            <div className="mode-card-body">
              <h2>Write My Song Lyrics</h2>
              <p>Brainstorm themes, verses, and choruses with AI — or let it write a full draft.</p>
            </div>
            <span className="mode-card-arrow">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
