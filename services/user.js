const db = require('./db');
const helper = require('../helper');
const config = require('../config');
const md5 = require('md5');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
var nodemailer = require('nodemailer');
const uploadFile = require("./middleware");
const mailer = require('../mailer');
// const smsClient = require('../smsclient');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

async function loginOld(loginuser){
  let uid=0;
  let utype=0;
  let u_name="";
  let cid=0;
  let message = "Error in user login"
  let rescode = "101"
  let TOKEN = ""
  // const result = await db.query('CALL apiCloudLoginCheck("'+loginuser.username+'","'+loginuser.password+'",@uid,@utype,@u_name,@cid);');  
  const result = await db.query('select user_id,customer_id,user_type from usermaster where username="'+loginuser.username+'" and password="'+loginuser.password+'";');  
	if (result[0]) 
  {
    console.error(`Result data==>`, result[0].user_id);
	  const token = jwt.sign({id:result[0].user_id},'the-super-strong-secrect',{ expiresIn: '24h' });
	  const result1 = db.query(
              'CALL AddUserToken('+result[0].user_id+',"'+token+'");'
          );
      let userid=result[0].user_id;
      TOKEN = token;
      message = 'User Login successful';
      return {rescode,message,TOKEN,userid};
  }
  else
  {
    rescode = 1001;
    message = 'User Login failed. Please check username/password';
    return {rescode,message};
  }  
}

//####################################################################################################################################################################################################
//####################   LOGIN WITH PASSWORD   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to customer to login with password
//Input data
//   {
//    "querystring":"656e15ce-b442-11ed-997a-b42e9923475f"
//    }
//Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Check if the input is email id or user name
//         3a. Email/username is entered,less than 5 char length
//         3b. password is entered and less than 8 and greater than 15
//      4. Check if the username & Password is matched
//      5. Create UserLog table records with SESSIONTOKEN and updated the client IP
//      6. Create UserLog table records with SESSIONTOKEN
//####################################################################################################################################################################################################
async function login(user,clientIp){
  //Begin Validation 1. API Key checking
  try{
    if(user.hasOwnProperty('APIKey') == false){
      return helper.getErrorResponse(false,"Api key missing. Please provide the API key","LOGIN","");
    }
    if(user.hasOwnProperty('Secret') == false){
      return helper.getErrorResponse(false,"Secret key missing. Please provide the Secret key","LOGIN","");
    }
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  // console.log("user.APIKey=>"+user.APIKey);
  // console.log("user.Secret=>"+user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse(false,"API key Invalid. Please provide the valid API key","LOGIN",user.Secret);
  }
  //End of Validation 1

  //Begin Validation 2. decrypt querystring data
  // console.log("querystring=>"+user.querystring);
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(user.querystring,user.Secret));
    // console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse(false,"Querystring Invalid. Please provide the valid querystring","LOGIN",user.Secret);
  }
  //End of Validation 2
var utype  = 3;
  //Validation RULE 3. Check if the inout is email id or user name
  var isEmailID = false;
  var isphone = false;
  if (queryData.username.indexOf('.') !== -1 || queryData.username.indexOf('@') !== -1) {
    utype =1;
    isEmailID = true;
} else {
    // Example regular expressions for checking phone numbers:
    var phonePattern1 = /^[0-9]{10}$/; // Matches 10-digit phone numbers.
    var phonePattern2 = /^\+\d{1,3}\s?\d{10}$/; // Matches international phone numbers like +123 456789012.

    if (phonePattern1.test(queryData.username) || phonePattern2.test(queryData.username)) {
        isphone = true;
        utype = 0;
    } else {
        utype = 2;
        isEmailID = false;
    }}
  //End of Validation RULE 3. Check if the inout is email id or user name
  //Begin Validation:- 3a. Email/username is entered,less than 5 char length
  if (queryData.username.length<5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse(false,"Invalid credentials. Please verify your username.","LOGIN",user.Secret);
    else
      return helper.getErrorResponse(false,"Invalid email. Please verify your email address and try again.","LOGIN",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered

  //Begin Validation:- 3b. password is entered and less than 8 and greater than 15
  if (queryData.password.length< 5 || queryData.password.length>30)
  {
    return helper.getErrorResponse(false,"Invalid password. Please check your password and try again.","LOGIN",user.Secret);
  }
  //End of Validation:- 3b Email/username is entered

  var userid,customerid,useraccess,userdesign;
  //Validation RULE 4. Check if the username & Password is matched
  const [result3] = await db.spcall('CALL SP_USER_EP_EXIST(?,?,@result,@name1,@custid,@useraccess,@userdesign);select @result,@name1,@custid,@useraccess,@userdesign;',[queryData.username,utype]);
  const objectValue3 = result3[1][0];
  // console.log("Login, objectValue->"+objectValue3["@result"]);
  if (objectValue3["@result"]==null) {    
      return helper.getErrorResponse(false,"User does not exist. Please register or verify your credentials.","LOGIN",user.Secret);
  }else{
    username = objectValue3["@name1"];
    userid = objectValue3["@result"];
    customerid = objectValue3["@custid"];
    useraccess = objectValue3["@useraccess"];
    userdesign = objectValue3["@userdesign"];
  }

  const [result1] = await db.spcall('CALL SP_USER_EXIST(?,?,?,@result);select @result;',[queryData.username,queryData.password,utype]);
  const objectValue = result1[1][0];
  // console.log("Login, objectValue->"+objectValue["@result"]);
  if (objectValue["@result"]==null) {    
      return helper.getErrorResponse(false,"Incorrect password. Please verify your password and try again.","LOGIN",user.Secret);
  }
  else
  {
    console.log("Login, result->"+objectValue["@result"]);
    const [result2] = await db.spcall('CALL SP_USER_LOGIN(?,?,@result);select @result;',[objectValue["@result"],clientIp]);
    const objectValue1 = result2[1][0];
    const SESSIONTOKEN = objectValue1["@result"];
    // console.log("Login,SESSIONTOKEN->"+objectValue1["@result"]);
    try
    {
      const returnstr = JSON.stringify({code:true,message:'Login successfull',userid,username,customerid,userdesign,useraccess,SESSIONTOKEN});
      if (user.Secret!="")
      {

        const encryptedResponse = helper.encrypt(returnstr,user.Secret);
        // console.log("returnstr=>"+JSON.stringify(encryptedResponse));
        return {encryptedResponse};
      }
      else
      {
        return ({code:true,message:'Login successfull',userid,username,customerid,userdesign,useraccess,SESSIONTOKEN});
      }
    }
    catch(Ex)
    {
      return ({code:true,message:'Login successfull',userid,username,userdesign,useraccess,SESSIONTOKEN});
    }
    // return helper.getSuccessResponse(true,"Login successfull",objectValue1["@result"],user.Secret);
  }
}catch(er){
  return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,user.Secret);
}
  //End of Validation RULE 4. Check if the username & Password is matched
}

//####################################################################################################################################################################################################
//####################   LOGIN WITH PASSWORD   #######################################################################################################################################################
//####################################################################################################################################################################################################


