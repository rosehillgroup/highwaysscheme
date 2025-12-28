/**
 * Run Resolution Logic
 *
 * Calculates module counts and positions for linear product runs.
 * Handles both continuous (End + Mid + End) and segmented (gaps between units) layouts.
 */

import type { Product, RunConfig, ResolvedQuantities, ModuleDefinition } from '@/types';

export interface ResolvedRun {
  segments: RunSegment[];
  moduleCounts: Record<string, number>;
  totalLength: number;
  cuttingRequired: boolean;
}

export interface RunSegment {
  startS: number;  // Chainage start (m)
  endS: number;    // Chainage end (m)
  moduleId: string;
  moduleType: 'end' | 'mid' | 'double-end' | 'extension';
}

/**
 * Resolve a run configuration into segments and module counts
 */
export function resolveRun(
  runConfig: RunConfig,
  product: Product
): ResolvedRun {
  const runLength = runConfig.endS - runConfig.startS;

  if (runLength <= 0) {
    return {
      segments: [],
      moduleCounts: {},
      totalLength: 0,
      cuttingRequired: false,
    };
  }

  // Check if this product requires segmented layout
  if (product.layoutMode === 'segmented' || runConfig.layoutMode === 'segmented') {
    return resolveSegmentedRun(runConfig, product, runLength);
  }

  return resolveContinuousRun(runConfig, product, runLength);
}

/**
 * Resolve a continuous run (End + Mid + End pattern)
 */
function resolveContinuousRun(
  runConfig: RunConfig,
  product: Product,
  runLength: number
): ResolvedRun {
  const modules = product.modules || [];
  const segments: RunSegment[] = [];
  const moduleCounts: Record<string, number> = {};

  // Find module definitions
  const endModule = modules.find((m) => m.type === 'end');
  const midModule = modules.find((m) => m.type === 'mid' || m.type === 'extension');
  const doubleEndModule = modules.find((m) => m.type === 'double-end');

  if (!endModule) {
    // Fallback: treat entire run as single units
    const unitLength = product.dimensions.length / 1000; // mm to m
    const unitCount = Math.ceil(runLength / unitLength);

    for (let i = 0; i < unitCount; i++) {
      const startS = runConfig.startS + i * unitLength;
      const endS = Math.min(startS + unitLength, runConfig.endS);
      segments.push({
        startS,
        endS,
        moduleId: product.id,
        moduleType: 'end',
      });
    }

    moduleCounts[product.id] = unitCount;

    return {
      segments,
      moduleCounts,
      totalLength: runLength,
      cuttingRequired: runLength % unitLength !== 0,
    };
  }

  const endLength = endModule.dimensions.length / 1000; // mm to m
  const midLength = midModule ? midModule.dimensions.length / 1000 : endLength;

  // Calculate how many mid units fit
  const availableForMids = runLength - 2 * endLength;

  if (availableForMids <= 0) {
    // Run is too short for End + End, use double-end if available or just one end
    if (doubleEndModule && runLength >= doubleEndModule.dimensions.length / 1000) {
      segments.push({
        startS: runConfig.startS,
        endS: runConfig.endS,
        moduleId: doubleEndModule.id,
        moduleType: 'double-end',
      });
      moduleCounts[doubleEndModule.id] = 1;
    } else {
      segments.push({
        startS: runConfig.startS,
        endS: runConfig.endS,
        moduleId: endModule.id,
        moduleType: 'end',
      });
      moduleCounts[endModule.id] = 1;
    }

    return {
      segments,
      moduleCounts,
      totalLength: runLength,
      cuttingRequired: true,
    };
  }

  // Start end unit
  segments.push({
    startS: runConfig.startS,
    endS: runConfig.startS + endLength,
    moduleId: endModule.id,
    moduleType: 'end',
  });
  moduleCounts[endModule.id] = 1;

  // Mid units
  if (midModule) {
    const midCount = Math.floor(availableForMids / midLength);
    const actualMidLength = midCount * midLength;

    for (let i = 0; i < midCount; i++) {
      const startS = runConfig.startS + endLength + i * midLength;
      segments.push({
        startS,
        endS: startS + midLength,
        moduleId: midModule.id,
        moduleType: 'mid',
      });
    }

    moduleCounts[midModule.id] = midCount;

    // Check if there's a gap that needs cutting
    const gap = availableForMids - actualMidLength;
    if (gap > 0.1) {
      // More than 10cm gap - might need cutting
    }
  }

  // End end unit
  segments.push({
    startS: runConfig.endS - endLength,
    endS: runConfig.endS,
    moduleId: endModule.id,
    moduleType: 'end',
  });
  moduleCounts[endModule.id] = (moduleCounts[endModule.id] || 0) + 1;

  // Calculate if cutting is required
  const totalModuleLength = 2 * endLength + (midModule ? (moduleCounts[midModule.id] || 0) * midLength : 0);
  const cuttingRequired = Math.abs(runLength - totalModuleLength) > 0.1;

  return {
    segments,
    moduleCounts,
    totalLength: runLength,
    cuttingRequired,
  };
}

