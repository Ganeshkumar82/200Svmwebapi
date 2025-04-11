const express = require('express');
const router = express.Router();
const user = require('../services/user');
var requestIp = require('request-ip');
const fs = require('fs');
const path = require('path');

/* POST user login */
router.post('/login', async function(req, res, next) {
  try {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    //console.log("ip------->"+req.socket.localAddress);
  
    var clientIp = requestIp.getClientIp(req);
    res.json(await user.login(req.body,clientIp));
  } catch (err) {
    //console.error(`Error while login`, err.message);
    next(err);
  }
});

/* POST user login */
router.post('/login1', async function(req, res, next) {
  try {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    //console.log("ip------->"+req.socket.localAddress);
  
    var clientIp = requestIp.getClientIp(req);
    res.json(await user.login1(req.body,clientIp));
  } catch (err) {
    //console.error(`Error while login`, err.message);
    next(err);
  }
});

/* POST user login OTP*/
router.post('/loginotp', async function(req, res, next) {
  try {
    res.json(await user.loginwithotp(req.body));
  } catch (err) {
    //console.error(`Error while login with OTP`, err.message);
    next(err);
  }
});

router.post('/forgotpassword', async function(req, res, next) {
  try {
    res.json(await user.loginwithotp(req.body));
  } catch (err) {
    //console.error(`Error while login with OTP`, err.message);
    next(err);
  }
});

/* POST user login OTP*/
router.post('/loginverifyotp', async function(req, res, next) {
  try {
    res.json(await user.verifyotplogin(req.body));
  } catch (err) {
    //console.error(`Error while login with OTP`, err.message);
    next(err);
  }
});

router.post('/register', async function(req, res, next) {
  try {
    res.json(await user.register(req.body));
  } catch (err) {
    //console.error(`Error while register`, err.message);
    next(err);
  }
});

router.post('/getuserdetails', async function(req, res, next) {
  try {
    res.json(await user.getUserdetails(req.body));
  } catch (err) {
    //console.error(`Error while getting user details `, err.message);
    next(err);
  }
});

router.post('/create', async function(req, res, next) {
  try {
    res.json(await user.createUser(req.body));
  } catch (err) {
    //console.error(`Error while creating user`, err.message);
    next(err);
  }
});

router.post('/update', async function(req, res, next) {
  try {
    res.json(await user.updateUser(req.body));
  } catch (err) {
    //console.error(`Error while updating user`, err.message);
    next(err);
  }
});

router.post('/updatepassword', async function(req, res, next) {
  try {
    res.json(await user.updatepassword(req.body));
  } catch (err) {
    //console.error(`Error while updating user`, err.message);
    next(err);
  }
});

router.post('/exist', async function(req, res, next) {
  try {
    res.json(await user.isuserexist(req.body));
  } catch (err) {
    //console.error(`Error while updating user`, err.message);
    next(err);
  }
});

router.post('/setpassword', async function(req, res, next) {
  try {
    res.json(await user.setpassword(req.body));
  } catch (err) {
    //console.error(`Error while updating user password`, err.message);
    next(err);
  }
});

router.post('/delete', async function(req, res, next) {
  try {
    res.json(await user.deleteUser(req.body));
  } catch (err) {
    //console.error(`Error while deleting user`, err.message);
    next(err);
  }
});


/* Send OTP to contact */
router.post('/sendotp', async function(req, res, next) {
  try {
    res.json(await user.createSendOTP(req.body));
  } catch (err) {
    //console.error(`Error while sending OTP to user`, err.message);
    next(err);
  }
});

/* Send OTP to mobile */
router.post('/sendmobileotp', async function(req, res, next) {
  try {
    res.json(await user.createSendMobileOTP(req.body));
  } catch (err) {
    //console.error(`Error while sending OTP to mobile`, err.message);
    next(err);
  }
});

/* Send OTP to mobile */
router.post('/sendemailotp', async function(req, res, next) {
  try {
    res.json(await user.createSendEmailOTP(req.body));
  } catch (err) {
    //console.error(`Error while sending OTP to email`, err.message);
    next(err);
  }
});

/* Verify mobile OTP */
router.post('/verifymobileotp', async function(req, res, next) {
  try {
    res.json(await user.verifyMobileOTP(req.body));
  } catch (err) {
    //console.error(`Error while sending OTP to mobile`, err.message);
    next(err);
  }
});

//Verify Email OTP
router.post('/verifyemailotp', async function(req, res, next) {
  try {
    res.json(await user.verifyEmailOTP(req.body));
  } catch (err) {
    //console.error(`Error while sending OTP to email`, err.message);
    next(err);
  }
});