async function isuserexist(loginuser){

  const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const userRegexp1 = /^[a-zA-Z0-9.!#@$%&'*+/=?^_`{|}~-]+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const phoneno = /^[0-9.!#@$%&'*+/=?^_`{|}~-]+[0-9](?:[0-9-]{0,61}[0-9])?(?:\.[0-9](?:[0-9-]{0,61}[0-9])?)*$/;
  var mobstr = loginuser.uem;
  const IsValidPhone = mobstr.match(phoneno);
  const IsValidUser = mobstr.match(userRegexp1);
  const IsValidEmail = mobstr.match(emailRegexp);
  console.log("User validate"+IsValidUser);
  console.log("Email validate"+IsValidEmail);
  console.log("Phone validate"+IsValidPhone);

  const result = await db.query('select user_id,customer_id,user_type from usermaster where username="'+loginuser.uem+'" or Email_ID="'+loginuser.uem+'" or Phone="'+loginuser.uem+'";');  
  console.error(`Result data==>`, result[0]);
  message = 'Invalid input';
	if (result[0]) 
  {
    rescode = 1002;
    console.error(`Result data==>`, result[0].user_id);
    if (IsValidUser)
      message = 'User exist';
    if (IsValidPhone)
      message = 'Phone exist';
    if (IsValidEmail)
      message = 'Email exist';

      return {rescode,message};
  }
  else
  {
    rescode = 102;
    if (IsValidUser)
    {
      if (mobstr.length<8 || mobstr.length>25)
        message = 'Invalid User';
      else
        message = 'User does not exist';
    }
    if (IsValidEmail)
      message = 'Email does not exist';
    if (IsValidPhone)
    {
      if (mobstr.length<8 || mobstr.length>15)
        message = 'Invalid Phonenumber';
      else
        message = 'Phone does not exist';
    }
    return {rescode,message};
  }  
}



//####################################################################################################################################################################################################
//####################   LOGIN WITH PASSWORD   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to customer to login with password
//Input data
//   {
//    "querystring":"656e15ce-b442-11ed-997a-b42e9923475f"
//    }
//Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Check if the input is email id or user name
//         3a. Email/username is entered,less than 5 char length
//         3b. password is entered and less than 8 and greater than 15
//      4. Check if the username & Password is matched
//      5. Create UserLog table records with SESSIONTOKEN and updated the client IP
//      6. Create UserLog table records with SESSIONTOKEN
//####################################################################################################################################################################################################
async function login1(user,clientIp){
  //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  console.log("user.APIKey=>"+user.APIKey);
  console.log("user.Secret=>"+user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","REGISTER",user.Secret);
  }
  //End of Validation 1

  //Begin Validation 2. decrypt querystring data
  console.log("querystring=>"+user.querystring);
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(user.querystring,user.Secret));
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("REG_QUERY_ERROR","REGISTER",user.Secret);
  }
  //End of Validation 2
var utype  = 3;
  //Validation RULE 3. Check if the inout is email id or user name
  var isEmailID = false;
  var isphone = false;
  if (queryData.username.indexOf('.') !== -1 || queryData.username.indexOf('@') !== -1) {
    utype =1;
    isEmailID = true;
} else {
    // Example regular expressions for checking phone numbers:
    var phonePattern1 = /^[0-9]{10}$/; // Matches 10-digit phone numbers.
    var phonePattern2 = /^\+\d{1,3}\s?\d{10}$/; // Matches international phone numbers like +123 456789012.

    if (phonePattern1.test(queryData.username) || phonePattern2.test(queryData.username)) {
        isphone = true;
        utype = 0;
    } else {
        utype = 2;
        isEmailID = false;
    }}
  //End of Validation RULE 3. Check if the inout is email id or user name
  //Begin Validation:- 3a. Email/username is entered,less than 5 char length
  if (queryData.username.length<=5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_INVALID_USER","LOGIN",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_INVALID_EMAIL","LOGIN",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered

  //Begin Validation:- 3b. password is entered and less than 8 and greater than 15
  if (queryData.password.length<8 || queryData.password.length>15)
  {
    return helper.getErrorResponse("LOGIN_INVALID_PASSWORD","LOGIN",user.Secret);
  }
  //End of Validation:- 3b Email/username is entered

  
  //Validation RULE 4. Check if the username & Password is matched
  const [result3] = await db.spcall('CALL SP_USER_EP_EXIST(?,?,@result,@name1);select @result,@name1;',[queryData.username,utype]);
  const objectValue3 = result3[1][0];
  console.log("Login, objectValue->"+objectValue3["@result"]);
  if (objectValue3["@result"]==null) {    
    if (isEmailID==false && isphone == false)
      return helper.getErrorResponse("LOGIN_USER_NOT_EXIST","LOGIN",user.Secret);
    else if(isphone == false && isEmailID== true)
      return helper.getErrorResponse("LOGIN_EMAIL_NOT_EXIST","LOGIN",user.Secret); 
    else{
      return helper.getErrorResponse("LOGIN_PHONE_NOT_EXIST","LOGIN",user.Secret);
    }
  }

  const [result1] = await db.spcall('CALL SP_USER_EXIST(?,?,?,@result);select @result;',[queryData.username,queryData.password,utype]);
  const objectValue = result1[1][0];
  console.log("Login, objectValue->"+objectValue["@result"]);
  if (objectValue["@result"]==null) {    
      return helper.getErrorResponse("LOGIN_PASSWORD_ERROR","LOGIN",user.Secret);
  }
  else
  {
    console.log("Login, result->"+objectValue["@result"]);
    const [result2] = await db.spcall('CALL SP_USER_LOGIN(?,?,@result);select @result;',[objectValue["@result"],clientIp]);
    const objectValue1 = result2[1][0];
    console.log("Login,SESSIONTOKEN->"+objectValue1["@result"]);
    return helper.getSuccessResponse("USER_LOGIN_SUCCESS",objectValue1["@result"],"login success",user.Secret);
  }
  //End of Validation RULE 4. Check if the username & Password is matched
}

//####################################################################################################################################################################################################
//####################   LOGIN WITH OTP   #########################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to customer to login with password
//Input data
//   {
//    "querystring":"656e15ce-b442-11ed-997a-b42e9923475f"
//    }
//Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Check if the input is email id or user name
//         3a. Valid email should be entered
//         3b. Valid phone numger should be entered
//      4. Check if the Email or Phone number is exist
//      4a. Phone / Email exist in the activation table but not verified
//      5. Generate 6 numeric digit OTP
//      6. Send response
//####################################################################################################################################################################################################
async function loginwithotp(user){
  //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","REGISTER",user.Secret);
  }
  //End of Validation 1

  //Begin Validation 2. decrypt querystring data
  console.log("querystring=>"+user.querystring);
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(user.querystring,user.Secret));
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("REG_QUERY_ERROR","REGISTER",user.Secret);
  }
  //End of Validation 2

  //Validation RULE 3. Check if the inout is email id or user name
  var isEmailID = false;
  if (queryData.username.indexOf('.')==-1 || queryData.username.indexOf('@')==-1)
  {
    isEmailID = false;
  }
  else
  {
    isEmailID = true;
  }
  //End of Validation RULE 3. Check if the inout is email id or phone number
  //Begin Validation:- 3a. Email/Phone is entered,less than 5 char length
  if (queryData.username.length<5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_INVALID_USER","LOGIN",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_INVALID_EMAIL","LOGIN",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered
  var utype = 1;
  if (isEmailID==false) //Phone number is given
  {
    utype = 2;
    //Begin Validation:- 3b. Valid phone numger should be entered
    if (queryData.username.length>15 || queryData.username.length<8)
    {
      return helper.getErrorResponse("REG_PHONE_SIZE_ERROR","REGISTER",user.Secret);
    }
    if (helper.phonenumber(queryData.username)) {
        console.log("Valid");
    } else {
      return helper.getErrorResponse("REG_PHONE_VALID_ERROR","REGISTER",user.Secret);
        console.log("Invalid");
    }
    //End of Validation:- 3b. Valid phone numger should be entered
  }

  
  //Validation RULE 4. Check if the email/phone is matched
  //Validation RULE 4a. Check if the email/phone is not yet verified
  const [result2] = await db.spcall('CALL SP_EP_VERIFY(?,@result);select @result;',[queryData.username]);
  const objectValue2 = result2[1][0];
  console.log("Login, objectValue->"+objectValue2["@result"]);
  if (objectValue2["@result"]==null) {    
    const [result1] = await db.spcall('CALL SP_USER_EP_EXIST(?,?,@result,@name1);select @result,@name1;',[queryData.username,utype]);
    const objectValue = result1[1][0];
    console.log("Login, objectValue->"+objectValue["@result"]);
    if (objectValue["@result"]==null) {
      if (isEmailID==false)
        return helper.getErrorResponse("LOGIN_PHONE_NOT_EXIST","LOGIN",user.Secret);
      else
        return helper.getErrorResponse("LOGIN_EMAIL_NOT_EXIST","LOGIN",user.Secret);
    }
    else
    {
      const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
      const result = await db.query('CALL SP_OTP_VERIFY('+utype+',"'+queryData.username+'",'+otpText+')');   
      EmailSent = await mailer.sendEmail(objectValue["@name1"],queryData.username,"LOGIN OTP","loginotp.html",otpText,"LOGIN_EMAIL_CONF");
      return helper.getSuccessResponse("USER_LOGIN_OTP_SUCCESS","",otpText,user.Secret);
    }
  }
  else
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_PHONE_NOTVERIFIED","LOGIN",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_EMAIL_NOTVERIFIED","LOGIN",user.Secret);
  }

  
  //End of Validation RULE 4. Check if the username & Password is matched
}

