// Repository sanity checks: SVG validity, local markdown links, and a secret/private-data scan.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
const skip=new Set(['node_modules','dist','.git','.data','reference']);
const files=[];const walk=d=>{for(const n of readdirSync(d)){if(skip.has(n))continue;const p=join(d,n);statSync(p).isDirectory()?walk(p):files.push(p);}};walk('.');
let fail=0;const bad=m=>{console.error('FAIL',m);fail++;};
for(const f of files.filter(f=>f.endsWith('.svg'))){const s=readFileSync(f,'utf8');if(!/^<svg [^>]*width="\d+" height="\d+" viewBox=/.test(s)||!s.includes('<title')||!s.trim().endsWith('</svg>'))bad(`svg ${f}`);}
for(const f of files.filter(f=>f.endsWith('.md'))){const s=readFileSync(f,'utf8');for(const m of s.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)){const t=m[1];if(/^(https?:|mailto:)/.test(t))continue;if(!existsSync(resolve(dirname(f),t)))bad(`link ${f} -> ${t}`);}}
const patterns=[/gh[pousr]_[A-Za-z0-9]{20,}/,/sk-[A-Za-z0-9]{20,}/,/AKIA[0-9A-Z]{16}/,/-----BEGIN [A-Z ]*PRIVATE KEY/,/xox[abp]-[A-Za-z0-9-]{10,}/,/Bearer [A-Za-z0-9._-]{20,}/,/AAAAAAAAAAAAAAAAAAAAA/];
const privateTerms=(process.env.PRIVATE_TERMS??'').split(',').filter(Boolean).map(t=>new RegExp(t,'i'));
for(const f of files){if(/\.(svg|json|md|ts|mjs|sh|yml|txt)$|LICENSE|gitignore/.test(f)&&!f.endsWith('package-lock.json')){const s=readFileSync(f,'utf8');for(const p of [...patterns,...privateTerms])if(p.test(s)&&!f.endsWith('check-repo.mjs'))bad(`pattern ${p} in ${f}`);}}
if(fail){console.error(`${fail} problem(s)`);process.exit(1);}console.log(`repo checks: OK (${files.length} files)`);
