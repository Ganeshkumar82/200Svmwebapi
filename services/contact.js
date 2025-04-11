const db = require('./db');
const helper = require('../helper');
const config = require('../config');
const otpGenerator = require('otp-generator');
// const { Curl } = require("node-libcurl");
var nodemailer = require('nodemailer')
var jade = require('jade');
// const smsClient = require('../smsclient');
const mailer = require('../mailer');



async function create(contact){
    let message = 'Error in creating new contact';
    let responsecode = "1301"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "1301"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL AddNewContact("'+contact.contactname+'","'+contact.mobile+'","'+contact.email+'", '+contact.deptid+','+contact.userid+','+contact.contacttype+')');

    if (result.affectedRows) {
      responsecode = "131"
      message = 'Contact created successfully';
    }
  
    return {responsecode,message};
}


async function update(contact){
  let message = 'Error in updating contact data';
  let responsecode = "1302"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1302"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `update customercontacts set contactname="${contact.contactname}",contactmobile="${contact.mobile}",contactemail="${contact.email}", dept_id=${contact.deptid},Created_by=${contact.userid},contact_type=${contact.contacttype} WHERE contact_id=${contact.contactid}` 
  );

  if (result.affectedRows) {
      responsecode = "132"
      message = 'Contact updated successfully';
  }

  return {message};
}

async function deletedata(contact){
  let message = 'Error in deleting contact data';
  let responsecode = "1303"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1303"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from customercontacts WHERE contact_id=${contact.contactid}` 
  );

  if (result.affectedRows) {
      responsecode = "133"
      message = 'Contact deleted successfully';
  }

  return {message};
}

async function getMultiple(page = 1,contact){
  let message = 'Error in fetching contact list';
  let responsecode = "1304"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1303"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (contact.deptid!=0)
    sql=`SELECT * FROM customercontacts where dept_id=${contact.deptid} LIMIT ${offset},${config.listPerPage}`;
  if (contact.branchid!=0)
    sql=`SELECT * FROM customercontacts where dept_id in (select dept_id from deptmaster where branch_id=${contact.branchid}) LIMIT ${offset},${config.listPerPage}`;
  if (contact.customerid!=0)
    sql=`SELECT * FROM customercontacts where dept_id in (select dept_id from deptmaster where branch_id in (select branch_id from branchmaster where customer_id=${contact.customerid})) LIMIT ${offset},${config.listPerPage}`;
  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Contact list Fetching successfully';
    responsecode = "134"

    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'Branch/Customer/Dept ID is missing. Please give any one of the input of Branch/Customer/Dept ID';
    responsecode = "1304"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}

async function createSendOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result = await db.query('CALL addotpverification(1,"'+contact.mobile+'",'+otpText+')');
  //sendSMS(contact.mobile,otpText);

  const otpText1 = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result1 = await db.query('CALL addotpverification(2,"'+contact.email+'",'+otpText+')');

  if (result1.affectedRows) {
    responsecode = "135"
    message = 'Email/Mobile OTP sent successfully';
  }

  return {responsecode,message};
}

async function createSendMobileOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result = await db.query('CALL addotpverification(1,"'+contact.mobile+'",'+otpText+')');
  sendSMS(contact.mobile,otpText);

  if (result.affectedRows) {
    responsecode = "135"
    message = 'Mobile OTP sent successfully';
  }

  return {responsecode,message};
}

async function createSendEmailOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result = await db.query('CALL addotpverification(2,"'+contact.email+'",'+otpText+')');
  sendEmail(contact.email,otpText,contact.companyname);
  if (result.affectedRows) {
    responsecode = "135"
    message = 'Email OTP sent successfully';
  }

  return {responsecode,message};
}


async function verifyMobileOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL checkotp(1,?,?,@result);select @result;',[contact.mobile,contact.OTP]);
  data = result[1];
  return {responsecode,message,data};
}

async function verifyEmailOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+contact.userid+' and token="'+contact.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL checkotp(2,?,?,@result);select @result;',[contact.email,contact.OTP]);
  data = result[1];
  return {responsecode,message,data};
}


