module.exports = function(app) {
    const evaluateController = require("../controllers/EvaluateController");

    app.route('/evaluate').post(evaluateController.evaluate);
}