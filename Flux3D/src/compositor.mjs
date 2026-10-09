import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {loadAnimatedScene} from './scene-loader.mjs';

let sharedRenderer=null,rendererUsers=0;
const radians=value=>(Number.isFinite(value)?value:0)*Math.PI/180;
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function acquireRenderer(){
 if(!sharedRenderer){sharedRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:true});sharedRenderer.setPixelRatio(1);sharedRenderer.outputColorSpace=THREE.SRGBColorSpace;sharedRenderer.toneMapping=THREE.ACESFilmicToneMapping;sharedRenderer.toneMappingExposure=1.3;sharedRenderer.shadowMap.enabled=true;sharedRenderer.shadowMap.type=THREE.PCFSoftShadowMap;sharedRenderer.setClearColor(0x000000,0);}
 rendererUsers++;return sharedRenderer;
}
function releaseRenderer(){rendererUsers=Math.max(0,rendererUsers-1);if(!rendererUsers&&sharedRenderer){sharedRenderer.dispose();sharedRenderer.forceContextLoss();sharedRenderer=null;}}

/** Reset action lifecycle as well as mixer time: rewinding must work after LoopOnce clamps. */
export function sampleAnimation(mixer,clips,time=0,clipIndex=0,loop=true){
 mixer.stopAllAction();if(!clips.length)return 0;
 const clip=clips[clamp(Math.floor(finite(clipIndex)),0,clips.length-1)],duration=Math.max(0,finite(clip.duration)),requested=Math.max(0,finite(time));
 const sampled=duration?(loop?requested%duration:Math.min(requested,duration)):0;
 const action=mixer.clipAction(clip);action.reset();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(sampled);return sampled;
}


/** Include brief keyed excursions and a bounded curve sweep; cached per source clip. */
export function animationFitTimes(clip){
 const duration=Math.max(0,finite(clip.duration)),times=new Set([0,duration]);for(let i=1;i<17;i++)times.add(duration*i/17);
 const all=new Set();for(const track of clip.tracks||[]){for(const time of track.times)all.add(time);const components=track.getValueSize(),cubic=track.createInterpolant?.isInterpolantFactoryMethodGLTFCubicSpline,valueSize=cubic?components/3:components;for(let axis=0;axis<valueSize;axis++){let lo=Infinity,hi=-Infinity,loTime=0,hiTime=0;for(let i=0;i<track.times.length;i++){const value=track.values[i*components+(cubic?valueSize:0)+axis];if(value<lo){lo=value;loTime=track.times[i];}if(value>hi){hi=value;hiTime=track.times[i];}}times.add(loTime);times.add(hiTime);}}
 const ordered=[...all].sort((a,b)=>a-b);if(ordered.length<=128)for(const time of ordered)times.add(time);else for(let i=0;i<128;i++)times.add(ordered[Math.floor(i*(ordered.length-1)/127)]);
 return [...times].filter(t=>Number.isFinite(t)&&t>=0&&t<=duration).sort((a,b)=>a-b);
}

/** One validated asset template. Instances share immutable geometry but own animation state. */
export async function loadSceneSource(asset){
 if(!asset?.src||!['glb','gltf','flux3d'].includes(asset.modelFormat))throw Error('This 3D asset is missing or has an unsupported scene format.');
 const loaded=await loadAnimatedScene(asset.src,`scene.${asset.modelFormat}`);let references=0,released=false,disposed=false;
 const source={loaded,fitCache:new Map(),warnings:loaded.warnings||[],create(){if(released)throw Error('The 3D asset was released. Load it again.');references++;try{return createInstance(source,()=>{references--;if(released&&!references)finish();});}catch(error){references--;throw error;}},dispose(){released=true;if(!references)finish();}};
 function finish(){if(disposed)return;disposed=true;loaded.dispose();}
 return source;
}

