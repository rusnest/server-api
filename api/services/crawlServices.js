const webdriver = require("selenium-webdriver");
const { By } = require("selenium-webdriver");
const tgdds = require("../links/tgdd");
const rp = require("request-promise");
const { changeStarToEvaluate } = require("./utilServices");

const maxSize = 30;

// Function Utils

const convertNameToLinkShopee = (name, shopid, itemid) => {
  const BASE_PATH = "https://shopee.vn";
  let endpoint = name
    .split(/[\s+,/+-]/)
    .filter((item) => {
      if (item === "" || item === ">") {
        return;
      }
      return item;
    })
    .join("-");
  return `${BASE_PATH}/${endpoint}-i.${shopid}.${itemid}`;
};

// Crawl Product

exports.crawlTikiService = async (query, productIds) => {
  const { category, urlKey } = query;
  const BASE_PATH = "https://tiki.vn/api/personalish/v1/blocks/listings";
  const BASE_URL = "https://tiki.vn";
  let crawlMaxPage = 1;
  let crawlData = [];
  let page = 1;

  const body = await rp({
    method: "GET",
    uri: `${BASE_PATH}?limit=48&include=advertisement&aggregations=2&trackity_id=6a272fd2-36d3-a54d-af64-aaae70bc662d&category=${category}&page=1&urlKey=${urlKey}`,
  }).catch((_) => null);

  if (!body) {
    console.log("bug", body);
    return [];
  }

  crawlMaxPage = JSON.parse(body).paging.last_page;

  while (page <= crawlMaxPage && crawlData.length < maxSize) {
    const body = await rp({
      method: "GET",
      uri: `${BASE_PATH}?limit=48&include=advertisement&aggregations=2&trackity_id=6a272fd2-36d3-a54d-af64-aaae70bc662d&category=${category}&page=${page}&urlKey=${urlKey}`,
    }).catch((_) => null);

    if (typeof body !== "string" || !body) break;

    const data = JSON.parse(body).data;
    data.forEach((element) => {
      let exits = false;
      if (productIds.length) {
        exits = productIds.find((id) => id === element.id);
      }
      if (element.review_count > 10 && !exits) {
        const product = {};
        if (element.advertisement) {
          product.seller_id = element.advertisement.ad[0].seller_id ?? 1;
        } else {
          product.seller_id = 1;
        }
        product.tiki_id = element.id;
        product.tiki_sku = element.sku;
        product.name = element.name;
        product.price = parseInt(element.price);
        product.link = `${BASE_URL}/${element.url_path}`;
        product.description = element.short_description;
        product.image = element.thumbnail_url;
        product.spid = element.seller_product_id;
        product.star = element.rating_average;
        product.evaluate = changeStarToEvaluate(product.star);
        product.percent = 0;
        product.id_shop = 1;

        crawlData.push(product);
      }
    });
    page++;
  }

  return crawlData;
};

exports.crawlSendoService = async (query, productIds) => {
  // const maxCount = 200;
  const { category } = query;
  const BASE_PATH = "https://mapi.sendo.vn/mob/product/cat/cong-nghe";
  let page = 1,
    crawlData = [];

  while (true && crawlData.length < maxSize) {
    const body = await rp({
      method: "GET",
      uri: `${BASE_PATH}/${category}?p=${page}`,
    }).catch((_) => null);

    if (typeof body !== "string" || !body) break;

    const data = JSON.parse(body);
    if (Object.entries(data).length === 0) break;

    const prods = data.data;
    prods.forEach((e) => {
      let exits = false;
      if (productIds.length) {
        exits = productIds.find((id) => id === e.product_id);
      }
      if (e.total_rated > 10 && !exits) {
        const prod = {};
        prod.sendo_id = e.product_id;
        prod.name = e.name;
        prod.price = parseInt(e.final_price);
        prod.link = e.deep_link;
        prod.image = e.img_url;
        prod.star = e.percent_star;
        prod.evaluate = changeStarToEvaluate(prod.star);
        prod.percent = 0;
        prod.id_shop = 2;

        crawlData.push(prod);
      }
    });

    page++;
  }

  return crawlData;
};

