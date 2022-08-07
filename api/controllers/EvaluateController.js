const rp = require("request-promise");
const cheerio = require("cheerio");
const { evaluateTGDD, evaluateNguyenKim } = require("../services/evaluateServices");

exports.evaluate = async (req, res) => {
    const { link, shop } = req.body;
    let product = null;
    if (shop === "tgdd") {
        product = await evaluateTGDD(link);
    } else if (shop === "nguyenkim") {
        product = await evaluateNguyenKim(link);
    }
    return res.json(product)
}