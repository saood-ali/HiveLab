/**
 * Collision-free label layout for 2D Objective Landscape (HiveLab).
 *
 * Prevents visual overlap between:
 * 1. Food source labels (#1, #2, etc.)
 * 2. Active candidate move labels (x' ✓, x' ✗)
 * 3. Global best-so-far marker (★ x*)
 * 4. Swarm node circle markers
 */

const CANDIDATE_POSITIONS = [
  { id: 'top', dx: 0, dy: -9, anchor: 'middle', pref: 0 },
  { id: 'bottom', dx: 0, dy: 15, anchor: 'middle', pref: 2 },
  { id: 'right', dx: 9, dy: 3, anchor: 'start', pref: 1 },
  { id: 'left', dx: -9, dy: 3, anchor: 'end', pref: 1 },
  { id: 'top-right', dx: 8, dy: -8, anchor: 'start', pref: 1.5 },
  { id: 'top-left', dx: -8, dy: -8, anchor: 'end', pref: 1.5 },
  { id: 'bottom-right', dx: 8, dy: 13, anchor: 'start', pref: 2.5 },
  { id: 'bottom-left', dx: -8, dy: 13, anchor: 'end', pref: 2.5 },
];

/**
 * Computes bounding box for a text label.
 */
export function getLabelBBox(x, y, pos, width = 20, height = 11) {
  let left = x + pos.dx;
  if (pos.anchor === 'middle') {
    left -= width / 2;
  } else if (pos.anchor === 'end') {
    left -= width;
  }

  const top = y + pos.dy - height + 2;
  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
  };
}

/**
 * Checks if two bounding boxes overlap with padding.
 */
export function boxesOverlap(b1, b2, pad = 3) {
  return !(
    b1.right + pad <= b2.left ||
    b1.left - pad >= b2.right ||
    b1.bottom + pad <= b2.top ||
    b1.top - pad >= b2.bottom
  );
}

/**
 * Checks if a bounding box overlaps a node circle.
 */
export function boxOverlapsNode(b, nx, ny, radius = 6) {
  return !(
    b.right < nx - radius ||
    b.left > nx + radius ||
    b.bottom < ny - radius ||
    b.top > ny + radius
  );
}

/**
 * Checks if a bounding box is outside the plot area bounds.
 */
export function boxOutOfBounds(b, pad = 36, size = 400) {
  return (
    b.left < pad + 2 ||
    b.right > size - pad - 2 ||
    b.top < pad + 2 ||
    b.bottom > size - pad - 2
  );
}

/**
 * Computes optimal, non-overlapping label positions for all elements in the 2D plot.
 */
