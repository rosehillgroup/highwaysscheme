/**
 * Signage Pattern Generators
 *
 * SVG path generators for UK road signs.
 * Based on Traffic Signs Regulations and General Directions.
 */

export interface SignPath {
  type: 'circle' | 'triangle' | 'triangle-inverted' | 'octagon' | 'rectangle' | 'arrow';
  path?: string;
  width: number;
  height: number;
  background: string;
  border: string;
  borderWidth: number;
  symbolPath?: string;
  symbolColor?: string;
  text?: string;
  textSize?: number;
}

/**
 * Generate circular sign outline
 */
function circleOutline(radius: number): string {
  return `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius} Z`;
}

/**
 * Generate equilateral triangle outline (pointing up for warning signs)
 */
function triangleOutline(width: number, height: number): string {
  const halfWidth = width / 2;
  return `M 0 ${-height / 2} L ${halfWidth} ${height / 2} L ${-halfWidth} ${height / 2} Z`;
}

/**
 * Generate inverted triangle outline (pointing down for give way)
 */
function triangleInvertedOutline(width: number, height: number): string {
  const halfWidth = width / 2;
  return `M ${-halfWidth} ${-height / 2} L ${halfWidth} ${-height / 2} L 0 ${height / 2} Z`;
}

/**
 * Generate octagon outline (for stop sign)
 */
function octagonOutline(size: number): string {
  const r = size / 2;
  const a = r * Math.tan(Math.PI / 8);
  const points = [];

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 8;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    points.push(`${x.toFixed(3)} ${y.toFixed(3)}`);
  }

  return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
}

/**
 * Generate rectangle outline
 */
function rectangleOutline(width: number, height: number): string {
  const hw = width / 2;
  const hh = height / 2;
  return `M ${-hw} ${-hh} L ${hw} ${-hh} L ${hw} ${hh} L ${-hw} ${hh} Z`;
}

/**
 * Generate speed limit number
 */
function speedNumber(speed: string, size: number): string {
  // Simplified - just return the text, renderer will handle it
  return speed;
}

/**
 * Generate no-entry bar symbol
 */
function noEntrySymbol(width: number): string {
  const barWidth = width * 0.7;
  const barHeight = width * 0.2;
  return `M ${-barWidth / 2} ${-barHeight / 2} L ${barWidth / 2} ${-barHeight / 2} L ${barWidth / 2} ${barHeight / 2} L ${-barWidth / 2} ${barHeight / 2} Z`;
}

/**
 * Generate diagonal slash for prohibition signs
 */
function prohibitionSlash(radius: number): string {
  const offset = radius * 0.7;
  return `M ${-offset} ${offset} L ${offset} ${-offset}`;
}

/**
 * Generate keep left/right arrow
 */
function keepArrow(direction: 'left' | 'right', size: number): string {
  const arrowSize = size * 0.35;
  const shaftWidth = size * 0.12;
  const shaftLength = size * 0.2;

  if (direction === 'left') {
    return `
      M ${-arrowSize} 0
      L 0 ${-arrowSize * 0.8}
      L 0 ${-shaftWidth}
      L ${shaftLength} ${-shaftWidth}
      L ${shaftLength} ${shaftWidth}
      L 0 ${shaftWidth}
      L 0 ${arrowSize * 0.8}
      Z
    `;
  } else {
    return `
      M ${arrowSize} 0
      L 0 ${-arrowSize * 0.8}
      L 0 ${-shaftWidth}
      L ${-shaftLength} ${-shaftWidth}
      L ${-shaftLength} ${shaftWidth}
      L 0 ${shaftWidth}
      L 0 ${arrowSize * 0.8}
      Z
    `;
  }
}

/**
 * Generate mini roundabout arrows
 */
function miniRoundaboutSymbol(size: number): string {
  const r = size * 0.15;
  const arrowR = size * 0.3;
  // Circle in center with three curved arrows
  return `
    M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}
    M ${-arrowR} ${-arrowR * 0.3}
    Q ${-arrowR * 0.5} ${-arrowR} ${0} ${-arrowR * 0.8}
    L ${arrowR * 0.15} ${-arrowR * 0.95}
    L ${-arrowR * 0.1} ${-arrowR * 0.6}
  `;
}

/**
 * Generate bend arrow symbol
 */
