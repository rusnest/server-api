const webdriver = require("selenium-webdriver");
const { By } = require("selenium-webdriver");
const tgdds = require("../links/tgdd");
const rp = require("request-promise");
const {
  addProduct,
  updateProduct,
  deleteProduct,
  getProductByShopId,
} = require("../../firebase/firebase");
const {
  crawlTikiService,
  crawlTikiCommentService,
  crawlSendoService,
  crawlSendoCommentService,
  crawlShopeeService,
  crawlShopeeCommentService,
  crawlTGDDService,
  crawlTGDDCommentService,
} = require("../services/crawlServices");

/**
 * info product
 * id
 * price
 * name
 * image, evaluate, star, link, id_shop = 1
 */

exports.crawlTiki = async (req, res) => {
  const productIds = await getProductByShopId(1);
  const crawlData = await crawlTikiService(req.query, productIds);

  let index = 0;
  for (const prod of crawlData) {
    crawlData[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).send(crawlData);
};

exports.crawlTikiCmt = async (req, res) => {
  const { id } = req.query;
  let dataResponse = false;

  const comments = await crawlTikiCommentService(req.query);

  if (comments.length) {
    dataResponse = await rp({
      method: "POST",
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments,
      },
      json: true,
    }).catch((err) => {
      return {
        status: 500,
        err: err,
      };
    });

    if (dataResponse.status) {
      return res.json(dataResponse);
    }

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
  const productIds = await getProductByShopId(2);

  const crawlData = await crawlSendoService(req.query, productIds);

  let index = 0;
  for (const prod of crawlData) {
    crawlData[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).json(crawlData);
};

exports.crawlSendoCmt = async (req, res) => {
  const { id } = req.query;
  let data = null;

  const comments = await crawlSendoCommentService(req.query);

  if (comments.length) {
    data = await rp({
      method: "POST",
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments,
      },
      json: true,
    }).catch((err) => {
      return {
        status: 500,
        err: err,
      };
    });

    if (data.status) {
      return res.json(data);
    }

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
 * image, evaluate, star, link, id_shop = 3
 */

exports.crawlShopee = async (req, res) => {
  const productIds = await getProductByShopId(3);

  let crawlData = await crawlShopeeService(req.query, productIds);
  let index = 0;
  for (const prod of crawlData) {
    crawlData[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).send(crawlData);
};

exports.crawlShopeeCmt = async (req, res) => {
  const { id } = req.query;
  let data = null;

  const comments = await crawlShopeeCommentService(req.query);

  if (comments.length) {
    data = await rp({
      method: "POST",
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments,
      },
      json: true,
    }).catch((err) => {
      return {
        status: 500,
        err: err,
      };
    });

    if (data.status) return res.json(data);

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
  const productIds = await getProductByShopId(4);

  const products = await crawlTGDDService(req.query, productIds);
  let index = 0;
  for (const prod of products) {
    products[index].id = await addProduct(prod);
    index = index + 1;
  }

  return res.status(200).json(products);
};

exports.crawlTGDDComment = async (req, res) => {
  const { id } = req.query;
  let data = null;
  const comments = await crawlTGDDCommentService(req.query);

  if (comments.length) {
    data = await rp({
      method: "POST",
      uri: `http://127.0.0.1:5000/evaluate`,
      body: {
        comments: comments,
      },
      json: true,
    }).catch((err) => {
      return {
        status: 500,
        err,
      };
    });

    if (data.status) return res.json(data);

    await updateProduct({
      id,
      percent: data.result.percent,
      type: data.result.type,
    });
  } else {
    // TODO delete product from firebase
    await deleteProduct(id);
  }

  return res.json(data);
};
