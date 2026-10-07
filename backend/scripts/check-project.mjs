import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');process.chdir(root);
const skip=new Set(['.git','node_modules','tmp','coverage','dist']);
function walk(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>skip.has(entry.name)?[]:
    entry.isDirectory()?walk(resolve(directory,entry.name)):[resolve(directory,entry.name)]);
}
const files=walk(root),sources=files.filter(file=>/\.(?:js|jsx|mjs|cjs)$/.test(file));
const graph=new Map(),issues=[];
const moduleOf=file=>{const name=relative(root,file);return name.startsWith('backend/tests/')?'tests':name.startsWith('backend/database/')?'Database':name.startsWith('backend/')?'Backend':name.split('/')[0];};
function layer(file) {
  const match=file.match(/\/l([0-3])_[^/]+\//);return match?Number(match[1]):null;
}
function findImport(file,specifier) {
  const base=resolve(dirname(file),specifier);
  return [base,base+'.js',base+'.jsx',base+'.mjs',base+'.cjs',resolve(base,'index.js')].find(candidate=>existsSync(candidate)&&files.includes(candidate));
}
for(const file of sources) {
  const source=readFileSync(file,'utf8'),name=relative(root,file);
  if(!file.endsWith('.jsx'))execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
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
// A portable source manifest works in both a Git checkout and a local patch snapshot.
const protectedSources=JSON.parse(readFileSync(resolve(root,'backend/scripts/protected-sources.json'),'utf8'));
for(const [file,hash] of Object.entries(protectedSources)) {
  assert.equal(createHash('sha256').update(readFileSync(resolve(root,file))).digest('hex'),hash,`Protected original changed: ${file}`);
}
assert.ok(readFileSync(resolve(root,'.gitignore'),'utf8').split('\n').includes('.env'),'Ignore local secrets');
if(issues.length)throw new Error(issues.join('\n'));
console.log(JSON.stringify({status:'passed',syntaxFiles:sources.length,documentationFiles:docs.length,cycles:0,boundaryViolations:0,protectedSources:'unchanged'}));