function bendSymbol(direction: 'left' | 'right', size: number): string {
  const w = size * 0.3;
  const h = size * 0.4;

  if (direction === 'left') {
    return `
      M ${w * 0.3} ${h * 0.5}
      L ${w * 0.3} 0
      Q ${w * 0.3} ${-h * 0.3} ${-w * 0.2} ${-h * 0.3}
      L ${-w * 0.2} ${-h * 0.5}
      L ${-w * 0.6} ${-h * 0.2}
      L ${-w * 0.2} ${h * 0.1}
      L ${-w * 0.2} ${-h * 0.1}
      Q ${w * 0.1} ${-h * 0.1} ${w * 0.1} ${h * 0.2}
      L ${w * 0.1} ${h * 0.5}
      Z
    `;
  } else {
    return `
      M ${-w * 0.3} ${h * 0.5}
      L ${-w * 0.3} 0
      Q ${-w * 0.3} ${-h * 0.3} ${w * 0.2} ${-h * 0.3}
      L ${w * 0.2} ${-h * 0.5}
      L ${w * 0.6} ${-h * 0.2}
      L ${w * 0.2} ${h * 0.1}
      L ${w * 0.2} ${-h * 0.1}
      Q ${-w * 0.1} ${-h * 0.1} ${-w * 0.1} ${h * 0.2}
      L ${-w * 0.1} ${h * 0.5}
      Z
    `;
  }
}

/**
 * Generate pedestrian symbol
 */
function pedestrianSymbol(size: number): string {
  const s = size * 0.35;
  return `
    M 0 ${-s * 0.9}
    a ${s * 0.15} ${s * 0.15} 0 1 0 0.001 0
    M ${-s * 0.1} ${-s * 0.6}
    L ${-s * 0.25} ${-s * 0.1}
    L ${-s * 0.4} ${s * 0.4}
    M ${s * 0.1} ${-s * 0.6}
    L ${s * 0.25} ${-s * 0.1}
    L ${s * 0.15} ${s * 0.5}
    M ${-s * 0.15} ${-s * 0.6}
    L ${s * 0.15} ${-s * 0.6}
    L ${s * 0.1} ${-s * 0.3}
    L ${-s * 0.1} ${-s * 0.3}
    Z
  `;
}

/**
 * Generate cyclist symbol
 */
function cyclistSymbol(size: number): string {
  const s = size * 0.35;
  const wheelR = s * 0.25;
  return `
    M ${-s * 0.35} ${s * 0.15}
    a ${wheelR} ${wheelR} 0 1 0 0.001 0
    M ${s * 0.35} ${s * 0.15}
    a ${wheelR} ${wheelR} 0 1 0 0.001 0
    M ${-s * 0.35} ${s * 0.15}
    L ${-s * 0.1} ${-s * 0.2}
    L ${s * 0.15} ${-s * 0.2}
    L ${s * 0.35} ${s * 0.15}
    M ${-s * 0.1} ${-s * 0.2}
    L ${s * 0.05} ${-s * 0.5}
    a ${s * 0.1} ${s * 0.1} 0 1 0 0.001 0
    M ${s * 0.15} ${-s * 0.2}
    L ${s * 0.3} ${-s * 0.45}
    L ${s * 0.15} ${-s * 0.55}
  `;
}

/**
 * Generate traffic signals symbol
 */
function trafficSignalsSymbol(size: number): string {
  const s = size * 0.3;
  return `
    M ${-s * 0.15} ${-s * 0.8}
    L ${s * 0.15} ${-s * 0.8}
    L ${s * 0.15} ${s * 0.8}
    L ${-s * 0.15} ${s * 0.8}
    Z
    M 0 ${-s * 0.5} a ${s * 0.1} ${s * 0.1} 0 1 0 0.001 0
    M 0 0 a ${s * 0.1} ${s * 0.1} 0 1 0 0.001 0
    M 0 ${s * 0.5} a ${s * 0.1} ${s * 0.1} 0 1 0 0.001 0
  `;
}

/**
 * Get sign path data for a specific sign type
 */
