import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTerminal } from '../store/terminalStore'
import { useTheme } from '../store/themeStore'
import { useApp } from '../store/appStore'
import { X, ChevronRight, Terminal as TerminalIcon, Maximize2, Minimize2 } from 'lucide-react'

interface NexusTerminalProps {
  setView: (v: any) => void
  openPalette?: () => void
}

export function NexusTerminal({ setView, openPalette }: NexusTerminalProps) {
  const { isOpen, history, executeCommand, setOpen, clearHistory } = useTerminal()
  const t = useTheme()
  const app = useApp()
  const [input, setInput] = useState('')
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, isMinimized])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setInputHistory(prev => [trimmed, ...prev].slice(0, 50))
    setHistoryIdx(-1)
    executeCommand(trimmed, { setView, t, app, openPalette })
    setInput('')
  }, [input, executeCommand, setView, t, app, openPalette])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextIdx = Math.min(historyIdx + 1, inputHistory.length - 1)
      setHistoryIdx(nextIdx)
      setInput(inputHistory[nextIdx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIdx = Math.max(historyIdx - 1, -1)
      setHistoryIdx(nextIdx)
      setInput(nextIdx === -1 ? '' : inputHistory[nextIdx] ?? '')
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      clearHistory()
    }
  }, [historyIdx, inputHistory, setOpen, clearHistory])

  if (!isOpen) return null

  const getLineColor = (type: string) => {
    switch (type) {
      case 'error': return '#FF453A'
      case 'success': return t.accent
      case 'warn': return '#FF9F0A'
      case 'input': return '#ffffff'
      default: return 'rgba(255,255,255,0.75)'
    }
  }

  const getLinePrefix = (type: string) => {
    if (type === 'input') return <span style={{ color: t.accent, opacity: 0.8 }}>❯</span>
    if (type === 'error') return <span style={{ color: '#FF453A', opacity: 0.7 }}>✗</span>
    if (type === 'success') return <span style={{ color: t.accent, opacity: 0.7 }}>✓</span>
    if (type === 'warn') return <span style={{ color: '#FF9F0A', opacity: 0.7 }}>⚠</span>
    return <span style={{ color: 'rgba(255,255,255,0.2)' }}>#</span>
  }

  const terminalHeight = isMinimized ? 44 : 340

  return (
    <AnimatePresence>
      <motion.div
        key="nexus-terminal"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(calc(100vw - 48px), 820px)',
          zIndex: 1000,
        }}
      >
        {/* Terminal shell — fixed height, no growth */}
        <div style={{
          height: terminalHeight,
          transition: 'height 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 18,
          overflow: 'hidden',
          background: t.mode === 'dark' ? 'rgba(8,8,18,0.92)' : 'rgba(240,240,250,0.95)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: `1px solid rgba(255,255,255,0.1)`,
          boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 0 30px ${t.accent}18`,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', flexShrink: 0,
            borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <TerminalIcon size={11} style={{ color: t.accent }} />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                  Nexus Console
                </span>
              </div>
              {/* Traffic lights */}
              <div style={{ display: 'flex', gap: 6, opacity: 0.3 }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={clearHistory}
                title="Clear (Ctrl+L)"
                className="nx-btn-ghost"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: '0.1em', fontWeight: 700,
                  padding: '4px 8px', borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
              >
                CLEAR
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', padding: '4px 6px', borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s', display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'none' }}
              >
                {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close (Esc)"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', padding: '4px 6px', borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s', display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FF453A'; e.currentTarget.style.background = 'rgba(255,69,58,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'none' }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* History — scrollable, bounded, no size growth */}
          {!isMinimized && (
            <>
              <div
                ref={scrollRef}
                className="custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '14px 18px 8px',
                  fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                  fontSize: 12,
                  lineHeight: 1.65,
                  background: 'rgba(0,0,0,0.28)',
                  minHeight: 0,
                  /* Critical: content NEVER expands this div */
                  maxHeight: '100%',
                }}
              >
                {history.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.1 }}>
                    <TerminalIcon size={36} />
                    <div style={{ marginTop: 10, fontSize: 10, fontWeight: 800, letterSpacing: '0.5em', textTransform: 'uppercase' }}>Link Established</div>
                  </div>
                ) : (
                  history.map((line, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 3,
                      animation: 'nexus-fade-in 0.15s ease both',
                    }}>
                      <span style={{ flexShrink: 0, width: 14, display: 'flex', alignItems: 'center', paddingTop: 1 }}>
                        {getLinePrefix(line.type)}
                      </span>
                      <span style={{
                        color: getLineColor(line.type),
                        textShadow: line.type === 'success' ? `0 0 10px ${t.accent}55` : 'none',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        {line.text}
                      </span>
                      <span style={{ fontSize: 9, opacity: 0.2, flexShrink: 0, paddingTop: 2 }}>
                        {new Date(line.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Quick command chips */}
              <div style={{ display: 'flex', gap: 6, padding: '8px 14px 0', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                {['help', 'stats', 'views', 'new note', 'new task', 'palette'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setInput(c)
                      setTimeout(() => inputRef.current?.focus(), 10)
                    }}
                    style={{
                      border: `1px solid rgba(${t.mode === 'dark' ? '255,255,255' : '0,0,0'},0.12)`,
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 99,
                      padding: '3px 8px',
                      fontSize: 10,
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                style={{
                  padding: '10px 18px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
                }}
              >
                <ChevronRight size={14} style={{ color: t.accent, flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Befehl eingeben... (help)"
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                    fontSize: 12, color: '#fff', minWidth: 0,
                  }}
                />
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {['↑↓', 'ENTER'].map(k => (
                    <kbd key={k} style={{
                      padding: '2px 6px', borderRadius: 5, fontSize: 9, fontWeight: 800,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em',
                    }}>{k}</kbd>
                  ))}
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
