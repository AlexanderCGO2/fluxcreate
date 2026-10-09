import type { Value } from './catalog.ts';
export const PARTICLE_CONTROL_DEFAULTS={
 simulationBackend:'automatic',emissionMode:'continuous',burstCount:600,emitStart:0,limitEmission:false,emitDuration:2,emissionRegion:'surface',
 direction:'up',azimuth:0,elevation:45,speedVariation:.4,lifetimeVariation:0,sizeVariation:0,
 windX:0,windY:0,windZ:0,turbulence:0,noiseScale:1,buoyancy:0,
 particleStyle:'grains',glow:0,streakLength:4
} satisfies Record<string,Value>;
export const TEXT_SPARK_PARAMS={lifeTransition:true,endColor:'#a780ed',endSize:.1,speed:1,gravity:-2,lifetime:5,particleStyle:'sparks',glow:.8} satisfies Record<string,Value>;
export const PARTICLE_PRESETS:Record<string,Record<string,Value>>={
 Sparks:{...TEXT_SPARK_PARAMS,color:'#f1c786',size:.055,opacity:1,endOpacity:0,fadeIn:.08,spread:1.5,drag:.25,buoyancy:0,turbulence:0,direction:'up'},
 Fire:{particleStyle:'flame',color:'#ffbd38',endColor:'#b52508',glow:1.3,size:.22,speed:2.4,spread:.6,lifetime:1.8,gravity:-1,buoyancy:2,drag:.45,turbulence:.7,noiseScale:1.4,lifeEasing:'linear',lifeTransition:true,endOpacity:0,endSize:.2,fadeIn:.08,opacity:1,direction:'up'},
 Smoke:{particleStyle:'smoke',color:'#a5a9b5',endColor:'#505969',glow:0,size:.18,speed:.8,spread:.5,lifetime:6,gravity:-.2,buoyancy:1,drag:.7,turbulence:.65,noiseScale:.8,lifeEasing:'linear',lifeTransition:true,endOpacity:0,endSize:3,fadeIn:.12,opacity:.45,direction:'up'},
 Dust:{particleStyle:'soft dots',color:'#dec7a2',endColor:'#8e99a7',glow:0,size:.045,speed:.2,spread:.3,lifetime:7,gravity:-.05,buoyancy:0,drag:.7,turbulence:.3,noiseScale:.8,lifeTransition:true,endOpacity:0,endSize:.5,fadeIn:.12,opacity:.6,direction:'up'}
};
export const PARTICLE_SECTIONS=[
 {title:'Emission',params:['emissionMode','rate','burstCount','count','emitStart','limitEmission','emitDuration','emissionRegion','radius']},
 {title:'Launch & lifetime',params:['direction','azimuth','elevation','speed','spread','speedVariation','lifetime','lifetimeVariation']},
 {title:'Forces & collision',params:['gravity','buoyancy','drag','windX','windY','windZ','turbulence','noiseScale','bounce','friction']},
 {title:'Particle appearance',params:['particleStyle','size','sizeVariation','streakLength','color','opacity','glow']}
];