async function verifyotplogin(loginuser){
  let uid=0;
  let utype=0;
  let u_name="";
  let cid=0;
  let message = "Error in user login"
  let rescode = "101"
  let TOKEN = ""

  // const result = await db.query('CALL apiCloudLoginCheck("'+loginuser.username+'","'+loginuser.password+'",@uid,@utype,@u_name,@cid);');  
  if (loginuser.mobileno!="")
  {
    const result = await db.query('SELECT * FROM otpverification where otp_type=1 and destination="'+loginuser.mobileno+'" and otp='+loginuser.otp+' order by row_upd_date desc LIMIT 1;');  
    if (result[0]) 
    {
      const resultAPI = await db.query('select user_id,customer_id,user_type from usermaster where Phone="'+loginuser.mobileno+'" order by Row_updated_date desc LIMIT 1;');  
      if (resultAPI[0]) 
      {
        console.error(`Result data==>`, resultAPI[0]);
        const token = jwt.sign({id:resultAPI[0].user_id},'the-super-strong-secrect',{ expiresIn: '24h' });
        const result1 = db.query(
                  'CALL AddUserToken('+resultAPI[0].user_id+',"'+token+'");'
              );
          let userid=resultAPI[0].user_id;
          TOKEN = token;
          message = 'User Login successful';
          return {rescode,message,TOKEN,userid};
      }
      else
      {
        rescode = 1001;
        message = 'User doesnot exist. Please check mobile number';
        return {rescode,message};
      }  
    }
    else
    {
      rescode = 1001;
      message = 'Login OTP was wrong. Please enter correct OTP';
      return {rescode,message};
    }  
  }
  else
  {
    if (loginuser.emailid!="")
    {
      const result = await db.query('SELECT * FROM otpverification where otp_type=2 and destination="'+loginuser.emailid+'" and otp='+loginuser.otp+' order by row_upd_date desc LIMIT 1;');  
      if (result[0]) 
      {
        const resultAPI = await db.query('select user_id,customer_id,user_type from usermaster where email_id="'+loginuser.emailid+'" order by Row_updated_date desc LIMIT 1;');  
        if (resultAPI[0]) 
        {
          console.error(`Result data==>`, resultAPI[0].user_id);
          const token = jwt.sign({id:resultAPI[0].user_id},'the-super-strong-secrect',{ expiresIn: '24h' });
          const result1 = db.query(
                    'CALL AddUserToken('+resultAPI[0].user_id+',"'+token+'");'
                );
            let userid=resultAPI[0].user_id;
            TOKEN = token;
            message = 'User Login successful';
            return {rescode,message,TOKEN,userid};
        }
        else
        {
          rescode = 1001;
          message = 'User doesnot exist. Please check your email id';
          return {rescode,message};
        }  
      }
      else
      {
        rescode = 1001;
        message = 'Login OTP was wrong. Please enter correct OTP';
        return {rescode,message};
      }  
    }
  }
}

async function register(registeruser){  
  let message = "Error in user registration"
  let responsecode = "102"
  let TOKEN = ""
  const result = await db.query('CALL adduser("'+registeruser.name+'",'+registeruser.customerid+','+registeruser.root+',"'+registeruser.emailid+'","'+registeruser.password+'","'+registeruser.username+'",'+registeruser.usertype+','+registeruser.webid+')');  
	if (result.affectedRows) 
  {
      message = 'User registered successfully';
  }
  return {responsecode,message};
}

async function getUserdetails(usrdata){
  let message = "Error in get user details"
  let responsecode = "104"
  let Customer_Name=""
  let Email_ID=""
  let Admin_username=""
  let Password=""
  let Contact_No=""
  let Address=""
  //API Key validation
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+usrdata.userid+' and token="'+usrdata.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
	if (resultAPI.length == 0) 
  {
    responsecode = "1004"
    message = "Invalid TOKEN";
    return{responsecode,message}
  }
  else
  {
    const result = await db.query('select user_id,customer_id,user_type,name,email_id,username,password from usermaster where user_id='+usrdata.userid+';');  
    console.error(`Result data==>`, result[0].user_id);
    if (result[0]) 
    {
        Customer_Name=result[0].name;
        Email_ID=result[0].email_id;
        Admin_username=result[0].username;
        Password=result[0].password;
        message = "Profile is not updated"

        if (result[0].customer_id!=0)
        {
          const result1 = await db.query('select Customer_Name,Email_ID,Admin_username,Password,Contact_No,Address from customermaster where Customer_ID='+result[0].customer_id+';');  
          console.error(`Result data==>`, result1[0]);
          if (result1[0]) 
          {
            Customer_Name=result1[0].Customer_Name;
            Email_ID=result1[0].Email_ID;
            Admin_username=result1[0].Admin_username;
            Password=result1[0].Password;
            Contact_No=result1[0].Contact_No;
            Address=result1[0].Address;
          }      
          message = 'User details given successfully';
        }
        else
        {
          const result1 = await db.query('select Customer_Name,Email_ID,Admin_username,Password,Contact_No,Address from customermaster where created_by='+usrdata.userid+';');  
          console.error(`Result data==>`, result1[0]);
          if (result1[0]) 
          {
            Customer_Name=result1[0].Customer_Name;
            Email_ID=result1[0].Email_ID;
            Admin_username=result1[0].Admin_username;
            Password=result1[0].Password;
            Contact_No=result1[0].Contact_No;
            Address=result1[0].Address;
          }      
          message = 'User details given successfully';
        }
    }
    return {responsecode,message,Customer_Name,Email_ID,Admin_username,Contact_No,Address};
  }
}

async function createUser(user){
  let message = 'Error in creating new user';
  let responsecode = "1005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL adduser("'+user.username+'",'+user.customerid+','+user.deptid+',"'+user.email+'","'+user.password+'","'+user.name+'",'+user.usertype+','+user.userid+')');

  if (result.affectedRows) {
    responsecode = "105"
    message = 'New user created successfully';
  }
  return {responsecode,message};
}

async function updateUser(user){
  let message = 'Error in updating new user';
  let responsecode = "1006"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1006"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('update usermaster set username="'+user.username+'",customer_id='+user.customerid+',dept_id='+user.deptid+',email_id="'+user.email+'",password="'+user.password+'",name="'+user.name+'",user_type='+user.usertype+',created_by='+user.userid+' where user_id='+user.id);

  if (result.affectedRows) {
    responsecode = "106"
    message = 'User data updated successfully';
  }
  return {responsecode,message};
}


async function updatepassword(user){
  let message = 'Error in updating new user';
  let responsecode = "1006"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1006"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('update usermaster set password="'+user.password+'" where user_id='+user.userid);

  if (result.affectedRows) {
    responsecode = "106"
    message = 'User password updated successfully';
  }
  return {responsecode,message};
}

async function setpassword(user){
    // const result1 = db.query(
    //   'CALL setpassword("'+user.uem+'","'+user.password+'",@result);'
    // );
    const [result1] = await db.spcall('CALL setpassword(?,?,@result);select @result;',[user.uem,user.password]);
    console.error(`Result data==>`, result1[1]);
    
      if (result1[1]!=null) {
        let responsecode = "1201"
        message = 'User password updated successfully';
        data =result1[1];
        return {responsecode,message,data};
      }
      else
      {
        let responsecode = "1201"
        message = 'Error in new password';
        return {responsecode,message};

      }
    // let responsecode = "1201"
    // message = 'User password updated successfully';
    // const [result] = await db.spcall('CALL setpassword(?,?,@result);select @result;',[user.uem,user.password]);
    // data = result;
    // return {responsecode,message,data};
}

async function deleteUser(user){
  let message = 'Error in deleting new user';
  let responsecode = "1007"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1007"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('delete from usermaster where user_id='+user.id);

  if (result.affectedRows) {
    responsecode = "107"
    message = 'User deleted successfully';
  }
  return {responsecode,message};
}