function createInstance(source,onDispose){
 const loaded=source.loaded,content=cloneSkeleton(loaded.scene);let embeddedCamera=null;content.traverse(object=>{if(!embeddedCamera&&(object.isPerspectiveCamera||object.isOrthographicCamera))embeddedCamera=object;});
 const scene=new THREE.Scene(),model=new THREE.Group();scene.add(model);model.add(content);scene.background=null;content.background=null;
 const lights=[];let hasLight=false;content.traverse(o=>{if(o.isLight)hasLight=true;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 if(!hasLight){const hemisphere=new THREE.HemisphereLight('#ffffff','#c3bfd2',2.4),key=new THREE.DirectionalLight('#fff5e8',3.6),fill=new THREE.DirectionalLight('#d8e3ff',1.6);key.position.set(-4,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;key.shadow.normalBias=.04;key.shadow.bias=-.0001;fill.position.set(6,3,-3);scene.add(hemisphere,key,fill);lights.push(hemisphere,key,fill);}
 const mixer=new THREE.AnimationMixer(content),clips=loaded.animations||[],camera=new THREE.PerspectiveCamera(38,1,.01,2000),ortho=new THREE.OrthographicCamera(-1,1,1,-1,.01,2000);
 content.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(content);if(bounds.isEmpty()){bounds.min.set(-1,-1,-1);bounds.max.set(1,1,1);}let center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=Math.max(.1,size.length()/2);const fitCache=source.fitCache;
 const nativeCamera=loaded.nativeCamera||loaded.project?.camera;
 const nativeBaseline=nativeCamera?{position:new THREE.Vector3().fromArray(nativeCamera.position),target:new THREE.Vector3().fromArray(nativeCamera.target),fov:nativeCamera.fov}:null;
 const renderer=acquireRenderer();let disposed=false;
 function render(options={}){
  if(disposed)throw Error('This 3D composition instance has been released.');
  const maxDimension=Math.min(8192,renderer.capabilities.maxTextureSize),requestedWidth=Math.max(1,Math.round(finite(options.width,1000))),requestedHeight=Math.max(1,Math.round(finite(options.height,750))),reduction=Math.min(1,maxDimension/requestedWidth,maxDimension/requestedHeight,Math.sqrt(33177600/(requestedWidth*requestedHeight))),width=Math.max(1,Math.round(requestedWidth*reduction)),height=Math.max(1,Math.round(requestedHeight*reduction));
  const layer=options.layer||options;model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);
  if(!nativeBaseline&&!embeddedCamera&&clips.length){const clipIndex=clamp(Math.floor(finite(layer.modelClip)),0,clips.length-1);if(!fitCache.has(clipIndex)){const swept=new THREE.Box3();for(const time of animationFitTimes(clips[clipIndex])){sampleAnimation(mixer,clips,time,clipIndex,false);scene.updateMatrixWorld(true);content.traverse(object=>{if(object.isSkinnedMesh){object.computeBoundingBox();object.computeBoundingSphere();}});swept.union(new THREE.Box3().setFromObject(content));}if(!swept.isEmpty())fitCache.set(clipIndex,{center:swept.getCenter(new THREE.Vector3()),radius:Math.max(.1,swept.getSize(new THREE.Vector3()).length()/2)});}const fit=fitCache.get(clipIndex);if(fit){center=fit.center;radius=fit.radius;}}
  sampleAnimation(mixer,clips,finite(options.time),layer.modelClip,layer.modelLoop!==false);scene.updateMatrixWorld(true);content.traverse(object=>{if(object.isSkinnedMesh){object.computeBoundingBox();object.computeBoundingSphere();}});
  let baseline=nativeBaseline,orthographic=false,orthographicHeight=2;
  if(!baseline&&embeddedCamera){const position=embeddedCamera.getWorldPosition(new THREE.Vector3()),direction=embeddedCamera.getWorldDirection(new THREE.Vector3()),distance=Math.max(radius*2,position.distanceTo(center));baseline={position,target:position.clone().addScaledVector(direction,distance),fov:embeddedCamera.fov||38,up:new THREE.Vector3(0,1,0).applyQuaternion(embeddedCamera.getWorldQuaternion(new THREE.Quaternion()))};if(embeddedCamera.isOrthographicCamera){orthographic=true;orthographicHeight=(embeddedCamera.top-embeddedCamera.bottom)/embeddedCamera.zoom;}}
  if(!baseline){const fov=38,aspect=width/height,halfFov=Math.atan(Math.tan(fov*Math.PI/360)*Math.min(1,aspect)),distance=radius/Math.sin(halfFov)*1.12;const direction=new THREE.Vector3().setFromSphericalCoords(distance,Math.PI/2-radians(20),radians(35));baseline={position:center.clone().add(direction),target:center.clone(),fov};}
  const offset=baseline.position.clone().sub(baseline.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=radians(layer.cameraYaw);spherical.phi=clamp(spherical.phi-radians(layer.cameraPitch),.001,Math.PI-.001);spherical.radius=Math.max(.001,spherical.radius/clamp(finite(layer.cameraZoom,1),.01,1000));
  const view=orthographic?ortho:camera;view.position.copy(baseline.target).add(new THREE.Vector3().setFromSpherical(spherical));view.up.copy(baseline.up||new THREE.Vector3(0,1,0));view.lookAt(baseline.target);view.near=Math.max(.001,spherical.radius/100000);view.far=Math.max(2000,spherical.radius*30,radius*30);if(orthographic){const h=orthographicHeight/clamp(finite(layer.cameraZoom,1),.01,1000);view.left=-h*width/height/2;view.right=-view.left;view.top=h/2;view.bottom=-h/2;}else{view.fov=baseline.fov;view.aspect=width/height;}view.updateProjectionMatrix();
  model.position.set(finite(layer.modelX),finite(layer.modelY),finite(layer.modelZ));model.rotation.set(radians(layer.modelRotationX),radians(layer.modelRotationY),radians(layer.modelRotationZ));model.scale.setScalar(clamp(finite(layer.modelScale,1),.0001,10000));scene.updateMatrixWorld(true);
  renderer.setSize(width,height,false);renderer.setClearColor(0x000000,0);renderer.clear(true,true,true);renderer.render(scene,view);return renderer.domElement;
 }
 function dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(content);content.traverse(o=>{o.skeleton?.dispose?.();if(o.isLight)o.shadow?.dispose?.();});for(const light of lights)light.shadow?.dispose?.();scene.clear();releaseRenderer();onDispose();}
 return{render,dispose,warnings:source.warnings,duration:loaded.duration||0,clips:clips.map(c=>({name:c.name,duration:c.duration})),width:1000,height:750};
}

/** Convenience for callers that do not already maintain an asset-template cache. */
export async function createSceneCompositor(asset){const source=await loadSceneSource(asset);try{const instance=source.create();const dispose=instance.dispose;instance.dispose=()=>{dispose();source.dispose();};return instance;}catch(error){source.dispose();throw error;}}
