import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/lib/celebration.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {getContactMoment}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const state=(prefix,contacts,day='2026-10-07',status='PLAYING')=>({day,progress:{prefix,contacts,status}});
assert.equal(getContactMoment(null,state('CA',1)),null,'Existing progress must not replay a celebration on load.');
assert.equal(getContactMoment(state('C',0),state('C',0)),null);
assert.deepEqual(getContactMoment(state('C',0),state('CA',1)),{before:'C',after:'CA',count:1,complete:false});
assert.equal(getContactMoment(state('C',0),state('C',0,'2026-10-08')),null,'Daily rollover must not celebrate.');
assert.deepEqual(getContactMoment(state('C',0),state('CAM',2)),{before:'C',after:'CAM',count:2,complete:false});
assert.equal(getContactMoment(state('CAM',2),state('CAM',2,'2026-10-07','WON')),null,'Guessing the secret is not a community contact.');
assert.deepEqual(getContactMoment(state('CAMIN',4),state('CAMINO',5,'2026-10-07','WON')),{before:'CAMIN',after:'CAMINO',count:1,complete:true});
console.log('PASS: contact celebrations fire once for new letters and distinguish load, daily rollover and secret guesses.');

assert.deepEqual(getContactMoment({...state('CA',1),progress:{...state('CA',1).progress,bonus_used:false}},{...state('CAM',1),progress:{...state('CAM',1).progress,bonus_used:true}}),{before:'CA',after:'CAM',count:1,complete:false,source:'bonus'});
