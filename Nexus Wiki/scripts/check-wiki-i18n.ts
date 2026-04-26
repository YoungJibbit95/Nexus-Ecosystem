import { entries } from '../src/data/wikiEntries';
import { englishEntryTranslations } from '../src/data/wikiEntryTranslations';
import { localizeEntry, makeSearchBlob, normalizeText } from '../src/pages/wikiPageData';

const ids = new Set(entries.map((entry) => entry.id));
const translationIds = Object.keys(englishEntryTranslations);

const missing = [...ids].filter((id) => !translationIds.includes(id));
const extra = translationIds.filter((id) => !ids.has(id));

const germanNeedles = [
  ' fuer ',
  ' und ',
  ' ist ',
  ' wird ',
  ' werden ',
  ' mit ',
  ' ueber ',
  ' oeffnen',
  ' schliessen',
  ' pruefen',
  ' waehlen',
  ' nutzen',
  ' anlegen',
  ' ausfuehren',
  ' verfuegbar',
  ' gesperrt',
  'Gesamtueberblick',
  'Schritt-fuer-Schritt',
];

const germanLikeHits: string[] = [];
for (const source of entries) {
  const entry = localizeEntry(source, 'en');
  const text = [
    entry.title,
    entry.summary,
    ...entry.guide.flatMap((step) => [step.title, step.detail]),
    ...entry.points,
    ...entry.commands,
    ...(entry.markdownSnippets ?? []).flatMap((snippet) => [snippet.label, snippet.description, snippet.snippet]),
  ].join('\n');

  for (const needle of germanNeedles) {
    if (text.includes(needle)) germanLikeHits.push(`${entry.id}: ${needle}`);
  }
}

const localizedEntries = entries.map((entry) => localizeEntry(entry, 'en'));
const searchChecks = ['nexus-kanban', 'render diagnostics', 'canvas magic', 'today layer', 'keybinds'];
const missingSearchHits = searchChecks.filter((query) => {
  const normalized = normalizeText(query);
  return !localizedEntries.some((entry) => makeSearchBlob(entry).includes(normalized));
});

if (missing.length || extra.length || germanLikeHits.length || missingSearchHits.length) {
  console.error('[wiki-i18n] FAIL', JSON.stringify({ missing, extra, germanLikeHits, missingSearchHits }, null, 2));
  process.exit(1);
}

console.log('[wiki-i18n] PASS', JSON.stringify({ entries: entries.length, translations: translationIds.length, searchChecks }, null, 2));