exports.crawlShopeeService = async (query, productIds) => {
  const { limit, category_id } = query;
  const BASE_PATH = "https://shopee.vn/api/v4/search/search_items";
  let newest = 0,
    crawlData = [];

  while (true && crawlData.length < maxSize) {
    // newest = page * 60
    const body = await rp({
      method: "GET",
      uri: `${BASE_PATH}?by=relevancy&limit=${limit}&match_id=${category_id}&newest=${newest}&order=desc&page_type=search&scenario=PAGE_OTHERS&version=2`,
    }).catch((_) => null);

    if (!body) break;

    const items = JSON.parse(body).items;

    if (!items) break;

    items?.forEach((e) => {
      let exits = false;
      if (productIds.length) {
        exits = productIds.find((id) => id === e.item_basic.itemid);
      }
      if (e.item_basic.item_rating.rating_star > 0 && !exits) {
        const item = {};
        item.shopee_id = e.item_basic.itemid;
        item.shopid = e.item_basic.shopid;
        item.name = e.item_basic.name;
        item.price = parseInt(e.item_basic.price) / 100000;
        item.image = `https://cf.shopee.vn/file/${e.item_basic.image}`;
        item.star = e.item_basic.item_rating.rating_star;
        item.type = e.item_basic.item_type;
        item.evaluate = changeStarToEvaluate(item.star);
        item.percent = 0;
        item.link = convertNameToLinkShopee(
          e.item_basic.name,
          e.item_basic.shopid,
          e.item_basic.itemid
        );
        item.id_shop = 3;

        crawlData.push(item);
      }
    });

    newest = (newest + 1) * 60;
  }

  return crawlData;
};

exports.crawlTGDDService = async (query, productIds) => {
  const driver = new webdriver.Builder().forBrowser("chrome").build();
  const { type, typeId, maxPage } = query;
  const products = [];

  const item = tgdds.find((v) => v.type === type);
  try {
    await driver
      .get(`${item.link}#c=${typeId}&o=9&pi=${maxPage}`)
      .catch((_) => null);

    await driver
      .findElements(By.css(`${item.selector}.__cate_${typeId}`))
      .then(async (v) => {
        for (const prod of v) {
          const product = {};
          let exits = false;
          product.tgddId = await prod
            .findElement(
              By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
            )
            .getAttribute("data-id");

          if (productIds.length) {
            exits = productIds.find((id) => id === product.tgddId);
          }

          if (!exits) {
            product.name = await prod
              .findElement(
                By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
              )
              .getAttribute("data-name");
            product.price = await prod
              .findElement(
                By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
              )
              .getAttribute("data-price");
            product.link = await prod
              .findElement(
                By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
              )
              .getAttribute("href");
            product.image = await prod
              .findElements(
                By.css(
                  `${item.selector}.__cate_${typeId} a.main-contain div.item-img.item-img_${typeId} img`
                )
              )
              .then((eles) => {
                eles[0].getAttribute("class").then((value) => {
                  if (value.includes("lazyload")) {
                    eles[0]
                      .getAttribute("data-src")
                      .then((img) => (product.image = img));
                  } else {
                    eles[0]
                      .getAttribute("src")
                      .then((img) => (product.image = img));
                  }
                });
              });

            await prod
              .findElements(
                By.css(
                  `${item.selector}.__cate_${typeId} a.main-contain div.item-rating p i.icon-star`
                )
              )
              .then((elements) => (product.star = elements.length));

            product.id_shop = 4;
            product.price = parseInt(product.price);
            product.evaluate = changeStarToEvaluate(product.star);

            if (product.star > 0) products.push(product);
          }
        }
        await driver.close();
      });
  } catch (err) {
    await driver.close();
    return [];
  }

  return products;
};