export function getSignPath(
  signId: string,
  width: number,
  height: number,
  background: string,
  border: string,
  borderWidth: number,
  symbolColor: string
): SignPath {
  const radius = Math.min(width, height) / 2;

  // Speed limit signs
  if (signId.startsWith('speed-')) {
    const speed = signId.replace('speed-', '');
    return {
      type: 'circle',
      path: circleOutline(radius),
      width,
      height,
      background,
      border,
      borderWidth,
      text: speed,
      textSize: radius * 0.8,
      symbolColor,
    };
  }

  // National speed limit
  if (signId === 'national-speed') {
    return {
      type: 'circle',
      path: circleOutline(radius),
      width,
      height,
      background,
      border,
      borderWidth,
      symbolPath: `M ${-radius * 0.6} ${radius * 0.6} L ${radius * 0.6} ${-radius * 0.6}`,
      symbolColor,
    };
  }

  // Stop sign
  if (signId === 'stop') {
    return {
      type: 'octagon',
      path: octagonOutline(width),
      width,
      height,
      background,
      border,
      borderWidth,
      text: 'STOP',
      textSize: radius * 0.4,
      symbolColor,
    };
  }

  // Give way sign
  if (signId === 'give-way') {
    return {
      type: 'triangle-inverted',
      path: triangleInvertedOutline(width, height),
      width,
      height,
      background,
      border,
      borderWidth,
      text: 'GIVE\nWAY',
      textSize: width * 0.12,
      symbolColor,
    };
  }

  // No entry
  if (signId === 'no-entry') {
    return {
      type: 'circle',
      path: circleOutline(radius),
      width,
      height,
      background,
      border,
      borderWidth,
      symbolPath: noEntrySymbol(width),
      symbolColor,
    };
  }

  // No turn signs
  if (signId === 'no-left-turn' || signId === 'no-right-turn' || signId === 'no-u-turn') {
    const direction = signId.includes('left') ? 'left' : 'right';
    return {
      type: 'circle',
      path: circleOutline(radius),
      width,
      height,
      background,
      border,
      borderWidth,
      symbolPath: `${keepArrow(direction, width)} ${prohibitionSlash(radius)}`,
      symbolColor,
    };
  }

  // Keep left/right
  if (signId === 'keep-left' || signId === 'keep-right') {
    const direction = signId.includes('left') ? 'left' : 'right';
    return {
      type: 'circle',
      path: circleOutline(radius),
      width,
      height,
      background,
      border,
      borderWidth,
      symbolPath: keepArrow(direction, width),
      symbolColor,
    };
  }

  // Mini roundabout
  if (signId === 'mini-roundabout') {
    return {
      type: 'circle',
      path: circleOutline(radius),
      width,
      height,
      background,
      border,
      borderWidth,
      symbolPath: miniRoundaboutSymbol(width),
      symbolColor,
    };
  }

  // One way
  if (signId === 'one-way') {
    return {
      type: 'rectangle',
      path: rectangleOutline(width, height),
      width,
      height,
      background,
      border,
      borderWidth,
      text: 'ONE WAY',
      textSize: height * 0.5,
      symbolColor,
    };
  }

  // Warning signs (triangles)
  if (signId.startsWith('warning-')) {
    const warningType = signId.replace('warning-', '');
    let symbolPath = '';

    switch (warningType) {
      case 'bend-left':
        symbolPath = bendSymbol('left', width);
        break;
      case 'bend-right':
        symbolPath = bendSymbol('right', width);
        break;
      case 'pedestrians':
        symbolPath = pedestrianSymbol(width);
        break;
      case 'children':
        symbolPath = pedestrianSymbol(width); // Simplified
        break;
      case 'cyclists':
        symbolPath = cyclistSymbol(width);
        break;
      case 'traffic-signals':
        symbolPath = trafficSignalsSymbol(width);
        break;
      case 'roundabout':
        symbolPath = miniRoundaboutSymbol(width * 0.8);
        break;
      default:
        // Generic exclamation for other warnings
        symbolPath = `M 0 ${-height * 0.15} L 0 ${height * 0.1} M 0 ${height * 0.2} L 0 ${height * 0.22}`;
    }

    return {
      type: 'triangle',
      path: triangleOutline(width, height),
      width,
      height,
      background,
      border,
      borderWidth,
      symbolPath,
      symbolColor,
    };
  }

  // Information signs (rectangles)
  if (signId.startsWith('info-') || signId.startsWith('direction-')) {
    let text = '';
    let symbolPath = '';

    if (signId === 'info-parking') text = 'P';
    else if (signId === 'info-hospital') text = 'H';
    else if (signId === 'info-cycle-route') symbolPath = cyclistSymbol(Math.min(width, height));
    else if (signId === 'info-pedestrian-crossing') symbolPath = pedestrianSymbol(Math.min(width, height));

    return {
      type: 'rectangle',
      path: rectangleOutline(width, height),
      width,
      height,
      background,
      border,
      borderWidth,
      text: text || undefined,
      textSize: Math.min(width, height) * 0.6,
      symbolPath: symbolPath || undefined,
      symbolColor,
    };
  }

  // Default circle
  return {
    type: 'circle',
    path: circleOutline(radius),
    width,
    height,
    background,
    border,
    borderWidth,
    symbolColor,
  };
}
