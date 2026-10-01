import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceOccurrence, emptyReminderLedger, exportReminderPortable, importReminderPortable, prepareReminderLedger, prepareReminderPortable, reconcileReminderSources, recurrenceInstant } from '../src/reminders/reminderDomain.ts'
import { createReminderRuntime } from '../src/reminders/reminderRuntime.ts'

const source = (patch={}) => ({id:'synthetic',title:'Synthetic',msg:'',datetime:'2026-01-31T09:00:37.123Z',repeat:'monthly',done:false,...patch})
const occurrence = (patch={}) => reconcileReminderSources(emptyReminderLedger(),[source(patch)]).occurrences[0]
test('UTC daily/weekly preserves precision over both DST transitions',()=>{
  for(const anchor of ['2026-03-28T09:00:37.123Z','2026-10-24T09:00:37.123Z']) {
    assert.equal(recurrenceInstant(anchor,'daily',1),new Date(Date.parse(anchor)+86_400_000).toISOString())
    assert.equal(recurrenceInstant(anchor,'weekly',2),new Date(Date.parse(anchor)+14*86_400_000).toISOString())
  }
})
test('monthly clamp retains anchor day without February drift, including leap year',()=>{
  const anchor='2026-01-31T09:00:37.123Z'
  assert.equal(recurrenceInstant(anchor,'monthly',1),'2026-02-28T09:00:37.123Z')
  assert.equal(recurrenceInstant(anchor,'monthly',2),'2026-03-31T09:00:37.123Z')
  assert.equal(recurrenceInstant('2028-01-31T09:00:37.123Z','monthly',1),'2028-02-29T09:00:37.123Z')
})
test('advance coalesces missed occurrences and returns first strictly future instant',()=>{
  assert.deepEqual(advanceOccurrence(occurrence(),Date.parse('2026-04-30T09:00:37.123Z')),{index:4,datetime:'2026-05-31T09:00:37.123Z',skipped:3})
  assert.equal(advanceOccurrence(occurrence({repeat:'daily'}),Date.parse('2026-02-02T09:00:37.123Z')).datetime,'2026-02-03T09:00:37.123Z')
})
test('snooze/title edits preserve anchor; time/repeat edits start explicit new series; closed stays closed',()=>{
  const ledger=reconcileReminderSources(emptyReminderLedger(),[source()])
  const snoozed=reconcileReminderSources(ledger,[source({title:'Changed',snoozeUntil:'2026-02-02T10:00:00Z'})])
  assert.equal(snoozed.occurrences[0].anchor,source().datetime)
  assert.equal(reconcileReminderSources(snoozed,[source({datetime:'2026-02-02T10:00:00Z'})]).occurrences[0].anchor,'2026-02-02T10:00:00Z')
  assert.equal(reconcileReminderSources(emptyReminderLedger(),[source({done:true})]).occurrences[0].done,true)
})
test('independent notification IDs avoid legacy polynomial hash collisions',()=>{
  const ledger=reconcileReminderSources(emptyReminderLedger(),[source({id:'Aa'}),source({id:'BB'})])
  assert.deepEqual(ledger.occurrences.map(item=>item.nativeId),[1,2])
})
test('unknown version, civil cadence, malformed ledger and duplicate source IDs are rejected',()=>{
  for(const value of [{...emptyReminderLedger(),version:2},{...emptyReminderLedger(),cadence:'Europe/Berlin'},{...emptyReminderLedger(),nextNativeId:0}]) assert.throws(()=>prepareReminderLedger(value))
  assert.throws(()=>reconcileReminderSources(emptyReminderLedger(),[source(),source()]))
  assert.throws(()=>reconcileReminderSources(emptyReminderLedger(),[source({datetime:'2026-03-29T02:30'})]))
})

