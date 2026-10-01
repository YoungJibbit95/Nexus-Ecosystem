import type { WikiAudience, WikiEntry } from './wikiData'
import { wikiEntriesPrimary } from './wikiEntriesPrimary'
import { wikiEntriesSecondary } from './wikiEntriesSecondary'

const audienceFor = (entry: WikiEntry): WikiAudience => entry.audience ?? (
  entry.app === 'control' ? 'operator'
    : entry.app === 'runtime' || entry.category === 'runtime' || entry.id === 'ecosystem-setup-dev' ? 'developer'
      : entry.category === 'ops' || entry.category === 'security' ? 'operator'
        : 'user'
)

export const entries: WikiEntry[] = [
  ...wikiEntriesPrimary,
  ...wikiEntriesSecondary,
].map((entry) => ({ ...entry, audience: audienceFor(entry) }))
