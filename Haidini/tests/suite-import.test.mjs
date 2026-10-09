import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeExchange,toFluxini} from '@flux-studio/exchange';
import {suiteExchangeMarkdown} from '../src/suite-import.mjs';
import {createBlankProject,createLayer,getComp} from '../../Fluxiffects/src/core.mjs';

test('suite native wrappers enter the existing editable Fluxini exchange path',()=>{const motion=createBlankProject({name:'Shared title'});getComp(motion).layers=[createLayer('text',{text:'EDITABLE SUITE',x:960,y:540})];const wrapper={format:'fluxcreate-project',version:1,app:'fluxidesign',project:{pages:[],nativeOnly:'preserved by source file'},motion};const exchange=decodeExchange(suiteExchangeMarkdown(JSON.stringify(wrapper)));assert.equal(exchange.sourceApp,'fluxiffects');assert.match(exchange.notes,/fluxidesign/);const scene=toFluxini(exchange);assert.equal(scene.package.project.graph.nodes.find(n=>n.type==='text').params.text,'EDITABLE SUITE');assert.equal(scene.package.project.nativeOnly,undefined);});
test('legacy native and markdown imports are not intercepted',()=>{assert.equal(suiteExchangeMarkdown('{"format":"fluxini-project-v1"}'),null);assert.equal(suiteExchangeMarkdown('# Flux exchange'),null);});
test('invalid suite motion and 3D-only projects are rejected explicitly',()=>{const wrapper={format:'fluxcreate-project',version:1,app:'fluximiere',project:{},motion:createBlankProject()};wrapper.motion.assets=[{id:'bad',type:'image',src:'javascript:alert(1)'}];assert.throws(()=>suiteExchangeMarkdown(JSON.stringify(wrapper)),/unsafe/);wrapper.app='flux3d';wrapper.motion=null;assert.throws(()=>suiteExchangeMarkdown(JSON.stringify(wrapper)),/PNG render.*GLB/);});
