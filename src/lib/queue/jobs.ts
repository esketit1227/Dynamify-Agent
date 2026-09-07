/**
 * Convenience re-export so API routes only need one import for "start the
 * pipeline for this lead" without reaching into queue internals.
 */
export { enqueueLeadPipeline } from "./boss";
