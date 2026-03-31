import type { WikiEntry } from './wikiData'
import { wikiEntriesPrimary } from './wikiEntriesPrimary'
import { wikiEntriesSecondary } from './wikiEntriesSecondary'

export const entries: WikiEntry[] = [
  ...wikiEntriesPrimary,
  ...wikiEntriesSecondary,
]
