import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeInitialSettings, parseInitialSettings, initialSettingsSchema, preserveCompatibleKeybindings } from './settingsSchema.ts';
import { DEFAULT_KEYBINDINGS, normalizeKeybindingSettings } from '../pages/editor/keybindingModel.js';
const defaults={theme:'actual-theme',font_size:14,font_family:'JetBrains Mono',tab_size:4,word_wrap:false,auto_save:true,keybinding_overrides:{},legacyControl:42};
test('stored keys/extension themes/future compatible keys survive schema round trips', () => {
  const stored={theme:'extension.future-theme',font_size:'18',tab_size:9,word_wrap:true,auto_save:false,keybinding_overrides:{'future.command':'Ctrl+Q'},future:{nested:true},legacyControl:100};
  const value=normalizeInitialSettings(stored,defaults);
  assert.equal(value.theme,stored.theme);assert.equal(value.font_size,18);assert.equal(value.tab_size,9);
  assert.deepEqual(value.future,{nested:true});assert.deepEqual(value.keybinding_overrides,stored.keybinding_overrides);assert.equal(value.legacyControl,100);
  assert.deepEqual(normalizeInitialSettings(JSON.parse(JSON.stringify(value)),defaults),value);
  assert.equal(stored.font_size,'18');
});
test('legacy numeric bounds/default merge and invalid-setting issues are explicit', () => {
  const result=parseInitialSettings({font_size:100,tab_size:'2',auto_save:'invalid',theme:'',keybinding_overrides:{good:'Ctrl+Q',invalid:3}},defaults);
  assert.equal(result.settings.font_size,28);assert.equal(result.settings.tab_size,2);assert.equal(result.settings.auto_save,true);assert.equal(result.settings.theme,'actual-theme');
  assert.deepEqual(result.settings.keybinding_overrides,{good:'Ctrl+Q'});assert.ok(result.issues.length>=4);
  assert.equal(initialSettingsSchema.length,7);assert.ok(initialSettingsSchema.every(item=>item.key&&item.category&&item.validate&&item.label));
  assert.equal(normalizeInitialSettings(null,defaults).legacyControl,42);
});

test('legacy shortcut validation/default handling survives while future command IDs persist', () => {
  const raw = {'workbench.openSettings':'Ctrl+,','workbench.toggleSidebar':'Ctrl+Alt+B','editor.save':'invalid shortcut','future.command':'Ctrl+Q','future.invalid':3};
  const normalized = normalizeKeybindingSettings({keybinding_overrides:raw}).keybinding_overrides;
  const merged = preserveCompatibleKeybindings(raw,normalized,new Set(DEFAULT_KEYBINDINGS.map(item=>item.id)));
  assert.equal(merged['future.command'],'Ctrl+Q');
  assert.equal(merged['future.invalid'],undefined);
  for (const item of DEFAULT_KEYBINDINGS) assert.equal(merged[item.id],normalized[item.id]);
  assert.equal(merged['workbench.toggleSidebar'],'Ctrl+Alt+B');
  assert.deepEqual(normalizeInitialSettings({keybinding_overrides:merged},defaults).keybinding_overrides,merged);
});
