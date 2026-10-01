import { isRecord } from '../platform/errors.ts';
export interface InitialSettings {
  theme: string; font_size: number; font_family: string; tab_size: number;
  word_wrap: boolean; auto_save: boolean; keybinding_overrides: Record<string,string>;
}
export interface SettingDescriptor {
  key: keyof InitialSettings; type: 'string'|'number'|'boolean'|'object';
  default: string|number|boolean|Record<string,string>; category: string; label: string; description: string;
  validate: (value: unknown) => boolean;
  normalize: (value: unknown, fallback: unknown) => unknown;
}
const stringSetting = (key: 'theme'|'font_family', fallback: string, category: string, label: string): SettingDescriptor => ({
  key, type:'string', default:fallback, category,label,description:label,
  validate:value => typeof value === 'string' && value.trim().length > 0,
  normalize:(value, defaultValue) => typeof value === 'string' && value.trim() ? value : defaultValue,
});
const numberSetting = (key: 'font_size'|'tab_size', fallback: number, min: number, max: number, label: string): SettingDescriptor => ({
  key,type:'number',default:fallback,category:'editor',label,description:`${label} (${min}–${max}).`,
  validate:value => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max,
  // Preserve legacy numeric-string coercion/clamping, including tab sizes 2–10.
  normalize:(value, defaultValue) => Number.isFinite(Number(value)) ? Math.max(min,Math.min(max,Number(value))) : defaultValue,
});
const booleanSetting = (key:'word_wrap'|'auto_save', fallback:boolean, label:string): SettingDescriptor => ({
  key,type:'boolean',default:fallback,category:key === 'auto_save' ? 'files':'editor',label,description:label,
  validate:value => typeof value === 'boolean', normalize:(value,defaultValue) => typeof value === 'boolean' ? value:defaultValue,
});
export const initialSettingsSchema: readonly SettingDescriptor[] = [
  stringSetting('theme','nexus_vibrant','appearance','Theme'), stringSetting('font_family','JetBrains Mono','editor','Font family'),
  numberSetting('font_size',14,10,28,'Font size'), numberSetting('tab_size',4,2,10,'Tab size'),
  booleanSetting('word_wrap',false,'Word wrap'), booleanSetting('auto_save',true,'Auto save'),
  { key:'keybinding_overrides',type:'object',default:{},category:'keyboard',label:'Keyboard shortcuts',description:'Overrides by stable command identity.',
    validate:value => isRecord(value) && Object.values(value).every(item => typeof item === 'string'),
    normalize:(value,defaultValue) => isRecord(value) ? Object.fromEntries(Object.entries(value).filter(([,item]) => typeof item === 'string')) : defaultValue },
];
export interface SettingsIssue { key: keyof InitialSettings; code:'INVALID_SETTING'; message:string }
export type CompatibleSettings<T> = T & InitialSettings & Record<string,unknown>;
export function parseInitialSettings<T extends Record<string,unknown>>(stored:unknown, defaults:T): {settings:CompatibleSettings<T>; issues:SettingsIssue[]} {
  const input = isRecord(stored) ? stored : {};
  const settings: Record<string,unknown> = {...defaults,...input};
  const issues: SettingsIssue[] = [];
  for (const descriptor of initialSettingsSchema) {
    const fallback = descriptor.normalize(defaults[descriptor.key] ?? descriptor.default,descriptor.default);
    const value = input[descriptor.key] ?? fallback;
    if (!descriptor.validate(value)) issues.push({key:descriptor.key,code:'INVALID_SETTING',message:`${descriptor.label} uses a compatible fallback or normalized value.`});
    settings[descriptor.key] = descriptor.normalize(value,fallback);
  }
  return {settings:settings as CompatibleSettings<T>,issues};
}
export const normalizeInitialSettings = <T extends Record<string,unknown>>(stored:unknown, defaults:T): CompatibleSettings<T> => parseInitialSettings(stored,defaults).settings;

export function preserveCompatibleKeybindings(raw: unknown, normalized: Record<string,string>, knownIds: ReadonlySet<string>): Record<string,string> {
  const future: Record<string,string> = {};
  if (isRecord(raw)) for (const [id,value] of Object.entries(raw)) {
    if (typeof value === 'string' && !knownIds.has(id)) future[id] = value;
  }
  // Known commands retain the existing shortcut normalizer's validation/default handling.
  return {...future,...normalized};
}
