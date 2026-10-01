import type { PlatformResult } from '../../platform/contracts.ts';
import { failure, success } from '../../platform/errors.ts';
export interface CommandDefinition {
  id: string; title: string; category: string; defaultShortcut?: string;
  aliases?: readonly string[]; searchTerms?: readonly string[];
  availability?: () => { enabled: boolean; reason?: string };
  handler: () => void | Promise<void>;
}
export interface CommandDescription {
  id: string; title: string; category: string; defaultShortcut?: string;
  enabled: boolean; disabledReason?: string; searchTerms: readonly string[];
}
export function createCommandRegistry(definitions: readonly CommandDefinition[]) {
  const commands = new Map<string, CommandDefinition>();
  const identities = new Map<string, string>();
  for (const definition of definitions) {
    if (!definition.id.trim() || identities.has(definition.id)) throw new Error('Duplicate or empty command identity');
    commands.set(definition.id, definition);
    for (const id of [definition.id, ...(definition.aliases ?? [])]) {
      if (!id.trim() || identities.has(id)) throw new Error('Duplicate or empty command alias');
      identities.set(id, definition.id);
    }
  }
  function describe(id: string): CommandDescription | undefined {
    const definition = commands.get(identities.get(id) ?? '');
    if (!definition) return undefined;
    let availability: {enabled:boolean; reason?:string};
    try { availability = definition.availability?.() ?? {enabled:true}; }
    catch { availability = {enabled:false,reason:'This command is currently unavailable.'}; }
    return { id: definition.id, title: definition.title, category: definition.category,
      defaultShortcut: definition.defaultShortcut, enabled: availability.enabled,
      ...(!availability.enabled ? { disabledReason: availability.reason ?? 'This command is currently unavailable.' } : {}),
      searchTerms: definition.searchTerms ?? [], };
  }
  async function execute(id: string): Promise<PlatformResult<void>> {
    const description = describe(id);
    if (!description?.enabled) return failure(`command.${description?.id ?? 'unknown'}`, undefined, 'UNAVAILABLE');
    const definition = commands.get(description.id);
    if (!definition) return failure('command.unknown', undefined, 'UNAVAILABLE');
    try { await definition.handler(); return success(undefined); }
    catch (error) { return failure(`command.${description.id}`, error); }
  }
  return { has: (id: string) => identities.has(id), describe, execute,
    list: () => [...commands.keys()].map(id => describe(id)).filter((item): item is CommandDescription => !!item), };
}
export type CommandRegistry = ReturnType<typeof createCommandRegistry>;
export function applyCommandAuthority<T extends { id: string; actionId?: string; enabled?: boolean }>(items: readonly T[], registry?: CommandRegistry): readonly (T & {canonicalCommandId?:string; disabledReason?:string})[] {
  if (!registry) return items;
  return items.map(item => {
    const command = registry.describe(item.actionId ?? item.id);
    // Keep legacy ranking/icons/localized labels; authority owns availability and dispatch ID.
    return command ? { ...item, enabled: command.enabled, disabledReason: command.disabledReason, canonicalCommandId: command.id } : item;
  });
}
