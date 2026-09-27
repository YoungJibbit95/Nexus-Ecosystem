import { createBrowserLocalFileRepository } from '@nexus/core/storage/browserLocalFiles'

export const fileRepository = createBrowserLocalFileRepository()
export const loadFilesFromStorage = fileRepository.load
export const saveFilesToStorage = fileRepository.save
if (import.meta.hot) import.meta.hot.dispose(() => fileRepository.dispose())
