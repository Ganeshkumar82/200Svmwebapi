const express = require('express');
const router = express.Router();
const contact = require('../services/contact');

/* POST New contact data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await contact.create(req.body));
    } catch (err) {
      console.error(`Error while creating contact`, err.message);
      next(err);
    }
  });

/* PUT contact data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await contact.update(req.body));
  } catch (err) {
    console.error(`Error while updating contact`, err.message);
    next(err);
  }
});

/* delete contact */
router.delete('/', async function(req, res, next) {
  try {
    res.json(await contact.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting contact data`, err.message);
    next(err);
  }
});

router.get('/', async function(req, res, next) {
  try {
    res.json(await contact.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching contact list`, err.message);
    next(err);
  }
});


/* Send OTP to contact */
router.post('/sendotp', async function(req, res, next) {
  try {
    res.json(await contact.createSendOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to contact`, err.message);
    next(err);
  }
});

/* Send OTP to mobile */
router.post('/sendmobileotp', async function(req, res, next) {
  try {
    res.json(await contact.createSendMobileOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to mobile`, err.message);
    next(err);
  }
});

/* Send OTP to mobile */
router.post('/sendemailotp', async function(req, res, next) {
  try {
    res.json(await contact.createSendEmailOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to email`, err.message);
    next(err);
  }
});

/* Verify mobile OTP */
router.post('/verifymobileotp', async function(req, res, next) {
  try {
    res.json(await contact.verifyMobileOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to mobile`, err.message);
    next(err);
  }
});

//Verify Email OTP
router.post('/verifyemailotp', async function(req, res, next) {
  try {
    res.json(await contact.verifyEmailOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to email`, err.message);
    next(err);
  }
});

/* Send OTP to mobile */
router.post('/sendemlotp', async function(req, res, next) {
  try {
    res.json(await contact.createsendEmailOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to email`, err.message);
    next(err);
  }
});

/* Send OTP to mobile */
router.post('/sendmobotp', async function(req, res, next) {
  try {
    res.json(await contact.createsendMobileOTP(req.body));
  } catch (err) {
    console.error(`Error while sending OTP to mobile`, err.message);
    next(err);
  }
});

//POST new contact list
router.post('/getcontact',async function(req,res,next){
  try{
    res.json(await contact.GetContact(req.body));
  }
  catch(err){
    console.error(`Error while fetching the customer escalation contacts details`,err.message);
    next(err);
  }
});

// ADD THE escalation contact CONTACT
router.post('/escalationcontact',async function(req,res,next){
  try{
    res.json(await contact.addescalationcontact(req.body));
  }catch(err){
    console.error('Error while adding the customer escalation contact list',err.message);
    next(err);
  }
});

//delete the ESCALTION CONTACT to the customer
router.post('/deleteescalation', async function(req,res,next) {
  try {
    res.json(await contact.DeleteEscalationContact(req.body));
  } catch (err) {
    console.error(`Error while while deleting the customer escalation contact`, err.message);
    next(err);
  }
});



module.exports = router;