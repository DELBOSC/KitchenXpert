#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');
const RAW  = fs.readFileSync(
  path.resolve(__dirname, '../../docs/planning/arborescence-definitive.txt'),
  'utf8'
);
const lines = RAW.split(/\r?\n/).map(line => {
  const m = line.match(/^([│\s]*)(?:├── |└── )(.+)$/);
  if (!m) return null;
  return { level: m[1].replace(/│/g,' ').length, name: m[2].split('#')[0].trim() };
}).filter(Boolean);
lines.forEach((e,i) => {
  const next = lines[i+1];
  e.isDir = next && next.level > e.level;
});
const stack = [{ level: -1, dir: process.cwd() }];
lines.forEach(({ level, name, isDir }) => {
  while (stack[stack.length-1].level >= level) stack.pop();
  const parent = stack[stack.length-1].dir;
  const target = path.join(parent, name);
  if (isDir) {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    stack.push({ level, dir: target });
  } else {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, '', 'utf8');
  }
});
console.log('✅ Arborescence générée !');  