function sendSMS(mobile,otptext)
{
	// Authorisation details.
	let username = "vmssupport@sporadasecure.com";
	let hash = "f1bc87ee9a2bf23c09fccf7f2dce22da644deed99c59dff538842629aca37835";

	// Config variables. Consult http://api.textlocal.in/docs for more info.
	let test = "0";

	// Data for text message. This is the text message data.
	let message = "The OTP for validating your mobile number is "+otptext+" - Sporada Secure";
	// 612 chars or less
	// A single number or a comma-seperated list of numbers
	message = encodeURIComponent(message);
  let sender = "sporad";
	data = "username="+username+"&hash="+hash+"&message="+message+"&sender="+sender+"&numbers="+mobile+"&test="+test;
  const curlTest = new Curl();

  curlTest.setOpt(Curl.option.URL, "https://api.textlocal.in/send/?");
  curlTest.setOpt(Curl.option.POST, true);
  curlTest.setOpt(
    Curl.option.POSTFIELDS,data
  );
	curlTest.on("end", function (statusCode, data, headers) {
    console.info("Status code " + statusCode);
    console.info("***");
    console.info("Our response: " + data);
    console.info("***");
    console.info("Length: " + data.length);
    console.info("***");
    console.info("Total time taken: " + this.getInfo("TOTAL_TIME"));
  
    this.close();
  });
  curlTest.perform();
}

function sendEmail(email,otptext,companyname)
{
var config = {
  host: "mail.sporadasecure.com",
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: "alerts@sporadasecure.com",
    pass: "Sporada@2014",
  }
  // config for sending emails like username, password, ...
}
var emailFrom = 'alerts@sporadasecure.com';
var emailTo = email;
var templateDir = 'template';
var transporter = nodemailer.createTransport(config);

var username = 'thisUsername'
// rendering html template (same way can be done for subject, text)
const fs = require('fs')
let html = ""
fs.readFile(templateDir+'/newcustomerotp.html', 'utf8' , (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  var ts = Date.now();console.log(ts+data)
  html = data;
})

html = html.replace("{{ subject }}",'Email OTP Verification');
html = html.replace("{{ msg }}",'You have been registered with Sporada Secure for e-Surveillance. Please verify your otp given below with our executive.');
html = html.replace("{{ otp }}",otptext);
html = html.replace("{{ link }}",'#');
html = html.replace("{{ welcome }}",'Hi');
//var html = jade.renderFile(templateDir+'/newcustomerotp.html', {subject: 'Email OTP Verification',msg: 'You have been registered with Sporada Secure for e-Surveillance. Please verify your otp given below with our executive.',otp: otptext,link: 'https://docs.google.com/gview?embedded=true&url=#',welcome:'Hi',Companyname:companyname});

//build options
var options = {
   from: emailFrom,
    to: emailTo,
    subject: 'subject',
    html: html,
    text:'text'
};

transporter.sendMail(options, function(error, info) {
  if(error) {
    var ts = Date.now();console.log(ts+'Message not sent');
    var ts = Date.now();console.log(ts+info);
    return false;
  }
  else{
    var ts = Date.now();console.log(ts+'Message sent: ' + info.response);
    var ts = Date.now();console.log(ts+info);
    return true;
  };
});
}

//########################################################################################################################################################################################

async function createsendMobileOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (contact.hasOwnProperty("STOKEN")== false) {
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "CREATE SEND MOBILE OTP", "");
  }
  // Check if the given session token size is valid or not
  if (contact.STOKEN.length > 50 || contact.STOKEN.length < 30) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "CREATE SEND MOBILE OTP", "");
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [contact.STOKEN]);
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  var custname = objectvalue["@custname"];
  if (userid == null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "CREATE SEND MOBILE OTP", "");
  }
  var secret = contact.STOKEN.substring(0, 16);
  console.log("secret->" + secret);

  if(contact.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","CREATE SEND MOBILE OTP","");
  }
  console.log("querystring=>"+contact.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(contact.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","CREATE SEND MOBILE OTP",secret);
  }
  try
  { 
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_COMPANY_JSON_ERROR","CREATE SEND MOBILE OTP",secret);
  }
  if(queryData.hasOwnProperty('mobileno')==false || queryData.mobileno == '' || queryData.mobileno == null){
    return helper.getErrorResponse("ESCALATION_CONTACT_NO_MISSING","CREATE SEND MOBILE OTP",secret);
  }
  const [result1] =  await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',['1',queryData.mobileno]);  
      const objectvalue1 = result1[1][0];
      const otpText = objectvalue1["@result"];
      console.log("otp mobile->"+otpText);
      if(otpText != null){
        console.log("phone no ->"+ queryData.mobileno);
      smsClient.sendSMS("sporad",queryData.mobileno,"0",otpText);
      return helper.getSuccessResponse("MOBILE_OTP_SEND_SUCCESSFULLY","OTP SEND SUCCESSFULLY","",secret);
      }else{
        return helper.getErrorResponse("OTP_GENERATING_OTP","LOGIN WITH OTP",secret);
      }
}

