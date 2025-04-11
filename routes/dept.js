const express = require('express');
const router = express.Router();
const dept = require('../services/dept');

/* POST New dept data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await dept.create(req.body));
    } catch (err) {
      console.error(`Error while creating department`, err.message);
      next(err);
    }
  });

/* PUT dept data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await dept.update(req.body));
  } catch (err) {
    console.error(`Error while updating department`, err.message);
    next(err);
  }
});

/* Delete department data */
router.delete('/', async function(req, res, next) {
  try {
    res.json(await dept.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting department data`, err.message);
    next(err);
  }
});

/* Get department data */
router.get('/', async function(req, res, next) {
  try {
    res.json(await dept.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching department list`, err.message);
    next(err);
  }
});


// Update the site department to the customer
router.post('/updatedept', async function(req, res, next) {
  try {
    res.json(await dept.updatedept(req.body));
  } catch (err) {
    console.error(`Error while updating customer site department`, err.message);
    next(err);
  }
});

module.exports = router;