export function computeLandscapeLabels({
  population = [],
  moveInfo = null,
  bestSoFar = null,
  activeSourceId = null,
  toSvgX,
  toSvgY,
  pad = 36,
  size = 400,
}) {
  const allNodes = [];
  const placedLabels = [];

  // 1. Gather all node coordinates for circle collision checks
  population.forEach((src) => {
    allNodes.push({
      id: `src-${src.id}`,
      x: toSvgX(src.x[0]),
      y: toSvgY(src.x[1]),
      radius: activeSourceId === src.id ? 7 : 5.5,
    });
  });

  if (moveInfo && moveInfo.to) {
    allNodes.push({
      id: 'cand',
      x: toSvgX(moveInfo.to[0]),
      y: toSvgY(moveInfo.to[1]),
      radius: 4,
    });
  }

  // 2. Candidate Label Layout (Highest priority when active)
  let candidateLabel = null;
  if (moveInfo && moveInfo.to && moveInfo.from) {
    const candX = toSvgX(moveInfo.to[0]);
    const candY = toSvgY(moveInfo.to[1]);
    const fromX = toSvgX(moveInfo.from[0]);
    const fromY = toSvgY(moveInfo.from[1]);

    const dx = candX - fromX;
    const dy = candY - fromY;
    const dist = Math.hypot(dx, dy);

    // Dynamic preference based on vector direction away from origin source
    const candPositions = [...CANDIDATE_POSITIONS].map((p) => {
      let pref = p.pref;
      if (dist < 20) {
        // When candidate is extremely close to origin source (e.g. small perturbation or rejected move),
        // cleanly split vertically: candidate prefers bottom, while origin source stays at top.
        if (p.id === 'bottom') pref -= 5;
        else if (p.id === 'top') pref += 5;
      } else if (dist < 45) {
        // Strongly push candidate label along the outward travel vector
        if (Math.abs(dx) >= Math.abs(dy)) {
          if (dx >= 0 && (p.id === 'right' || p.id === 'top-right' || p.id === 'bottom-right')) pref -= 3;
          if (dx < 0 && (p.id === 'left' || p.id === 'top-left' || p.id === 'bottom-left')) pref -= 3;
        } else {
          if (dy >= 0 && (p.id === 'bottom' || p.id === 'bottom-right' || p.id === 'bottom-left')) pref -= 3;
          if (dy < 0 && (p.id === 'top' || p.id === 'top-right' || p.id === 'top-left')) pref -= 3;
        }
      }
      return { ...p, pref };
    });

    candPositions.sort((a, b) => a.pref - b.pref);

    const candWidth = 26;
    const candHeight = 11;
    let bestPos = candPositions[0];
    let bestScore = Infinity;

    for (const pos of candPositions) {
      const bbox = getLabelBBox(candX, candY, pos, candWidth, candHeight);
      let score = pos.pref * 10;

      if (boxOutOfBounds(bbox, pad, size)) score += 300;

      // Check collision with any node circles (especially the origin source)
      for (const node of allNodes) {
        if (node.id !== 'cand' && boxOverlapsNode(bbox, node.x, node.y, node.radius)) {
          score += 500;
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    const finalBBox = getLabelBBox(candX, candY, bestPos, candWidth, candHeight);
    placedLabels.push(finalBBox);

    candidateLabel = {
      x: candX,
      y: candY,
      dx: bestPos.dx,
      dy: bestPos.dy,
      anchor: bestPos.anchor,
      bbox: finalBBox,
    };
  }

  // 3. Food Source Labels Layout
  // Order sources so the active source is positioned next (to cleanly avoid candidate)
  const sourceList = [...population].sort((a, b) => {
    if (a.id === activeSourceId) return -1;
    if (b.id === activeSourceId) return 1;
    return a.id - b.id;
  });

  const sourceLabels = {};

  for (const src of sourceList) {
    const sx = toSvgX(src.x[0]);
    const sy = toSvgY(src.x[1]);
    const isAct = src.id === activeSourceId;
    const srcWidth = src.id >= 10 ? 22 : 18;
    const srcHeight = 11;

    // Filter and score positions
    const posCandidates = [...CANDIDATE_POSITIONS].map((p) => {
      let pref = p.pref;
      // If this is the active source and candidate is nearby, favor direction away from candidate
      if (isAct && moveInfo && moveInfo.to) {
        const candX = toSvgX(moveInfo.to[0]);
        const candY = toSvgY(moveInfo.to[1]);
        const dx = candX - sx;
        const dy = candY - sy;
        if (Math.hypot(dx, dy) < 45) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            // Candidate is right -> source label prefers left
            if (dx >= 0 && (p.id === 'left' || p.id === 'top-left' || p.id === 'bottom-left')) pref -= 3;
            // Candidate is left -> source label prefers right
            if (dx < 0 && (p.id === 'right' || p.id === 'top-right' || p.id === 'bottom-right')) pref -= 3;
          } else {
            // Candidate is below -> source label prefers top
            if (dy >= 0 && (p.id === 'top' || p.id === 'top-right' || p.id === 'top-left')) pref -= 3;
            // Candidate is above -> source label prefers bottom
            if (dy < 0 && (p.id === 'bottom' || p.id === 'bottom-right' || p.id === 'bottom-left')) pref -= 3;
          }
        }
      }
      return { ...p, pref };
    });

    posCandidates.sort((a, b) => a.pref - b.pref);

    let chosenPos = posCandidates[0];
    let minScore = Infinity;

    for (const pos of posCandidates) {
      const bbox = getLabelBBox(sx, sy, pos, srcWidth, srcHeight);
      let score = pos.pref * 10;

      // Penalize boundaries
      if (boxOutOfBounds(bbox, pad, size)) score += 300;

      // Penalize overlaps with other node circles
      for (const node of allNodes) {
        if (node.id !== `src-${src.id}` && boxOverlapsNode(bbox, node.x, node.y, node.radius)) {
          score += 400;
        }
      }

      // Penalize overlaps with already placed labels (highest priority penalty)
      for (const placed of placedLabels) {
        if (boxesOverlap(bbox, placed, 2)) {
          score += 1000;
        }
      }

      if (score < minScore) {
        minScore = score;
        chosenPos = pos;
      }
    }

    const finalBBox = getLabelBBox(sx, sy, chosenPos, srcWidth, srcHeight);
    placedLabels.push(finalBBox);

    sourceLabels[src.id] = {
      x: sx,
      y: sy,
      dx: chosenPos.dx,
      dy: chosenPos.dy,
      anchor: chosenPos.anchor,
    };
  }

  // 4. Best-so-far Star Marker Layout
  let bestLabel = null;
  if (bestSoFar) {
    const bx = toSvgX(bestSoFar.x[0]);
    const by = toSvgY(bestSoFar.x[1]);
    const starWidth = 28;
    const starHeight = 11;

    const starPositions = [
      { id: 'right', dx: 9, dy: 4, anchor: 'start', pref: 0 },
      { id: 'top-right', dx: 8, dy: -8, anchor: 'start', pref: 1 },
      { id: 'bottom-right', dx: 8, dy: 14, anchor: 'start', pref: 1.5 },
      { id: 'top', dx: 0, dy: -10, anchor: 'middle', pref: 2 },
      { id: 'bottom', dx: 0, dy: 15, anchor: 'middle', pref: 2.5 },
      { id: 'left', dx: -9, dy: 4, anchor: 'end', pref: 3 },
    ];

    let chosenPos = starPositions[0];
    let minScore = Infinity;

    for (const pos of starPositions) {
      const bbox = getLabelBBox(bx, by, pos, starWidth, starHeight);
      let score = pos.pref * 10;

      if (boxOutOfBounds(bbox, pad, size)) score += 300;

      for (const placed of placedLabels) {
        if (boxesOverlap(bbox, placed, 2)) {
          score += 1000;
        }
      }

      if (score < minScore) {
        minScore = score;
        chosenPos = pos;
      }
    }

    bestLabel = {
      x: bx,
      y: by,
      dx: chosenPos.dx,
      dy: chosenPos.dy,
      anchor: chosenPos.anchor,
    };
  }

  return {
    candidateLabel,
    sourceLabels,
    bestLabel,
  };
}