//#########################################################################################################################################################################################
//#########################################################################################################################################################################################

async function createsendEmailOTP(contact){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (contact.hasOwnProperty("STOKEN")== false) {
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "CREATE SEND EMAIL OTP", "");
  }
  // Check if the given session token size is valid or not
  if (contact.STOKEN.length > 50 || contact.STOKEN.length < 30) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "CREATE SEND EMAIL OTP", "");
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [contact.STOKEN]);
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregidid = objectvalue["@custid"];
  var custname = objectvalue["@custname"];
  if (userid == null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "CREATE SEND EMAIL OTP", "");
  }
  var secret = contact.STOKEN.substring(0, 16);
  console.log("secret->" + secret);

  if(contact.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","CREATE SEND EMAIL OTP","");
  }
  console.log("querystring=>"+contact.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(contact.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","CREATE SEND EMAIL OTP",secret);
  }
  try
  { 
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_COMPANY_JSON_ERROR","CREATE SEND EMAIL OTP",secret);
  }
  if(queryData.hasOwnProperty('emailid')==false || queryData.emailid == '' || queryData.emailid == null){
    return helper.getErrorResponse("ESCALATION_EMAIL_ID_MISSING","CREATE SEND EMAIL OTP",secret);
  }
  const [result1] =  await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',['0',queryData.emailid]);  
      const objectvalue1 = result1[1][0];
      const otpText = objectvalue1["@result"];
      console.log("otp mobile->"+otpText);
      if(otpText != null){
        console.log("phone no ->"+ queryData.emailid);
        EmailSent = await mailer.sendEmail("",queryData.emailid,"ESCALATION OTP","escalationotp.html",otpText,"ESCALTION_OTP_CONF");
      // smsClient.sendSMS("sporad",queryData.mobileno,"0",otpText);
      return helper.getSuccessResponse("EMAIL_OTP_SEND_SUCCESSFULLY","OTP SEND SUCCESSFULLY","",secret);
      }else{
        return helper.getErrorResponse("OTP_GENERATING_OTP","LOGIN WITH OTP",secret);
      }
}


//################################# Get the dept Escalation contact  ################################################################################################################################################################################################
//###################################################################################################################################################################################################################################################################################################################################
//#######################################################################

