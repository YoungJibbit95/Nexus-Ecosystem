import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommandRegistry, applyCommandAuthority } from './commandRegistry.ts';
import { createWorkbenchCommandController } from './workbenchCommandController.ts';
import { openWorkbenchDockPanel, toggleWorkbenchDockPanel, normalizeWorkbenchLayout } from '../../pages/editor/workbenchDockModel.js';
import { getEditorCommandPaletteCommands, createSpotlightResults } from '../../pages/editor/commandPaletteModel.js';
test('registry aliases dispatch once and use current availability with safe errors', async () => {
  let enabled=false; let calls=0;
  const registry=createCommandRegistry([{id:'canonical',title:'Command',category:'test',aliases:['old'],availability:()=>({enabled,reason:'Choose a project'}),handler:()=>{calls++;}}]);
  assert.equal(registry.describe('old').disabledReason,'Choose a project');
  assert.equal((await registry.execute('old')).ok,false); assert.equal(calls,0);
  enabled=true; assert.equal((await registry.execute('old')).ok,true); assert.equal(calls,1);
  assert.equal(registry.describe('old').id,'canonical');
  assert.equal((await registry.execute('unknown-secret')).error.operation,'command.unknown');
  assert.throws(()=>createCommandRegistry([{id:'a',title:'A',category:'t',aliases:['alias'],handler:()=>{}},{id:'b',title:'B',category:'t',aliases:['alias'],handler:()=>{}}]),/Duplicate/);
});
test('palette/Spotlight metadata follows authority without changing legacy ranking identities', () => {
  const registry=createCommandRegistry([{id:'canonical',title:'New title',category:'t',aliases:['old'],availability:()=>({enabled:false,reason:'Unavailable'}),handler:()=>{}}]);
  const rows=applyCommandAuthority([{id:'old',label:'Existing localized label'},{id:'extension.untouched'}],registry);
  assert.equal(rows[0].canonicalCommandId,'canonical'); assert.equal(rows[0].enabled,false);
  assert.equal(rows[0].label,'Existing localized label'); assert.deepEqual(rows[1],{id:'extension.untouched'});
});

test('actual palette and Spotlight models share availability and preserve aliases/labels', async () => {
  let calls=0;
  const registry=createCommandRegistry([{id:'workbench.openSettings',title:'Settings',category:'workbench',aliases:['open-settings','change-theme'],availability:()=>({enabled:false,reason:'Fixture unavailable'}),handler:()=>{calls++;}}]);
  const legacy=getEditorCommandPaletteCommands().find(row=>row.id==='open-settings');
  const palette=getEditorCommandPaletteCommands({commandRegistry:registry}).find(row=>row.id==='open-settings');
  const spotlight=createSpotlightResults({query:'settings',commandRegistry:registry}).find(row=>row.actionId==='open-settings'||row.id==='open-settings');
  assert.equal(palette.label,legacy.label); assert.equal(palette.enabled,false);
  assert.equal(palette.disabledReason,'Fixture unavailable');
  assert.equal(spotlight.enabled,false); assert.equal(spotlight.canonicalCommandId,'workbench.openSettings');
  await registry.execute(spotlight.actionId||spotlight.id); assert.equal(calls,0);
});

test('handler and availability failures cannot escape structured command results', async () => {
  const registry=createCommandRegistry([
    {id:'throws',title:'Throws',category:'test',handler:()=>{throw new Error('C:\\private token=secret');}},
    {id:'availability-throws',title:'Unavailable',category:'test',availability:()=>{throw new Error('token=secret');},handler:()=>assert.fail('must not execute')},
  ]);
  for (const id of ['throws','availability-throws']) {
    const result=await registry.execute(id); assert.equal(result.ok,false);
    assert.doesNotMatch(JSON.stringify(result),/private|secret|token=/);
  }
});
function fixture(layout=normalizeWorkbenchLayout({})) {
  const view={activePanel:'explorer',bottomTab:'terminal',bottomPanelOpen:false,showSettings:true,settings:{sidebar_visible:false,zen_mode:true,unknownKey:'keep'}};
  const effects=[];
  const controller=createWorkbenchCommandController({
    setActivePanel:update=>{view.activePanel=typeof update==='function'?update(view.activePanel):update;effects.push('panel');},
    setShowSettings:visible=>{view.showSettings=visible;effects.push('settings');},
    setSettings:update=>{view.settings=update(view.settings);effects.push('preferences');},
    readDockState:()=>view,
    writeDockState:next=>{view.activePanel=next.activePanel||null;view.bottomTab=next.bottomTab||'terminal';view.bottomPanelOpen=Boolean(next.bottomPanelOpen);},
    movePanel:(state,panel,mode)=>(mode==='toggle'?toggleWorkbenchDockPanel:openWorkbenchDockPanel)(state,panel,layout),
  });
  return {view,effects,registry:controller.registry};
}
test('sidebar toggle preserves legacy visibility/zen/draft-independent effects', async () => {
  const {view,effects,registry}=fixture();
  await registry.execute('toggle-sidebar');
  assert.equal(view.activePanel,null);assert.equal(view.showSettings,false);
  assert.deepEqual(view.settings,{sidebar_visible:true,zen_mode:false,unknownKey:'keep'});
  assert.deepEqual(effects,['settings','preferences','panel']);
  await registry.execute('workbench.toggleSidebar');assert.equal(view.activePanel,'explorer');
});
test('terminal open/toggle respects current docking and settings command aliases', async () => {
  const {view,registry}=fixture();
  await registry.execute('terminal.new');assert.equal(view.bottomPanelOpen,true);assert.equal(view.settings.sidebar_visible,false);
  await registry.execute('toggle-terminal');assert.equal(view.bottomPanelOpen,false);
  await registry.execute('change-theme');assert.equal(view.activePanel,null);assert.equal(view.showSettings,true);
  await registry.execute('open-search');assert.equal(view.activePanel,'search');assert.equal(view.showSettings,false);assert.equal(view.settings.sidebar_visible,true);
});
test('custom side-docked terminal uses the existing model without forcing rail visibility', async () => {
  const {view,registry}=fixture(normalizeWorkbenchLayout({panelZones:{terminal:'left'}}));
  await registry.execute('terminal.open');assert.equal(view.activePanel,'terminal');assert.equal(view.settings.sidebar_visible,false);
});
