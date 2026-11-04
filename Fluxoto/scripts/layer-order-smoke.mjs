import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {serve} from './serve.mjs';
import {newLayer, toMotion} from '../src/model.mjs';

const server = await serve(0, {dataDir:path.resolve('artifacts/layer-order/state')});
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page = await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;console.log('PASS '+message);};
const order=()=>page.locator('.oto-layer-row').evaluateAll(rows=>rows.map(row=>row.dataset.layerId));
const project={format:'fluxoto-project',version:1,id:'layer-test',name:'Layer ordering',width:240,height:240,background:'transparent',layers:[
  newLayer('shape',{id:'red',name:'Red foreground',x:0,y:0,width:240,height:240,fill:'#ff0000',radius:0}),
  newLayer('shape',{id:'blue',name:'Blue background',x:0,y:0,width:240,height:240,fill:'#0000ff',radius:0}),
  newLayer('shape',{id:'green',name:'Green base',x:0,y:0,width:240,height:240,fill:'#00ff00',radius:0})
]};
const open=async p=>{await page.getByTestId('import-file').setInputFiles({name:'layers.fluxoto',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'fluxcreate-project',version:1,app:'fluxoto',project:p,motion:toMotion(p)}))});await page.waitForFunction(id=>document.querySelector('.oto-layer-row')?.dataset.layerId===id,p.layers[0].id);};
const drag=async(source,target,edge)=>{const a=await page.locator(`[data-layer-id="${source}"] .oto-layer-select`).boundingBox(),b=await page.locator(`[data-layer-id="${target}"]`).boundingBox();await page.mouse.move(a.x+30,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+50,edge==='before'?b.y+3:b.y+b.height-3,{steps:10});await page.waitForTimeout(70);check(await page.locator(`.drop-${edge}`).count()===1,'insertion marker visible');await page.mouse.up();await page.waitForTimeout(80);};
try{
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByLabel('Text content').waitFor();await open(project);
 await drag('red','green','after');check((await order()).join(',')==='blue,green,red','drag moves foreground to bottom');
 check(await page.getByLabel('Design canvas').evaluate(c=>c.getContext('2d').getImageData(120,120,1,1).data[2]===255),'canvas stacking changes with row order');
 await page.getByRole('button',{name:'Undo',exact:true}).click();check((await order()).join(',')==='red,blue,green','one undo restores full order');
 await page.getByRole('button',{name:'Redo',exact:true}).click();check((await order()).join(',')==='blue,green,red','redo restores move');
 await drag('red','blue','before');check((await order()).join(',')==='red,blue,green','drag moves last layer to top');
 await page.waitForTimeout(700);await page.reload();await page.getByLabel('Select Red foreground',{exact:true}).waitFor();check((await order()).join(',')==='red,blue,green','order persists after reload');
 await page.getByLabel('Reorder Red foreground',{exact:true}).focus();await page.keyboard.press('Alt+ArrowDown');check((await order()).join(',')==='blue,red,green','keyboard reordering works');
 await page.getByLabel('Lock Red foreground',{exact:true}).click();const locked=await order();const a=await page.getByLabel('Select Red foreground',{exact:true}).boundingBox(),b=await page.locator('[data-layer-id="green"]').boundingBox();await page.mouse.move(a.x+30,a.y+10);await page.mouse.down();await page.mouse.move(b.x+50,b.y+b.height-3,{steps:10});await page.mouse.up();check(JSON.stringify(await order())===JSON.stringify(locked),'locked layers cannot be dragged');
 await page.getByLabel('Unlock Red foreground',{exact:true}).click();const c=await page.getByLabel('Select Red foreground',{exact:true}).boundingBox();await page.mouse.move(c.x+30,c.y+10);await page.mouse.down();await page.mouse.move(b.x+50,b.y+b.height-3,{steps:10});await page.keyboard.press('Escape');await page.mouse.up();check(JSON.stringify(await order())===JSON.stringify(locked),'Escape cancels drag');
 await page.mouse.move(c.x+30,c.y+10);await page.mouse.down();await page.mouse.move(400,400,{steps:10});await page.mouse.up();check(JSON.stringify(await order())===JSON.stringify(locked),'dropping outside leaves document unchanged');
 const touch=await page.context().newCDPSession(page),from=await page.getByLabel('Reorder Red foreground',{exact:true}).boundingBox(),to=await page.locator('[data-layer-id="blue"]').boundingBox();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x+from.width/2,y:from.y+from.height/2}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x+50,y:to.y+3}]});await page.waitForTimeout(80);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);check((await order()).join(',')==='red,blue,green','touch dragging reorders layers');
 const many={...project,layers:Array.from({length:35},(_,i)=>newLayer('shape',{id:'layer-'+i,name:'Layer '+i,width:30,height:30}))};await open(many);const list=await page.locator('.oto-layer-list').boundingBox(),first=await page.getByLabel('Reorder Layer 0',{exact:true}).boundingBox();await page.mouse.move(first.x+5,first.y+15);await page.mouse.down();await page.mouse.move(list.x+70,list.y+list.height-3,{steps:10});await page.waitForTimeout(650);check(await page.locator('.oto-layer-list').evaluate(el=>el.scrollTop)>100,'drag autoscrolls a long layer list');await page.keyboard.press('Escape');await page.mouse.up();check((await order())[0]==='layer-0','cancel after scrolling preserves layer order');
 check(!errors.length,'no browser runtime errors');await fs.mkdir('artifacts/layer-order',{recursive:true});await page.screenshot({path:'artifacts/layer-order/layers.png'});await fs.writeFile('artifacts/layer-order/checks.json',JSON.stringify({checks,errors},null,2));console.log(`FluxFoto layer ordering: ${checks} browser checks passed.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
