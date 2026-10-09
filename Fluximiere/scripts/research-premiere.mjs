import {mkdir,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const dir=new URL('../artifacts/premiere-research/',import.meta.url);await mkdir(dir,{recursive:true});
for(const [name,url] of [['sample-2014','https://gist.githubusercontent.com/Xeoncross/31f1663d3b965126f172/raw/sample_1.prproj.xml'],['sample-reader','https://raw.githubusercontent.com/sergeiventurinov/PRPROJ-READER/master/test.prproj']]){
 const response=await fetch(url);if(!response.ok){console.log(name,response.status);continue;}const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>8*1024*1024)throw Error('Research fixture too large.');await writeFile(new URL(name+'.prproj',dir),bytes);const xml=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes,{maxOutputLength:16*1024*1024}).toString():bytes.toString();await writeFile(new URL(name+'.xml',dir),xml);
 console.log(`${name}: saved ${bytes.length} source bytes and ${xml.length} XML characters to ignored artifacts.`);
}
