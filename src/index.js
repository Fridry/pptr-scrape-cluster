const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: false,
    userDataDir: "./tmp",
  });

  const url =
    "https://www.amazon.com.br/s?i=stripbooks&bbn=13130368011&rh=n%3A6740748011%2Cn%3A13130368011%2Cn%3A7842641011%2Cn%3A7842670011&dc&qid=1645206272&rnid=7842641011&ref=sr_nr_n_7";
  // "https://www.amazon.com.br/s?i=stripbooks&bbn=13130368011&rh=n%3A6740748011%2Cn%3A13130368011%2Cn%3A7842641011&dc&qid=1645202979&rnid=7841278011";

  const page = await browser.newPage();

  await page.goto(url);

  const productsHandles = await page.$$(
    "div > span:nth-child(4) > div.s-main-slot.s-result-list.s-search-results.sg-row > .s-result-item"
  );

  let is_last_page = false;

  while (!is_last_page) {
    for (const productHandles of productsHandles) {
      try {
        const title = await page.evaluate(
          (el) => el.querySelector("h2 > a > span").textContent,
          productHandles
        );
        const link = await page.evaluate(
          (el) => el.querySelector("h2 > a").href,
          productHandles
        );
        const price = await page.evaluate(
          (el) => el.querySelector(".a-price > .a-offscreen").textContent,
          productHandles
        );
        const image = await page.evaluate(
          (el) => el.querySelector(".s-image").getAttribute("src"),
          productHandles
        );

        fs.appendFile(
          "./products.csv",
          `${title.replace(/,/g, ";")},${price.replace(
            /,/g,
            "."
          )},${link},${image}\n`,
          (error) => {
            if (error) throw error;

            console.log("Data saved!");
          }
        );
      } catch (error) {}
    }

    await page.waitForSelector(".s-pagination-item.s-pagination-next", {
      visible: true,
    });

    const is_disabled =
      (await page.$(
        "span.s-pagination-item.s-pagination-next.s-pagination-disabled"
      )) !== null;

    is_last_page = is_disabled;

    if (!is_disabled) {
      await Promise.all([
        page.click(".s-pagination-item.s-pagination-next"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
      ]);
    }
  }

  await browser.close();
})();
