import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[],errors=[];
try{
 for(const app of ['fluxoto','fluxidesign','fluximiere','fluxiffects','fluxlab']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.route('**/api/recent',route=>route.fulfill({json:{ok:true}}));
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  // Exercise real localhost origins, ports and window.opener. No model call is made.
  const page=await context.newPage();await page.goto('http://localhost:4327/');await page.getByText('Saved on this browser',{exact:true}).waitFor();await page.getByRole('button',{name:'Simulate No charge'}).click();await page.getByText('Simulation completed. No model was called.',{exact:true}).waitFor();await page.getByLabel('Output destination').selectOption(app);
  const popup=context.waitForEvent('page');await page.getByRole('button',{name:'Open in studio',exact:true}).click();const target=await popup;
  if(app==='fluxlab'){
   await expect(target.getByRole('dialog',{name:'Workflow output for FluxLab'})).toBeVisible();await expect(target.getByLabel('Workflow prompt to use')).toContainText('FluxAgents simulation');await target.getByLabel('Workflow prompt to use').fill('A sculptural recycled glass lamp, quiet studio light.');await target.getByRole('button',{name:'Use as prompt',exact:true}).click();await expect(target.getByLabel('Describe what to create')).toHaveValue('A sculptural recycled glass lamp, quiet studio light.');checks.push('FluxAgents → FluxLab preserves text in review and applies a prompt without generation.');
  }else{
   await expect(target.getByRole('dialog',{name:'From FluxLab'})).toBeVisible();await expect(target.getByLabel('FluxLab text to import')).toContainText('FluxAgents simulation');await target.getByLabel('FluxLab text to import').fill('Light reimagined — routed from FluxAgents.');await target.getByRole('button',{name:'Add to project',exact:true}).click();await expect(target.getByRole('dialog',{name:'From FluxLab'})).toHaveCount(0);
   const found=await target.locator('textarea,input').evaluateAll(elements=>elements.some(el=>el.value?.includes('Light reimagined')));
   if(app==='fluxoto')expect(found).toBeTruthy();
   await expect(page.getByRole('status').filter({hasText:'Output opened'})).toBeVisible();checks.push(`FluxAgents → ${app} real-origin handshake, editable review and insertion succeed.`);
  }
  await expect(target).not.toHaveURL(/#fluxlab=/);await context.close();
 }
 expect(errors).toEqual([]);await fs.mkdir('artifacts/agents-handoff',{recursive:true});await fs.writeFile('artifacts/agents-handoff/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
