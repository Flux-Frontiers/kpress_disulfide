// Write public/forests/index.json: one entry per exported database under
// public/forests/<slug>/, which the app reads to offer a choice of database.
// `make forest` runs it after each export.
//
//   node scripts/forests.mjs

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const root = "public/forests";
const forests = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}/${d.name}/catalog.json`))
  .map((d) => {
    const catalog = JSON.parse(readFileSync(`${root}/${d.name}/catalog.json`, "utf8"));
    const about = existsSync(`${root}/${d.name}/about.json`)
      ? JSON.parse(readFileSync(`${root}/${d.name}/about.json`, "utf8"))
      : {};
    return {
      slug: d.name,
      title: about.title || d.name,
      ...(about.home ? { home: about.home } : {}),
      bonds: catalog.meta.database.bonds,
      lines: catalog.lines.length,
    };
  })
  // Largest first: the app opens on the first unless a database was chosen before.
  .sort((a, b) => b.bonds - a.bonds || a.title.localeCompare(b.title));
writeFileSync(`${root}/index.json`, `${JSON.stringify({ forests }, null, 1)}\n`);
console.log(forests.map((f) => `${f.slug}: ${f.title} (${f.bonds} bonds, ${f.lines} lines)`).join("\n"));
