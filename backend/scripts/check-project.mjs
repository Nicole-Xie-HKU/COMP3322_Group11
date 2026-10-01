import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..');process.chdir(root);
const skip=new Set(['.git','node_modules','tmp','coverage','dist']);
function walk(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>skip.has(entry.name)?[]:
    entry.isDirectory()?walk(resolve(directory,entry.name)):[resolve(directory,entry.name)]);
}
const files=walk(root),sources=files.filter(file=>/\.(?:js|mjs|cjs)$/.test(file));
const graph=new Map(),issues=[];
const moduleOf=file=>{const name=relative(root,file);return name.startsWith('backend/tests/')?'tests':name.startsWith('backend/database/')?'Database':name.startsWith('backend/')?'Backend':name.split('/')[0];};
function layer(file) {
  const match=file.match(/\/l([0-3])_[^/]+\//);return match?Number(match[1]):null;
}
function findImport(file,specifier) {
  const base=resolve(dirname(file),specifier);
  return [base,base+'.js',base+'.mjs',base+'.cjs',resolve(base,'index.js')].find(candidate=>existsSync(candidate)&&files.includes(candidate));
}
for(const file of sources) {
  const source=readFileSync(file,'utf8'),name=relative(root,file);
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
  if(source.trimEnd().split('\n').length>200)issues.push(`Source exceeds 200 lines: ${name}`);
  const imports=[...source.matchAll(/(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)].map(match=>findImport(file,match[1]));
  if(imports.some(value=>!value))issues.push(`Unresolved local import: ${name}`);
  graph.set(file,imports.filter(Boolean));
  for(const target of imports.filter(Boolean)) {
    const fromLayer=layer(file),toLayer=layer(target);
    if(fromLayer!==null&&toLayer!==null&&toLayer>fromLayer)issues.push(`Upward import: ${name} -> ${relative(root,target)}`);
    if(fromLayer!==null&&moduleOf(file)!==moduleOf(target))issues.push(`Layer imports another module directly: ${name}`);
    if(moduleOf(file)==='Backend'&&moduleOf(target)==='Database'&&relative(root,target)!=='backend/database/public.js')issues.push(`Database boundary bypass: ${name}`);
    if(moduleOf(file)==='Backend'&&moduleOf(target)==='scheduler'&&relative(root,target)!=='scheduler/scheduler.js')issues.push(`Scheduler boundary bypass: ${name}`);
  }
}
const visited=new Set(),stack=new Set();
function visit(file) {
  if(stack.has(file)){issues.push(`Import cycle at ${relative(root,file)}`);return;}
  if(visited.has(file))return;
  stack.add(file);for(const target of graph.get(file)||[])visit(target);stack.delete(file);visited.add(file);
}
for(const file of sources)visit(file);
const docs=files.filter(file=>extname(file)==='.md'&&!relative(root,file).startsWith('proposal/'));
const docGraph=new Map();
for(const file of docs) {
  const source=readFileSync(file,'utf8'),name=relative(root,file),links=[];
  if(Buffer.byteLength(source)>4000)issues.push(`Document exceeds 4000 bytes: ${name}`);
  for(const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target=match[1].split('#')[0];if(!target||/^[a-z][a-z\d+.-]*:/i.test(target))continue;
    const path=resolve(dirname(file),decodeURIComponent(target));links.push(path);
    if(!existsSync(path))issues.push(`Broken link in ${name}: ${target}`);
  }
  docGraph.set(file,links);
}
const reachable=new Set();
function reach(file){if(reachable.has(file))return;reachable.add(file);for(const target of docGraph.get(file)||[])reach(target);}
for(const index of ['README.md','FEATURES.md','TASK_PROGRESS.md','PROJECT_LOG.md'])reach(resolve(root,index));
for(const file of docs.filter(file=>relative(root,file).startsWith('backend/docs/')))if(!reachable.has(file))issues.push(`Unreachable documentation: ${relative(root,file)}`);
// Compare supplied source assets to the recorded main baseline, not to any generated output.
const baseline='5dde468';
const protectedFiles=['proposal/Proposal.md','Database/2026-27 class_timetable_20260902.xlsx','Database/schema.sql','frontend/src/styles.css','frontend/public/hku-logo.svg','Database/excel_to_json_timetable.R'];
const originalFiles=execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n');
for(const file of [...protectedFiles,...originalFiles.filter(file=>file.startsWith('Database/'))]) {
  const original=execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:50*1024*1024});
  assert.ok(readFileSync(file).equals(original),`Protected original changed: ${file}`);
}
assert.equal(execFileSync('git',['check-ignore','.env'],{encoding:'utf8'}).trim(),'.env');
assert.equal(execFileSync('git',['ls-files','.env'],{encoding:'utf8'}).trim(),'');
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({status:'passed',syntaxFiles:sources.length,documentationFiles:docs.length,cycles:0,boundaryViolations:0,protectedSources:'unchanged'}));