async function GetContact(contact){
  let message = 'Error in fetching department escalation contact details';
  let responsecode = "8005";
  //BEGIN VALIDATION 1
  //CHECK IF THE SESSIONTOKEN SIZE IS CORRECT
  if(contact.STOKEN.length>50 || contact.STOKEN.length<30){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","GET CUSTOMER ESCALATION CONTACT DETAILS","");            
  }
   
  //CHECK IF THE SESSIONTOKEN IS VALID
  const [result] = await db.spcall(`CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,contact.STOKEN);
  const objectvalue = result[1][0];
  console.log("contact objectvalue ->"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET CUSTOMER ESCALATION CONTACT DETAILS","");
  }
  // CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT
  if(contact.hasOwnProperty["STOKEN"]==false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","GET CUSTOMER ESCALATION CONTACT DETAILS","");
  }
  //END OF VALIDATION 1.
  //BEGIN VALIDATION 2
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT IF NOT GIVEN AS AN INPUT RETURN THE ERROR
  if(contact.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("CONTACT_PACKAGE_QUERY_MISSING","GET CUSTOMER ESCALATION CONTACT DETAILS","");
  }
  var secret=contact.STOKEN.substring(0,16);
  console.log("secret-->"+secret);
  console.log("customer querystring ->"+contact.querystring);
  var querydata;
  try{ 
     querydata = await helper.decrypt(contact.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("CONTACT_PACKAGE_QUERY_ERROR","GET CUSTOMER ESCALATION CONTACT DETAILS",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("CUST_CONTACT_JSON_ERROR","GET CUSTOMER ESCALATION CONTACT DETAILS",secret);
  }
    let sql=""
    //  C) IF THE CONTACTEMAIL1 IS NOT GIVEN AS INPUT
    if(querydata.contactid == "" || querydata.contactid == null || querydata.hasOwnProperty('contactid') == false){
      return helper.getErrorResponse("DEPT_CONTACT_ID_MISSING","GET CUSTOMER ESCALATION CONTACT DETAILS",secret)
    }
    //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
    sql=`select Dept_id,Name1,Name2,Name3,Contact_mobile1,Contact_mobile2,Contact_mobile3,Contact_Email1,Contact_Email2,Contact_Email3,Emerg_mobile,Emerg_Email,Technical_Email,Technical_contact from deptcontacts where ID in(${querydata.contactid})`;
    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    console.error(`rows==>`, rows);
    const data = helper.emptyOrRows(rows);
    message = 'The department escalation contact Details Fetching successfully';
    responsecode = "807"
    const encrypt = helper.encrypt(JSON.stringify({
      responsecode,
      message,
      data,
     }), secret);
    return encrypt;
}


//#####################################################################################################################################################################################################################
//########################### ADD CUSTOMER ESCALATION CONTACT ########################################################################################################################################################################
//####################################################################################################################################################################################################

async function addescalationcontact(contact){
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(contact.STOKEN.length < 30 || contact.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","ADD BRANCH EMERGENCY CONTACT","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[contact.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","ADD BRANCH EMERGENCY CONTACT","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(contact.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","ADD BRANCH EMERGENCY CONTACT","");
  }
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(contact.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("EMERGENCY_QUERYSTRING_MISSING_ERROR","ADD BRANCH EMERGENCY CONTACT","");
  }
  
  var secret = contact.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // DECRYPT THE QUERYSTRING USING SECRET KEY
  var querydata;
  try{ 
     querydata = await helper.decrypt(contact.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("EMERGENCY_CONTACT_PACKAGE_QUERY_ERROR","ADD BRANCH EMERGENCY CONTACT LIST",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("EMERGENCY_CONTACT_JSON_ERROR","ADD BRANCH EMERGENCY CONTACT LIST",secret);
  }
  // CHECK IF THE CONTACT DEPT ID IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('deptid')==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_DEPT_ID_MISSING","The branch emergency contact department id is missing",secret);
  }
   //CHECK IF THE CONTACT NAME1 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('name1')==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_NAME1_MISSING","The branch emergency contact number is not given as an input",secret);
  }
  // CHECK IF THE CONTACT NAME2 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('name2')==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_NAME2_MISSING","The branch emergency contact name2 is missing",secret);
  }
  // CHECK IF THE CONTACT NAME3 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('name3')==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_NAME3_MISSING","The branch emergency contact number 3 is not given as an input",secret);
  }
  //CHECK IF THE CONTACT PHONE NUMBER1 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('phoneno1')==false){
    return helper.getErrorResponse('EMERGENCY_CONTACT_PHONENO1_MISSING',"The branch emergency contact phone number 1 is missing",secret);
  }
  //CHECK IF THE CONTACT PHONE NUMBER2 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('phoneno2')==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_PHONENO2_MISSING","The branch emergency contact phone number 2 is not given as an input",secret);
  }
  //CHECK IF THE CONTACT PHONE NUMBER3 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('phoneno3')==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_PHONENO3_MISSING","The branch emergency contact phone number 3 is missing",secret);
  }
  //CHECK IF THE EMERGENGY CONTACT EMAILID1 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty("emailid1")==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_EMAILID1_MISSING","The branch emergency contact emailid is not given as an input",secret);
  }

  //CHECK IF THE EMERGENCY CONTACT EMAILID2 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty("emailid2")==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_EMAILID2_MISSING","The customer branch emergency contact emailid2 is not given as an input",secret);
  }

  //CHECK IF THE EMERGENCY CONTACT EMAILID3 IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty("emailid3")==false){
    return helper.getErrorResponse("EMERGENCY_CONTACT_EMAILID3_MISSING","The customer branch emergency emailid3 is not given as an input",secret);
  }

  //ADD THE CUSTOMER BRANCH EMERGENCY CONTACT
 
   const [result1] = await db.spcall('CALL SP_ESCA_CONTACT_ADD(?,?,?,?,?,?,?,?,?,?,?,@contactid); select @contactid',[querydata.deptid,querydata.name1,querydata.phoneno1,querydata.emailid1,
    querydata.name2,querydata.emailid2,querydata.phoneno2,querydata.name3,querydata.phoneno3,querydata.emailid3,userid]);
   const objectvalue2 =result1[1][0];
   let contactid = objectvalue2["@contactid"];
   console.log("Emergency id value ->"+contactid);
   if(contactid != null){
    return helper.getSuccessResponse("EMERGENCCY_CONTACT_ADDED_SUCCESSFULLY","The customer branch emergency contact was added successfully",contactid,secret);
   }
   else{
    return helper.getErrorResponse("BRANCH_EMERGENCY_CONTACT_ADDED_FAILED","Error while adding the Customer branch emergency contact list",secret);
   }
}



//######################################################################################################################################################################################################
//############################# DELETE CONTACT #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function DeleteEscalationContact(contact) {
  message = 'Error while deleting customer escalation contact';
  responsecode = "8005"
  console.log("stoken->"+contact.STOKEN);
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(contact.STOKEN.length < 30 || contact.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","DELETE ESCALATION CONTACT","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[contact.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","DELETE ESCALATION CONTACT","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(contact.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","DELETE ESCALATION CONTACT","");
  }
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(contact.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("QUERYSTRING_MISSING_ERROR","DELETE ESCALATION CONTACT","");
  }
  
  var secret = contact.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  console.log("querystring=>"+contact.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(contact.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("QUERYSTRING_ERROR","DELETE CUSTOMER ESCALATION CONTACT",secret);
  }
  try
  { 
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("QUERYSTRING_JSON_ERROR","DELETE CUSTOMER ESCALATION CONTACT",secret);
  }
 let sql ='';
 //If the customer id is given as input delete the contacts that are available for the  customer
  if(queryData.customerid != '' && queryData.customerid != null && queryData.hasOwnProperty('customerid') == true){
   sql= `DELETE FROM deptcontacts where Dept_ID in(select Dept_ID from deptmaster where Branch_ID IN(select Branch_ID from branchmaster where Customer_ID =${queryData.customerid}))`;
  }
  //IF the branchid  is given as input delete the contacts that are available for the customer
  else if(queryData.branchid != ''  && queryData.branchid != null && queryData.hasOwnProperty('branchid') == true){
    sql= `DELETE FROM deptcontacts where Dept_ID in(select Dept_ID from deptmaster where Branch_ID  In(${queryData.branchid})`;
  }
  //IF the department id is given as an input delete the contacts that are available for that department
  else if(queryData.deptid != ''  && queryData.deptid != null && queryData.hasOwnProperty('deptid') == true){
    sql= `DELETE FROM deptcontacts where Dept_ID IN(${queryData.deptid})`;
  }
  // if the contact id is given as an input delete the contacts that are available for that partiucular contacts
  else if(queryData.contactid != ''  && queryData.contactid != null && queryData.hasOwnProperty('contactid') == true){
     if(queryData.escalationtype == 'Escalation 1'){
     sql = `UPDATE deptcontacts SET Name1 = null, Contact_mobile1 = null, Contact_Email1 = null WHERE ID = ${queryData.contactid}`;
     }else if(queryData.escalationtype == 'Escalation 2'){
      sql = `UPDATE deptcontacts SET Name2 = null, Contact_mobile2 = null, Contact_Email2 = null WHERE ID = ${queryData.contactid}`;
      }else if(queryData.escalationtype == 'Escalation 3'){
        sql = `UPDATE deptcontacts SET Name3 = null, Contact_mobile3 = null, Contact_Email3 = null WHERE ID = ${queryData.contactid}`;
        }
  }
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows); 
  // if the rows is deleted then give the 
  if(rows.affectedRows){
    message = 'Customer Escalation contact deleted successfully';
    responsecode = "807";
  }
  else{
    message = 'Error while deleting the Escalation contact';
    responsecode = '8007';
  }
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message
  }), secret);
  return encrypt;
}

module.exports = {
  create,
  update,
  deletedata,
  getMultiple,
  createSendOTP,
  createSendEmailOTP,
  createSendMobileOTP,
  verifyEmailOTP,
  verifyMobileOTP,
  createsendMobileOTP,
  createsendEmailOTP,
  GetContact,
  addescalationcontact,
  DeleteEscalationContact,
}