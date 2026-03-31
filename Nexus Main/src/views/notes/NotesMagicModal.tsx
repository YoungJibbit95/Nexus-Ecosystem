import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface MagicModalProps {
  accent: string
  accent2: string
  onClose: () => void
  onInsert: (snippet: string) => void
}

type MagicTypeField = {
  key: string
  label: string
  multiline: boolean
  placeholder: string
}

type MagicTypeDef = {
  id: string
  label: string
  icon: string
  desc: string
  color: string
  fields: MagicTypeField[]
  build: (v: Record<string, string>) => string
}

const MAGIC_TYPES: MagicTypeDef[] = [
  {
    id: 'nexus-list', label: 'Liste', icon: '📋', desc: 'Zeilen mit Label und Detail',
    color: '#00AAFF',
    fields: [{ key: 'rows', label: 'Einträge (Label | Detail, eine Zeile pro Eintrag)', multiline: true, placeholder: 'Alpha | Erster Punkt\nBeta | Zweiter Punkt\nGamma | Dritter Punkt' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-list\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-checklist', label: 'Checklist', icon: '☑️', desc: 'Interaktive Checkliste mit Fortschritt',
    color: '#30D158',
    fields: [{ key: 'rows', label: 'Einträge (Text | done/true/false, eine Zeile pro Punkt)', multiline: true, placeholder: 'UI Polish | false\nAPI Contract finalisieren | true\nRelease Smoke-Test | false' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-checklist\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-alert', label: 'Alert Box', icon: '🔔', desc: 'Info, Warnung oder Fehler',
    color: '#FF9F0A',
    fields: [
      { key: 'type', label: 'Typ (info / success / warning / error)', multiline: false, placeholder: 'info' },
      { key: 'msg', label: 'Nachricht', multiline: true, placeholder: 'Wichtige Information hier...' },
    ],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-alert\n${v.type || 'info'}\n${v.msg}\n\`\`\`\n`,
  },
  {
    id: 'nexus-progress', label: 'Fortschritt', icon: '📊', desc: 'Fortschrittsbalken mit Prozent',
    color: '#30D158',
    fields: [{ key: 'rows', label: 'Einträge (Label | Prozent, eine Zeile pro Balken)', multiline: true, placeholder: 'Frontend | 80\nBackend | 65\nDesign | 45' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-progress\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-timeline', label: 'Timeline', icon: '🗓️', desc: 'Zeitstrahl mit Datum und Text',
    color: '#BF5AF2',
    fields: [{ key: 'rows', label: 'Einträge (Datum | Ereignis, eine Zeile pro Punkt)', multiline: true, placeholder: 'Q1 2026 | Projektstart\nQ2 2026 | Alpha Release\nQ3 2026 | Beta Launch' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-timeline\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-grid', label: 'Grid', icon: '⊞', desc: 'Mehrspaltiges Raster',
    color: '#FF6B6B',
    fields: [
      { key: 'cols', label: 'Spalten (Zahl)', multiline: false, placeholder: '2' },
      { key: 'items', label: 'Inhalte (eine Zeile pro Zelle)', multiline: true, placeholder: 'Zelle 1\nZelle 2\nZelle 3\nZelle 4' },
    ],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-grid\n${v.cols || '2'}\n${v.items}\n\`\`\`\n`,
  },
  {
    id: 'nexus-card', label: 'Bild-Karte', icon: '🖼️', desc: 'Karte mit Bild, Titel und Text',
    color: '#FF79C6',
    fields: [
      { key: 'url', label: 'Bild-URL', multiline: false, placeholder: 'https://images.unsplash.com/photo-1618005182384?w=600' },
      { key: 'title', label: 'Titel', multiline: false, placeholder: 'Mein Titel' },
      { key: 'desc', label: 'Beschreibung', multiline: false, placeholder: 'Kurze Beschreibung...' },
    ],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-card\n${v.url} | ${v.title} | ${v.desc}\n\`\`\`\n`,
  },
  {
    id: 'nexus-metrics', label: 'KPI Cards', icon: '📈', desc: 'Kennzahlen mit Wert und Delta',
    color: '#64D2FF',
    fields: [{ key: 'rows', label: 'Einträge (Label | Wert | Delta, eine Zeile pro KPI)', multiline: true, placeholder: 'MRR | 49.2k | +8.4%\nNPS | 61 | +5\nUptime | 99.95% | +0.03%' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-metrics\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-steps', label: 'Process Steps', icon: '🪜', desc: 'Schrittfolge mit Details',
    color: '#30D158',
    fields: [{ key: 'rows', label: 'Einträge (Schritt | Detail, eine Zeile pro Schritt)', multiline: true, placeholder: 'Research | Problem und Zielbild klären\nBuild | Kernfeatures implementieren\nValidate | QA und Feedback einholen' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-steps\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'nexus-quadrant', label: 'Quadrant Board', icon: '🧩', desc: '2x2 Board für Priorisierung und Mapping',
    color: '#FF9F0A',
    fields: [{ key: 'rows', label: 'Einträge (Titel | Inhalt, bis zu 4 Zeilen)', multiline: true, placeholder: 'Quick Wins | Hoher Impact, geringer Aufwand\nBig Bets | Hoher Impact, hoher Aufwand\nFill-ins | Niedriger Impact, geringer Aufwand\nAvoid | Niedriger Impact, hoher Aufwand' }],
    build: (v: Record<string,string>) => `\n\`\`\`nexus-quadrant\n${v.rows}\n\`\`\`\n`,
  },
  {
    id: 'badge', label: 'Badge', icon: '✨', desc: 'Inline-Abzeichen im Text',
    color: '#FFE600',
    fields: [
      { key: 'label', label: 'Text', multiline: false, placeholder: 'Nexus' },
      { key: 'variant', label: 'Farbe (magic / success / warning / error / info)', multiline: false, placeholder: 'magic' },
    ],
    build: (v: Record<string,string>) => `\`b:${v.label || 'Badge'}|${v.variant || 'magic'}\``,
  },
]

export function MagicElementModal({ accent, accent2, onClose, onInsert }: MagicModalProps) {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [fields, setFields] = React.useState<Record<string,string>>({})

  const type = MAGIC_TYPES.find(m => m.id === selected)

  const handleSelect = (id: string) => {
    setSelected(id)
    const t = MAGIC_TYPES.find(m => m.id === id)!
    const defaults: Record<string,string> = {}
    t.fields.forEach(f => { defaults[f.key] = f.placeholder })
    setFields(defaults)
  }

  const handleInsert = () => {
    if (!type) return
    onInsert(type.build(fields))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{
          width: '100%', maxWidth: 720, maxHeight: '85vh',
          background: 'rgba(12,12,22,0.97)',
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 20,
          boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), 0 0 60px ${accent}18`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: `linear-gradient(135deg, ${accent}40, ${accent2}30)`,
              border: `1px solid ${accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>✦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>
                {selected ? `Magic: ${type?.label}` : 'Magic Element einfügen'}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4, marginTop: 1 }}>
                {selected ? type?.desc : 'Wähle ein Element aus'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'inherit',
            fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <X size={12} /> ESC
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: 220, borderRight: '1px solid rgba(255,255,255,0.07)',
            padding: 12, overflowY: 'auto', flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8, paddingLeft: 4 }}>
              Elemente
            </div>
            {MAGIC_TYPES.map(mt => (
              <button
                key={mt.id}
                onClick={() => handleSelect(mt.id)}
                style={{
                  width: '100%', padding: '9px 10px', borderRadius: 10, marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: `1px solid ${selected === mt.id ? mt.color + '50' : 'transparent'}`,
                  background: selected === mt.id ? `${mt.color}18` : 'transparent',
                  color: 'inherit', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (selected !== mt.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (selected !== mt.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{mt.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{mt.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2, lineHeight: 1.3 }}>{mt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.35, gap: 12 }}>
                <div style={{ fontSize: 48 }}>✦</div>
                <div style={{ fontSize: 13, textAlign: 'center' }}>Wähle links ein Element aus<br/>und befülle es mit deinen Daten</div>
              </div>
            ) : type ? (
              <>
                <div style={{ height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${type.color}, ${type.color}44)`, marginBottom: 20 }} />

                {type.fields.map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, opacity: 0.6, marginBottom: 6, fontWeight: 600 }}>
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        value={fields[field.key] ?? ''}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                        rows={field.key === 'rows' || field.key === 'items' ? 5 : 3}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.05)',
                          border: `1px solid rgba(255,255,255,0.1)`,
                          borderRadius: 10, padding: '10px 12px', color: 'inherit',
                          fontFamily: "'Fira Code', monospace", fontSize: 12, lineHeight: 1.6,
                          resize: 'vertical', outline: 'none',
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = type.color + '80' }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={fields[field.key] ?? ''}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.05)',
                          border: `1px solid rgba(255,255,255,0.1)`,
                          borderRadius: 10, padding: '9px 12px', color: 'inherit',
                          fontFamily: 'inherit', fontSize: 12,
                          outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = type.color + '80' }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                    )}
                  </div>
                ))}

                <div style={{ marginTop: 4, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Vorschau</div>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '10px 12px',
                    fontFamily: "'Fira Code', monospace", fontSize: 11, opacity: 0.65,
                    lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    maxHeight: 120, overflowY: 'auto',
                  }}>
                    {type.build(fields)}
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                <button
                  onClick={handleInsert}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff',
                    background: `linear-gradient(135deg, ${type.color}, ${accent2})`,
                    boxShadow: `0 4px 20px ${type.color}44`,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${type.color}55` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${type.color}44` }}
                >
                  <span style={{ fontSize: 16 }}>{type.icon}</span>
                  In Notiz einfügen
                </button>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
