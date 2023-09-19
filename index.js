const puppeteer = require("puppeteer");

let url = "https://hk.centanet.com/findproperty/en/list/buy/?q=33e8fee82e";

async function scrape() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
    userDataDir: "./tmp",
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  await page.waitForSelector(
    "#__layout > div > div.search-result.layout-main-content.result-theme1 > div.result-main > div > div.main-list.grow1 > div.title-sort-switch.hidden-xs-only > div > h2",
    { visible: true, timeout: 0 }
  );

  const propertyCount = await page.$eval(
    "#__layout > div > div.search-result.layout-main-content.result-theme1 > div.result-main > div > div.main-list.grow1 > div.title-sort-switch.hidden-xs-only > div > h2",
    (el) => el.textContent
  );

  console.log(propertyCount);

  let hasNextPage = true;
  let allProperties = [];
  while (hasNextPage) {
    await page.waitForSelector(".list", { visible: true, timeout: 0 });
    // Usage:
    await scrollPageToLoadImages(page, 300);

    // Wait for all images to be completely loaded
    while (!(await allImagesLoaded(page))) {
      await delay(500);
    }
    const properties = await page.$$eval(
      "#__layout > div > div.search-result.layout-main-content.result-theme1 > div.result-main > div > div.main-list.grow1 > div:nth-child(2) > div.list",
      (properties) => {
        return properties.map((property) => {
          const largeTitle = property
            .querySelector(".title-lg")
            ?.textContent.trim();
          const smallTitle = property
            .querySelector(".title-sm")
            ?.textContent.trim();

          // Extracting price: It appears to be nested and can have M for million, so we need to process this
          const priceElement = property.querySelector(".price-sect .price");
          let price = priceElement
            ? priceElement.textContent
                .replace("Sell", "")
                .replace("$", "")
                .replace("M", "")
                .trim()
            : null;
          if (price) {
            price = parseFloat(price) * 1e6; // Convert to actual amount if "M" for million was in the text
          }
          const imageUrl = property.querySelector(".img-holder img")?.src;
          const aiDecoTourText = property
            .querySelector(".thumbnailTypeText")
            ?.textContent.trim();
          const tagText = property
            .querySelector(".img_tag .tag1")
            ?.textContent.trim();
          const address = property
            .querySelector(".adress.tag-adress")
            ?.textContent.trim();
          const age = property
            .querySelector(".floor-info span")
            ?.textContent.trim();
          const efficiency = property
            .querySelector(".floor-info span:last-child")
            ?.textContent.trim();
          const facilityTime = property
            .querySelector(".facility .facility-tag span")
            ?.textContent.trim();
          const usableArea = property
            .querySelector(".usable-area .num.hidden-xs-only span")
            ?.textContent.trim();
          const usableAreaPrice = property
            .querySelector(".usable-area .area-price span")
            ?.textContent.trim();
          const gfa = property
            .querySelector(".construction-area .num.hidden-xs-only span")
            ?.textContent.trim();
          const gfaPrice = property
            .querySelector(".construction-area .area-price span")
            ?.textContent.trim();
          const monthlyInstallment = property
            .querySelector(".installment")
            ?.textContent.trim();

          return {
            largeTitle: largeTitle,
            smallTitle: smallTitle,
            price: price,
            imageUrl: imageUrl,
            aiDecoTourText: aiDecoTourText,
            tagText: tagText,
            address: address,
            age: age,
            efficiency: efficiency,
            facilityTime: facilityTime,
            usableArea: usableArea,
            usableAreaPrice: usableAreaPrice,
            gfa: gfa,
            gfaPrice: gfaPrice,
            monthlyInstallment: monthlyInstallment,
          };
        });
      }
    );

    console.log(JSON.stringify(properties, null, 2));
    allProperties.push(...properties);
    // Check if there's a "Next" button that is not disabled
    const nextButton = await page.$(".btn-next:not([disabled])");

    if (nextButton) {
      await nextButton.click();
      await page.waitForNavigation({ waitUntil: "networkidle0" });
    } else {
      hasNextPage = false;
    }
  }

  console.log(JSON.stringify(allProperties, null, 2));

  await browser.close();
}

scrape();

async function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function scrollPageToLoadImages(
  page,
  scrollStep = 100,
  maxScrolls = 100
) {
  let previousPosition = 0;
  let currentPosition = 0;
  let scrolls = 0;

  while (scrolls < maxScrolls) {
    scrolls++;

    previousPosition = currentPosition;

    currentPosition = await page.evaluate((scrollStep) => {
      window.scrollBy(0, scrollStep);
      return window.scrollY;
    }, scrollStep);

    // Wait for some fixed amount of time after each scroll
    await delay(500);

    // Break if we've reached the bottom of the page
    if (previousPosition === currentPosition) break;
  }
}

async function allImagesLoaded(page) {
  return await page.evaluate(() => {
    const images = document.querySelectorAll("img.el-image__inner");
    return Array.from(images).every((i) => i.complete);
  });
}
