import { createContext, useContext } from 'react'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'

const ActiveView = createContext(true)
export const ViewCommandScope = ActiveView.Provider
export const useActiveViewCommandScope = () => useContext(ActiveView)
export const isViewCommandScopeActive = (active: boolean) => active && !workspaceOperation.isActive()