// Crawl Comment
exports.crawlTikiCommentService = async (query) => {
  const BASE_PATH = "https://tiki.vn/api/v2/reviews";
  const { spid, product_id, seller_id } = query;
  let crawlMaxPage = 1,
    page = 1;
  const comments = [];

  const body = await rp({
    method: "GET",
    uri: `${BASE_PATH}?limit=5&include=comments,contribute_info&sort=score%7Cdesc,id%7Cdesc,stars%7Call&page=1&spid=${spid}&product_id=${product_id}&seller_id=${seller_id}`,
  }).catch((_) => null);

  if (!body) return null;

  crawlMaxPage = JSON.parse(body).paging.last_page;

  while (page <= crawlMaxPage) {
    const body = await rp({
      method: "GET",
      uri: `${BASE_PATH}?limit=5&include=comments,contribute_info&sort=score%7Cdesc,id%7Cdesc,stars%7Call&page=${page}&spid=${spid}&product_id=${product_id}&seller_id=${seller_id}`,
    }).catch((_) => null);

    if (typeof body !== "string" || !body) {
      break;
    }

    const data = JSON.parse(body).data;
    data.forEach((element) => {
      if (element.content) {
        const comment = element.content
          .replace("\n", " ")
          .replace("\r", " ")
          .replace("\t", " ");
        comments.push(comment);
      }
    });
    page++;
  }

  return comments;
};

exports.crawlSendoCommentService = async (query) => {
  const { product_id } = query;
  const BASE_PATH = "https://ratingapi.sendo.vn/product";
  let maxPage = 1,
    page = 1;
  const comments = [];

  const body = await rp({
    method: "GET",
    uri: `${BASE_PATH}/${product_id}/rating?page=${page}&limit=10&sort=review_score&v=2&star=all`,
  }).catch((_) => null);

  if (!body) return [];

  maxPage = JSON.parse(body)?.meta_data.total_page;

  if (maxPage === 0) return [];

  while (page <= maxPage) {
    const body = await rp({
      method: "GET",
      uri: `${BASE_PATH}/${product_id}/rating?page=${page}&limit=10&sort=review_score&v=2&star=all`,
    }).catch((_) => null);

    if (!body) break;

    const data = JSON.parse(body).data;
    data.forEach((e) => {
      if (e.comment !== "") {
        comments.push(e.comment);
      }
    });
    page++;
  }

  return comments;
};

exports.crawlShopeeCommentService = async (query) => {
  const { itemid, shopid, type } = query;
  const BASE_PATH = "https://shopee.vn/api/v2/item/get_ratings";
  let comments = [],
    offset = 0;

  while (true) {
    // offset = limit + 20
    const body = await rp({
      method: "GET",
      uri: `${BASE_PATH}?filter=0&flag=1&itemid=${itemid}&limit=20&offset=${offset}&shopid=${shopid}&type=${type}`,
    }).catch((_) => null);

    if (!body) break;

    const ratings = JSON.parse(body).data.ratings;

    if (ratings.length <= 0) break;

    ratings?.forEach((e) => {
      if (e.comment) {
        comments.push(e.comment);
      }
    });

    offset += 20;
  }

  return comments;
};

exports.crawlTGDDCommentService = async (query) => {
  const driver = new webdriver.Builder().forBrowser("chrome").build();
  const { link } = query;
  let maxPage = 1, page = 1;
  const comments = [];

  try {
    await driver.get(`${link.split("?")[0]}/danh-gia?p=${page}`).catch((_) => {
      return null;
    });
  
    await driver.findElements(By.css(`div.pagcomment a`)).then(async (v) => {
      if (v.length) {
        maxPage = await v[v.length - 2]?.getText();
      }
    });
  
    maxPage = parseInt(maxPage);
  
    while (page <= maxPage) {
      await driver
        .get(`${link.split("?")[0]}/danh-gia?p=${page}`)
        .catch((_) => {
          return null;
        });
  
      await driver
        .findElements(
          By.css(`div.comment.comment--all.ratingLst div.comment__item.par`)
        )
        .then(async (v) => {
          for (const cmt of v) {
            let comment = "";
            await cmt
              .findElement(By.css(`div.comment-content p.cmt-txt`))
              .then(async (element) => {
                comment = await element.getText();
              })
              .catch((err) => {
                return;
              });
  
            if (comment) comments.push(comment);
          }
        })
        .catch(async (error) => {
          console.log("error", error);
          await driver.close();
        });
  
      page++;
    }
  
    await driver.close();
  } catch (error) {
    await driver.close();
    return [];
  }
  
  return comments;
};
