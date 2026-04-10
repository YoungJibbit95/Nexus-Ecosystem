import React from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export type NotesLocalSettings = {
  fontSize: number
  fontFamily: string
  lineHeight: number
  mode: 'light' | 'dark'
  autosave: boolean
  autosaveInterval: number
  wordWrap: boolean
  lineNumbers: boolean
  minimap: boolean
  cursorAnimation: boolean
  tabSize: number
  compactMode: boolean
  panelRadius: number
  shadowDepth: number
  spacingDensity: 'comfortable' | 'compact' | 'spacious'
}

type NotesSettingsModalProps = {
  open: boolean
  mode: 'dark' | 'light'
  accent: string
  accent2: string
  localSettings: NotesLocalSettings
  setLocalSettings: React.Dispatch<React.SetStateAction<NotesLocalSettings>>
  onApply: () => void
  onClose: () => void
}

export function NotesSettingsModal({
  open,
  mode,
  accent,
  accent2,
  localSettings,
  setLocalSettings,
  onApply,
  onClose,
}: NotesSettingsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'relative',
              zIndex: 1,
              width: 380,
              maxHeight: '80vh',
              overflowY: 'auto',
              background: mode === 'dark' ? 'rgba(14,14,26,0.97)' : 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(24px)',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>📝 Notes Settings</span>
              <button
                onClick={onClose}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Schriftgröße', key: 'fontSize', min: 10, max: 24, step: 1 },
                { label: 'Zeilenhöhe', key: 'lineHeight', min: 1, max: 3, step: 0.1 },
                { label: 'Tab Size', key: 'tabSize', min: 2, max: 8, step: 2 },
              ].map(({ label, key, min, max, step }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ opacity: 0.8 }}>{label}</span>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={(localSettings as any)[key]}
                    onChange={e => setLocalSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                    style={{
                      width: 60,
                      padding: '4px 8px',
                      borderRadius: 7,
                      fontSize: 12,
                      textAlign: 'right',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none',
                      color: 'inherit',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ opacity: 0.8 }}>Schriftart</span>
                <select
                  value={localSettings.fontFamily}
                  onChange={e => setLocalSettings(s => ({ ...s, fontFamily: e.target.value }))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 7,
                    fontSize: 11,
                    background: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none',
                    color: 'inherit',
                  }}
                >
                  {['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Monaco', 'Inter', 'system-ui'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              {[
                { label: 'Wortumbruch', key: 'wordWrap' },
                { label: 'Zeilennummern', key: 'lineNumbers' },
                { label: 'Autosave', key: 'autosave' },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ opacity: 0.8 }}>{label}</span>
                  <input
                    type="checkbox"
                    checked={(localSettings as any)[key]}
                    onChange={e => setLocalSettings(s => ({ ...s, [key]: e.target.checked }))}
                    style={{ cursor: 'pointer', accentColor: accent, width: 15, height: 15 }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={onApply}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '10px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                color: '#fff',
                background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                boxShadow: `0 4px 14px ${accent}44`,
                transition: 'all 0.15s',
              }}
            >
              ✓ Anwenden
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