async function createSendOTP(user){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result = await db.query('CALL addotpverification(1,"'+user.mobile+'",'+otpText+')');
  //sendSMS(contact.mobile,otpText);

  const otpText1 = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result1 = await db.query('CALL addotpverification(2,"'+user.email+'",'+otpText+')');

  if (result1.affectedRows) {
    responsecode = "135"
    message = 'Email/Mobile OTP sent successfully';
  }

  return {responsecode,message};
}

async function createSendMobileOTP(user){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result = await db.query('CALL addotpverification(1,"'+user.mobile+'",'+otpText+')');
  sendSMS(user.mobile,otpText);

  if (result.affectedRows) {
    responsecode = "135"
    message = 'Mobile OTP sent successfully';
  }

  return {responsecode,message};
}

async function createSendEmailOTP(user){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
  const result = await db.query('CALL addotpverification(2,"'+user.email+'",'+otpText+')');
  sendEmail(user.email,otpText,user.companyname);
  if (result.affectedRows) {
    responsecode = "135"
    message = 'Email OTP sent successfully';
  }

  return {responsecode,message};
}


async function verifyMobileOTP(user){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL checkotp(1,?,?,@result);select @result;',[user.mobile,user.OTP]);
  data = result[1];
  return {responsecode,message,data};
}

