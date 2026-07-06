import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("focused interactive surfaces include smooth motion states", () => {
  const navMenu = source("src/components/NavMenu.tsx");
  assert.match(navMenu, /aria-expanded=\{open\}/);
  assert.match(navMenu, /transition-\[opacity,transform\]/);
  assert.match(navMenu, /duration-300/);
  assert.match(navMenu, /sm:duration-200/);
  assert.match(navMenu, /rotate-45/);

  const catalogGrid = source("src/components/CatalogGrid.tsx");
  assert.match(catalogGrid, /transition-\[grid-template-rows,opacity\]/);

  const profileEditor = source("src/components/ProfileEditor.tsx");
  assert.match(profileEditor, /transition-\[opacity,transform\]/);

  const readerView = source("src/components/ReaderView.tsx");
  assert.match(readerView, /transition-\[opacity,transform\]/);
});

test("dark theme uses a warm low-contrast night-reading palette", () => {
  const globals = source("src/app/globals.css");

  assert.match(globals, /--paper: 30 26 22;/);
  assert.match(globals, /--ink: 216 199 163;/);
  assert.match(globals, /--surface: 42 36 30;/);
  assert.match(globals, /--accent: 201 138 74;/);
  assert.match(globals, /--accent-dark: 183 121 62;/);
});
