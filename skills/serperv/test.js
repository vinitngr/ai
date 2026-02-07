import { execSync } from 'child_process';

console.log('Starting Serper-V CLI tests...\n');

const tests = [
  { name: 'General Search', cmd: 'serperV search -q "OpenClaw" -l 2' },
  { name: 'Past Hour Search', cmd: 'serperV search -q "Apple Inc" --tbs qdr:h -l 2' },
  { name: 'Places Search', cmd: 'serperV search -q "Coffee in London" -t places -l 2' },
  { name: 'News Search', cmd: 'serperV search -q "Tech News" -t news -l 2' },
  { name: 'Scholar Search', cmd: 'serperV search -q "Quantum Computing" -t scholar -l 2' },
  { name: 'Bulk Scrape', cmd: 'serperV scrape -u "https://example.com, https://vinitngr.xyz"' }
];

let passCount = 0;

tests.forEach(test => {
  try {
    console.log(`Running: ${test.name}`);
    execSync(test.cmd, { stdio: 'ignore' });
    console.log(`${test.name} passed.\n`);
    passCount++;
  } catch (err) {
    console.error(`${test.name} failed. (Make sure you are authenticated)\n`);
  }
});

console.log(`\nTests complete: ${passCount}/${tests.length} passed.`);

if (passCount < tests.length) {
  console.log('💡 Note: Try running "serperV auth <key>" if tests failed.');
  process.exit(1);
}
