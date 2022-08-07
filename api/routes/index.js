const evaluateRoutes = require("./evaluateRoutes");
const crawlRoutes = require("./crawlRoutes");

module.exports = function(app) {
    evaluateRoutes(app);
    crawlRoutes(app);
}