async function verifyEmailOTP(user){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1305"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1305"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL checkotp(2,?,?,@result);select @result;',[user.email,user.OTP]);
  data = result[1];
  return {responsecode,message,data};
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
fs.readFile(templateDir+'/forgetpassword.html', 'utf8' , (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  var ts = Date.now();console.log(ts+data)
  html = data;
})

html = html.replace("{{ subject }}",'Email OTP Verification');
html = html.replace("{{ msg }}",'You have been requested for changing new Password. Please verify your otp given below.');
html = html.replace("{{ otp }}",otptext);
html = html.replace("{{ link }}",'#');
html = html.replace("{{ welcome }}",'Hi');
// html = jade.renderFile(templateDir+'/newcustomerotp.html', {subject: 'Email OTP Verification',msg: 'You have been registered with Sporada Secure for e-Surveillance. Please verify your otp given below with our executive.',otp: otptext,link: 'https://docs.google.com/gview?embedded=true&url=#',welcome:'Hi',Companyname:companyname});

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

async function uploadadhaar(req,res){
  try {
    await uploadFile(req, res);
    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }
    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
}

async function uploadadhaardetails(user)
{ 
  try {
    let message = 'Error in creating user adhaar details';
    let responsecode = "1306"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "1301"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    
    const result = await db.query('CALL AddUserAdhaarDetails('+user.userid+',"'+user.adhaarnumber+'","'+user.adhaarname+'", "'+user.adhaardob+'")');

    if (result.affectedRows) { 
      responsecode = "136"
      message = 'Adhaar was uploaded successfully';
    }
  
    return {responsecode,message};
  
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
}

async function uploadpan(req,res){
  try {
    await uploadFile(req, res);
    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }
    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
}

async function uploadpandetails(user)
{
  try {
    let message = 'Error in creating user pan details';
    let responsecode = "1306"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "1301"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    
    const result = await db.query('CALL AddUserPanDetails('+user.userid+',"'+user.pannumber+'","'+user.panname+'", "'+user.pandob+'")');

    if (result.affectedRows) {
      responsecode = "136"
      message = 'User Pancard was uploaded successfully';
    }
  
    return {responsecode,message};
  
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
}


async function forgotpassword(user){
  let message = 'Error in sending OTP to contact';
  let responsecode = "1307"
  if (user.username!="")
  {
    const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
    const result = await db.query('CALL addotpverification(1,"'+user.mobile+'",'+otpText+')');
    const otpText1 = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
    const result1 = await db.query('CALL 	addotpverification(2,"'+user.email+'",'+otpText1+')');
    sendEmail(user.email,otpText,"Sporada");
    sendEmail(user.mobile,otpText1,"Sporada");
    if (result.affectedRows || result1.affectedRows) {
      responsecode = "137"
      message = 'Mobile/Email OTP sent successfully';
    }
  }
  else if (user.mobileno!="")
  {
    const otpText = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphasbets:false,specialChars:false});
    const result = await db.query('CALL	addotpverification(1,"'+user.mobile+'",'+otpText+')');
   sendEmail(user.mobile,otpText,"Sporada");
    if (result.affectedRows) {
      responsecode = "137"
      message = 'Mobile OTP sent successfully';
    }
  }
  else if (user.emailid!="")
  {
    const otpText1 = otpGenerator.generate(6, { digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false});
    const result1 = await db.query('CALL addotpverification(2,"'+user.email+'",'+otpText1+')');
    sendEmail(user.email,otpText1,"Sporada");
    if (result1.affectedRows) {
      responsecode = "135"
      message = 'Email OTP sent successfully';
    }
  }
  return {responsecode,message};
}

async function getSiteDashboard(user){
  let message = 'Error in fetching report list';
  let responsecode = "1101"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1101"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL getsitereport(?,?,@cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@site_name,@site_addr,@scity,@sstate,@rno,@totsites,@cpincode,@spincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@cust_id,@custcode,@emailid,@phone);select @cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@site_name,@site_addr,@scity,@sstate,@rno,@totsites,@cpincode,@spincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@cust_id,@custcode,@emailid,@phone;',[user.branchid,user.reportdate]);
  data = result[1];

  const [result1] = await db.spcall('CALL getSiteNVRDVR(?,@totNVR,@totDVR);select @totNVR,@totDVR;',user.branchid);
  NVRDVR = result1[1];

  const [result2] = await db.spcall('CALL getSiteCamerasActiveInActive(?,@totCam,@totActive);select @totCam,@totActive;',user.branchid);
  cameracount = result2[1];

  responsecode = "902"
  message = 'Site report created successfully';
  return {responsecode,message,data,NVRDVR,cameracount};
}

async function getCompanyDashboard(user){
  let message = 'Error in fetching report list';
  let responsecode = "1102";
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+user.userid+' and token="'+user.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1102"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL getsitesummary(?,?,@cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@rno,@totsites,@cpincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@emailid,@phone,@custcode);select @cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@rno,@totsites,@cpincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@emailid,@phone,@custcode;',[user.customerid,user.reportdate]);
  data = result[1];

  const [result1] = await db.spcall('CALL getCompantNVRDVR(?,@totNVR,@totDVR);select @totNVR,@totDVR;',[user.customerid]);
  data1 = result1[1];

  responsecode = "112"
  message = 'Summary report created successfully';
  return {responsecode,message,data,data1};
}
//#####################################################################################################################################################################################3#
//######################################################################################################################################################################################
//3########################################################################################################################################################################################

async function loginforgotpassword(user){
  //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","FORGOT PASSWORD",user.Secret);
  }
  //End of Validation 1
// decrypt the querystring
  if(user.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("PACKAGE_QUERYSTRING_MISSING","CUSTOMER FORGOT PASSWORD",user.Secret);
  }
  //Begin Validation 2. decrypt querystring data
  console.log("querystring=>"+user.querystring);
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(user.querystring,user.Secret));
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("REG_QUERY_ERROR","USER FORGOT PASSWORD",user.Secret);
  }
  //End of Validation 2

  //Validation RULE 3. Check if the inout is email id or user name
  var isEmailID = false;
  if (queryData.username.indexOf('.')==-1 || queryData.username.indexOf('@')==-1)
  {
    isEmailID = false;
  }
  else
  {
    isEmailID = true;
  }
  //End of Validation RULE 3. Check if the inout is email id or phone number
  //Begin Validation:- 3a. Email/Phone is entered,less than 5 char length
  if (queryData.username.length<5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_INVALID_USER","USER FORGOT PASSWORD",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_INVALID_EMAIL","USER FORGOT PASSWORD",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered
  var utype = 1;
  if (isEmailID==false) //Phone number is given
  {
    utype = 0;
    //Begin Validation:- 3b. Valid phone numger should be entered
    if (queryData.username.length>15 || queryData.username.length<8)
    {
      return helper.getErrorResponse("REG_PHONE_SIZE_ERROR","USER FORGOT PASSWORD",user.Secret);
    }
    if (helper.phonenumber(queryData.username)) {
        console.log("Valid");
    } else {
      return helper.getErrorResponse("REG_PHONE_VALID_ERROR","USER FORGOT PASSWORD",user.Secret);
        console.log("Invalid");
    }
    //End of Validation:- 3b. Valid phone numger should be entered
  }

  //          c) Check the username is given as an input or nots
if(queryData.hasOwnProperty('username')==false){
  return helper.getErrorResponse("LOGIN_USERNAME_MISSING","USER FORGOT PASSWORD",user.Secret);
}
var isEmailID = false;
  if (queryData.username.indexOf('.')==-1 || queryData.username.indexOf('@')==-1)
  {
    isEmailID = false;
  }
  else
  {
    isEmailID = true;
  }
  //End of Validation RULE 3. Check if the inout is email id or phone number
  //Begin Validation:- 3a. Email/Phone is entered,less than 5 char length
  if (queryData.username.length<5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_INVALID_USER","USER FORGOT PASSWORD",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_INVALID_EMAIL","USER FORGOT PASSWORD",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered
  var utype = 1;
  if (isEmailID==false) //Phone number is given
  {
    utype = 2;
    //Begin Validation:- 3b. Valid phone numger should be entered
    if (queryData.username.length>15 || queryData.username.length<8)
    {
      return helper.getErrorResponse("REG_PHONE_SIZE_ERROR","USER FORGOT PASSWORD",user.Secret);
    }
    if (helper.phonenumber(queryData.username)) {
        console.log("Valid");
    } else {
      return helper.getErrorResponse("REG_PHONE_VALID_ERROR","USER FORGOT PASSWORD",user.Secret);
        console.log("Invalid");
    }
    //End of Validation:- 3b. Valid phone numger should be entered
  }
  const [result2] = await db.spcall('CALL SP_EP_VERIFY(?,@result);select @result;',[queryData.username]);
  const objectValue2 = result2[1][0];
  console.log("Login, objectValue->"+objectValue2["@result"]);
  if (objectValue2["@result"]!=null) {    
    const [result1] = await db.spcall('CALL SP_USER_EP_EXIST(?,?,@result,@name1);select @result,@name1;',[queryData.username,utype]);
    const objectValue = result1[1][0];
    console.log("Login, objectValue->"+objectValue["@result"]);
    if (objectValue["@result"]==null) {
      if (isEmailID==false)
        return helper.getErrorResponse("LOGIN_PHONE_NOT_EXIST","USER FORGOT PASSWORD",user.Secret);
      else
        return helper.getErrorResponse("LOGIN_EMAIL_NOT_EXIST","USER FORGOT PASSWORD",user.Secret);
    }
    else
    {
      if(isEmailID == true){
        const [result] =  await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',['0',queryData.username]);  
        const objectvalue = result[1][0];
        const otpText = objectvalue["@result"];
        console.log("otp email->"+otpText);
        if(otpText != null){
        EmailSent = await mailer.sendEmail(objectValue["@name1"],queryData.username,"Forgot password","forgetpassword.html",otpText,"LOGIN_FORGET_PASSWORD");
        return helper.getSuccessResponse("USER_LOGIN_OTP_SUCCESS","",otpText,user.Secret);
        }else{
          return helper.getErrorResponse("ERROR_GENERATING_OTP","USER FORGOT PASSWORD",user.Secret)
        }
       }else{
        const [result] =  await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',['1',queryData.username]);  
        const objectvalue = result[1][0];
        const otpText = objectvalue["@result"];
        console.log("otp mobile->"+otpText);
        if(otpText != null){
          console.log("phone no ->"+ queryData.username);
        smsClient.sendSMS("sporad",queryData.username,"2",otpText);
        return helper.getSuccessResponse("USER_LOGIN_OTP_SUCCESS","",otpText,user.Secret);
        }else{
          return helper.getErrorResponse("ERROR_GENERATING_OTP","USER FORGOT PASSWORD",user.Secret)
        }
       }
      }
    }
    else
    {
      if (isEmailID==false)
        return helper.getErrorResponse("LOGIN_PHONE_NOTVERIFIED","USER FORGOT PASSWORD",user.Secret);
      else
        return helper.getErrorResponse("LOGIN_EMAIL_NOTVERIFIED","USER FORGOT PASSWORD",user.Secret);
    }
  
    //End of Validation RULE 4. Check if the username & Password is matched
  }

//###########################################################################################################################################################################################
//##################################################################################################################################################################################
async function verifyOTP(user){
     //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","VERIFY OTP",user.Secret);
  }
  //End of Validation 1
// decrypt the querystring
  if(user.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","VERIFY OTP",user.Secret);
  }
  console.log("querystring=>"+user.querystring);
  var queryData;
  try 
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(user.querystring,user.Secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","VERIFY OTP",user.Secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_COMPANY_JSON_ERROR","VERIFY OTP",user.Secret);
  }
  //          c) Check the username is given as an input or nots
  if(queryData.hasOwnProperty('username')==false){
    return helper.getErrorResponse("VERIFY_USERNAME_MISSING","VERIFY OTP",user.Secret);
  }
  if(queryData.hasOwnProperty('OTP')== false){
    return helper.getErrorResponse("VERIFY_OTP_MISSING","VERIFY OTP",user.Secret);
  }
  var isEmailID = false;
  var isphone = false;
  var otpresult = 0;
  if (queryData.username.indexOf('.') !== -1 || queryData.username.indexOf('@') !== -1) {
    utype =1;
    isEmailID = true;
} else {
    // Example regular expressions for checking phone numbers:
    var phonePattern1 = /^[0-9]{10}$/; // Matches 10-digit phone numbers.
    var phonePattern2 = /^\+\d{1,3}\s?\d{10}$/; // Matches international phone numbers like +123 456789012.
    if (phonePattern1.test(queryData.username) || phonePattern2.test(queryData.username)) {
        isphone = true;
        utype = 0;
    } 
  }
  if(queryData.username != null){
  const resultAPI = await db.query('select user_id,email_id,phone from usermaster where username="'+queryData.username+'" and status=1;');  
  console.error(`Result data==>`, resultAPI);
  if(isEmailID == true ){
  const [result] = await db.spcall('CALL SP_OTP_CHECK(?,?,?,@result);select @result;',[0,queryData.username,queryData.OTP]);
  const data = result[1][0];
  console.log("otp check ->" + data["@result"]);
   otpresult = data["@result"];
  }else if(isphone == true){
    const [result] = await db.spcall('CALL SP_OTP_CHECK(?,?,?,@result);select @result;',[1,queryData.username,queryData.OTP]);
    const data = result[1][0];
    console.log("otp check ->" + data["@result"]);
    otpresult = data["@result"];
  }
 
  if(otpresult == 1){
    return helper.getSuccessResponse("OTP_VERIFIED_SUCCESSFULLY","THE USER OTP WAS VERIFIED SUCCESSFULLY",otpresult,user.Secret);
  }
  else{
    return helper.getErrorResponse("OTP_VERIFICATION_FAILED","Please enter the correct otp",user.Secret);
   }
 }
}
//###############################################################################################################################################################################################################
//
async function changepassword(user){
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","CUSTOMER UPDATE PASSWORD",user.Secret);
  }
  //End of Validation 1
