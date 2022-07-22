const webdriver = require('selenium-webdriver');
const { By } = require('selenium-webdriver');
const tgdds = require('../links/tgdd');
const rp = require('request-promise');
const {
  addProduct,
  updateProduct,
  deleteProduct,
  getProductByShopId,
} = require('../../firebase/firebase');

/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 1
 */

exports.crawlTiki = async (req, res) => {
  const { category, urlKey } = req.query;
  const BASE_PATH = 'https://tiki.vn/api/personalish/v1/blocks/listings';
  const BASE_URL = 'https://tiki.vn';
  let crawlMaxPage = 1;
  let crawlData = [];
  let page = 1;

  const productIds = await getProductByShopId(1);
  const body = await rp({
    method: 'GET',
    uri: `${BASE_PATH}?limit=48&include=advertisement&aggregations=2&trackity_id=6a272fd2-36d3-a54d-af64-aaae70bc662d&category=${category}&page=1&urlKey=${urlKey}`,
  });

  crawlMaxPage = JSON.parse(body).paging.last_page;

  while (page <= crawlMaxPage) {
    const body = await rp({
      method: 'GET',
      uri: `${BASE_PATH}?limit=48&include=advertisement&aggregations=2&trackity_id=6a272fd2-36d3-a54d-af64-aaae70bc662d&category=${category}&page=${page}&urlKey=${urlKey}`,
    }).catch((err) => res.send(err));

    if (typeof body !== 'string') break;

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
        product.price = element.price;
        product.link = `${BASE_URL}/${element.url_path}`;
        product.description = element.short_description;
        product.image = element.thumbnail_url;
        product.spid = element.seller_product_id;
        product.star = element.rating_average;
        product.evaluate = 'none';
        product.percent = 0;
        product.id_shop = 1;

        crawlData.push(product);
      }
    });
    page++;
  }

  let index = 0;
  for (const prod of crawlData) {
    crawlData[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).send(crawlData);
};

exports.crawlTikiCmt = async (req, res) => {
  const BASE_PATH = 'https://tiki.vn/api/v2/reviews';
  const { spid, product_id, seller_id, id } = req.query;
  let crawlMaxPage = 1,
    dataResponse = false;
  const comments = [];
  let page = 1;

  const body = await rp({
    method: 'GET',
    uri: `${BASE_PATH}?limit=5&include=comments,contribute_info&sort=score%7Cdesc,id%7Cdesc,stars%7Call&page=1&spid=${spid}&product_id=${product_id}&seller_id=${seller_id}`,
  }).catch((err) => res.send(err));

  crawlMaxPage = JSON.parse(body).paging.last_page;

  while (page <= crawlMaxPage) {
    const body = await rp({
      method: 'GET',
      uri: `${BASE_PATH}?limit=5&include=comments,contribute_info&sort=score%7Cdesc,id%7Cdesc,stars%7Call&page=${page}&spid=${spid}&product_id=${product_id}&seller_id=${seller_id}`,
    }).catch((err) => res.send(err));

    if (typeof body === 'string') {
      const data = JSON.parse(body).data;
      data.forEach((element) => {
        if (element.content) {
          const comment = {};
          comment.content = element.content
            .replace('\n', ' ')
            .replace('\r', ' ')
            .replace('\t', ' ');
          comment.score = element.score;
          comment.rating = element.rating;
          comments.push(comment);
        }
      });
    }
    page++;
  }

  if (comments.length) {
    dataResponse = await rp({
      method: 'POST',
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments.map((e) => e.content),
      },
      json: true,
    }).catch((err) => {
      return res.status(err.statusCode).send(err.message);
    });

    await updateProduct({
      id,
      percent: dataResponse.result.percent,
      type: dataResponse.result.type,
    });
  } else {
    // TODO Delete from firebase
    await deleteProduct(id);
  }

  return res.status(200).send(dataResponse);
};

/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 2
 */

exports.crawlSendo = async (req, res) => {
  const { category } = req.query;
  const BASE_PATH = 'https://mapi.sendo.vn/mob/product/cat/cong-nghe';
  let page = 1;
  let crawlData = [];

  const productIds = await getProductByShopId(2);

  while (true) {
    const body = await rp({
      method: 'GET',
      uri: `${BASE_PATH}/${category}?p=${page}`,
    }).catch((err) => res.send(err));

    if (typeof body !== 'string') break;

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
        prod.price = e.final_price;
        prod.link = e.deep_link;
        prod.image = e.img_url;
        prod.star = e.percent_star;
        prod.evaluate = 'none';
        prod.percent = 0;
        prod.id_shop = 2;

        crawlData.push(prod);
      }
    });

    page++;
  }

  let index = 0;
  for (const prod of crawlData) {
    crawlData[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).json(crawlData);
};

