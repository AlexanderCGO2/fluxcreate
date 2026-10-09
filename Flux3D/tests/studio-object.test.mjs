import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSuiteSource} from '../../FluxCreate/shared/suite-source.mjs';
import {encodeProject,decodeProject,transportProject} from '../../FluxCreate/shared/browser.mjs';
import {createDemoProject,newObject,duplicateObject,validateProject,getAIContext,applyAICommands} from '../src/model.mjs';
import {exportGLB,exportGLTF} from '../src/formats.mjs';
import {objectMesh} from '../src/geometry.mjs';
import {syncObjectMaterial,disposeObjectMaterial,readyObjectTextures,getStudioTexture} from '../src/studio-material.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const source=makeSuiteSource({app:'fluxoto',name:'Original poster',filename:'poster.fluxoto',text:'{"privateSource":"DO NOT SEND"}',kind:'native',view:{}});
const plane=()=>newObject('plane',{name:'Poster',color:'#ffffff',studioObject:{suiteSource:source,preview:{src:png}}});
const scene=(objects=[plane()])=>validateProject({...createDemoProject(),objects});
test('native save/reload and duplicate preserve studio source and preview independently of destination transforms',()=>{
 const p=scene(),o=p.objects[0],copy=duplicateObject(o);copy.position[0]+=2;const q=validateProject({...p,objects:[o,copy]});const reopened=validateProject(decodeProject(encodeProject('flux3d',q,null)).project);
 assert.deepEqual(reopened,q);assert.equal(reopened.objects[1].studioObject.suiteSource.text,source.text);assert.notDeepEqual(reopened.objects[1].position,o.position);assert.equal(o.position[0],0);
 const changed=applyAICommands(p,[{type:'updateObject',id:o.id,values:{position:[2,3,4],color:'#abcdef'}}]);assert.equal(changed.objects[0].studioObject,o.studioObject);assert.deepEqual(changed.objects[0].position,[2,3,4]);
});
test('source validation rejects wrong object types, external/invalid previews and combined decoded texture budget',()=>{
 assert.throws(()=>scene([{...plane(),type:'box'}]),/plane/);assert.throws(()=>scene([{...plane(),studioObject:{suiteSource:source,preview:{src:'https://example.test/a.png'}}}]),/PNG preview/);
 const o=plane();const bytes=Buffer.from(png.split(',')[1],'base64');bytes.writeUInt32BE(2048,16);bytes.writeUInt32BE(2048,20);o.studioObject.preview.src='data:image/png;base64,'+bytes.toString('base64');
 assert.throws(()=>scene(Array.from({length:5},()=>({...o,id:crypto.randomUUID()}))),/16 megapixel/);
 const huge=makeSuiteSource({...source,text:'a'.repeat(12*1024*1024)});assert.throws(()=>scene(Array.from({length:3},()=>({...plane(),studioObject:{suiteSource:huge,preview:{src:png}}}))),/32 MiB/);
});
test('AI context contains only inert source identity, no original bytes or preview image; AI cannot replace source',()=>{
 const p=scene(),context=JSON.stringify(getAIContext(p)),transport=JSON.stringify(transportProject(p));assert(!context.includes('DO NOT SEND'));assert(!context.includes('base64'));assert(context.includes('Original poster'));assert(!transport.includes('DO NOT SEND'));assert(!transport.includes('base64'));
 assert.throws(()=>applyAICommands(p,[{type:'updateObject',id:p.objects[0].id,values:{studioObject:null}}]),/cannot change/);
 assert.doesNotThrow(()=>getAIContext(transportProject(p)));
});
test('portable GLB and glTF carry real PNG texture bytes with UV and unlit transparent material',()=>{
 const p=scene();for(const kind of ['glb','gltf']){const out=kind==='glb'?Buffer.from(exportGLB(p)):null,g=kind==='glb'?JSON.parse(out.subarray(20,20+out.readUInt32LE(12)).toString().trim()):JSON.parse(exportGLTF(p));
  const bin=kind==='glb'?out.subarray(28+out.readUInt32LE(12)):Buffer.from(g.buffers[0].uri.split(',')[1],'base64'),view=g.bufferViews[g.images[0].bufferView];assert.equal(g.images[0].mimeType,'image/png');assert.equal(bin.subarray(view.byteOffset,view.byteOffset+view.byteLength).toString('base64'),png.split(',')[1]);assert.equal(g.materials[0].pbrMetallicRoughness.baseColorTexture.index,0);assert(g.materials[0].extensions.KHR_materials_unlit);assert.equal(g.materials[0].alphaMode,'BLEND');assert.notEqual(g.meshes[0].primitives[0].attributes.TEXCOORD_0,undefined);assert(!JSON.stringify(g).includes('DO NOT SEND'));
 }
});
test('replacing and deleting textured material disposes each old texture including late decode',async()=>{
 const previous=globalThis.Image,images=[];globalThis.Image=class{constructor(){images.push(this);}set src(value){this._src=value;}};
 try{const o=scene().objects[0],mesh=objectMesh(o),first=syncObjectMaterial(mesh,o),state=getStudioTexture(mesh);let disposed=0;state.texture.addEventListener('dispose',()=>disposed++);
  const second=syncObjectMaterial(mesh,{...o,studioObject:{...o.studioObject,preview:{src:png+'='}}});assert.equal(state.disposed,true);assert.equal(disposed,1);images[0].onload();await first;assert.equal(disposed,2);images[1].onload();await second;await readyObjectTextures([mesh]);assert.deepEqual(Object.keys(mesh.userData),['id'],'Texture state must stay outside cloneable scene userData');const current=getStudioTexture(mesh);disposeObjectMaterial(mesh);assert.equal(current.disposed,true);mesh.geometry.dispose();
 }finally{globalThis.Image=previous;}
});
