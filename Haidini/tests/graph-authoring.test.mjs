import test from 'node:test';import assert from 'node:assert/strict';
import {makeNode,edge,validateGraph,createProject,applyPatch} from '../src/engine/project.ts';
const tools=await import('../src/engine/graphAuthoring.ts').catch(()=>({}));
const get=name=>{assert.equal(typeof tools[name],'function',`${name} must provide graph authoring behavior`);return tools[name];};
const graph=()=>({nodes:[makeNode('title','text',0,0,{text:'SUMMER SALE',color:'#abcdef'},'Summer headline'),makeNode('motion','textAnimate',240,0,{},'Letter reveal'),makeNode('extra','shape',0,150,{shape:'box'},'Display pedestal'),makeNode('output','output',500,0)],edges:[edge('title','motion','text'),edge('motion','output','scene')]});
test('graph search matches multiple words across labels, operator types and actual parameter values without changing graph data',()=>{
 const g=graph(),before=JSON.stringify(g),search=get('searchGraphNodes');assert.deepEqual(search(g,'summer SALE').map(r=>r.node.id),['title']);assert.deepEqual(search(g,'typeface helvetiker').map(r=>r.node.id),['title']);assert.deepEqual(search(g,'shape BOX').map(r=>r.node.id),['extra']);assert.deepEqual(search(g,'TEXTANIMATE').map(r=>r.node.id),['motion']);assert.deepEqual(search(g,'no matching node'),[]);assert.equal(JSON.stringify(g),before);
});
test('graph diagnostics distinguish missing required inputs, renderer messages and unused branches',()=>{
 const g=graph();g.edges=g.edges.filter(e=>e.target!=='motion');const issues=get('graphIssues')(g,{motion:'Connect a valid text input.',title:'This font is missing a glyph.'});
 assert.ok(issues.motion.some(i=>i.kind==='input'&&i.input==='text'));assert.equal(issues.motion.filter(i=>i.kind==='evaluation').length,0,'Missing-input diagnostics should not repeat the same renderer failure');assert.ok(issues.title.some(i=>i.kind==='evaluation'&&/glyph/.test(i.message)));assert.ok(issues.title.some(i=>i.kind==='unused'));assert.ok(issues.extra.some(i=>i.kind==='unused'));assert.ok(!issues.output?.some(i=>i.kind==='unused'));
 assert.deepEqual(get('searchGraphNodes')(g,'',{title:'Missing glyph'},true).map(r=>r.node.id),['title','motion','extra']);
});
test('connection suggestions exclude incompatible, occupied, duplicate and cyclic wires',()=>{
 const g={nodes:[makeNode('shape','shape'),makeNode('a','transform'),makeNode('b','transform'),makeNode('proto','prototype'),makeNode('output','output')],edges:[edge('a','b','scene'),edge('b','output','scene')]},sources=get('connectionSources');
 assert.deepEqual(sources(g,'a','scene').map(n=>n.id),['shape']);assert.deepEqual(sources(g,'b','scene'),[]);assert.deepEqual(sources(g,'a','unknown'),[]);assert.deepEqual(sources(g,'output','scene').map(n=>n.id),['shape','a']);
 for(const n of sources(g,'a','scene'))assert.doesNotThrow(()=>validateGraph({...g,edges:[...g.edges,edge(n.id,'a','scene')]}));
});
test('a suggested repair is an ordinary atomic graph command and clears its missing-input issue',()=>{
 let p=createProject(crypto.randomUUID(),'blank');p.graph={nodes:[makeNode('source','text'),makeNode('animate','textAnimate'),makeNode('output','output')],edges:[edge('animate','output','scene')]};p.locks=[{nodeId:'source',param:'text'}];const before=JSON.stringify(p),sources=get('connectionSources')(p.graph,'animate','text');assert.deepEqual(sources.map(n=>n.id),['source']);
 const result=applyPatch(p,{baseRevision:p.revision,summary:'Connect text input.',commands:[{op:'connect',edge:edge('source','animate','text')}]});assert.ok(!get('graphIssues')(result.graph).animate?.some(i=>i.kind==='input'));assert.equal(result.revision,p.revision+1);assert.equal(JSON.stringify(p),before);assert.deepEqual(result.locks,p.locks);assert.deepEqual(result.graph.nodes,p.graph.nodes,'Connecting wires preserves protected parameter values');
});
test('search indexes editable fields only and never retained source documents or preview image bytes',()=>{
 const g=graph();g.nodes[0].studioObject={suiteSource:{text:'private attachment keyword'},preview:{src:'private pixel bytes'}};assert.deepEqual(get('searchGraphNodes')(g,'private'),[]);
});
