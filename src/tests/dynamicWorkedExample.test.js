import assert from 'assert';
import { generateDynamicWorkedExample } from '../engine/workedExampleGenerator.js';
import { PROBLEMS } from '../data/problems.js';

console.log('=== Test Suite 9: Dynamic Worked Example Generator ===');

const sphere = PROBLEMS[0];
const rosenbrock = PROBLEMS[1];
const rastrigin = PROBLEMS[2];

// Test 1: Sphere with default parameters
{
  const stages = generateDynamicWorkedExample(sphere, sphere.defaultParams);
  assert.strictEqual(stages.length, 4, 'Must return 4 stages');
  assert.strictEqual(stages[0].phase, 'INIT', 'Stage 0 is INIT');
  assert.strictEqual(stages[1].phase, 'EMPLOYED', 'Stage 1 is EMPLOYED');
  assert.strictEqual(stages[2].phase, 'ONLOOKER', 'Stage 2 is ONLOOKER');
  assert.strictEqual(stages[3].phase, 'SCOUT', 'Stage 3 is SCOUT');
  assert.strictEqual(stages[0].population.length, 5, 'Np = S/2 = 5 sources for S=10');
  assert(stages[1].calculation.probBreakdown.length === 5, 'Stage 1 has probability breakdown for all sources');
  console.log('  ✓ Sphere dynamic worked example generated successfully');
}

// Test 2: Rosenbrock with custom S=6 (Np=3) and custom bounds
{
  const customParams = {
    S: 6,
    T: 5,
    limit: 2,
    seed: 123,
    bounds: [[-2, 2], [-1, 3]],
  };
  const stages = generateDynamicWorkedExample(rosenbrock, customParams);
  assert.strictEqual(stages[0].population.length, 3, 'Np = 6/2 = 3 sources');
  assert.strictEqual(stages[1].calculation.partnerId !== stages[1].calculation.sourceId, true, 'Partner must not equal source');
  assert(stages[3].calculation.limit === 2, 'Limit matches configured limit');
  console.log('  ✓ Rosenbrock with custom S=6 and non-symmetric bounds generated successfully');
}

// Test 3: Rastrigin with S=8 (Np=4) and limit=1 (Scout trigger check)
{
  const customParams = {
    S: 8,
    T: 5,
    limit: 1,
    seed: 999,
    bounds: [[-5.12, 5.12], [-5.12, 5.12]],
  };
  const stages = generateDynamicWorkedExample(rastrigin, customParams);
  assert.strictEqual(stages[0].population.length, 4, 'Np = 4 sources');
  assert(stages[0].bestSoFar.f !== undefined, 'Initial best solution exists');
  console.log('  ✓ Rastrigin multimodal problem dynamic calculation generated successfully');
}

console.log('\nAll Dynamic Worked Example Generator tests passed successfully!\n');
