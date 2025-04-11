const express = require('express');
const router = express.Router();
const devicesdk = require('../services/devicesdk');

/* POST New dept data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await devicesdk.create(req.body));
    } catch (err) {
      console.error(`Error while creating devicedata`, err.message);
      next(err);
    }
  });

/* PUT dept data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await devicesdk.update(req.body));
  } catch (err) {
    console.error(`Error while updating devicedata`, err.message);
    next(err);
  }
});

/* Delete devicedata data */
router.delete('/', async function(req, res, next) {
  try {
    res.json(await devicesdk.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting devicedata data`, err.message);
    next(err);
  }
});

/* Get device information */
router.get('/', async function(req, res, next) {
  try {
    res.json(await devicesdk.getDeviceInfo(req.body,req));
  } catch (err) {
    console.error(`Error while fetching devicedata list`, err.message);
    next(err);
  }
});

/* Get device information */
router.get('/network', async function(req, res, next) {
  try {
    res.json(await devicesdk.getDeviceNetwork(req.body,req));
  } catch (err) {
    console.error(`Error while fetching devicedata list`, err.message);
    next(err);
  }
});

/* Read device information */
router.get('/read', async function(req, res, next) {
  try {
    res.json(await devicesdk.readDeviceInfo(req.body,req));
  } catch (err) {
    console.error(`Error while fetching devicedata list`, err.message);
    next(err);
  }
});

//Using the server connect to the device and fetch the device details
router.post('/info' , async function(req,res ,next){
  try{
    res.json(await devicesdk.getDeviceinfo(req.body));
  }catch(err){
    console.error(`Error while fetching the device information`, err.message);
    next(err);
  }  
});


module.exports = router;
