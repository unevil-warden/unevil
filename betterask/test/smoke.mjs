/**
 * End-to-end smoke test: loads the built extension into Chromium and verifies the
 * popup/options/dashboard pages render and the "fix ask" pill flow works on a mock
 * supported-site page.
 *
 * Prereqs: `npm run build` (produces dist/), then `node test/smoke.mjs`.
 *
 * The test makes a copy of dist/ as dist-test/ with the content script's shadow root
 * switched from "closed" to "open" so it can inspect the injected UI. dist-test/ is
 * gitignored and removed on exit.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const EXT = resolve(ROOT, 'dist-test')

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

// Resolve a Chromium executable: prefer the pre-installed browser, fall back to Playwright's.
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (base && existsSync(base)) {
    const dir = readdirSync(base).find((d) => d.startsWith('chromium-') && !d.includes('headless'))
    if (dir) {
      const bin = resolve(base, dir, 'chrome-linux/chrome')
      if (existsSync(bin)) return bin
    }
  }
  return undefined // let Playwright use its bundled browser
}

// Build the inspectable test copy
rmSync(EXT, { recursive: true, force: true })
cpSync(DIST, EXT, { recursive: true })
const contentPath = resolve(EXT, 'src/content/index.js')
writeFileSync(contentPath, readFileSync(contentPath, 'utf8').replace('mode: "closed"', 'mode: "open"'))

const results = []
const log = (ok, msg) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`) }

const TEST_HTML = `<!DOCTYPE html><html><head><title>Test</title></head>
<body style="background:#fff">
  <h1>Mock chat</h1>
  <textarea id="prompt-textarea" placeholder="Send a message" style="width:600px;height:80px"></textarea>
  <script>document.getElementById('prompt-textarea').focus()</script>
</body></html>`

const ctx = await chromium.launchPersistentContext('', {
  executablePath: findChromium(),
  headless: true,
  args: [
    '--headless=new',
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    '--no-sandbox',
  ],
})

try {
  let sw = ctx.serviceWorkers()[0]
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 })
  const extId = new URL(sw.url()).host
  log(!!extId, `service worker registered (extension id = ${extId})`)

  // Extension pages render
  for (const [name, path, needle] of [
    ['popup', 'src/popup/index.html', 'BetterAsk'],
    ['options', 'src/options/index.html', 'Sensitivity'],
    ['dashboard', 'src/dashboard/index.html', 'BetterAsk'],
  ]) {
    const p = await ctx.newPage()
    await p.goto(`chrome-extension://${extId}/${path}`, { waitUntil: 'load' })
    await p.waitForTimeout(800)
    const text = await p.innerText('body')
    log(text.includes(needle), `${name} page renders`)
    await p.close()
  }

  // Content script + pill flow on a mock supported host
  const page = await ctx.newPage()
  await page.route('**/*', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: TEST_HTML }))
  await page.goto('https://chatgpt.com/', { waitUntil: 'load' })
  await page.waitForTimeout(1000)

  log(await page.locator('#betterask-shadow-host').count() > 0, 'content script injected')

  await page.locator('#prompt-textarea').click()
  await page.keyboard.type('make this better', { delay: 25 })

  const shadowText = () => page.evaluate(() => {
    const h = document.getElementById('betterask-shadow-host')
    return h && h.shadowRoot ? (h.shadowRoot.textContent || '') : null
  })

  let pill = null
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500)
    pill = await shadowText()
    if (pill && /fix ask/i.test(pill)) break
  }
  log(!!pill && /fix ask/i.test(pill), '"fix ask" pill appears for weak prompt')

  const clicked = await page.evaluate(() => {
    const root = document.getElementById('betterask-shadow-host').shadowRoot
    const btn = [...root.querySelectorAll('button')].find((b) => /fix ask/i.test(b.textContent))
    if (btn) { btn.click(); return true }
    return false
  })
  log(clicked, 'pill is clickable')
  await page.waitForTimeout(1000)

  const card = await shadowText()
  log(/Better Ask/i.test(card) && /Original/i.test(card), 'suggestion card shows Original + Better Ask')

  const used = await page.evaluate(() => {
    const root = document.getElementById('betterask-shadow-host').shadowRoot
    const btn = [...root.querySelectorAll('button')].find((b) => /use better ask/i.test(b.textContent))
    if (btn) { btn.click(); return true }
    return false
  })
  await page.waitForTimeout(500)
  const newVal = await page.locator('#prompt-textarea').inputValue()
  log(used && newVal !== 'make this better' && newVal.length > 16, '"Use Better Ask" replaced textarea text')
} catch (err) {
  console.error('ERROR:', err.message)
  results.push(false)
} finally {
  await ctx.close()
  rmSync(EXT, { recursive: true, force: true })
}

const passed = results.filter(Boolean).length
console.log(`\n=== ${passed}/${results.length} passed ===`)
process.exit(results.every(Boolean) ? 0 : 1)
