#!/usr/bin/env node
/**
 * sync-translations.js
 * Finds keys in en/translation.json missing from ta/translation.json,
 * auto-translates them using MyMemory (free, no API key), and updates the Tamil file.
 *
 * Usage:  node scripts/sync-translations.js
 *         npm run sync-translations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const EN_PATH = path.join(__dirname, '../public/locales/en/translation.json');
const TA_PATH = path.join(__dirname, '../public/locales/ta/translation.json');

function translate(text) {
  return new Promise((resolve, reject) => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ta`;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.responseData?.translatedText || text);
        } catch {
          resolve(text);
        }
      });
    }).on('error', () => resolve(text));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const ta = JSON.parse(fs.readFileSync(TA_PATH, 'utf8'));

  const missing = Object.keys(en).filter(k => !(k in ta));

  if (missing.length === 0) {
    console.log('All keys are in sync. Nothing to do.');
    return;
  }

  console.log(`Found ${missing.length} missing key(s) in Tamil:`);
  missing.forEach(k => console.log(`  ${k}: "${en[k]}"`));
  console.log('\nTranslating...');

  for (const key of missing) {
    const translated = await translate(en[key]);
    ta[key] = translated;
    console.log(`  ${key}: "${en[key]}" → "${translated}"`);
    await sleep(300); // avoid rate limiting
  }

  // Write back preserving key order (EN order for missing, existing TA order for the rest)
  const merged = {};
  for (const key of Object.keys(en)) {
    merged[key] = ta[key];
  }

  fs.writeFileSync(TA_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`\nDone. Updated ${TA_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
