import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AppState {
  unlocked: boolean
  userName: string
  setUserName: (name: string) => void
  unlock: () => void
}

const Ctx = createContext<AppState>({
  unlocked: false,
  userName: '',
  setUserName: () => {},
  unlock: () => {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('ts_unlocked') === '1')
  const [userName, setUserNameState] = useState(() => localStorage.getItem('ts_name') ?? '')

  const unlock = () => {
    setUnlocked(true)
    localStorage.setItem('ts_unlocked', '1')
  }

  const setUserName = (name: string) => {
    setUserNameState(name)
    localStorage.setItem('ts_name', name)
  }

  useEffect(() => {
    if (!unlocked) localStorage.removeItem('ts_unlocked')
  }, [unlocked])

  return <Ctx.Provider value={{ unlocked, userName, setUserName, unlock }}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
