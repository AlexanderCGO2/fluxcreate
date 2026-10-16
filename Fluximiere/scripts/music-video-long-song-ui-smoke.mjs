import {chromium,expect} from '@playwright/test';
import {serve} from './serve.mjs';
import {preview} from '../../FluxCreate/deploy/preview.mjs';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
const hosted=process.argv.includes('--hosted'),server=hosted?await preview(fileURLToPath(new URL('../../',import.meta.url))):await serve(0),browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));const button=name=>page.getByRole('button',{name,exact:true});
const rate=8000,n=200*rate,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)if(i%4000<80)b.writeInt16LE(Math.round(Math.sin(i*1.2)*24000),44+i*2);
try{
 await page.goto(`http://127.0.0.1:${server.address().port}${hosted?'/fluximiere/':'/'}`);await page.locator('.sequence-loading-veil').waitFor({state:'hidden'});await button('Music video').click();
 await page.getByLabel('Song file',{exact:true}).setInputFiles({name:'long-song.wav',mimeType:'audio/wav',buffer:b});await expect(page.locator('.mv-song')).toContainText('Using 3:00',{timeout:30000});await expect(page.locator('.mv-save')).toHaveText('Saved on this device');
 const download=page.waitForEvent('download');await button('Download original song').click();const file=await download;expect(await fs.readFile(await file.path())).toEqual(b);
 await page.reload();await button('Music video').click();await expect(page.locator('.mv-song')).toContainText('Using 3:00');await expect(button('Download original song')).toBeEnabled();
 await button('Analyze music').click();await expect(page.locator('.mv-analysis')).toContainText('BPM',{timeout:30000});await page.getByLabel('Manual tempo (BPM)',{exact:true}).fill('120');await button('Apply manual beat grid').click();await expect(page.locator('.mv-analysis')).toContainText('manual',{timeout:30000});await button('Create beat storyboard').click();await expect.poll(()=>page.locator('.mv-shot').count()).toBeGreaterThan(30);
 await button('Open animatic in timeline').click();await expect(page.getByRole('dialog',{name:'Music Video Studio'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Clip: long-song.wav',exact:true})).toBeVisible();expect(errors).toEqual([]);
 console.log('PASS long-song UI: import, fade notice, byte-identical original download, reopen, storyboard, timeline.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
