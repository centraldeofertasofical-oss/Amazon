const express = require('express');
const { scrapeAmazonOffers } = require('../services/amazonOffersService');

const router = express.Router();

router.post('/search', async (req, res, next) => {
  try {
    const result = await scrapeAmazonOffers(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
