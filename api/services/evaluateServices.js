const rp = require("request-promise");
const cheerio = require("cheerio");
const webdriver = require("selenium-webdriver");
const { By } = require("selenium-webdriver");
const { addProduct } = require("../../firebase/firebase");
const { changeStarToEvaluate } = require("./utilServices");

/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 4
 */

exports.evaluateTGDD = async (link) => {
  // create product
  const product = {
    comments: [],
    link: link,
  };

  let maxPage = 1;

  let options = {
    uri: `${link}/danh-gia`,
    transform: function (body) {
      //Khi lấy dữ liệu từ trang thành công nó sẽ tự động parse DOM
      return cheerio.load(body);
    },
  };

  try {
    // Lấy dữ liệu từ trang crawl đã được parseDOM
    var $ = await rp(options);
    let pages = $(
      "body > section.rtPage > div.content-wrap > div.pgrc > div > a"
    );
    if (pages.length > 2) {
      maxPage = $(pages[pages.length - 2]).text();
    }
    product.tgddId = $("input#hdfRtInfo").attr("data-productid");
    product.name = $(
      "body > section.rtPage > div.frames-detail > div.box-pdt > div.box-pdt__content > h3"
    )
      .text()
      .trim();
    product.price = $(
      "body > section.rtPage > div.frames-detail > div.box-pdt > div.box-pdt__content > p.box-pdt-price"
    )
      .text()
      .trim();
    product.star = $(
      "body > section.rtPage > div.frames-detail > div.rating-star.rating-viewall > div.rating-left > p"
    )
      .text()
      .trim();
    product.evaluate = changeStarToEvaluate(product.star);
    product.percent = 0;
  } catch (error) {
    return {
      status: error.statusCode,
      product: null,
    };
  }

  // console.log(id, name, stars.length, price);

  for (let i = 1; i <= maxPage; i++) {
    options = {
      ...options,
      uri: `${link}/danh-gia?p=${i}`,
    };

    try {
      // Lấy dữ liệu từ trang crawl đã được parseDOM
      var $ = await rp(options);
    } catch (error) {
      return error;
    }

    const comments = $("div.comment__item.par > div.comment-content > p");
    for (let j = 0; j < comments.length; j++) {
      const comment = $(comments[j]).text();
      if (comment) {
        product.comments.push(comment);
      }
    }
  }

  const image = $(
    "body > section.rtPage > div.frames-detail > div.box-pdt > div.box-pdt__img > img"
  ).attr("src");
  product.image = image;

  if (product.comments.length) {
    const data = await rp({
      method: "POST",
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: product.comments,
      },
      json: true,
    }).catch((_) => {
      return null;
    });

    if (data) {
      product.evaluate = data.result.type;
      product.percent = data.result.percent;
    }

    product.id = await addProduct(product);
  }
  return { status: 200, product };
};

/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 5
 */

exports.evaluateNguyenKim = async (link) => {
  let name, image, star, price;
  let product = {
    link: link,
    comments: [],
  };
  const driver = new webdriver.Builder().forBrowser("chrome").build();

  await driver.get(link).catch((err) => {
    return {
      status: err,
      product: null,
    };
  });

  let btnNext = await driver
    .wait(
      webdriver.until.elementsLocated(By.css("#view-more-comment > div > a")),
      5
    )
    .catch((_) => {
      return null;
    });

  while (btnNext) {
    if (btnNext) {
      btnNext = await driver
        .executeScript("arguments[0].click();", btnNext)
        .catch((_) => {
          return null;
        });
    }

    btnNext = await driver
      .findElement(By.css("#view-more-comment > div > a"))
      .catch((_) => {
        return null;
      });
  }

  const imageEle = await driver
    .findElement(
      By.css(
        "#top-product > div.productInfo_gallery > div.productInfo_gallery_small > ul > li.product-img-1.animated.active > div > img"
      )
    )
    .catch((_) => {
      return null;
    });

  const nameEle = await driver
    .findElement(
      By.css(
        "#tygh_main_container > div.tygh-content.clearfix > div > div:nth-child(1) > div > div.container > div > div > div.NkPdp_productInfo > div.productInfo_col-23 > div.productInfo_col-23-top > div:nth-child(2) > h1"
      )
    )
    .catch((_) => {
      return null;
    });

  const starEle = await driver
    .findElement(By.css("#average_rating_product > span.number_avg_rate_npv"))
    .catch((_) => {
      return null;
    });

  const priceEle = await driver
    .findElement(
      By.css(
        "#tygh_main_container > div.tygh-content.clearfix > div > div:nth-child(1) > div > div.container > div > div > div.NkPdp_productInfo > div.productInfo_col-23 > div.productInfo_col-2 > form > div.nk2020-pdp-price > div.l > div.product_info_price > div > div > div.product_info_price_value-final > span"
      )
    )
    .catch((_) => {
      return null;
    });

  const comments = await driver
    .findElements(By.css("div.post.post-main > div.post_content"))
    .catch((_) => {
      return null;
    });

  if (comments) {
    for (const comment of comments) {
      try {
        const text = await comment.getText();
        product.comments.push(text);
      } catch (error) {
        await driver.close();
        return {
          status: error,
          product: null,
        };
      }
    }
  } else {
    await driver.close();
    return {
      status: 404,
      product: null,
    };
  }

  try {
    if (!nameEle || !imageEle || !priceEle) {
      await driver.close();
      return {
        status: 500,
        product: null,
      };
    }
    name = await nameEle.getText();
    image = await imageEle.getAttribute("src");
    price = await priceEle.getText();
    star = !starEle ? 0 : await starEle.getText();
  } catch (error) {
    await driver.close();
    return {
      status: error,
      product: null,
    };
  }

  await driver.close();

  if (product.comments.length) {
    const data = await rp({
      method: "POST",
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: product.comments,
      },
      json: true,
    }).catch((_) => {
      return null;
    });

    if (data) {
      product.evaluate = data.result.type;
      product.percent = data.result.percent;
    }
  }

  price = parseInt(price.replace(/[đ|.]/g, ''));

  product = {
    ...product,
    name,
    price,
    image,
    evaluate: changeStarToEvaluate(star),
    star,
  };

  return {
    status: 200,
    product,
  };
};