//Upload KYC adhaar details
router.post('/upload-adhaar', async function(req, res, next) {
  try {
    res.json(await user.uploadadhaar(req,res));
  } catch (err) {
    //console.error(`Error while uploading adhaar card`, err.message);
    next(err);
  }
});

//Upload KYC adhaar details
router.post('/upload-adhaar-details', async function(req, res, next) {
  try {
    res.json(await user.uploadadhaardetails(req.body));
  } catch (err) {
    //console.error(`Error while updating adhaar details`, err.message);
    next(err);
  }
});


//Upload KYC adhaar details
router.post('/upload-pan', async function(req, res, next) {
  try {
    res.json(await user.uploadpan(req,res));
  } catch (err) {
    //console.error(`Error while upload pan card`, err.message);
    next(err);
  }
});

//Upload KYC adhaar details
router.post('/upload-pan-details', async function(req, res, next) {
  try {
    res.json(await user.uploadpandetails(req.body));
  } catch (err) {
    //console.error(`Error while updating pan details`, err.message);
    next(err);
  }
});


//forgot password
router.post('/forgot-password', async function(req, res, next) {
  try {
    res.json(await user.forgotpassword(req.body));
  } catch (err) {
    //console.error(`Error while doing forget passwords`, err.message);
    next(err);
  }
});

//get site dashboard data
router.post('/get-site-dashboard', async function(req, res, next) {
  try {
    res.json(await user.getSiteDashboard(req.body));
  } catch (err) {
    //console.error(`Error while getting site dashboard details`, err.message);
    next(err);
  }
});

//get company dashboard data
router.post('/get-company-dashboard', async function(req, res, next) {
  try {
    res.json(await user.getCompanyDashboard(req.body));
  } catch (err) {
    //console.error(`Error while getting company dashboard details`, err.message);
    next(err);
  }
});
//forgot password
router.post('/loginforgotpassword', async function(req, res, next) {
  try {
    res.json(await user.loginforgotpassword(req.body));
  } catch (err) {
    //console.error(`Error while sending forget password otp`, err.message);
    next(err);
  }
});
//verify otp 
router.post('/verifyotp', async function(req, res, next) {
  try {
    res.json(await user.verifyOTP(req.body));
  } catch (err) {
    //console.error(`Error while Verifying the otp`, err.message);
    next(err);
  }
});

//Update password
router.post('/newpassword', async function(req, res, next) {
  try {
    res.json(await user.changepassword(req.body));
  } catch (err) {
    //console.error(`Error while Verifying the otp`, err.message);
    next(err);
  }
});


/* POST user login OTP*/
router.post('/otplogin', async function(req, res, next) {
  try {
    res.json(await user.loginWithotp(req.body));
  } catch (err) {
    //console.error(`Error while login with OTP`, err.message);
    next(err);
  }
});

/* POST user login OTP*/
router.post('/otploginverify', async function(req, res, next) {
  try {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    //console.log("ip------->"+req.socket.localAddress);
  
    var clientIp = requestIp.getClientIp(req); 
    res.json(await user.VerifyloginWithotp(req.body,clientIp));
  } catch (err) {
    //console.error(`Error while login OTP Verification`, err.message);
    next(err);
  }
});


/* POST user logout*/
router.post('/logout', async function(req, res, next) {
  try {
    res.json(await user.Logout(req.body));
  } catch (err) {
    //console.error(`Error while logging out the user`, err.message);
    next(err);
  }
});


//fetch the user acknowledged event from the table
router.post('/userevents' , async function(req,res,next){
  try{
    res.json(await user.UserEvents(req.body));
  }catch(err){
    //console.error("Error in fetching the user acknowledged Event list",err.message);
    next(err);
  }
});

/* POST user logout*/
router.post('/getcustomerid', async function(req, res, next) {
  try {
    res.json(await user.getUserid(req.body));
  } catch (err) {
    //console.error(`Error while fetching the customer id of  the user`, err.message);
    next(err);
  }
});

//GET THE USER REPORTS
router.post('/userlist',async function(req,res,next){
  try{
     res.json(await user.GetUserList(req.body));
  }catch(er){
     console.error(`Error while fetching the User list -> ${er.message}`);
     next(er);
  }
});

//ADD THE USER TO AS A EXECUTIVE
router.post('/adduser', async function(req,res,next){
  try{
     res.json(await user.AddUser(req.body));
  }catch(er){
    console.error(`Error adding the user -> ${er.message}`);
    next(er);
  }
});
module.exports = router;