// decrypt the querystring
  if(user.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("QUERYSTRING_MISSING","CUSTOMER UPDATE PASSWORD",user.Secret);
  }
  console.log("querystring=>"+user.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(user.querystring,user.Secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("QUERYSTRING_PACKAGE_ERROR","CUSTOMER UPDATE PASSWORD",user.Secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("QUERYSTRING_JSON_ERROR","CUSTOMER UPDATE PASSWORD",user.Secret);
  }
  //          c) Check the username is given as an input or nots
  if(queryData.hasOwnProperty('username')==false){
    return helper.getErrorResponse("LOGIN_USERNAME_MISSING","CUSTOMER UPDATE PASSWORD",user.Secret);
  }
  if(queryData.hasOwnProperty('password')==false){
    return helper.getErrorResponse("NEW_PASSWORD_MISSING","CUSTOMER UPDATE PASSWORD",user.Secret);
  }
  
 if(queryData.username != null){
  const resultAPI = await db.query('select user_id,email_id,phone from usermaster where username="'+queryData.username+'" and status=1;');  
  console.error(`Result data==>`, resultAPI);
  const user_id = resultAPI[0].user_id;
  if(resultAPI[0].email_id != null){
       const [result] = await db.spcall('CALL SP_UPDATE_PASSWORD(?,?,@result); select @result;',[queryData.password,resultAPI[0].user_id]);
       const object = result[1][0];
       console.log("password status ->"+object["@result"]);

       if(object["@result"] == 'Password updated successfully'){
        return helper.getSuccessResponse("PASSWORD_UPDATED_SUCCESSFULLY","The New password was updated successfully",queryData.password,user.Secret);
       }
       else{
        return helper.getErrorResponse("PASSWORD_NOT_UPDATED","Error while updating the password",user.Secret);
       }
    }
    else{
      return helper.getErrorResponse("INVALID_USERNAME","PLEASE ENTER THE CORRECT USERNAEM",user.Secret);
    }
   }
 }


 
//####################################################################################################################################################################################################
//####################   LOGIN WITH OTP   #########################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to customer to login with password
//Input data
//   {
//    "querystring":"656e15ce-b442-11ed-997a-b42e9923475f"
//    }
//Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Check if the input is email id or user name
//         3a. Valid email should be entered
//         3b. Valid phone numger should be entered
//      4. Check if the Email or Phone number is exist
//      4a. Phone / Email exist in the activation table but not verified
//      5. Generate 6 numeric digit OTP
//      6. Send response
//####################################################################################################################################################################################################
async function loginWithotp(user){
  //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","Server Error. Please try after sometime.","LOGIN WITH OTP",user.Secret);
  }
  //End of Validation 1

  //Begin Validation 2. decrypt querystring data
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(user.querystring,user.Secret));
  }
  catch(ex)
  {
    return helper.getErrorResponse("LOGIN_QUERYSTRING_ERROR","","LOGIN WITH OTP",user.Secret);
  }
  //End of Validation 2

  //Validation RULE 3. Check if the inout is email id or user name
  var isEmailID = false;
  if (queryData.username.indexOf('.')==-1 || queryData.username.indexOf('@')==-1)
  {
    isEmailID = false;
  }
  else
  {
    isEmailID = true;
  }
  //End of Validation RULE 3. Check if the inout is email id or phone number
  //Begin Validation:- 3a. Email/Phone is entered,less than 5 char length
  if (queryData.username.length<5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_INVALID_USER","LOGIN WITH OTP",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_INVALID_EMAIL","LOGIN WITH OTP",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered
  var utype = 1;
  if (isEmailID==false) //Phone number is given
  {
    utype = 2;
    //Begin Validation:- 3b. Valid phone numger should be entered
    if (queryData.username.length>15 || queryData.username.length<8)
    {
      return helper.getErrorResponse("REG_PHONE_SIZE_ERROR","LOGIN WITH OTP",user.Secret);
    }
    if (helper.phonenumber(queryData.username)) {
        console.log("Valid");
    } else {
      console.log("Invalid");
      return helper.getErrorResponse("REG_PHONE_VALID_ERROR","LOGIN WITH OTP",user.Secret);
    }
    //End of Validation:- 3b. Valid phone numger should be entered
  }

  
  //Validation RULE 4. Check if the email/phone is matched
  //Validation RULE 4a. Check if the email/phone is not yet verified
  const [result2] = await db.spcall('CALL SP_EP_VERIFY(?,@result);select @result;',[queryData.username]);
  const objectValue2 = result2[1][0];
  console.log("Login, objectValue->"+objectValue2["@result"]);
  if (objectValue2["@result"]!=null) {    
    const [result1] = await db.spcall('CALL SP_USER_EP_EXIST(?,?,@result,@name1);select @result,@name1;',[queryData.username,utype]);
    const objectValue = result1[1][0];
    console.log("Login, objectValue->"+objectValue["@result"]);
    if (objectValue["@result"]==null) {
      if (isEmailID==false)
        return helper.getErrorResponse("LOGIN_PHONE_NOT_EXIST","LOGIN WITH OTP",user.Secret);
      else
        return helper.getErrorResponse("LOGIN_EMAIL_NOT_EXIST","LOGIN WITH OTP",user.Secret);
    }
    else
    {
     if(isEmailID == true){
      const [result] =  await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',['0',queryData.username]);  
      const objectvalue = result[1][0];
      const otpText = objectvalue["@result"];
      console.log("otp email->"+otpText);
      if(otpText != null){
      EmailSent = await mailer.sendEmail(objectValue["@name1"],queryData.username,"LOGIN OTP","loginotp.html",otpText,"LOGIN_EMAIL_CONF");
      return helper.getSuccessResponse("USER_LOGIN_OTP_SUCCESS","",otpText,user.Secret);
      }else{
        return helper.getErrorResponse("ERROR_GENERATING_OTP","LOGIN WITH OTP",user.Secret)
      }
     }else{
      const [result] =  await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',['1',queryData.username]);  
      const objectvalue = result[1][0];
      const otpText = objectvalue["@result"];
      console.log("otp mobile->"+otpText);
      if(otpText != null){
        console.log("phone no ->"+ queryData.username);
      smsClient.sendSMS("sporad",queryData.username,"0",otpText);
      return helper.getSuccessResponse("USER_LOGIN_OTP_SUCCESS","",otpText,user.Secret);
      }else{
        return helper.getErrorResponse("ERROR_GENERATING_OTP","LOGIN WITH OTP",user.Secret)
      }
     }
    }
  }
  else
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_PHONE_NOTVERIFIED","LOGIN WITH OTP",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_EMAIL_NOTVERIFIED","LOGIN WITH OTP",user.Secret);
  }

  //End of Validation RULE 4. Check if the username & Password is matched
}


