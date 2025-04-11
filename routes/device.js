const express = require('express');
const router = express.Router();
const device = require('../services/device');

/* POST New device data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await device.create(req.body));
    } catch (err) {
      console.error(`Error while creating device`, err.message);
      next(err);
    }
  });

/* PUT device data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await device.update(req.body));
  } catch (err) {
    console.error(`Error while updating device`, err.message);
    next(err);
  }
});

/* Delete Device data*/
router.delete('/', async function(req, res, next) {
  try {
    res.json(await device.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting device data`, err.message);
    next(err);
  }
});

router.get('/', async function(req, res, next) {
  try {
    res.json(await device.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching device list`, err.message);
    next(err);
  }
});


/* POST New device router data */
router.post('/router', async function(req, res, next) {
  try {
    res.json(await device.createRouter(req.body));
  } catch (err) {
    console.error(`Error while creating device router`, err.message);
    next(err);
  }
});

/* PUT device router data */
router.put('/router',async function(req, res, next) {
try {
  res.json(await device.updateRouter(req.body));
} catch (err) {
  console.error(`Error while updating device router`, err.message);
  next(err);
}
});

/* Delete device router data */
router.delete('/router', async function(req, res, next) {
try {
  res.json(await device.deletedataRouter(req.body));
} catch (err) {
  console.error(`Error while deleting device router data`, err.message);
  next(err);
}
});

router.get('/router', async function(req, res, next) {
try {
  res.json(await device.getRouterMultiple(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching device router`, err.message);
  next(err);
}
});



/* POST New device audio data */
router.post('/audio', async function(req, res, next) {
  try {
    res.json(await device.createAudio(req.body));
  } catch (err) {
    console.error(`Error while creating device audio`, err.message);
    next(err);
  }
});

/* PUT device audio data */
router.put('/audio',async function(req, res, next) {
try {
  res.json(await device.updateAudio(req.body));
} catch (err) {
  console.error(`Error while updating device audio`, err.message);
  next(err);
}
});

/* Delete device router data */
router.delete('/audio', async function(req, res, next) {
try {
  res.json(await device.deletedataAudio(req.body));
} catch (err) {
  console.error(`Error while deleting device audio data`, err.message);
  next(err);
}
});

router.get('/audio', async function(req, res, next) {
try {
  res.json(await device.getAudioMultiple(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching device audio`, err.message);
  next(err);
}
});
// Getting Site dept list
router.post('/getdevicelist', async function(req, res, next) {
  try{
      res.json(await device.getdevicelist(req.body));
     } 
    catch (err) {
      console.error(`Error while getting department device list`, err.message);
       next(err);
      }
  });

// Getting the device brand name list 
router.post('/brandname',async function(req,res, next){
  try{
    res.json(await device.getBrandname(req.body));
  }
  catch(err){
    console.log('Error while fetching the device brand name',err.message);
    next(err);
  }
});

router.post('/getsipnumber',async function(req,res, next){
  try{
    res.json(await device.getSipnumber(req.body));
  }
  catch(err){
    console.log('Error while fetching the sip number',err.message);
    next(err);
  }
});

// Update the site department to the customer
router.post('/updatedevice', async function(req, res, next) {
  try {
    res.json(await device.updatedevice(req.body));
  } catch (err) {
    console.error(`Error while updating customer site department`, err.message);
    next(err);
  }
});


//UPDATE THE DEVICE DAILY STATUS TO THE DATABASE
router.post('/devicestatus', async function(req,res,next){
  try {
    res.json(await device.DeviceStatus(req.body));
  }
  catch(err) {
    console.error(`Error while updating the device daily status . Pleasr re-try it`,err.message);
    next(err);
  }

});


//UPDATE THE SIP DEVICE STATUS
router.post('/sipstatus', async function(req,res,next){
  try{
    res.json(await device.addsipStatus(req.body));
  }
  catch(err){
    console.error("Error while adding the device sip status",err.message);
    next(err);
  }
});
module.exports = router;