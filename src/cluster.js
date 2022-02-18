const { Cluster } = require("puppeteer-cluster");
const fs = require("fs");

const urls = [
  "https://www.amazon.com.br/s?k=jogos+xbox",
  "https://www.amazon.com.br/s?k=nintendo",
];

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 3,
    monitor: true,
    puppeteerOptions: {
      headless: true,
      defaultViewport: false,
      userDataDir: "./tmp",
    },
  });

  cluster.on("taskerror", (err, data) => {
    console.log(`Error crawling ${data}: ${err.message}`);
  });

  await cluster.task(async ({ page, data: url }) => {
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
  });

  for (const url of urls) {
    cluster.queue(url);
  }

  await cluster.idle();
  await cluster.close();

  console.log("Done!!!");
})();
