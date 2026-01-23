import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const docsDir = resolve(repoRoot, "docs", "site", "docs");
const outPath = resolve(docsDir, "search-index.json");

const htmlFiles = readdirSync(docsDir).filter((name) => name.endsWith(".html"));

const entries = htmlFiles.map((file) => {
  const fullPath = resolve(docsDir, file);
  const html = readFileSync(fullPath, "utf-8");
  const title = matchTag(html, /<title>(.*?)<\/title>/i) ?? file;
  const summary =
    matchTag(html, /<meta name="description" content="(.*?)"/i) ??
    matchTag(html, /<p class="hero__lead">(.*?)<\/p>/i) ??
    "";
  return {
    title: stripTags(title),
    summary: stripTags(summary),
    url: `./${file}`,
    tags: guessTags(title + " " + summary)
  };
});

const docsRoot = resolve(repoRoot);
const extra = [
  extractMarkdown(resolve(docsRoot, "spec.md"), "../../spec.md"),
  extractMarkdown(resolve(docsRoot, "statement.md"), "../../statement.md")
].filter(Boolean);

const index = [...entries, ...extra];
writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${index.length} entries to ${outPath}`);

function matchTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, "").trim();
}

function guessTags(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  return Array.from(new Set(words)).slice(0, 6);
}

function extractMarkdown(path, url) {
  try {
    const content = readFileSync(path, "utf-8");
    const title = content.match(/^#\s+(.+)$/m)?.[1] ?? "Document";
    const summary = content
      .split("\n")
      .slice(0, 8)
      .join(" ")
      .replace(/#+\s+/g, "")
      .trim();
    return {
      title,
      summary,
      url,
      tags: guessTags(title + " " + summary)
    };
  } catch {
    return null;
  }
}
