import {chromium,expect} from '@playwright/test';
import {serve} from './serve.mjs';
import {preview} from '../../FluxCreate/deploy/preview.mjs';
import {fileURLToPath} from 'node:url';
const hosted=process.argv.includes('--hosted'),server=hosted?await preview(fileURLToPath(new URL('../../',import.meta.url))):await serve(0),browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const button=name=>page.getByRole('button',{name,exact:true});
const rate=8000,n=40*rate,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)if(i%4000<80)b.writeInt16LE(Math.round(Math.sin(i*1.2)*(i<n/2?4800:24000)),44+i*2);
const ranges=()=>page.locator('.mv-shot-top > span').evaluateAll(nodes=>nodes.map(el=>el.textContent.match(/[\d.]+/g).map(Number)));
async function saved(){return page.evaluate(async()=>{const q=indexedDB.open('fluximiere-music-video',1),db=await new Promise((resolve,reject)=>{q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspace'),r=tx.objectStore('workspace').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}});}
const analyze=()=>page.getByRole('button',{name:/^Analyze music(?: again)?$/});
async function repeat(){const before=await saved();await analyze().click();await expect.poll(async()=>(await saved()).version).toBeGreaterThan(before.version);await expect(page.getByRole('button',{name:'Cancel',exact:true})).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:/Analysis (complete|refreshed)/})).toBeVisible();await expect(page.locator('.mv-error')).toHaveCount(0);return saved();}
try{
 await page.goto(`http://127.0.0.1:${server.address().port}${hosted?'/fluximiere/':'/'}`);await page.locator('.sequence-loading-veil').waitFor({state:'hidden'});await button('Music video').click();await page.getByLabel('Song file',{exact:true}).setInputFiles({name:'repeat.wav',mimeType:'audio/wav',buffer:b});await expect(page.locator('.mv-song')).toContainText('repeat.wav');await expect(page.locator('.mv-save')).toHaveText('Saved on this device');
 await repeat();const first=await saved();await repeat();const second=await saved();expect(second.plan.song).toEqual(first.plan.song);expect(second.plan.analysis.revision).toBeGreaterThan(first.plan.analysis.revision);console.log('PASS same song can be analyzed twice from Music map');
 await button('Create beat storyboard').click();await expect.poll(()=>page.locator('.mv-shot').count()).toBeGreaterThan(5);
 await expect(analyze()).toBeVisible();console.log('PASS analysis action is available from storyboard');
 const board=await saved();await repeat();expect((await saved()).plan.shots).toEqual(board.plan.shots);
 await page.reload();await button('Music video').click();await expect(analyze()).toBeVisible();await repeat();expect((await saved()).plan.song).toEqual(first.plan.song);expect(errors).toEqual([]);
 console.log('PASS same-song reanalysis preserves storyboard and works after reopening.');
 await button('Music map').click();await page.getByLabel('Manual tempo (BPM)',{exact:true}).fill('110');await button('Apply manual beat grid').click();await expect(page.locator('.mv-confidence')).toHaveText('Manual anchors added');const manual=await saved();await repeat();expect((await saved()).plan.analysis.anchors).toEqual(manual.plan.analysis.anchors);
 const irregular=Buffer.from(b);irregular.fill(0,44);let t=0,index=0;const intervals=[.3,.45,.65,.55,.4,.75];while(t<40){const at=Math.round(t*rate);for(let j=0;j<40&&at+j<n;j++)irregular.writeInt16LE(Math.round((1-j/40)*(j%2?-24000:24000)),44+(at+j)*2);t+=intervals[index++%intervals.length];}
 await page.getByLabel('Song file',{exact:true}).setInputFiles({name:'changing-rhythm.wav',mimeType:'audio/wav',buffer:irregular});await expect(page.locator('.mv-song')).toContainText('changing-rhythm.wav');await expect(page.locator('.mv-save')).toHaveText('Saved on this device');await repeat();const changed=await saved();expect(changed.plan.analysis.confidence).toBeLessThan(.35);expect(changed.plan.analysis.anchors).toEqual([]);expect(changed.plan.song.hash).not.toBe(first.plan.song.hash);
 await button('Create beat storyboard').click();await expect.poll(()=>page.locator('.mv-shot').count()).toBeGreaterThan(5);await expect(page.locator('.mv-error')).toHaveCount(0);expect(errors).toEqual([]);
 console.log('PASS manual corrections survive reanalysis and a new song with changing rhythm builds a storyboard.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
