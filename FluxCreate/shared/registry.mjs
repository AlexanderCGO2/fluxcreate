import {isHosted} from './hosting.mjs';
export const APPS = [
 {id:'fluxoto',name:'FluxFoto',folder:'Fluxoto',port:4321,mark:'Fo',color:'#3979d7',kind:'Photo & image',description:'Layers, light, and a new point of view.',formats:'PSD · PSB · PNG · JPEG'},
 {id:'fluxidesign',name:'FluxDesign',folder:'Fluxidesign',port:4322,mark:'Fi',color:'#cf6371',kind:'Pages & publishing',description:'Give every story room to breathe.',formats:'IDML · PDF · AI · SVG'},
 {id:'fluximiere',name:'FluxVideo',folder:'Fluximiere',port:4323,mark:'Fv',color:'#9270d4',kind:'Video & editing',description:'Find the story between the frames.',formats:'PRPROJ · XML · MP4 · EDL'},
 {id:'flux3d',name:'Flux3D',folder:'Flux3D',port:4324,mark:'F3',color:'#c18342',kind:'3D & scene design',description:'A little imagination. Another dimension.',formats:'GLB · glTF · OBJ · STL'},
 {id:'fluxiffects',name:'FluxMotion',folder:'Fluxiffects',port:4320,mark:'Fm',color:'#8261d9',kind:'Motion & compositing',description:'Ideas, in motion.',formats:'GLB · WebM · AE bridge'},
 {id:'fluxini',name:'FluxEffects',folder:'Haidini',port:4318,mark:'Fx',color:'#79935d',kind:'Procedural & simulation',description:'Shape the rules. Discover the unexpected.',formats:'GLB · PNG · WebM'},
 {id:'fluxlab',name:'FluxLab',folder:'FluxLab',port:4326,mark:'Fl',color:'#5b8eae',kind:'AI & creative exploration',description:'A spark. A direction. Something entirely new.',formats:'Text · Images · Video · Audio'},
 {id:'fluxagents',name:'FluxAgents',folder:'FluxAgents',port:4327,mark:'Fa',color:'#6479a8',kind:'Agents & workflows',description:'Give your ideas a way to work.',formats:'Workflows · Approvals · Run history'},
];
export const getApp = id => APPS.find(app=>app.id===id);
export const appURL = value => {const app=typeof value==='string'?getApp(value):value;if(!app)throw Error('Unknown FluxCreate workspace.');return isHosted()?(app.id==='fluxcreate'?'/':`/${app.id}/`):`http://localhost:${app.port}/`;};
