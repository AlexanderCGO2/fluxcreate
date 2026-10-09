// Shared by graph validation, controls and the operator catalogue.
export const MAX_PARTICLE_CAPACITY=128_000;
export const MAX_PARTICLE_RATE=32_000;
export const MAX_SCENE_PARTICLES=128_000;
// Analytical emitters, water and cloud solvers retain a separate workload budget.
export const MAX_OTHER_SCENE_PARTICLES=12_000;
export const CPU_PARTICLE_PREVIEW=4_000;
