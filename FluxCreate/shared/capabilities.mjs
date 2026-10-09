import {getApp} from './registry.mjs';

// Enabled types describe working insertion adapters, not future roadmap promises.
export const APP_CAPABILITIES=Object.freeze({
 fluxoto:Object.freeze({receive:['text','image'],placeSource:true}),
 fluxidesign:Object.freeze({receive:['text','image'],placeSource:false}),
 fluximiere:Object.freeze({receive:['text','image','video','audio'],placeSource:false}),
 fluxiffects:Object.freeze({receive:['text','image','video','audio'],placeSource:true}),
 flux3d:Object.freeze({receive:[],placeSource:true}),
 fluxini:Object.freeze({receive:[],placeSource:true}),
 fluxlab:Object.freeze({receive:['text'],placeSource:false}),
 fluxagents:Object.freeze({receive:[],placeSource:false})
});
export function destinationsFor(kind){return Object.entries(APP_CAPABILITIES).filter(([,c])=>c.receive.includes(kind)).map(([id])=>getApp(id));}
export function acceptsArtifact(appId,kind){return !!APP_CAPABILITIES[appId]?.receive.includes(kind);}