//####################################################################################################################################################################################################
//####################   LOGIN WITH OTP   #########################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to customer to login with password
//Input data
//   {
//    "querystring":"656e15ce-b442-11ed-997a-b42e9923475f"
//    }
//Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Check if the input is email id or user name
//         3a. Valid email should be entered
//         3b. Valid phone numger should be entered
//      4. Check if the Email or Phone number is exist
//      4a. Phone / Email exist in the activation table but not verified
//      5. Generate 6 numeric digit OTP
//      6. Send response
//####################################################################################################################################################################################################
async function VerifyloginWithotp(user,clientIp){
  //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(user.APIKey,user.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function(value) { 
        isValid = value.IsValidAPI;
      },
    function(error) { 
      isValid = 0;
     }
  );  
  if (isValid==0)
  {
    return helper.getErrorResponse("API_KEY_ERROR","LOGIN",user.Secret);
  }
  //End of Validation 1

  //Begin Validation 2. decrypt querystring data
  console.log("querystring=>"+user.querystring);
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(user.querystring,user.Secret));
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("REG_QUERY_ERROR","LOGIN",user.Secret);
  }
  //End of Validation 2

  //Validation RULE 3. Check if the inout is email id or user name
  if(queryData.hasOwnProperty('username')== false || queryData.username ==''){
    return helper.getErrorResponse("LOGIN_USERNAME_MISSING","LOGIN",user.Secret)
  }
  var isEmailID = false;
  if (queryData.username.indexOf('.')==-1 || queryData.username.indexOf('@')==-1)
  {
    isEmailID = false;
  }
  else
  {
    isEmailID = true;
  }
  //End of Validation RULE 3. Check if the inout is email id or phone number
  //Begin Validation:- 3a. Email/Phone is entered,less than 5 char length
  if (queryData.username.length<5)
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_INVALID_USER","LOGIN",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_INVALID_EMAIL","LOGIN",user.Secret);
  }
  //End of Validation:- 3a Email/username is entered
  var utype = 1;
  if (isEmailID==false) //Phone number is given
  {
    utype = 2;
    //Begin Validation:- 3b. Valid phone numger should be entered
    if (queryData.username.length>15 || queryData.username.length<8)
    {
      return helper.getErrorResponse("REG_PHONE_SIZE_ERROR","LOGIN",user.Secret);
    }
    if (helper.phonenumber(queryData.username)) {
        console.log("Valid");
    } else {
      return helper.getErrorResponse("REG_PHONE_VALID_ERROR","LOGIN",user.Secret);
        console.log("Invalid");
    }
    //End of Validation:- 3b. Valid phone numger should be entered
  }
  if(queryData.hasOwnProperty('otp')== false){
    return helper.getErrorResponse('LOGIN_OTP_MISSING',"LOGIN WITH OTP",user.Secret);
  }
  var otpsend ='';
  
  //Validation RULE 4. Check if the email/phone is matched
  //Validation RULE 4a. Check if the email/phone is not yet verified
  const [result2] = await db.spcall('CALL SP_EP_VERIFY(?,@result);select @result;',[queryData.username]);
  const objectValue2 = result2[1][0];
  console.log("Login, objectValue->"+objectValue2["@result"]);
  if (objectValue2["@result"]!=null) {    
    const [result1] = await db.spcall('CALL SP_USER_EP_EXIST(?,?,@result,@name1);select @result,@name1;',[queryData.username,utype]);
    const objectValue = result1[1][0];
    console.log("Login, objectValue->"+objectValue["@result"]);
    if (objectValue["@result"]==null) {
      if (isEmailID==false)
        return helper.getErrorResponse("LOGIN_PHONE_NOT_EXIST","LOGIN",user.Secret);
      else
        return helper.getErrorResponse("LOGIN_EMAIL_NOT_EXIST","LOGIN",user.Secret);
    }
    else
    {
      if(isEmailID == false){
    const [otp] = await db.spcall('CALL SP_OTP_CHECK(?,?,?,@result); select @result;',['1',queryData.username,queryData.otp]);
    const otpv = otp[1][0];
    console.log("otp status->"+otpv["@result"]);
     otpsend = otpv["@result"];
    }
    else{
      const [otp] = await db.spcall('CALL SP_OTP_CHECK(?,?,?,@result); select @result;',['0',queryData.username,queryData.otp]);
    const otpv = otp[1][0];
    console.log("otp status->"+otpv["@result"]);
     otpsend = otpv["@result"];
    }
    if(otpsend == '1'){
    console.log("Login, result->"+objectValue["@result"]);
    const [result2] = await db.spcall('CALL SP_USER_LOGIN(?,?,@result);select @result;',[objectValue["@result"],clientIp]);
    const objectValue1 = result2[1][0];
    console.log("Login,SESSIONTOKEN->"+objectValue1["@result"]);
    return helper.getSuccessResponse("USER_LOGIN_SUCCESS",objectValue1["@result"],"login success",user.Secret);
    }
    else{
       return helper.getErrorResponse("ENTER_CORRECT_OTP","LOGIN WITH OTP",user.Secret);
    }
  }
  }
  else
  {
    if (isEmailID==false)
      return helper.getErrorResponse("LOGIN_PHONE_NOTVERIFIED","LOGIN",user.Secret);
    else
      return helper.getErrorResponse("LOGIN_EMAIL_NOTVERIFIED","LOGIN",user.Secret);
  }

  // End of Validation RULE 4. Check if the username & Password is matched
}


//#######################################################################################################################################################################################
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################

async function Logout(user){
  if (!event.hasOwnProperty('STOKEN')) {
    return helper.getErrorResponse(false, "Login sessiontoken missing", "CUSTOMER UNACKNOELEGED EVENT LIST", "");
  }

  if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
    return helper.getErrorResponse(false, "Login sessiontoken size Invalid", "CUSTOMER UNACKNOELEGED EVENT LIST", "");
  }

  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];

  if (userid == null) {
    return helper.getErrorResponse(false, "Login sessiontoken Invalid. Please provide the valid sessiontoken", "CUSTOMER UNACKNOELEGED EVENT LIST", "");
  }
  try{
  const [result1] = await db.spcall(`CALL SP_USER_LOGOUT(?,@result); select @result`,[user.STOKEN]);
  const data = result1[1][0];
  message = data['@result'];
  return helper.getSuccessResponse();
  }catch(er){

  }
}

//####################################################################################################################################################################################################################################
//#####################################################################################################################################################################################################################################
//#####################################################################################################################################################################################################################################
async function UserEvents(user) {
  if (!user.date) {
      return helper.getErrorResponse("DATE_MISSING", "PLEASE ENTER THE DATE WHICH YOU WANT TO FETCH THE DATA", "");
  }
  // const sql3 = `select * from userreports where reportdate = ${user.date}`;
  // const rows3 = await db.query(sql3);
  // if(rows3 == null && rows3 == ''){
    try{
  const date = new Date(user.date);
  console.log("date ->" + date);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-indexed
  const day = date.getDate().toString().padStart(2, '0');
  // Concatenate components to get the desired format
  const formattedDate1 = `${year}${month}${day}`;
  console.log("Formatted date:", formattedDate1);
  const currentDate = new Date();
  const formattedCurrentDate = currentDate.toISOString().slice(0, 10).replace(/-/g, '');
  console.log("CURRENT DATE ->"+formattedCurrentDate);
  const yesterday = new Date(date);
  yesterday.setDate(date.getDate() - 1);
  const basePath = '\\\\192.168.0.198\\UserAckEvents'
  const formattedDate = date.toISOString().slice(0, 10);
  const tableSuffix = formattedDate.replace(/-/g, '');
  const slot1Filename = `${formattedDate}_slot1.json`;
  const slot2Filename = `${formattedDate}_slot2.json`;
  const slot1FilePath = path.join(basePath, slot1Filename);
  const slot2FilePath = path.join(basePath, slot2Filename);

  const filesExist = fs.existsSync(slot1FilePath) && fs.existsSync(slot2FilePath);
  if (!filesExist) {
  // Time slot for the first query (row-updated_between: yesterday 18:00:00 to yesterday 22:00:00)
  const timeSlot1Start = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 18, 0, 0));
  const timeSlot1End = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 22, 0, 0));

  // Time slot for the second query (row-updated_between: yesterday 22:00:00 to today 06:00:00)
  const timeSlot2Start = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 22, 0, 0));
  const timeSlot2End = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0));

  const formatForSQL = (dateTime) => dateTime.toISOString().slice(0, 19).replace("T", " ");
  var sql ="";
  var sql1 = "";
  if(formattedCurrentDate == formattedDate1){
   sql = `
      SELECT um.Name uname, em.event_id eid, em.event_name alert, el.feedback comments,
      em.row_updated_date edate, el.row_upd_date acknowledged
      FROM eventmaster em, eventlog el, usermaster um
      WHERE um.user_id = el.created_by
      AND em.event_id = el.event_id
      AND el.row_upd_date BETWEEN '${formatForSQL(timeSlot1Start)}' AND '${formatForSQL(timeSlot1End)}'
      ORDER BY el.row_upd_date ASC;`;
  console.error("SQL1 ==> ", sql);

  

   sql1 = `
      SELECT um.Name uname, em.event_id eid, em.event_name alert, el.feedback comments,
      em.row_updated_date edate, el.row_upd_date acknowledged
      FROM eventmaster em, eventlog el, usermaster um
      WHERE um.user_id = el.created_by 
      AND em.event_id = el.event_id
      AND el.row_upd_date BETWEEN '${formatForSQL(timeSlot2Start)}' AND '${formatForSQL(timeSlot2End)}'
      ORDER BY el.row_upd_date ASC;`;

  console.error("SQL2 ==> ", sql1);
  }else{
   sql = `
    SELECT um.Name uname, em.event_id eid, em.event_name alert, el.feedback comments,
    em.row_updated_date edate, el.row_upd_date acknowledged
    FROM eventmaster_${tableSuffix} em, eventlog_${tableSuffix} el, usermaster um
    WHERE um.user_id = el.created_by
    AND em.event_id = el.event_id
    AND el.row_upd_date BETWEEN '${formatForSQL(timeSlot1Start)}' AND '${formatForSQL(timeSlot1End)}'
    ORDER BY el.row_upd_date ASC;`;
console.error("SQL1 ==> ", sql);

 sql1 = `
    SELECT um.Name uname, em.event_id eid, em.event_name alert, el.feedback comments,
    em.row_updated_date edate, el.row_upd_date acknowledged
    FROM eventmaster_${tableSuffix} em, eventlog_${tableSuffix} el, usermaster um
    WHERE um.user_id = el.created_by 
    AND em.event_id = el.event_id
    AND el.row_upd_date BETWEEN '${formatForSQL(timeSlot2Start)}' AND '${formatForSQL(timeSlot2End)}'
    ORDER BY el.row_upd_date ASC;`;

console.error("SQL2 ==> ", sql1);
  }
  const rows = await db.query(sql);
  const rows1 = await db.query(sql1);
  const csvData1 = convertToJSON(rows);
  const csvData2 = convertToJSON(rows1);
  fs.writeFileSync(slot1FilePath, csvData1);
  fs.writeFileSync(slot2FilePath, csvData2);

  return{
   message :'The User acknowledged Event was fetched successfully and file path is given',
   responsecode :"806",
   slot1FilePath,
   slot2FilePath,
  }
}
else{
  return{
      message :'The User acknowledged Event was fetched successfully and file path is given',
      responsecode :"806",
      slot1FilePath,
      slot2FilePath,
     }
  }
}catch(er){
  return helper.getErrorResponse("USER_REPORT_NOT_AVAILABLE","DATA NOT AVAILABLE","");
}
}
// Define a function to convert data to JSON format
function convertToJSON(data) {
  // Convert date strings to Date objects and format them
  const formattedData = data.map(item => ({
      ...item,
      edate: format(new Date(item.edate), 'yyyy-MM-dd HH:mm:ss'),
      acknowledged: format(new Date(item.acknowledged), 'yyyy-MM-dd HH:mm:ss')
  }));

  return JSON.stringify(formattedData, null, 2);
}
function convertToCSV(data) {
  const csvData = Papa.unparse(data);
  return csvData;
}

