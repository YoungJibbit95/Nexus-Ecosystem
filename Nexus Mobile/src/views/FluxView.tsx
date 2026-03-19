import React, { useState } from 'react'
import { Activity as ActivityIcon, Clock, Filter, Trash2, Zap, FileText, Code, CheckSquare, Bell, Package } from 'lucide-react'
import { Glass } from '../components/Glass'
import { useApp, Activity } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { fmtDt } from '../lib/utils'

export function FluxView() {
    const { activities, logActivity } = useApp()
    const t = useTheme()
    const [filter, setFilter] = useState<Activity['type'] | 'all'>('all')

    const filtered = activities.filter(a => filter === 'all' || a.type === filter)

    const TYPE_ICONS: Record<string, any> = {
        note: FileText,
        code: Code,
        task: CheckSquare,
        reminder: Bell,
        system: Package
    }

    const TYPE_COLORS: Record<string, string> = {
        note: '#007AFF',
        code: '#AF52DE',
        task: '#FF9500',
        reminder: '#FF3B30',
        system: '#34C759'
    }

    return (
        <div className="flex flex-col h-full p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-4">
                        <Zap size={32} className="animate-pulse" style={{ color: t.accent }} />
                        Nexus Flux
                    </h1>
                    <p className="text-xs opacity-40 mt-1 uppercase tracking-[0.2em] font-bold">Activity Stream & System Pulse</p>
                </div>

                <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
                    {(['all', 'note', 'code', 'task', 'reminder'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === type ? 'bg-white/10 shadow-lg' : 'opacity-30 hover:opacity-100'}`}
                            style={{ color: filter === type ? t.accent : undefined }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <div className="relative border-l-2 border-white/5 ml-4 pl-8 space-y-6 pb-20">
                    {filtered.map((activity, idx) => {
                        const Icon = TYPE_ICONS[activity.type] || Package
                        const color = TYPE_COLORS[activity.type] || t.accent

                        return (
                            <div key={activity.id} className="relative group animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                                {/* Timeline Dot */}
                                <div
                                    className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-[#1a1a1a] shadow-[0_0_15px_currentColor] transition-transform group-hover:scale-125 group-hover:rotate-12"
                                    style={{ background: color, color: color }}
                                />

                                <Glass className="p-4 border border-white/10 transition-all hover:border-white/20 hover:translate-x-1" hover>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl" style={{ background: `${color}15`, color: color }}>
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black">
                                                    <span className="opacity-40 font-normal mr-2 uppercase tracking-tighter text-[10px]">@{activity.action}</span>
                                                    {activity.targetName}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] opacity-30 font-bold">
                                            <Clock size={12} />
                                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                    </div>
                                    <p className="text-[11px] opacity-40 font-medium">
                                        Action log: System {activity.action} entry "{activity.targetName}" in registry.
                                    </p>
                                </Glass>
                            </div>
                        )
                    })}

                    {filtered.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-20">
                            <ActivityIcon size={48} className="mb-4" />
                            <p className="text-sm font-bold uppercase tracking-[0.2em]">Silence in the flux</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
