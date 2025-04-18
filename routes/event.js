const express = require('express');
const router = express.Router();
const event = require('../services/event');
const fs = require('fs');


/* POST New device event data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await event.create(req.body));
    } catch (err) {
      //console.error(`Error while creating device event`, err.message);
      next(err);
    }
  });

  /* POST New device event data */
router.post('/snapshot', async function(req, res, next) {
  try {
    res.json(await event.createSnapshot(req.body));
  } catch (err) {
    //console.error(`Error while creating event snapshot`, err.message);
    next(err);
  }
});

router.post('/recent', async function(req, res, next) {
  try {
    res.json(await event.getRecentEvent(req.body));
  } catch (err) {
    //console.error(`Error while getting recent event list`, err.message);
    next(err);
  }
});

router.post('/unack', async function(req, res, next) {
  try {
    res.json(await event.getUnAckEvent(req.body));
  } catch (err) {
    //console.error(`Error while getting unacknowledged event list`, err.message);
    next(err);
  }
});

router.post('/device', async function(req, res, next) {
  try {
    res.json(await event.getDeviceEvent(req.body));
  } catch (err) {
    //console.error(`Error while getting device event list`, err.message);
    next(err);
  }
});


router.post('/snapshotsingle', async function(req, res, next) {
  try {
    res.json(await event.createSnapshotSingle(req.body));
  } catch (err) {
    //console.error(`Error while creating event snapshot`, err.message);
    next(err);
  }
});

router.post('/action', async function(req, res, next) {
  try {
    res.json(await event.createAction(req.body));
  } catch (err) {
    //console.error(`Error while creating event snapshot`, err.message);
    next(err);
  }
});

/* PUT device data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await event.update(req.body));
  } catch (err) {
    //console.error(`Error while updating device event`, err.message);
    next(err);
  }
});

/* POST New Customer Subscription */
router.delete('/', async function(req, res, next) {
  try {
    res.json(await event.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting device event data`, err.message);
    next(err);
  }
});

router.get('/', async function(req, res, next) {
  try {
    res.json(await event.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching device event list`, err.message);
    next(err);
  }
});

