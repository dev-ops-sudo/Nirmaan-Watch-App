import { spawn } from 'node:child_process';
const action=process.argv[2];
const commands={dev:['node_modules/vite/bin/vite.js'],build:['node_modules/vinext/dist/cli.js','build'],start:['node_modules/vinext/dist/cli.js','start'],lint:['node_modules/eslint/bin/eslint.js','.','--ignore-pattern','dist','--ignore-pattern','.next']};
if(!commands[action])throw new Error('Unknown project command');
const legacy=process.platform!=='win32'&&action==='build';
const child=spawn(legacy?'bash':process.execPath,legacy?['scripts/build-verified.sh']:[...commands[action],...process.argv.slice(3)],{stdio:'inherit',env:{...process.env,WRANGLER_LOG_PATH:'.wrangler/wrangler.log',WRANGLER_WRITE_LOGS:'false'},timeout:action==='build'?240000:undefined});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
