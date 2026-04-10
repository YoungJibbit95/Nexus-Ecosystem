import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X } from 'lucide-react'
import { Glass } from './Glass'
import { useTheme } from '../store/themeStore'
import type { View } from './Sidebar'

type WalkthroughStep = {
  id: string
  title: string
  description: string
  view: View
  hint: string
  keybinds: string[]
}

const STEPS: WalkthroughStep[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Schneller Überblick über Fortschritt, Tasks und Aktivität. Im Layout-Editor kannst du Widgets frei anordnen und jetzt auch Plätze direkt tauschen.',
    view: 'dashboard',
    hint: 'Tipp: Nutze den Layout-Modus für eine persönliche Startseite pro Workflow.',
    keybinds: ['Shift + D (Layout öffnen)'],
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Markdown-Editor mit Magic-Blöcken, Split-View und Import. Die Guide-Notiz zeigt alle Features und Keybinds.',
    view: 'notes',
    hint: 'Importiere bestehende .md Dateien direkt über den neuen Import-Button.',
    keybinds: ['Cmd/Ctrl + S', 'Cmd/Ctrl + B', 'Cmd/Ctrl + K'],
  },
  {
    id: 'canvas',
    title: 'Canvas',
    description: 'Visuelle Planung mit Nodes, Verbindungen und Magic-Templates. Beim ersten Start ist ein Demo-Canvas mit Workflow enthalten.',
    view: 'canvas',
    hint: 'Magic Templates sind jetzt stärker auf Delivery, Meetings und Projektsteuerung ausgelegt.',
    keybinds: ['Cmd/Ctrl + M', 'F', 'G', 'P'],
  },
  {
    id: 'files',
    title: 'Files & Workspace',
    description: 'Lege einen Workspace-Ordner fest. Runtime-Daten werden automatisch synchronisiert, manuelles Import/Export bleibt zusätzlich verfügbar.',
    view: 'files',
    hint: 'Aktiviere Auto-Sync in FilesView für kontinuierliches Speichern auf Disk.',
    keybinds: ['Workspace laden', 'Workspace synchronisieren'],
  },
  {
    id: 'code',
    title: 'Code',
    description: 'Code-Ansicht zum schnellen Prototyping. Eine Beispiel-Datei wird direkt mitgeliefert, damit du sofort testen kannst.',
    view: 'code',
    hint: 'Nutze FilesView + Workspace-Ordner, um Code-Artefakte geordnet zu sichern.',
    keybinds: ['Cmd/Ctrl + S'],
  },
]

export function WelcomeWalkthrough({
  open,
  onClose,
  onOpenView,
}: {
  open: boolean
  onClose: () => void
  onOpenView: (view: View) => void
}) {
  const t = useTheme()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (open) {
      setIndex(0)
    }
  }, [open])

  const step = useMemo(() => STEPS[Math.max(0, Math.min(STEPS.length - 1, index))], [index])

  useEffect(() => {
    if (!open) return
    onOpenView(step.view)
  }, [open, onOpenView, step.view])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 16, 0.62)',
        backdropFilter: 'blur(6px)',
        zIndex: 4200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <Glass
        glow
        style={{
          width: 'min(760px, calc(100vw - 32px))',
          maxHeight: 'min(680px, calc(100vh - 40px))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Sparkles size={14} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Nexus Quick Walkthrough</div>
              <div style={{ fontSize: 11, opacity: 0.56 }}>Erststart-Guide für die wichtigsten Views</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'inherit',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {STEPS.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  background:
                    i <= index
                      ? `linear-gradient(90deg, ${t.accent}, ${t.accent2})`
                      : 'rgba(255,255,255,0.12)',
                  transition: 'all 180ms ease',
                }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ fontSize: 12, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Schritt {index + 1} von {STEPS.length}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{step.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.85 }}>{step.description}</div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 12,
                  opacity: 0.88,
                }}
              >
                {step.hint}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {step.keybinds.map((keybind) => (
                  <span
                    key={keybind}
                    style={{
                      fontSize: 11,
                      padding: '5px 8px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    {keybind}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: index === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                color: 'inherit',
                cursor: index === 0 ? 'not-allowed' : 'pointer',
                opacity: index === 0 ? 0.45 : 1,
              }}
            >
              <ArrowLeft size={14} /> Zurück
            </button>
            <button
              onClick={() => onOpenView(step.view)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.07)',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              View öffnen
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.07)',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              Überspringen
            </button>
            {index < STEPS.length - 1 ? (
              <button
                onClick={() => setIndex((value) => Math.min(STEPS.length - 1, value + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Weiter <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Fertig <CheckCircle2 size={14} />
              </button>
            )}
          </div>
        </div>
      </Glass>
    </div>
  )
}