exports.crawlSendoCmt = async (req, res) => {
  const { product_id, id } = req.query;
  const BASE_PATH = 'https://ratingapi.sendo.vn/product';
  let maxPage = 1, data;
  let page = 1;
  const comments = [];

  const body = await rp({
    method: 'GET',
    uri: `${BASE_PATH}/${product_id}/rating?page=${page}&limit=10&sort=review_score&v=2&star=all`,
  }).catch((err) => res.send(err));

  maxPage = JSON.parse(body)?.meta_data.total_page;

  if (maxPage === 0) return res.status(201).send({ isDelete: true });

  while (page <= maxPage) {
    const body = await rp({
      method: 'GET',
      uri: `${BASE_PATH}/${product_id}/rating?page=${page}&limit=10&sort=review_score&v=2&star=all`,
    }).catch((err) => res.send(err));
    const data = JSON.parse(body).data;
    data.forEach((e) => {
      if (e.comment !== '') {
        const comment = {};
        comment.comment = e.comment;
        comment.star = e.star;
        comments.push(comment);
      }
    });
    page++;
  }

  if (comments.length) {
    data = await rp({
      method: 'POST',
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments.map((e) => e.comment),
      },
      json: true,
    }).catch((err) => {
      return res.status(err.statusCode).send(err.message);
    });

    await updateProduct({
      id,
      percent: data.result.percent,
      type: data.result.type,
    });
  } else {
    // TODO delete product from firebase
    await deleteProduct(id);
  }

  return res.status(200).send(data);
};

const convertNameToLinkShopee = (name, shopid, itemid) => {
  const BASE_PATH = 'https://shopee.vn';
  let endpoint = name
    .split(/[\s+,/+-]/)
    .filter((item) => {
      if (item === '' || item === '>') {
        return;
      }
      return item;
    })
    .join('-');
  return `${BASE_PATH}/${endpoint}-i.${shopid}.${itemid}`;
};
/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 3
 */