function fixture({reminders=[source({repeat:'none'})],native=false}={}) {
  let sources=structuredClone(reminders), stored=null, journal=null, now=Date.parse('2026-02-01T10:00:00Z')
  const calls=[], requests=new Map(), delivered=new Set()
  const state={hydration:true,sourceFlush:true,ledgerWrite:true,journalWrite:true,cancel:true,schedule:true,permission:'granted'}
  const ports={
    hydrate:async()=>{calls.push('hydrate');if(!state.hydration)throw Error('hydration failed')},sources:()=>sources,
    replaceSource:replacement=>{sources=sources.map(item=>item.id===replacement.id?structuredClone(replacement):item);calls.push('source-apply')},
    flushSource:async()=>{calls.push('source-ack');return state.sourceFlush},
    loadLedger:async()=>stored,saveLedger:async ledger=>{calls.push('ledger-ack');if(!state.ledgerWrite)throw Error('ledger failed');stored=structuredClone(ledger)},
    journal:{read:async()=>journal,write:async(before,after)=>{calls.push('journal-ack');if(!state.journalWrite)throw Error('journal failed');journal=structuredClone({before,after})},clear:async()=>{calls.push('journal-clear');journal=null}},
    foreground:async()=>{calls.push('foreground-request')},quiet:()=>false,now:()=>now,
    ...(native?{native:{permission:async()=>state.permission,pending:async()=>[...requests.values()],delivered:async()=>[...delivered].map(id=>({id,fingerprint:stored?.occurrences.find(item=>item.nativeId===id)?.requestFingerprint})),cancel:async id=>{calls.push(`cancel:${id}`);if(!state.cancel)throw Error('cancel failed');requests.delete(id)},schedule:async(_source,item,fingerprint)=>{calls.push(`schedule:${item.nativeId}`);if(!state.schedule)throw Error('schedule failed');requests.set(item.nativeId,{id:item.nativeId,fingerprint})}}}:{}),
  }
  let runtime=createReminderRuntime(ports)
  return {state,calls,requests,delivered,ports,get runtime(){return runtime},get sources(){return sources},get stored(){return stored},get journal(){return journal},set now(value){now=Date.parse(value)},restart(){runtime=createReminderRuntime(ports)},edit(patch){sources=sources.map(item=>({...item,...patch}))}}
}
test('outside-view owner dispatches only after source and claim ack; remount/restart cannot repeat external request',async()=>{
  const f=fixture();await Promise.all([f.runtime.tick(),f.runtime.tick()])
  assert.equal(f.calls.filter(call=>call==='foreground-request').length,1)
  const effect=f.calls.indexOf('foreground-request')
  assert.ok(f.calls.indexOf('source-ack')<effect && f.calls.lastIndexOf('ledger-ack',effect)<effect)
  f.restart();await f.runtime.tick()
  assert.equal(f.calls.filter(call=>call==='foreground-request').length,1)
  assert.equal(f.runtime.getStatus().alerts.length,1)
})
test('hydration/source/claim persistence failure produces no external effect',async()=>{
  for(const field of ['hydration','sourceFlush','ledgerWrite']) {
    const f=fixture();f.state[field]=false;await f.runtime.tick()
    assert.ok(!f.calls.includes('foreground-request'),field)
    assert.ok(f.runtime.getStatus().error)
  }
})
test('two completed monthly cycles survive restart with anchor; snooze affects current only; stop closes series',async()=>{
  const f=fixture({reminders:[source()]});await f.runtime.tick()
  assert.deepEqual(await f.runtime.command({kind:'complete',id:'synthetic'}),{ok:true,skipped:0})
  assert.equal(f.sources[0].datetime,'2026-02-28T09:00:37.123Z')
  await f.runtime.command({kind:'snooze',id:'synthetic',minutes:60})
  assert.equal(f.sources[0].datetime,'2026-02-28T09:00:37.123Z')
  assert.equal(f.stored.occurrences[0].anchor,'2026-01-31T09:00:37.123Z')
  f.now='2026-02-28T10:00:00Z';f.restart();await f.runtime.tick()
  await f.runtime.command({kind:'complete',id:'synthetic'})
  assert.equal(f.sources[0].datetime,'2026-03-31T09:00:37.123Z');assert.equal(f.sources[0].snoozeUntil,undefined)
  await f.runtime.command({kind:'stop',id:'synthetic'});assert.equal(f.sources[0].done,true)
})
test('command journal is acknowledged before source write; failed flush retained then restart rolls forward',async()=>{
  const f=fixture({reminders:[source()]});await f.runtime.tick();f.calls.length=0;f.state.sourceFlush=false
  // Source was unchanged, so journal preparation is reached without a new source reconcile.
  const result=await f.runtime.command({kind:'complete',id:'synthetic'})
  assert.equal(result.ok,false);assert.ok(f.journal)
  assert.ok(f.calls.indexOf('journal-ack')<f.calls.indexOf('source-apply'))
  assert.ok(!f.calls.includes('journal-clear'))
  f.state.sourceFlush=true;f.restart();await f.runtime.tick()
  assert.equal(f.sources[0].datetime,'2026-02-28T09:00:37.123Z');assert.equal(f.journal,null)
})
test('newer edit during interrupted command blocks recovery and retains evidence',async()=>{
  const f=fixture({reminders:[source()]});await f.runtime.tick();f.state.sourceFlush=false
  await f.runtime.command({kind:'complete',id:'synthetic'});f.edit({title:'Newer edit'});f.state.sourceFlush=true;f.restart();await f.runtime.tick()
  assert.equal(f.runtime.getStatus().blocked,true);assert.ok(f.journal);assert.equal(f.sources[0].title,'Newer edit')
})
test('native restart reconciles same pending request without duplicate schedule; deletion cancels owned ID',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'none'})]});await f.runtime.tick();f.restart();await f.runtime.tick()
  assert.equal(f.calls.filter(call=>call.startsWith('schedule:')).length,1)
  f.edit({done:true});await f.runtime.tick();assert.equal(f.requests.size,0)
})
test('native cancellation failure cannot falsely report cleared and is retried',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'none'})]});await f.runtime.tick();f.edit({snoozeUntil:'2026-03-02T09:00:00Z'});f.state.cancel=false;await f.runtime.tick()
  assert.equal(f.requests.size,1);assert.equal(f.calls.filter(call=>call.startsWith('schedule:')).length,1)
  f.state.cancel=true;await f.runtime.tick();assert.equal(f.calls.filter(call=>call.startsWith('schedule:')).length,2)
})
test('failed native schedule leaves persisted claim; restart reconciles missing request once with same ID',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'none'})]});f.state.schedule=false;await f.runtime.tick()
  assert.equal(f.stored.occurrences[0].dispatch,'claimed');f.state.schedule=true;f.restart();await f.runtime.tick()
  assert.equal(f.requests.size,1);assert.equal(f.stored.occurrences[0].nativeId,1)
})
test('missing native request after due time is uncertain; observed event is distinguished; no duplicate foreground request',async()=>{
  for(const observed of [false,true]) {
    const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'none'})]});await f.runtime.tick();f.requests.clear();if(observed)f.delivered.add(1)
    f.now='2026-03-01T10:00:00Z';f.restart();await f.runtime.tick()
    assert.equal(f.stored.occurrences[0].dispatch,observed?'native-observed':'uncertain');assert.ok(!f.calls.includes('foreground-request'))
  }
})
test('permission denied uses foreground only when due, without any request-permission port',async()=>{
  const f=fixture({native:true});f.state.permission='denied';await f.runtime.tick()
  assert.equal(f.calls.filter(call=>call==='foreground-request').length,1);assert.ok(!f.calls.some(call=>call.startsWith('schedule:')))
})
test('quiet hours defer foreground claim; invalid snooze and completed occurrence return honest results',async()=>{
  const f=fixture();f.ports.quiet=()=>true;await f.runtime.tick();assert.ok(!f.calls.includes('foreground-request'))
  assert.equal((await f.runtime.command({kind:'snooze',id:'synthetic',minutes:NaN})).code,'validation')
  assert.equal((await f.runtime.command({kind:'snooze',id:'synthetic',minutes:-1})).code,'validation')
  await f.runtime.command({kind:'complete',id:'synthetic'})
  assert.equal((await f.runtime.command({kind:'complete',id:'synthetic'})).code,'conflict')
})
test('unrelated native ID collisions allocate another ID and never cancel unrelated request',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'none'})]})
  f.requests.set(1,{id:1});await f.runtime.tick();await f.runtime.tick()
  assert.ok(f.requests.has(1));assert.ok(f.requests.has(2));assert.ok(!f.calls.includes('cancel:1'))
})
test('native quiet-hours capability cancels pending future request and permits foreground after quiet hours',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'none'})]});await f.runtime.tick()
  f.ports.allowNative=()=>false;await f.runtime.tick();assert.equal(f.requests.size,0)
  f.now='2026-03-01T10:00:00Z';await f.runtime.tick();assert.ok(f.calls.includes('foreground-request'))
})
test('stop series reports delivery pending when native cancellation fails; retry acknowledges cancellation',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z'})]});await f.runtime.tick();f.state.cancel=false
  const result=await f.runtime.command({kind:'stop',id:'synthetic'})
  assert.equal(result.ok,false);assert.equal(result.code,'delivery-unavailable');assert.equal(f.sources[0].done,true)
  assert.equal(f.requests.size,1);assert.equal(f.journal,null)
  f.state.cancel=true;await f.runtime.tick();assert.equal(f.requests.size,0)
})
test('legacy native request migration cancels only identified legacy reminders',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z'})]})
  f.requests.set(80,{id:80,legacyReminderId:'synthetic'});f.requests.set(81,{id:81})
  await f.runtime.tick();assert.ok(!f.requests.has(80));assert.ok(f.requests.has(81))
})
test('old delivered event for the same native ID cannot confirm the next occurrence',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z',repeat:'daily'})]});await f.runtime.tick()
  const oldFingerprint=f.stored.occurrences[0].requestFingerprint
  await f.runtime.command({kind:'complete',id:'synthetic'});f.now='2026-03-02T10:00:00Z';f.requests.clear()
  f.ports.native.delivered=async()=>[{id:1,fingerprint:oldFingerprint}]
  await f.runtime.tick();assert.equal(f.stored.occurrences[0].dispatch,'uncertain')
})
test('a concurrent double click completes one occurrence and rejects the stale second command',async()=>{
  const f=fixture({reminders:[source({repeat:'daily',datetime:'2026-02-01T09:00:00Z'})]});await f.runtime.tick()
  const results=await Promise.all([f.runtime.command({kind:'complete',id:'synthetic'}),f.runtime.command({kind:'complete',id:'synthetic'})])
  assert.equal(results[0].ok,true);assert.equal(results[1].code,'conflict');assert.equal(f.sources[0].datetime,'2026-02-02T09:00:00.000Z')
})
test('command ledger failure after acknowledged source commit retains journal and restart preserves anchor',async()=>{
  const f=fixture({reminders:[source()]});await f.runtime.tick();f.state.ledgerWrite=false
  assert.equal((await f.runtime.command({kind:'complete',id:'synthetic'})).ok,false)
  assert.equal(f.sources[0].datetime,'2026-02-28T09:00:37.123Z');assert.ok(f.journal)
  f.state.ledgerWrite=true;f.restart();await f.runtime.tick()
  assert.equal(f.journal,null);assert.equal(f.stored.occurrences[0].anchor,'2026-01-31T09:00:37.123Z')
})
test('stop is idempotent and retries failed native cancellation after the source is already closed',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z'})]});await f.runtime.tick();f.state.cancel=false
  assert.equal((await f.runtime.command({kind:'stop',id:'synthetic'})).code,'delivery-unavailable')
  f.state.cancel=true;assert.deepEqual(await f.runtime.command({kind:'stop',id:'synthetic'}),{ok:true,skipped:0});assert.equal(f.requests.size,0)
})
test('portable occurrence transfer preserves month-end anchor and history, excluding all OS bindings',async()=>{
  const f=fixture({reminders:[source()]});await f.runtime.tick();await f.runtime.command({kind:'complete',id:'synthetic'})
  const portable=await f.runtime.capturePortable(),text=JSON.stringify(portable)
  assert.ok(!text.includes('nativeId')&&!text.includes('Fingerprint')&&!text.includes('dispatch'))
  const local={...emptyReminderLedger(),nextNativeId:90}
  const imported=importReminderPortable(local,portable,f.sources)
  assert.equal(imported.occurrences[0].nativeId,90);assert.equal(imported.occurrences[0].anchor,'2026-01-31T09:00:37.123Z')
  assert.equal(imported.occurrences[0].index,1)
  assert.equal(advanceOccurrence(imported.occurrences[0],Date.parse('2026-02-28T10:00:00Z')).datetime,'2026-03-31T09:00:37.123Z')
})
test('portable format rejects native bindings, future versions and source mismatch',()=>{
  const sources=[source()],portable=exportReminderPortable(reconcileReminderSources(emptyReminderLedger(),sources),sources)
  assert.throws(()=>prepareReminderPortable({...portable,version:2}))
  assert.throws(()=>prepareReminderPortable({...portable,occurrences:[{...portable.occurrences[0],nativeId:1}]}))
  assert.throws(()=>importReminderPortable(emptyReminderLedger(),portable,[source({datetime:'2026-02-01T09:00:00Z'})]))
})
test('imported requested outcome suppresses current delivery even in future until explicit snooze',async()=>{
  const sourceFixture=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z'})]});await sourceFixture.runtime.tick()
  const portable=await sourceFixture.runtime.capturePortable()
  const destination=fixture({native:true,reminders:sourceFixture.sources});await destination.runtime.initialize();await destination.runtime.replacePortable(portable);await destination.runtime.tick()
  assert.equal(destination.requests.size,0);assert.equal(destination.stored.occurrences[0].suppressCurrentDelivery,true)
  assert.equal((await destination.runtime.command({kind:'snooze',id:'synthetic',minutes:5})).ok,true)
  assert.equal(destination.requests.size,1);assert.equal(destination.stored.occurrences[0].suppressCurrentDelivery,undefined)
})
test('startup initialize/recovery and sidecar captures do not perform delivery effects before App attach',async()=>{
  const f=fixture();await f.runtime.initialize();await f.runtime.captureLocalLedger();await f.runtime.capturePortable()
  assert.ok(!f.calls.includes('foreground-request'));assert.equal(f.runtime.getStatus().ready,true)
})
test('workspace freeze prevents new effects and commands; local sidecar replacement is acknowledged without effects',async()=>{
  const f=fixture({native:true,reminders:[source({datetime:'2026-03-01T09:00:00Z'})]});let frozen=true;f.ports.suspended=()=>frozen
  await f.runtime.initialize();const local=await f.runtime.captureLocalLedger();await f.runtime.tick()
  assert.equal(f.requests.size,0);assert.equal((await f.runtime.command({kind:'complete',id:'synthetic'})).code,'conflict')
  await f.runtime.replaceLocalLedger(local);assert.deepEqual(f.stored,local);assert.equal(f.requests.size,0)
  frozen=false;await f.runtime.tick();assert.equal(f.requests.size,1)
})
test('drain waits an already-started effect before source replacement, then frozen ticks stay paused',async()=>{
  const f=fixture();let started,release,frozen=false
  const startedPromise=new Promise(resolve=>{started=resolve}),gate=new Promise(resolve=>{release=resolve})
  f.ports.foreground=async()=>{f.calls.push('effect-start');started();await gate;f.calls.push('effect-ack')};f.ports.suspended=()=>frozen
  const tick=f.runtime.tick();await startedPromise;frozen=true
  let drained=false;const drain=f.runtime.drain().then(()=>{drained=true});await Promise.resolve();assert.equal(drained,false)
  release();await tick;await drain;assert.equal(drained,true);assert.ok(f.calls.includes('effect-ack'))
  f.edit({datetime:'2026-01-31T10:00:00Z'});await f.runtime.tick();assert.equal(f.calls.filter(call=>call==='effect-start').length,1)
})
