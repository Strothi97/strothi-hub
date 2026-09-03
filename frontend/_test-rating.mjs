import { chromium } from 'playwright'

const SCREENSHOT_DIR = 'C:\\Users\\felix\\AppData\\Local\\Temp\\claude\\c--Users-felix-Documents-Programmieren-strothi-hub\\1dbc8134-9a89-47f9-9eb0-8f155075ab03\\scratchpad'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'felixstrothmann@t-online.de')
await page.fill('input[type="password"]', 'RBfX4C0S61-IMSy!j1xo')
await page.click('button[type="submit"]')
await page.waitForURL('**/')

await page.goto('http://localhost:3000/kochbuch')
await page.waitForSelector('.kochbuch-recipe-card')
await page.click('.kochbuch-recipe-card')
await page.waitForURL('**/kochbuch/rezept/*')
await page.waitForSelector('.kochbuch-detail__rating-row')

console.log('Average rating shown:', (await page.locator('.kochbuch-detail__average-rating').count()) > 0)
const filledBefore = await page.locator('.kochbuch-rating-stars__star.is-filled').count()
console.log('My rating stars filled before click:', filledBefore)

// Click the 4th star
await page.locator('.kochbuch-rating-stars__star').nth(3).click()
await page.waitForTimeout(400)
const filledAfter = await page.locator('.kochbuch-rating-stars__star.is-filled').count()
console.log('My rating stars filled after clicking 4th star (expect 4):', filledAfter)
console.log('Average rating text now:', await page.locator('.kochbuch-detail__average-rating').textContent())
await page.screenshot({ path: `${SCREENSHOT_DIR}\\kochbuch-rating.png` })

// Reload and confirm it persisted
await page.reload()
await page.waitForSelector('.kochbuch-rating-stars')
await page.waitForTimeout(300)
console.log('Filled stars after reload (should still be 4):', await page.locator('.kochbuch-rating-stars__star.is-filled').count())

// Click the same (4th) star again -> should clear
await page.locator('.kochbuch-rating-stars__star').nth(3).click()
await page.waitForTimeout(400)
console.log('Filled stars after clicking same star again (should be 0):', await page.locator('.kochbuch-rating-stars__star.is-filled').count())
console.log('Average rating shown after clearing (should be false, since only 1 rating existed):', (await page.locator('.kochbuch-detail__average-rating').count()) > 0)

await browser.close()
console.log('DONE')