//#######################################################################################################################################################################################
//#############################################################################################################################################################################################
//###########################################################################################################################################################################################

async function getUserid(user){
  let message = 'Error while fetching the user and customerid';
  let responsecode = "1102";
  if(user.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","GET USER ID","");
  }
   //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
   if(user.STOKEN.length > 50 || user.STOKEN.length  < 30){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET USER ID","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[user.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log(" userid ->"+ userid);
  var secret = user.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET USER ID","");
  }
  const result1 = await db.query(`select user_id ,customer_id from usermaster where User_id  = ${userid} and status =1`);
  if(result.length > 0 && result[0]){
    message = "User id and Customer id Fetched Successfully";
    responsecode = '200';
  const user_id = result1[0].user_id;
  const customer_id = result1[0].customer_id;
  const encrypt = helper.encrypt(JSON.stringify({
    responsecode,
    message,
    user_id,
    customer_id
  }), secret);
  return encrypt;
  }
}

//#######################################################################################################################################################################################
//#############################################################################################################################################################################################
//###########################################################################################################################################################################################


async function GetUserList(user){
  try {
    if (!user.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login sessiontoken missing", "USER LIST", "");
    }

    if (user.STOKEN.length > 50 || user.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login sessiontoken size Invalid", "USER LIST", "");
    }

    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [user.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];

    if (userid == null) {
      return helper.getErrorResponse(false, "Login sessiontoken Invalid. Please provide the Sessiontoken", "USER LIST", "");
    }
    var secret = user.STOKEN.substring(0,16);
    try{
       const result = await db.query(`select user_id, username ,Name from usermaster where status = 1 and User_type = 0 and user_design NOT like 'Normal'`);
       if(result[0]){
         return helper.getSuccessResponse(true,'User list fetched successfully',result,secret)
       } else{
         return helper.getErrorResponse(false,"Error fetching the user list","USER LIST");
       }
    }catch(er){
      return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
    }
  }catch(er){
    return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
  }
}


//#######################################################################################################################################################################################
//#############################################################################################################################################################################################
//###########################################################################################################################################################################################


async function AddUser(user){
  try {
    // Check if the session token exists
    if (!user.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login session token missing. Please provide the Login session token", "CUSTOMER FILTER EVENT LIST", "");
    }
    
    // Validate session token length
    if (user.STOKEN.length > 50 || user.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login session token size invalid. Please provide the valid Session token", "CUSTOMER FILTER EVENT LIST", "");
    }
    
    // Validate session token
    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?, @result, @custid, @custname, @custemail); SELECT @result, @custid, @custname, @custemail', [user.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    
    if (userid == null) {
      return helper.getErrorResponse(false, "Login session token Invalid. Please provide the valid session token", "CUSTOMER FILTER EVENT LIST", "");
    }
    
    // Check if querystring is provided
    if (!user.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "CUSTOMER FILTER AI EVENT", "");
    }

    var secret = user.STOKEN.substring(0, 16);
    var querydata;

    // Decrypt querystring
    try {
      querydata = await helper.decrypt(user.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error. Please provide the valid querystring.", "CUSTOMER FILTER EVENT LIST", secret);
    }
    
    // Parse the decrypted querystring
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring JSON error. Please provide valid JSON", "CUSTOMER FILTER EVENT LIST", secret);
    }
    if (!querydata.hasOwnProperty('username') || querydata.username == '') {
      return helper.getErrorResponse(false, "User name missing. Please provide the Username", "Please enter the Username", secret);
    }
    if (!querydata.hasOwnProperty('password') || querydata.password == '') {
      return helper.getErrorResponse(false, "Password missing. Please provide the Password", "Please enter the password", secret);
    }
    if (!querydata.hasOwnProperty('emailid') || querydata.emailid == '') {
      return helper.getErrorResponse(false, "Email id missing. Please provide the email id", "Please enter the emailid", secret);
    }
    if (!querydata.hasOwnProperty('phonenumber') || querydata.phonenumber == '') {
      return helper.getErrorResponse(false, "Phone number missing. Please provide the phonenumber", "Please enter the Phone number", secret);
    }
    if (!querydata.hasOwnProperty('userdesign') || querydata.userdesign == '') {
      return helper.getErrorResponse(false, "User design missing. Please provide the user design", "Please enter the User design", secret);
    }
    if (!querydata.hasOwnProperty('department') || querydata.department == '') {
      return helper.getErrorResponse(false, "Department missing. Please provide the Department", "Please enter the Department", secret);
    }
    if (!querydata.hasOwnProperty('userid') || querydata.userid == '') {
      return helper.getErrorResponse(false, "User id missing. Please provide the User id", "Please enter the User id", secret);
    }
    if (querydata.emailid.indexOf('.') == -1 || querydata.emailid.indexOf('@') == -1) {
       return helper.getErrorResponse(false,"Invalid email address. Please provide the valid emailaddress.","Please enter the Emailid",secret);
    }
    var phonePattern1 = /^[0-9]{10}$/; // Matches 10-digit phone numbers.
    var phonePattern2 = /^\+\d{1,3}\s?\d{10}$/; // Matches international phone numbers like +123 456789012.

    if (phonePattern1.test(querydata.phonenumber) || phonePattern2.test(querydata.phonenumber)) {
    }else{
        return helper.getErrorResponse(false,'Phone number Invalid. Please provide the phone number.',"Please provide the valid phonenumber.",secret);
    }try{
       const [sql] = await db.spcall(`CALL SP_CUST_USER_ADD(?,?,?,?,?,?,?,?,?,@userid); select @userid;`,[0,querydata.username,querydata.emailid,querydata.username,querydata.password,0,querydata.userdesign,querydata.phonenumber,querydata.userid]);
       const objectvalue = sql[1][0];
       const userid = objectvalue["@userid"];
       if(userid != null ){
           return helper.getSuccessResponse(true,"User added successfully",userid,secret);
       }else{
          return helper.getErrorResponse(false,'Error adding the user',"FAILED",secret);
       }
    }catch(er){
      console.log(er);
      return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
    }
  }catch(er){
    console.log(er);
    return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
  }
}

module.exports = {
  login,
  login1,
  isuserexist,
  loginwithotp,
  verifyotplogin,
  register,
  createUser,
  updateUser,
  updatepassword,
  setpassword,
  deleteUser,
  getUserdetails,
  createSendOTP,
  createSendEmailOTP,
  createSendMobileOTP,
  verifyEmailOTP,
  verifyMobileOTP,
  sendEmail,
  uploadadhaar,
  uploadadhaardetails,
  uploadpan,
  uploadpandetails,
  forgotpassword,
  getSiteDashboard,
  getCompanyDashboard,
  loginforgotpassword,
  verifyOTP,
  changepassword,
  loginWithotp,
  VerifyloginWithotp,
  Logout,
  UserEvents,
  getUserid,
  GetUserList,
  AddUser,
}