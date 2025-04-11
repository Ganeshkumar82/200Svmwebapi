const express = require('express');
const router = express.Router();
const subscription = require('../services/subscription');

/* GET Subscription Packages. */
router.get('/', async function(req, res, next) {
  try {
    res.json(await subscription.getMultiple(req.query.page));
  } catch (err) {
    console.error(`Error while getting subscription packages `, err.message);
    next(err);
  }
});

/* POST Subcription Packages */
router.post('/', async function(req, res, next) {
  try {
    res.json(await subscription.create(req.body));
  } catch (err) {
    console.error(`Error while creating subscription`, err.message);
    next(err);
  }
});

/* PUT Subsction package */
router.put('/:id', async function(req, res, next) {
  try {
    res.json(await subscription.update(req.params.id, req.body));
  } catch (err) {
    console.error(`Error while updating subscription package`, err.message);
    next(err);
  }
});


/* DELETE Subsction package */
router.delete('/:id', async function(req, res, next) {
  try {
    res.json(await subscription.remove(req.params.id));
  } catch (err) {
    console.error(`Error while deleting subscription package`, err.message);
    next(err);
  }
});

/*Subsction package */
router.post('/getsubscriptionname', async function(req, res, next) {
  try {
    res.json(await subscription.getSubscriptionname(req.body));
  } catch (err) {
    console.error(`Error while Getting subscription package name`, err.message);
    next(err);
  }
});

router.post('/getsubscriptiondetails', async function(req, res, next) {
  try {
    res.json(await subscription.getSubscriptionPackageDetails(req.body));
  } catch (err) {
    console.error(`Error while Getting subscription package details`, err.message);
    next(err);
  }
})


module.exports = router;