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
 * Continuous means NO gaps - all segments abut each other
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
    // Fallback: treat entire run as single units placed continuously
    const unitLength = product.dimensions.length / 1000; // mm to m
    const unitCount = Math.ceil(runLength / unitLength);
    let currentS = runConfig.startS;

    for (let i = 0; i < unitCount; i++) {
      const segmentEnd = currentS + unitLength;
      segments.push({
        startS: currentS,
        endS: segmentEnd,
        moduleId: product.id,
        moduleType: 'end',
      });
      currentS = segmentEnd; // Next segment starts exactly where this one ends
    }

    moduleCounts[product.id] = unitCount;

    return {
      segments,
      moduleCounts,
      totalLength: runLength,
      cuttingRequired: unitCount * unitLength > runLength,
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
        endS: runConfig.startS + doubleEndModule.dimensions.length / 1000,
        moduleId: doubleEndModule.id,
        moduleType: 'double-end',
      });
      moduleCounts[doubleEndModule.id] = 1;
    } else {
      segments.push({
        startS: runConfig.startS,
        endS: runConfig.startS + endLength,
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

  // Track current position - segments placed continuously with no gaps
  let currentS = runConfig.startS;

  // Start end unit
  segments.push({
    startS: currentS,
    endS: currentS + endLength,
    moduleId: endModule.id,
    moduleType: 'end',
  });
  currentS += endLength;
  moduleCounts[endModule.id] = 1;

  // Mid units - placed continuously after start end
  if (midModule) {
    // Use custom mid count if specified, otherwise auto-calculate
    // Use ceiling to ensure we fill the space (last one may need cutting)
    const autoMidCount = Math.ceil(availableForMids / midLength);
    const midCount = (runConfig.autoFill === false && runConfig.customMidCount !== undefined)
      ? Math.max(0, runConfig.customMidCount)
      : autoMidCount;

    for (let i = 0; i < midCount; i++) {
      segments.push({
        startS: currentS,
        endS: currentS + midLength,
        moduleId: midModule.id,
        moduleType: 'mid',
      });
      currentS += midLength; // Next segment starts exactly where this one ends
    }

    moduleCounts[midModule.id] = midCount;
  }

  // End end unit - placed immediately after last mid
  segments.push({
    startS: currentS,
    endS: currentS + endLength,
    moduleId: endModule.id,
    moduleType: 'end',
  });
  moduleCounts[endModule.id] = (moduleCounts[endModule.id] || 0) + 1;

  // Calculate total module length vs requested run length
  const totalModuleLength = 2 * endLength + (midModule ? (moduleCounts[midModule.id] || 0) * midLength : 0);
  // Cutting required if total modules exceed the run length (we need to trim the last piece)
  const cuttingRequired = totalModuleLength > runLength + 0.01;

  return {
    segments,
    moduleCounts,
    totalLength: runLength,
    cuttingRequired,
  };
}

/**
 * Resolve a segmented run (sections with gaps between them)
 * Each section can contain multiple units joined together
 * E.g., 2 units per section = [unit+unit][gap][unit+unit][gap]...
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
  const unitsPerSection = runConfig.unitsPerSection || 1; // Default 1 unit per section
  const sectionLength = unitLength * unitsPerSection; // Total length of each section

  // Calculate how many SECTIONS fit with gaps
  // Pattern: [section][gap][section][gap][section]
  // Total = N * sectionLength + (N-1) * gapLength <= runLength
  // Solve for N: N <= (runLength + gapLength) / (sectionLength + gapLength)

  const pitch = sectionLength + gapLength;
  const autoSectionCount = Math.max(1, Math.floor((runLength + gapLength) / pitch));

  // Use custom section count if specified, otherwise auto-calculate
  const sectionCount = (runConfig.autoFill === false && runConfig.customUnitCount !== undefined)
    ? Math.max(1, runConfig.customUnitCount)
    : autoSectionCount;

  // Calculate actual spacing to distribute sections evenly
  const totalSectionsLength = sectionCount * sectionLength;
  const totalGapsLength = runLength - totalSectionsLength;
  const actualGapLength = sectionCount > 1 ? totalGapsLength / (sectionCount - 1) : 0;

  let currentS = runConfig.startS;

  for (let i = 0; i < sectionCount; i++) {
    // Each section contains multiple units placed continuously
    for (let j = 0; j < unitsPerSection; j++) {
      segments.push({
        startS: currentS,
        endS: currentS + unitLength,
        moduleId: unitId,
        moduleType: 'end',
      });
      currentS += unitLength; // Units within section are continuous (no gap)
    }

    // Add gap after section (except after last section)
    if (i < sectionCount - 1) {
      currentS += actualGapLength;
    }
  }

  // Total units = sections × units per section
  moduleCounts[unitId] = sectionCount * unitsPerSection;

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

/**
 * Calculate auto-fill values for a run configuration
 * Returns the values that would be used if autoFill is true
 */
export function calculateAutoFillValues(
  runConfig: RunConfig,
  product: Product
): { midCount: number; sectionCount: number; totalUnits: number; actualLength: number } {
  const runLength = runConfig.endS - runConfig.startS;
  const modules = product.modules || [];

  if (runConfig.layoutMode === 'segmented' || product.layoutMode === 'segmented') {
    // Segmented layout
    const unitModule = modules[0];
    const unitLength = unitModule
      ? unitModule.dimensions.length / 1000
      : product.dimensions.length / 1000;
    const gapLength = runConfig.gapLength || 2;
    const unitsPerSection = runConfig.unitsPerSection || 1;
    const sectionLength = unitLength * unitsPerSection;
    const pitch = sectionLength + gapLength;
    const sectionCount = Math.max(1, Math.floor((runLength + gapLength) / pitch));
    const totalUnits = sectionCount * unitsPerSection;
    const actualLength = sectionCount * sectionLength + (sectionCount - 1) * gapLength;

    return { midCount: 0, sectionCount, totalUnits, actualLength };
  }

  // Continuous layout
  const endModule = modules.find((m) => m.type === 'end');
  const midModule = modules.find((m) => m.type === 'mid' || m.type === 'extension');

  if (!endModule || !midModule) {
    const unitLength = product.dimensions.length / 1000;
    const totalUnits = Math.ceil(runLength / unitLength);
    return { midCount: 0, sectionCount: totalUnits, totalUnits, actualLength: totalUnits * unitLength };
  }

  const endLength = endModule.dimensions.length / 1000;
  const midLength = midModule.dimensions.length / 1000;
  const availableForMids = runLength - 2 * endLength;

  if (availableForMids <= 0) {
    return { midCount: 0, sectionCount: 1, totalUnits: 2, actualLength: 2 * endLength };
  }

  const midCount = Math.ceil(availableForMids / midLength);
  const actualLength = 2 * endLength + midCount * midLength;

  return { midCount, sectionCount: 1, totalUnits: 2 + midCount, actualLength };
}