exports.crawlShopee = async (req, res) => {
  const { limit, category_id } = req.query;
  const BASE_PATH = 'https://shopee.vn/api/v4/search/search_items';
  let newest = 0;
  let crawlData = [];

  const productIds = await getProductByShopId(3);

  while (true) {
    // newest = page * 60
    const body = await rp({
      method: 'GET',
      uri: `${BASE_PATH}?by=relevancy&limit=${limit}&match_id=${category_id}&newest=${newest}&order=desc&page_type=search&scenario=PAGE_OTHERS&version=2`,
    }).catch((err) => res.send(err));

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
        item.price = e.item_basic.price;
        item.image = `https://cf.shopee.vn/file/${e.item_basic.image}`;
        item.evaluate = 'none';
        item.star = e.item_basic.item_rating.rating_star;
        item.type = e.item_basic.item_type;
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

  let index = 0;
  for (const prod of crawlData) {
    crawlData[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).send(crawlData);
};

exports.crawlShopeeCmt = async (req, res) => {
  const { itemid, shopid, type, id } = req.query;
  const BASE_PATH = 'https://shopee.vn/api/v2/item/get_ratings';
  let comments = [], data;
  let offset = 0;

  while (true) {
    // offset = limit + 20
    const body = await rp({
      method: 'GET',
      uri: `${BASE_PATH}?filter=0&flag=1&itemid=${itemid}&limit=20&offset=${offset}&shopid=${shopid}&type=${type}`,
    }).catch((err) => res.send(err));

    const ratings = JSON.parse(body).data.ratings;

    if (ratings.length <= 0) break;

    ratings?.forEach((e) => {
      if (e.comment) {
        comments.push(e.comment);
      }
    });

    offset += 20;
  }

  if (comments.length) {
    data = await rp({
      method: 'POST',
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments.map((e) => e.comment),
      },
      json: true,
    }).catch((err) => {
      return res.status(err.statusCode).send(err.message);
    });

    console.log(data);

    await updateProduct({
      id,
      percent: data.result.percent,
      type: data.result.type,
    });
  } else {
    // TODO delete product from firebase
    await deleteProduct(id);
  }

  return res.status(200).send(data);
};

/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 4
 */

exports.crawlTGDD = async (req, res) => {
  const driver = new webdriver.Builder().forBrowser('chrome').build();
  const { type, typeId, maxPage } = req.query;
  const products = [];

  const item = tgdds.find((v) => v.type === type);
  const productIds = await getProductByShopId(4);

  await driver
    .get(`${item.link}#c=${typeId}&o=9&pi=${maxPage}`)
    .catch((err) => res.status(500).json(err));
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
          .getAttribute('data-id');

        if (productIds.length) {
          exits = productIds.find((id) => id === product.tgddId);
        }

        if (!exits) {
          product.name = await prod
            .findElement(
              By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
            )
            .getAttribute('data-name');
          product.price = await prod
            .findElement(
              By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
            )
            .getAttribute('data-price');
          product.link = await prod
            .findElement(
              By.css(`${item.selector}.__cate_${typeId} a.main-contain`)
            )
            .getAttribute('href');
          product.image = await prod
            .findElements(
              By.css(
                `${item.selector}.__cate_${typeId} a.main-contain div.item-img.item-img_${typeId} img`
              )
            )
            .then((eles) => {
              eles[0].getAttribute('class').then((value) => {
                if (value.includes('lazyload')) {
                  eles[0]
                    .getAttribute('data-src')
                    .then((img) => (product.image = img));
                } else {
                  eles[0]
                    .getAttribute('src')
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
          product.evaluate = 'none';

          if (product.star > 0) products.push(product);
        }
      }

      await driver.close();

      let index = 0;
      for (const prod of products) {
        products[index].id = await addProduct(prod);
        index = index + 1;
      }

      return res.status(200).json(products);
    });
};

exports.crawlTGDDComment = async (req, res) => {
  const driver = new webdriver.Builder().forBrowser('chrome').build();
  let maxPage = 1, page = 1, data;
  const { id, link } = req.query;
  const comments = [];

  await driver.get(`${link.split('?')[0]}/danh-gia?p=${page}`).catch((err) => {
    return res.status(500).json(err);
  });

  await driver.findElements(By.css(`div.pagcomment a`)).then(async (v) => {
    if (v.length) {
      maxPage = await v[v.length - 2]?.getText();
    }
  });

  maxPage = parseInt(maxPage);

  while (page <= maxPage) {
    await driver
      .get(`${link.split('?')[0]}/danh-gia?p=${page}`)
      .catch((err) => {
        return res.status(500).json(err);
      });

    await driver
      .findElements(
        By.css(`div.comment.comment--all.ratingLst div.comment__item.par`)
      )
      .then(async (v) => {
        for (const cmt of v) {
          let comment = '';
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
      }).catch(async error => {
        console.log("error", error);
        await driver.close();
      });

    page++;
  }

  await driver.close();

  if (comments.length) {
    data = await rp({
      method: 'POST',
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments,
      },
      json: true,
    }).catch((err) => {
      return res.status(err.statusCode).send(err.message);
    });

    await updateProduct({
      id,
      percent: data.result.percent,
      type: data.result.type,
    });
  } else {
    // TODO delete product from firebase
    await deleteProduct(id);
  }

  return res.status(200).send({
    maxPage: maxPage,
    data,
    length: comments.length,
  });
};

exports.crawlNguyenKim = async (req, res) => {
  const driver = new webdriver.Builder().forBrowser('chrome').build();
  let isBtn = true;
  const basePath = 'https://www.nguyenkim.com/';
  const products = [];
  let linkNew = '';
  await driver.get(`${basePath}${req.query?.type}`);
  let x = 1;

  while (x < 100) {
    if (x >= 2) {
      await driver.get(linkNew);
    }
    const prods = await driver.findElements(
      By.css('div.item.nk-fgp-items.nk-new-layout-product-grid')
    );

    for (const prod of prods) {
      const product = {};
      product.nkId = await prod.getAttribute('id');
      product.name = await prod
        .findElement(By.css('div.product-title a'))
        .getText();
      product.price = await prod
        .findElement(By.css('div.product-price p.final-price'))
        .getText();
      product.href = await prod
        .findElement(By.css('div.product-title a'))
        .getAttribute('href');

      products.push(product);
    }

    const btnNext = await driver
      .findElement(
        By.css(
          'div.NkReview_footer_col-3 a.btn_next.ty-pagination__item.ty-pagination__btn.ty-pagination__next.cm-history'
        )
      )
      .catch(() => {
        isBtn = false;
      });

    if (isBtn) {
      x++;
      linkNew = await btnNext.getAttribute('href');
      await driver.executeScript('arguments[0].click();', btnNext);
    } else {
      break;
    }
  }

  await driver.close();
  return res.status(200).json(products);
};

exports.tgddGetInfo = async (req, res) => {
  const driver = new webdriver.Builder().forBrowser('chrome').build();

  const item = tgdds.find((v) => v.type === req.query.type);
  await driver
    .get(item.link)
    .then(async () => {
      const typeId = await driver
        .findElement(By.css('#categoryPage'))
        .getAttribute('data-id');
      const maxProd = await driver
        .findElement(By.css('#categoryPage div.box-sort p.sort-total b'))
        .getText();
      const maxPage = Math.round(parseInt(maxProd) / 20);

      item['typeId'] = parseInt(typeId);
      item['maxPage'] = maxPage;
    })
    .catch((err) => {
      res.status(500).json(err);
    });

  await driver.close();
  return res.status(200).json(item);
};
