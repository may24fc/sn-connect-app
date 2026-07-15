const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto('http://localhost:3000/team', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#staff-section', { timeout: 30000 });

  const boxes = await page.evaluate(() => {
    const section = document.querySelector('#staff-section');
    const rows = section.querySelectorAll(':scope > div > div.grid.grid-cols-1');
    // Instead, find all first-card images by locating each track's first child.
    const results = [];
    const gridRows = Array.from(section.querySelectorAll('div')).filter((el) =>
      el.className.includes('grid-cols-1') && el.className.includes('md:grid-cols-')
    );
    for (const row of gridRows) {
      const leftCol = row.children[0];
      const rightCol = row.children[1];
      if (!rightCol) continue;
      const firstCard = rightCol.querySelector('.group');
      if (!firstCard) continue;
      const leftRect = leftCol.getBoundingClientRect();
      const rightRect = rightCol.getBoundingClientRect();
      const cardRect = firstCard.getBoundingClientRect();
      const titleEl = leftCol.querySelector('p');
      results.push({
        title: titleEl ? titleEl.textContent : '(label row)',
        leftColWidth: leftRect.width,
        rightColLeft: rightRect.left,
        firstCardLeft: cardRect.left,
      });
    }
    return results;
  });

  console.log(JSON.stringify(boxes, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
