import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankProject,parseProject,getComp} from '../src/core.mjs';
import {placeSuiteObject} from '../src/suite-object.mjs';
import {projectForAI} from '../src/ai-commands.mjs';
import {makeSuiteSource} from '../../FluxCreate/shared/suite-source.mjs';
const src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const source=makeSuiteSource({app:'fluxidesign',name:'Artwork',filename:'Artwork.fluxidesign',text:'{"privateSource":"retain locally"}'}),prepared={source,preview:{src,width:1,height:1}};
test('snapshot append preserves composition, source roundtrip and media-free AI payload',()=>{const p=createBlankProject(),before=JSON.stringify(p),placed=placeSuiteObject(p,prepared);assert.equal(JSON.stringify(p),before);const reopened=parseProject(JSON.stringify(placed.project)).project;assert.equal(getComp(reopened).layers[0].suiteSource.text,source.text);assert.ok(!JSON.stringify(projectForAI(reopened)).includes('privateSource'));assert.ok(!JSON.stringify(projectForAI(reopened)).includes('data:image'));});
test('snapshot replace preserves transforms and rejects locked or invalid target atomically',()=>{const p=placeSuiteObject(createBlankProject(),prepared).project,l=getComp(p).layers[0];l.x=20;l.rotation=45;const q=placeSuiteObject(p,prepared,{replaceId:l.id}).project;assert.equal(getComp(q).layers.length,1);assert.equal(getComp(q).layers[0].x,20);assert.equal(getComp(q).layers[0].rotation,45);l.locked=true;assert.throws(()=>placeSuiteObject(p,prepared,{replaceId:l.id}),/unlocked/);assert.throws(()=>placeSuiteObject(p,{...prepared,preview:{...prepared.preview,width:2}}),/dimensions/);});
