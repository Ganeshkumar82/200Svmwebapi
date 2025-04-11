const express = require('express');
const router = express.Router();
const ui = require('../services/ui');

/* Get Grid Template */
router.get('/grid', async function(req, res, next) {
  try {
    res.json(await ui.getGridTemplate(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching grid template list`, err.message);
    next(err);
  }
});


module.exports = router;