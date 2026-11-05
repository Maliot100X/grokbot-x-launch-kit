// Repository sanity checks: SVG validity, local markdown links, and a secret/private-data scan.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
const skip=new Set(['node_modules','dist','.git','.data','reference']);
const files=[];const walk=d=>{for(const n of readdirSync(d)){if(skip.has(n))continue;const p=join(d,n);statSync(p).isDirectory()?walk(p):files.push(p);}};walk('.');
let fail=0;const bad=m=>{console.error('FAIL',m);fail++;};
for(const f of files.filter(f=>f.endsWith('.svg'))){const s=readFileSync(f,'utf8');if(!/^<svg [^>]*width="\d+" height="\d+" viewBox=/.test(s)||!s.includes('<title')||!s.trim().endsWith('</svg>'))bad(`svg ${f}`);}
for(const f of files.filter(f=>f.endsWith('.md'))){const s=readFileSync(f,'utf8');for(const m of [...s.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g),...s.matchAll(/(?:src|href)="([^"#]+)"/g)]){const t=m[1];if(/^(https?:|mailto:)/.test(t))continue;if(!existsSync(resolve(dirname(f),t)))bad(`link ${f} -> ${t}`);}}
// Raster checks: parse PNG/JPEG headers for dimensions, enforce size budget.
function dims(buf){if(buf.readUInt32BE(0)===0x89504e47)return[buf.readUInt32BE(16),buf.readUInt32BE(20)];
 if(buf[0]===0xff&&buf[1]===0xd8){let i=2;while(i<buf.length){if(buf[i]!==0xff){i++;continue;}const m=buf[i+1],len=buf.readUInt16BE(i+2);if(m>=0xc0&&m<=0xc3)return[buf.readUInt16BE(i+7),buf.readUInt16BE(i+5)];i+=2+len;}}return null;}
const expected={'docs/brand/derived/profile-400.png':[400,400],'docs/brand/derived/profile-800.jpg':[800,800],'docs/brand/derived/x-header-1500x500.jpg':[1500,500],'docs/brand/derived/github-social-1280x640.jpg':[1280,640]};
let images=0;for(const f of files.filter(f=>/\.(png|jpe?g)$/i.test(f))){images++;const b=readFileSync(f);const d=dims(b);if(!d)bad(`unreadable image ${f}`);else{const e=expected[f.replace(/^\.\//,'')];if(e&&(d[0]!==e[0]||d[1]!==e[1]))bad(`dims ${f} ${d}`);}if(b.length>400*1024)bad(`image too large ${f}`);}
for(const f of Object.keys(expected))if(!existsSync(f))bad(`missing ${f}`);
const patterns=[/gh[pousr]_[A-Za-z0-9]{20,}/,/sk-[A-Za-z0-9]{20,}/,/AKIA[0-9A-Z]{16}/,/-----BEGIN [A-Z ]*PRIVATE KEY/,/xox[abp]-[A-Za-z0-9-]{10,}/,/Bearer [A-Za-z0-9._-]{20,}/,/AAAAAAAAAAAAAAAAAAAAA/];
const privateTerms=(process.env.PRIVATE_TERMS??'').split(',').filter(Boolean).map(t=>new RegExp(t,'i'));
for(const f of files){if(/\.(svg|json|md|ts|mjs|sh|yml|txt)$|LICENSE|gitignore/.test(f)&&!f.endsWith('package-lock.json')){const s=readFileSync(f,'utf8');for(const p of [...patterns,...privateTerms])if(p.test(s)&&!f.endsWith('check-repo.mjs'))bad(`pattern ${p} in ${f}`);}}
if(fail){console.error(`${fail} problem(s)`);process.exit(1);}console.log(`repo checks: OK (${files.length} files, ${images} raster images)`);
