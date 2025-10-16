// api/crawl.js

import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing URL parameter" });
    }

    const visited = new Set();
    const brokenImages = [];
    const brokenPages = [];

    async function crawl(pageUrl, baseUrl) {
      if (visited.size > 20) return;
      if (visited.has(pageUrl)) return;
      visited.add(pageUrl);

      try {
        const response = await axios.get(pageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          timeout: 10000,
        });

        if (response.status === 404) {
          brokenPages.push(pageUrl);
          return;
        }

        const $ = cheerio.load(response.data);

        // Check for broken images
        const imgs = $("img");
        imgs.each((_, el) => {
          const src = $(el).attr("src");
          if (!src) return;
          const fullSrc = src.startsWith("http")
            ? src
            : new URL(src, baseUrl).href;

          axios
            .get(fullSrc)
            .then((r) => {
              if (r.status !== 200) brokenImages.push(pageUrl);
            })
            .catch(() => brokenImages.push(pageUrl));
        });

        // Follow internal links
        const links = $("a")
          .map((_, el) => $(el).attr("href"))
          .get()
          .filter(
            (href) =>
              href &&
              href.startsWith("/") &&
              !href.startsWith("//") &&
              !href.includes("#")
          )
          .map((href) => new URL(href, baseUrl).href);

        for (const link of links) {
          await crawl(link, baseUrl);
        }
      } catch (err) {
        brokenPages.push(pageUrl);
      }
    }

    await crawl(url, url);

    return res.status(200).json({
      summary: {
        totalPages: visited.size,
        pages404: brokenPages.length,
        pagesWithBrokenImages: [...new Set(brokenImages)].length,
      },
      details: {
        brokenPages,
        brokenImages,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
