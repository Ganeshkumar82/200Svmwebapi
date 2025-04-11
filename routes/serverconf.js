const express = require('express');
const router = express.Router();
const serverconf = require('../services/serverconf');

/* POST New server setting data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await serverconf.create(req.body));
    } catch (err) {
      console.error(`Error while creating server settings`, err.message);
      next(err);
    }
  });

/* PUT server setting data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await serverconf.update(req.body));
  } catch (err) {
    console.error(`Error while updating server settings`, err.message);
    next(err);
  }
});

/* delete server setting */
router.delete('/', async function(req, res, next) {
  try {
    res.json(await serverconf.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting server settings data`, err.message);
    next(err);
  }
});

router.get('/', async function(req, res, next) {
  try {
    res.json(await serverconf.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching server settings list`, err.message);
    next(err);
  }
});

//Create new AI system
router.post('/aisystem', async function(req, res, next) {
  try {
    res.json(await serverconf.createAISystem(req.body));
  } catch (err) {
    console.error(`Error while creating new AI system`, err.message);
    next(err);
  }
});

//delete AI system
router.delete('/aisystem', async function(req, res, next) {
  try {
    res.json(await serverconf.deleteAISystem(req.body));
  } catch (err) {
    console.error(`Error while deleting new AI system`, err.message);
    next(err);
  }
});

//Create new mobile operator
router.post('/operator', async function(req, res, next) {
  try {
    res.json(await serverconf.createMOperator(req.body));
  } catch (err) {
    console.error(`Error while creating new mobile operator`, err.message);
    next(err);
  }
});

/* delete mobile operator */
router.delete('/operator', async function(req, res, next) {
  try {
    res.json(await serverconf.deleteMOperator(req.body));
  } catch (err) {
    console.error(`Error while deleting mobile operator`, err.message);
    next(err);
  }
});

module.exports = router;