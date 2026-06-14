import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Nav() {
  const { pathname } = useLocation()
  const { userName } = useApp()

  if (pathname === '/') return null

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        <span className="nav-t">T</span><span className="nav-apos">'s</span> Studio
      </Link>
      <div className="nav-links">
        <Link to="/music" className={'nav-link' + (pathname === '/music' ? ' active' : '')}>
          Make Music
        </Link>
        <Link to="/lyrics" className={'nav-link' + (pathname === '/lyrics' ? ' active' : '')}>
          Lyrics
        </Link>
      </div>
      {userName && <span className="nav-name">{userName}</span>}
    </nav>
  )
}