router.get('/snapshot', async function(req, res, next) {
  try {
    res.json(await event.getEventSnapshot(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching device event list`, err.message);
    next(err);
  }
});

//get custom feedback message
router.post('/addcustommessage',async function(req,res, next){
  try{
    res.json(await event.addCustomMessage(req.body));
  }
  catch(err){
    console.error('Error while adding the custom message',err.message);
    next(err);
  }
});

//get custom feedback message
router.post('/getcustommessage',async function(req,res, next){
  try{
    res.json(await event.getCustomMessage(req.body));
  }
  catch(err){
    console.error('Error while fetching the custom message',err.message);
    next(err);
  }
});

// GET EVENT LIST OF THE CUSTOMER
router.post('/eventaction',async function(req,res, next){
  try{
    res.json(await event.getEventAction(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while fetching event list',err.message);
    next(err);
  }
});

//Get event occured location
router.post('/geteventproperty',async function(req,res, next){
  try{
    res.json(await event.getEventProperty(req.body));
  }
  catch(err){
    //console.error('Error while fetching event location',err.message);
    next(err);
  }
});

//Add
router.post('/addeventfeedback',async function(req,res, next){
  try{
    res.json(await event.addEventFeedback(req.body));
  }
  catch(err){
    //console.error('Error while adding event feedback',err.message);
    next(err);
  }
});

//Add the event whatsapp
router.post('/addwhatsapplog',async function(req,res, next){
  try{
    res.json(await event.addWhatsappLog(req.body));
  }
  catch(err){
    //console.error('Error while adding event feedback',err.message);
    next(err);
  }
});

//Get the AI event
router.post('/getaievent',async function(req,res, next){
  try{
    res.json(await event.GetAIEvent(req.body));
  }
  catch(err){
    //console.error('Error while getting the event AI',err.message);
    next(err);
  }
});

//FILTER THE EVENT LIST
router.post('/filterevent',async function(req,res, next){
  try{
    res.json(await event.Eventlistfilter(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the event list',err.message);
    next(err);
  }
});

//Get the image path
router.post('/getcameraimg',async function(req,res, next){
  try{
    res.json(await event.getcameraimg(req.body));
  }
  catch(err){
    //console.error('Error while ',err.message);
    next(err);
  }
});


//FILTER THE UNACKNOWLEGED EVENT LIST
router.post('/unacknowledge',async function(req,res, next){
  try{
    res.json(await event.getUnAcknoEvent(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the unaknowledged event',err.message);
    next(err);
  }
});

//FILTER THE RECENT EVENT LIST
router.post('/recentevent',async function(req,res, next){
  try{
    res.json(await event.getRecEvent(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the recent event',err.message);
    next(err);
  }
});

//FILTER THE DEVICE EVENT LIST
router.post('/deviceevent',async function(req,res, next){
  try{
    res.json(await event.getDevEvent(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the device event',err.message);
    next(err);
  }
});

//FILTER THE VIDEO LOSS EVENT LIST
router.post('/videoloss',async function(req,res, next){
  try{
    res.json(await event.getVideolossEvent(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the device event',err.message);    
    next(err);
  }
});

//FILTER THE NOT CONNECTED EVENT LIST
router.post('/notconnect',async function(req,res, next){
  try{
    res.json(await event.getNotConnect(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the not connected event',err.message);
    next(err);
  }
});

//FILTER THE NOT CONNECTED EVENT LIST
router.post('/whatsappnotified',async function(req,res, next){
  try{
    res.json(await event.getWhatsappEvent(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while filtering the whatsapp notified event',err.message);
    next(err);
  }
});

//GET THE SNAPSHOT FROM THE USER AND STORE IN THE PATH
router.post('/createevent',async function(req,res, next){
  try{
    res.json(await event.CreateSnapshot(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while storing the event snapshot',err.message);
    next(err);
  }
});

router.get('/serve-image', (req, res) => {
  const imagePath = decodeURIComponent(req.query.path);
  if (fs.existsSync(imagePath)) {
    
    const image = fs.readFileSync(imagePath);
    res.contentType('image/jpeg'); 
    res.send(image);
  } else {
    res.status(404).send('Image not found');
  }
});

// //FILTER THE VIDEO LOSS EVENT LIST FOR COMPANY 
// router.post('/videoloss',async function(req,res, next){
//   try{
//     res.json(await event.getVideolossEvent(req.query.page,req.body));
//   }
//   catch(err){
//     //console.error('Error while filtering the device event',err.message);    
//     next(err);
//   }
// });

//GET THE CAMERA INFO FOR COMPANY 
router.post('/getcamerainfo',async function(req,res, next){
  try{
    res.json(await event.getCameraInfo(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while fetching the get camera info',err.message);    
    next(err);
  }
});
//new create EVENT 
router.post('/createevent',async function(req,res, next){
  try{
    res.json(await event.CreateSnapshot(req.query.page,req.body));
  }
  catch(err){
    //console.error('Error while Creating the new event',err.message);
    next(err);
  }
});

//ADD THE CUSTOMER SELF FEEDBACKs
router.post('/addselffeedback',async function(req,res, next){
  try{
    res.json(await event.addCustomerSelfFeedback(req.query.page,req.body));
  }
  catch(err){
    console.error('Error while adding the customer self feedback',err.message);    
    next(err);
  }
});

//GET THE USER WISE REPORT FOR THE UNACKNOWLEDGED EVENTS
router.post('/getuserreport', async function(req,res,next){
  try{
    res.json(await event.GetUserReport(req.query.page,req.body));
  }catch(er){
    console.error('Error while adding the customer self feedback',err.message);    
    next(err);
  }
});

//IGNORE CAMERA RECORDS
router.post('/ignorecamera', async function(req,res,next){
  try{
    res.json(await event.IgnoreCameras(req.body));
  }catch(er){
    console.error('Error while adding the ignore camera list',err.message);    
    next(err);
  }
});

module.exports = router;          