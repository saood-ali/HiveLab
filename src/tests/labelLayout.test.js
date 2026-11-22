import assert from 'assert';
import {
  getLabelBBox,
  boxesOverlap,
  boxOverlapsNode,
  boxOutOfBounds,
  computeLandscapeLabels,
} from '../components/labelLayout.js';

console.log('=== Test Suite 8: Landscape Label Collision Avoidance ===');

// Test 1: Bounding box math and overlap detection
const b1 = getLabelBBox(100, 100, { dx: 0, dy: -9, anchor: 'middle' }, 20, 11);
const b2 = getLabelBBox(100, 100, { dx: 0, dy: 15, anchor: 'middle' }, 20, 11);
assert.strictEqual(boxesOverlap(b1, b2), false, 'Top and bottom offsets on the same node must not overlap');
console.log('  ✓ Top and bottom offsets on the same node do not overlap');

// Test 2: Active candidate very close to origin food source (5px apart)
// e.g. Rejected move with small delta
const mockToSvg = (v) => v; // identity mapping
const population = [
  { id: 1, x: [100, 100] },
  { id: 2, x: [200, 200] },
];
const moveInfo = {
  type: 'rejected',
  from: [100, 100],
  to: [105, 100], // only 5px away horizontally
};

const layout = computeLandscapeLabels({
  population,
  moveInfo,
  bestSoFar: null,
  activeSourceId: 1,
  toSvgX: (x) => x,
  toSvgY: (y) => y,
});

assert(layout.candidateLabel, 'Candidate label must exist');
assert(layout.sourceLabels[1], 'Source #1 label must exist');

// Compute both actual bounding boxes
const candBox = getLabelBBox(
  layout.candidateLabel.x,
  layout.candidateLabel.y,
  layout.candidateLabel,
  26,
  11
);
const srcBox = getLabelBBox(
  layout.sourceLabels[1].x,
  layout.sourceLabels[1].y,
  layout.sourceLabels[1],
  18,
  11
);

const isColliding = boxesOverlap(candBox, srcBox, 2);
assert.strictEqual(isColliding, false, 'Candidate label and parent food source label must not collide even at 5px distance');
console.log('  ✓ Candidate label and food source label do not collide at 5px horizontal distance');

// Test 3: Vertical close proximity (candidate 6px above food source)
const moveInfoVert = {
  type: 'rejected',
  from: [150, 150],
  to: [150, 144], // 6px above
};
const layoutVert = computeLandscapeLabels({
  population: [{ id: 1, x: [150, 150] }],
  moveInfo: moveInfoVert,
  bestSoFar: null,
  activeSourceId: 1,
  toSvgX: (x) => x,
  toSvgY: (y) => y,
});

const candBoxV = getLabelBBox(
  layoutVert.candidateLabel.x,
  layoutVert.candidateLabel.y,
  layoutVert.candidateLabel,
  26,
  11
);
const srcBoxV = getLabelBBox(
  layoutVert.sourceLabels[1].x,
  layoutVert.sourceLabels[1].y,
  layoutVert.sourceLabels[1],
  18,
  11
);
assert.strictEqual(boxesOverlap(candBoxV, srcBoxV, 2), false, 'Candidate and source label must not collide under vertical proximity');
console.log('  ✓ Candidate and source label do not collide at 6px vertical distance');

// Test 4: Clustered food sources near optimum (all within 15px of each other)
const clusteredPop = [
  { id: 1, x: [200, 200] },
  { id: 2, x: [208, 200] },
  { id: 3, x: [200, 208] },
  { id: 4, x: [195, 195] },
];
const clusterLayout = computeLandscapeLabels({
  population: clusteredPop,
  moveInfo: null,
  bestSoFar: { x: [200, 200] },
  toSvgX: (x) => x,
  toSvgY: (y) => y,
});

const placedBoxes = [];
for (const src of clusteredPop) {
  const lbl = clusterLayout.sourceLabels[src.id];
  const b = getLabelBBox(lbl.x, lbl.y, lbl, 18, 11);
  for (const prev of placedBoxes) {
    assert.strictEqual(boxesOverlap(b, prev, 1), false, `Labels for food sources must not overlap each other`);
  }
  placedBoxes.push(b);
}
console.log('  ✓ 4 tightly clustered food sources have zero label collisions');

console.log('\nAll Label Layout Collision Avoidance tests passed successfully!\n');
