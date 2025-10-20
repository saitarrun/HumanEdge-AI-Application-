
import { humanizeAdvanced, simpleDiff } from './utils/humanTexture.js';

const aiText = `The system is designed to process data streams in real-time. It is imperative to utilize the provided APIs for data ingestion. The performance of the system is approximately 1000 transactions per second. However, we cannot guarantee this performance under all conditions. Therefore, users should implement their own monitoring.`;

console.log('--- Original AI Text ---');
console.log(aiText);
console.log('\n' + '='.repeat(50) + '\n');

// --- Example 1: Engineering Report ---
console.log('--- Profile: Engineering Report ---');
const engResult = humanizeAdvanced(aiText, {
  formality: 'technical',
  audience: 'engineers',
  region: 'US',
  seed: 'eng-report-123',
});

console.log(engResult.text);
console.log('\n--- Metadata ---');
console.log(engResult.meta);
console.log('\n' + '='.repeat(50) + '\n');


// --- Example 2: Marketing Blog Post ---
console.log('--- Profile: Marketing Blog Post ---');
const marketingResult = humanizeAdvanced(aiText, {
  formality: 'marketing',
  audience: 'executives',
  region: 'US',
  seed: 'mktg-post-456',
});

console.log(marketingResult.text);
console.log('\n--- Metadata ---');
console.log(marketingResult.meta);
console.log('\n' + '='.repeat(50) + '\n');


// --- Example 3: Custom Style Sheet & Imperfections ---
console.log('--- Profile: Custom Style Sheet & Imperfections ---');
const customResult = humanizeAdvanced(aiText, {
  formality: 'casual',
  seed: 'custom-789',
  errors: 1, // Add some mild imperfections
  styleProfile: {
    preferredTerms: {
      'system': 'platform',
      'users': 'developers',
    },
    forbiddenPhrases: [
      'It is imperative to',
    ]
  }
});

console.log(customResult.text);
console.log('\n--- Metadata ---');
console.log(customResult.meta);
console.log('\n--- Diff ---');
// The simpleDiff function is also exported for you to use
const diff = simpleDiff(aiText, customResult.text);
console.log('Showing differences from original:');
console.log(diff);
console.log('\n' + '='.repeat(50) + '\n');
