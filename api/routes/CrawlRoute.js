module.exports = function (app) {
  var crawlController = require('../controllers/CrawlController.js');
  app.route('/tiki').get(crawlController.crawlTiki);
  app.route('/tiki/cmt').get(crawlController.crawlTikiCmt);
  app.route('/sendo').get(crawlController.crawlSendo);
  app.route('/sendo/cmt').get(crawlController.crawlSendoCmt);
  app.route('/shopee').get(crawlController.crawlShopee);
  app.route('/shopee/cmt').get(crawlController.crawlShopeeCmt);
  app.route('/tgdd').get(crawlController.crawlTGDD);
  app.route('/tgdd/cmt').get(crawlController.crawlTGDDComment);
  app.route('/tgdd/info').get(crawlController.tgddGetInfo);
  app.route('/nguyenkim').get(crawlController.crawlNguyenKim);
};

