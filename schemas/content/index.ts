// schemas/content/index.ts
// Barrel export para facilitar importaciones

// ============================================================================
// SHARED SCHEMAS
// ============================================================================
export * from './shared/seo';
export * from './shared/pagination';
export * from './shared/author';
export * from './shared/cross-content';

// ============================================================================
// ARTICLES SCHEMAS (3)
// ============================================================================
export * from './articles/main';
export * from './articles/category';
export * from './articles/single';

// ============================================================================
// VIDEOS SCHEMAS (3)
// ============================================================================
export * from './videos/main';
export * from './videos/category';
export * from './videos/single';

// ============================================================================
// TESTIMONIALS SCHEMAS (3)
// ============================================================================
export * from './testimonials/main';
export * from './testimonials/category';
export * from './testimonials/single';

// ============================================================================
// CANONICAL SCHEMA (Unified)
// ============================================================================
export * from './canonical';
