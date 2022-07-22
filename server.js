const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// const mongoose = require('mongoose');
// mongoose.Promise = global.Promise;
// mongoose.connect("mongodb://localhost/CrawlSendo");
const route = require('./api/routes/CrawlRoute.js');
route(app);

app.use(function (req, res) {
  res.status(404).send({ url: req.originalUrl + ' not found' });
});

app.listen(port, function () {
  console.log(`Connected. locahost:${port}`);
});