/**
 * Resolve a segmented run (units with gaps between them)
 * Used for NCLD Lite which has no mid piece
 */
function resolveSegmentedRun(
  runConfig: RunConfig,
  product: Product,
  runLength: number
): ResolvedRun {
  const segments: RunSegment[] = [];
  const moduleCounts: Record<string, number> = {};

  const unitModule = product.modules?.[0];
  const unitLength = unitModule
    ? unitModule.dimensions.length / 1000
    : product.dimensions.length / 1000;
  const unitId = unitModule?.id || product.id;

  const gapLength = runConfig.gapLength || 2; // Default 2m gap

  // Calculate how many units fit with gaps
  // Pattern: [unit][gap][unit][gap][unit]
  // Total = N * unitLength + (N-1) * gapLength >= runLength
  // Solve for N: N >= (runLength + gapLength) / (unitLength + gapLength)

  const pitch = unitLength + gapLength;
  const unitCount = Math.max(1, Math.floor((runLength + gapLength) / pitch));

  // Calculate actual spacing to distribute units evenly
  const totalUnitsLength = unitCount * unitLength;
  const totalGapsLength = runLength - totalUnitsLength;
  const actualGapLength = unitCount > 1 ? totalGapsLength / (unitCount - 1) : 0;

  let currentS = runConfig.startS;

  for (let i = 0; i < unitCount; i++) {
    segments.push({
      startS: currentS,
      endS: currentS + unitLength,
      moduleId: unitId,
      moduleType: 'end',
    });

    currentS += unitLength;
    if (i < unitCount - 1) {
      currentS += actualGapLength;
    }
  }

  moduleCounts[unitId] = unitCount;

  return {
    segments,
    moduleCounts,
    totalLength: runLength,
    cuttingRequired: false, // Segmented runs don't require cutting
  };
}

/**
 * Convert resolved run to quantities format
 */
export function runToQuantities(resolvedRun: ResolvedRun): ResolvedQuantities {
  return {
    modules: resolvedRun.moduleCounts,
    linearMetres: resolvedRun.totalLength,
    cuttingRequired: resolvedRun.cuttingRequired,
  };
}

/**
 * Get default run configuration for a product
 */
export function getDefaultRunConfig(
  product: Product,
  startS: number,
  endS: number,
  offset: number = 0
): RunConfig {
  return {
    startS,
    endS,
    layoutMode: product.layoutMode || 'continuous',
    pattern: product.defaultPattern || 'end-mid-end',
    gapLength: product.minGapLength ? product.minGapLength / 1000 : 2,
    snapTarget: 'carriageway',
    offset,
  };
}

/**
 * Calculate suggested gap length for segmented runs
 */
export function suggestGapLength(
  runLength: number,
  unitLength: number,
  targetGap: number = 2
): { gapLength: number; unitCount: number } {
  // Try to find a gap length close to target that results in even spacing
  const pitch = unitLength + targetGap;
  const unitCount = Math.max(1, Math.round((runLength + targetGap) / pitch));

  if (unitCount === 1) {
    return { gapLength: 0, unitCount: 1 };
  }

  const totalUnitsLength = unitCount * unitLength;
  const availableForGaps = runLength - totalUnitsLength;
  const gapLength = availableForGaps / (unitCount - 1);

  return { gapLength: Math.max(0, gapLength), unitCount };
}
