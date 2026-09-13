import { spawn } from 'node:child_process';

const action = process.argv[2];
const commands = {
  dev: ['node_modules/vite/bin/vite.js'],
  build: ['node_modules/vite/bin/vite.js', 'build'],
  preview: ['node_modules/vite/bin/vite.js', 'preview'],
  start: ['node_modules/vite/bin/vite.js', 'preview', '--host', '0.0.0.0', '--port', '3000'],
  lint: ['node_modules/eslint/bin/eslint.js', '.', '--ignore-pattern', 'dist', '--ignore-pattern', '.next']
};

if (!commands[action]) {
  throw new Error(`Unknown project command: ${action}`);
}

const child = spawn(process.execPath, [...commands[action], ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (e) => {
  console.error(e.message);
  process.exitCode = 1;
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
