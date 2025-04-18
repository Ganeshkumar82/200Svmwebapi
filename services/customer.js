const db = require("./db");
const helper = require("../helper");
const mqtt = require("mqtt");
const mailer = require("../mailer");
const config = require("../config");
const fs = require("fs").promises;
const passwordValidator = require("password-validator");
// const smsClient = require("../smsclient");
const otpGenerator = require("otp-generator");
const axios = require("axios");
const { isNull } = require("util");
const path = require("path");
const { pathToFileURL } = require("url");

async function create(customer) {
  let message = "Error in creating customer profile";
  let responsecode = "501";
  const resultAPI = await db.query(
    "select user_id,token from apitokenmaster where user_id=" +
      customer.userid +
      ' and token="' +
      customer.TOKEN +
      '" and valid_status=1;'
  );
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) {
    responsecode = "5001";
    message = "Invalid TOKEN";
    return { responsecode, message };
  }
  var ts = Date.now();
  console.log(
    ts +
      customer.customername +
      "," +
      customer.type +
      ',"' +
      customer.emailid +
      '", "' +
      customer.username +
      '","' +
      customer.password +
      '","' +
      customer.phone +
      '","' +
      customer.address +
      '",' +
      customer.motp +
      "," +
      customer.eotp +
      "," +
      customer.userid
  );
  const result = await db.query(
    'CALL addcompany("' +
      customer.customername +
      '",' +
      customer.type +
      ',"' +
      customer.emailid +
      '", "' +
      customer.username +
      '","' +
      customer.password +
      '","' +
      customer.phone +
      '","' +
      customer.address +
      '",' +
      customer.motp +
      "," +
      customer.eotp +
      "," +
      customer.userid +
      ")"
  );

  if (result.affectedRows) {
    message = "Customer Profile created successfully";
  }

  return { message };
}

async function registerold(customer) {
  let message = "Error in creating customer profile";
  let responsecode = "503";
  var ts = Date.now();
  console.log(
    ts +
      customer.emailid +
      '","' +
      customer.phone +
      '","' +
      customer.motp +
      "," +
      customer.eotp +
      "," +
      customer.appid
  );
  const result = await db.query(
    'CALL addcompany("NewUser",0,"' +
      customer.emailid +
      '", "' +
      customer.phone +
      '","' +
      customer.motp +
      '","","",' +
      customer.motp +
      "," +
      customer.eotp +
      "," +
      customer.appid +
      ")"
  );

  if (result.affectedRows) {
    message = "Customer Profile created successfully";
  }

  return { message };
}

//####################################################################################################################################################################################################
//####################   REGISTER A CUSTOMER   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            "name":"testuser1",
//            "emailid":"testuser@email.com",
//            "phoneno":"##########",
//            "password":"***********"
//          }
//Validation rule
//      1. Full name - The name field should not exceed 30 characters - If exceeds give a API response " The full name should be within 30 characters "
//      2. The name field should get updated to first character of a word to uppercase
//      3. Email id should be valid email format
//      4. Phone number should not be greater than 15 and should not be less than 8 number.
//      5. Password should have minimum 8 characters and maximum 15 characters with mix of uppercase, lowercase, numeric and special character.
//      6. If the password doesn't meet the guidelines provide a response through API - if below or above the minimum
//         and maximum characters - " The password should be between 8-15 characters " if the password doesn't contain uppercase or lowercase or numeric or special character - " The password
//      7. If the email / phone number is already exist, show "Email/phone number already exists"
//      8. API Key checking for REST API Security
//      9. querystring encrypted data to decrypt
//      10. Invalid encrypt if the api key and secret is correct, but the querystring is invalid
//      11. Send Verification Email
//      12. Send Verification SMS
//####################################################################################################################################################################################################

async function register(customer) {
  //Begin Validation 8. API Key checking
  const ApiCheck = helper.checkAPIKey(customer.APIKey, customer.Secret);
  var isValid = 0;
  await ApiCheck.then(
    function (value) {
      isValid = value.IsValidAPI;
    },
    function (error) {
      isValid = 0;
    }
  );
  if (isValid == 0) {
    return helper.getErrorResponse(
      "API_KEY_ERROR",
      "Server Error. Please Contact Administration",
      "REGISTRATION API KEY ERROR",
      customer.Secret
    );
  }
  //End of Validation 8

  //Begin Validation 9. decrypt querystring data
  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    queryData = JSON.parse(
      await helper.decrypt(customer.querystring, customer.Secret)
    );
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "REG_QUERYSTRING_ERROR",
      "Server Error. Please Contact Administration.",
      "REGISTRATION QUERYSTRING ERROR",
      customer.Secret
    );
  }
  //End of Validation 9
  console.log("queryData==>" + JSON.stringify(queryData));
  //Begin Validation:- 1. Full name - The name field should not exceed 30 characters - If exceeds give a API response " The full name should be within 30 characters "
  if (queryData.name.length > 30) {
    return helper.getErrorResponse(
      "REG_NAME_SIZE_ERROR",
      "Please provide a name with the appropriate size.",
      "REGISTER",
      customer.Secret
    );
  }
  //End of Validation:- 1
  //Begin Validation:- 2. The name field should get updated to first character of a word to uppercase
  const str = queryData.name;
  const Fullname = str.charAt(0).toUpperCase() + str.slice(1);
  //End of Validation:- 2
  //Validation RULE 3 was set at the DB-Trigger
  if (
    queryData.emailid.indexOf(".") == -1 ||
    queryData.emailid.indexOf("@") == -1
  ) {
    return helper.getErrorResponse(
      "REG_EMAIL_VALID_ERROR",
      "Invalid email format. Please provide a valid email address.",
      "REGISTER",
      customer.Secret
    );
  }
  //Begin Validation:- 4. Phone number should not be greater than 15 and should not be less than 8 number.
  if (queryData.phoneno.length > 15 || queryData.phoneno.length < 8) {
    return helper.getErrorResponse(
      "REG_PHONE_SIZE_ERROR",
      "Phone number must be of valid size. Please provide a valid phone number.",
      "REGISTER",
      customer.Secret
    );
  }
  if (helper.phonenumber(queryData.phoneno)) {
    console.log("Valid");
  } else {
    return helper.getErrorResponse(
      "REG_PHONE_VALID_ERROR",
      "Invalid phone number. Please provide a valid phone number.",
      "REGISTER",
      customer.Secret
    );
    console.log("Invalid");
  }
  //End of Validation:- 4
  //Begin Validation:- 5. Password should have minimum 8 characters and maximum 15 characters with mix of uppercase, lowercase, numeric and special character.
  if (queryData.password.length > 15 || queryData.password.length < 8) {
    return helper.getErrorResponse(
      "REG_PASS_SIZE_ERROR",
      "Password must be of valid size. Please provide a password with appropriate length.",
      "REGISTER",
      customer.Secret
    );
  }
  //End of Validation:- 5
  //Begin Validation:- 6. If the password doesn't meet the guidelines provide a response through API - if below or above the minimum
  //                      and maximum characters - " The password should be between 8-15 characters " if the password doesn't contain
  var schema = new passwordValidator();
  schema
    .is()
    .min(8) // Minimum length 8
    .is()
    .max(100) // Maximum length 100
    .has()
    .uppercase() // Must have uppercase letters
    .has()
    .lowercase() // Must have lowercase letters
    .has()
    .digits(1) // Must have at least 2 digits
    .has()
    .not()
    .spaces(); // Must not have spaces
  console.log(schema.validate(queryData.password));
  if (schema.validate(queryData.password) == false) {
    return helper.getErrorResponse(
      "REG_PASS_GL_ERROR",
      "Password does not meet the required guidelines.",
      "REGISTER",
      customer.Secret
    );
  }
  //End of Validation:- 6
  //Validation RULE 7 was set at the DB-Trigger
  try {
    //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
    const [result] = await db.spcall(
      "CALL SP_CUST_ADD(?,?,?,?,@custid);select @custid;",
      [queryData.name, queryData.emailid, queryData.phoneno, queryData.password]
    );
    const objectValue1 = result[1][0];
    const custID = objectValue1["@custid"];
    console.log("custID=>" + custID);
    if (custID != null) {
      //Begin Validation:- 11. Send Verification Email
      const [result1] = await db.spcall(
        "CALL SP_ACTVERIFY_ADD(?,?,?,@acttoken);select @acttoken;",
        [custID, queryData.emailid, 0]
      );
      const objectValue = result1[1][0];
      console.log("acttoken EMAIL=>" + objectValue["@acttoken"]);
      var EmailSent = false;
      var SMSSent = false;
      if (objectValue["@acttoken"] != null) {
        EmailSent = await mailer.sendEmail(
          queryData.name,
          queryData.emailid,
          "Account Verification",
          "acverification.html",
          "http://192.168.0.198:8080/verification?acttoken=" +
            objectValue["@acttoken"],
          "REG_ACVERIFY_EMAIL_CONF"
        );
        console.log("EmailSent=>" + EmailSent);
        if (EmailSent == false) {
          return helper.getErrorResponse(
            "EMAIL_SENT_ERROR",
            "Error sending the Email. Please try again later.",
            customer.Secret
          );
        }
      }
      //End of Validation:- 11
      //Begin Validation:- 12. Send Verification SMSs
      const [result2] = await db.spcall(
        "CALL SP_ACTVERIFY_ADD(?,?,?,@acttoken);select @acttoken;",
        [custID, queryData.phoneno, 1]
      );
      const objectValue2 = result2[1][0];
      console.log("acttoken SMS=>" + objectValue2["@acttoken"]);
      if (objectValue2["@acttoken"] != null) {
        const phone = queryData.phoneno;
        const name = queryData.name;
        const originalURL =
          "http://192.168.0.198:8080/verification?acttoken=" +
          objectValue2["@acttoken"];
        shortenURL(originalURL)
          .then((shortURL) => {
            // smsClient.sendSMS('sporad',phone,"3","",shortURL,name)
            SMSSent = true;
            console.log("Shortened URL:", shortURL);
          })
          .catch((error) => {
            console.error("Error:", error);
            return helper.getErrorResponse(
              "ERROR_SENDING_MESSAGE",
              "Error sending the message. Please try again later.",
              error,
              customer.Secret
            );
          });
        // const user = JSON.parse({name,phone});
        //   console.log("SMS API Called -   user->"+user);
      }
      //End of Validation:- 11
      if (EmailSent == true || SMSSent == true) {
        console.log("EmailSent=>" + EmailSent);
        return helper.getSuccessResponse(
          "REG_SUCCESS",
          "Registration successful",
          "Register Success",
          customer.Secret
        );
      } else {
        if (EmailSent == false)
          return helper.getErrorResponse(
            "REG_EMAIL_SENT_ERROR",
            "There was an error sending the registration email. Please try again later.",
            "REGISTER",
            customer.Secret
          );
        if (SMSSent == false)
          return helper.getErrorResponse(
            "REG_PHONE_SENT_ERROR",
            "There was an error sending the registration message. Please try again later.",
            "REGISTER",
            customer.Secret
          );
        return helper.getSuccessResponse(
          "REG_SUCCESS",
          "Registration successful",
          "REGISTER",
          customer.Secret
        );
      }
    } else {
      return helper.getErrorResponse(
        "REG_ERROR",
        "An error occurred during registration. Please try again later.",
        "REGISTER",
        customer.Secret
      );
    }
  } catch (ex) {
    if (ex.sqlMessage == "Wrong phone number")
      return helper.getErrorResponse(
        "REG_PHONE_SIZE_ERROR",
        "Phone number must be of valid size. Please provide a phone number with appropriate length.",
        "REGISTER",
        customer.Secret
      );
    else if (ex.sqlMessage == "Wrong Email")
      return helper.getErrorResponse(
        "REG_EMAIL_VALID_ERROR",
        "Invalid email format. Please provide a valid email address.",
        "REGISTER",
        customer.Secret
      );
    else if (ex.sqlMessage == "Phone number already exist")
      return helper.getErrorResponse(
        "REG_PHONE_ALRE_ERROR",
        "Phone number is already registered. Please provide a different phone number.",
        "REGISTER",
        customer.Secret
      );
    else if (ex.sqlMessage == "Email already exist")
      return helper.getErrorResponse(
        "REG_EMAIL_ALRE_ERROR",
        "Email is already in use. Please provide a different email address.",
        "REGISTER",
        customer.Secret
      );
    else
      return helper.getErrorResponse(
        "UNEXPECTED_ERROR",
        "Server Error. Please try again later",
        ex,
        customer.Secret
      );
  }

  // const responseData = {responsecode,message};
  // responseData = JSON.parse("{\"message\":"+ helper.encrypt(responseData,helper.getEncryptionKey())+"}");
  // return {responseData};
}
// const fetch = require('node-fetch');

async function shortenURL(url) {
  try {
    const response = await axios.get(
      `http://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(`Failed to shorten URL. Status: ${response.status}`);
    }
  } catch (error) {
    throw error;
  }
}

//####################################################################################################################################################################################################
//####################   GET ORGANIZATION LIST  #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345,
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getOrganizationList(customer) {
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if (customer.STOKEN.length > 30 || customer.STOKEN.length < 50) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "CUSTOMER GET ORGANI"
    );
  }
}

//####################################################################################################################################################################################################
//####################   GET CUSTOMER LIST  #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345,
//
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getCompanylist(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET COMPANY LIST",
        ""
      );
    }
    //Begin Validation 1. SESSION TOKEN VALIDATION
    //  a) If SESSION TOKEN Character sizes error
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Session token size is invalid. Please provide a valid session token.",
        "GET COMPANY LIST",
        secret
      );
    }
    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log("Get Company List, objectValue->" + objectValue1["@result"]);
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET COMPANY LIST",
        secret
      );
    }

    let sql = "";
    let rows = "";
    if (sql == "") {
      sql = `SELECT customer_id,customer_name FROM customermaster and status =1`;
      rows = await db.query(sql);
    }

    if (rows != "") {
      const data = JSON.stringify(helper.emptyOrRows(rows));
      console.log(data);
      return helper.getSuccessResponse(
        "COMPANY_LIST_FETCHED_SUCCESSFULLY",
        "The Customer company list fetched successfully.",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "COMPANY_LIST_FETCHED_ERROR",
        "Error fetching the list of companies. Please try again later.",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "ERROR_FETCHING_COMPANY_LIST",
      "Error while fetching the company list",
      error,
      secret
    );
  }
}

//####################################################################################################################################################################################################
//####################   GET CUSTOMER SITE LIST  #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345wd2w34esf,
//
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getCompanySitelist(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET COMPANY SITE LIST",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //Begin Validation 1. SESSION TOKEN VALIDATION
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET COMPANY SITE LIST",
        secret
      );
    }
    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET COMPANY  SITE LIST",
        secret
      );
    }

    // CHECK WHERE THE COMPANY ID IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("companyid") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_COMPANY_ID_MISSING",
        "Customer's company ID is missing. Please provide a valid company ID.",
        "GET COMPANY SITE LIST",
        secret
      );
    }

    let sql = "";
    let rows = "";
    if (customer.companyid != "") {
      sql = `SELECT branch_id,branch_name from branchmaster WHERE customer_id= ${customer.companyid} and status=1`;
      rows = await db.query(sql);
    }

    if (rows != "") {
      const data = JSON.stringify(helper.emptyOrRows(rows));
      console.log(data);
      return helper.getSuccessResponse(
        "SITE_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Company Site list fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "SITE_LIST_FETCHING_ERROR",
        "Error fetching the list of sites. Please try again later.",
        "GET COMPANY SITE LIST",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "ERROR_WHILE_FETCHING_SITE_LIST",
      "Error fetching the list of sites. Please try again later.",
      er,
      secret
    );
  }
}

//####################################################################################################################################################################################################
//#################### GET CUSTOMER SITE DEPARTMENT LIST ##############################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345wd2w34esf,
//
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getSiteDeptlist(customer) {
  try {
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET SITE DEPARTMEN LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //Begin Validation 1. SESSION TOKEN VALIDATION
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET SITE DEPARTMENT LIST",
        secret
      );
    }
    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log(
      "Get Site Department List, objectValue->" + objectValue1["@result"]
    );
    const customerid = objectValue1["@custid"];
    console.log("customerid ->" + customerid);
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET SITE DEPARTMEN LIST",
        secret
      );
    }
    //  c) If SESSION TOKEN not given as input

    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "SITE_QUERYSTRING_MISSING",
        "Site query string is missing. Please provide a valid query string.",
        "GET SITE DEPARTMEN LIST",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("Secret-->" + secret);
    console.log("Customer querystring->" + customer.querystring);
    var querydata;

    try {
      querydata = await helper.decrypt(customer.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(
        "SITE_PACKAGE_QUERY_ERROR",
        "Internal error. Please try again.",
        "SITE QUERYSTRING HAS ERROR",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing JSON query string. Please provide a valid JSON string.",
        "GET SITE DEPARTMEN LIST",
        secret
      );
    }

    let sql = "";
    let rows = "";
    if (
      querydata.customerid != "" &&
      querydata.customerid != null &&
      querydata.hasOwnProperty("customerid") == true
    ) {
      sql = `select dept_id,dept_name from deptmaster where Branch_ID IN (select Branch_ID from branchmaster where Customer_ID IN (${querydata.customerid}))`;
    } else if (
      querydata.branchid != "" &&
      querydata.branchid != null &&
      querydata.hasOwnProperty("branchid") == true
    ) {
      sql = `select dept_id,dept_name from deptmaster where Branch_ID IN (${querydata.branchid})`;
    } else {
      sql = `select dept_id,dept_name from deptmaster where status =1`;
    }
    rows = await db.query(sql);
    if (rows != "") {
      const data = helper.emptyOrRows(rows);
      console.log(data);
      return helper.getSuccessResponse(
        "DEPT_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Site Department List Fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "DEPT_LIST_FETCHING_ERROR",
        "Error fetching the list of departments. Please try again later.",
        "Error the entered Customerid/branchid is invalid or it has no department",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "DEPT_LIST_FETCHING_ERROR",
      "Error fetching the list of departments. Please try again later.",
      er,
      secret
    );
  }
}

//####################################################################################################################################################################################################
//#################### GET CUSTOMER DEVICE LIST ##############################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345wd2w34esf,
//
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getdeptdevicelist(customer) {
  try {
    // Check if the session token is provided
    if (!customer.hasOwnProperty("STOKEN")) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET DEPARTMENT DEVICE LIST",
        ""
      );
    }

    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);

    // Begin validation
    // Check if the session token character size is valid
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET DEPARTMENT DEVICE LIST",
        secret
      );
    }
    let userType = 0;
    let customerId = 0;
    // Check the session token's validity
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    const userid = objectValue1["@result"];
    console.log(
      "Get Department device List, objectValue->" + objectValue1["@result"]
    );
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET DEPARTMENT DEVICE LIST",
        secret
      );
    }
    // else{
    //   const sql = `SELECT User_type, Customer_id FROM usermaster WHERE User_id = ${userid}`;
    //   const rows = await db.query(sql);
    //   if (rows.length > 0) {
    //     userType = rows[0].User_type;
    //     customerId = rows[0].Customer_id;
    //   }
    // }
    // Check if the query string is provided
    if (!customer.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(
        "DEVICE_QUERYSTRING_MISSING",
        "Device query string is missing. Please provide a valid query string.",
        "GET DEPARTMENT DEVICE LIST",
        secret
      );
    }

    console.log("customer querystring-->" + customer.querystring);

    // Decrypt and parse the query string
    let querydata;
    try {
      querydata = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + querydata);
    } catch (er) {
      return helper.getErrorResponse(
        "QUERY_DECRYPTION_ERROR",
        "Error in device querystring.",
        er,
        secret
      );
    }

    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "DEVICE_QUERY_PARSE_ERROR",
        "Error parsing device query string.",
        ex,
        secret
      );
    }

    // Define SQL query
    let clSQL = "";
    if (querydata.hasOwnProperty("organizationid")) {
      if (querydata.organizationid.startsWith("O")) {
        let organizationId = querydata.organizationid.replace("O_", "");
        if (querydata.locationid == "0") {
          clSQL = `SELECT dm.Device_ID as Device_ID, CONCAT(dm.Device_ID, '~', dm.device_name) AS Device_name, dt.Dept_Location, dm.Dept_ID, dm.SDK_ID 
                   FROM devicemaster dm, deptmaster dt, branchmaster bm 
                   WHERE dm.status = 1 AND dm.dept_id = dt.dept_id AND dt.branch_id = bm.branch_id 
                   AND bm.customer_id IN (SELECT customer_id FROM customermaster WHERE organization_id = ${organizationId}) 
                   ORDER BY dm.device_name ASC`;
        } else {
          clSQL = `SELECT dm.Device_ID as Device_ID, CONCAT(dm.Device_ID, '~', dm.device_name) AS Device_name, dt.Dept_Location, dm.Dept_ID, dm.SDK_ID 
                   FROM devicemaster dm, deptmaster dt, branchmaster bm 
                   WHERE dm.status = 1 AND dm.dept_id = dt.dept_id AND dt.branch_id = bm.branch_id 
                   AND bm.branch_id = ${querydata.locationid} AND bm.customer_id IN (SELECT customer_id FROM customermaster WHERE organization_id = ${organizationId}) 
                   ORDER BY dm.device_name ASC`;
        }
      } else {
        if (querydata.locationid == "0") {
          clSQL = `SELECT dm.Device_ID as Device_ID, CONCAT(dm.Device_ID, '~', dm.device_name) AS Device_name, dt.Dept_Location, dm.Dept_ID, dm.SDK_ID 
                   FROM devicemaster dm, deptmaster dt, branchmaster bm 
                   WHERE dm.status = 1 AND dm.dept_id = dt.dept_id AND dt.branch_id = bm.branch_id 
                   AND bm.customer_id = ${querydata.organizationid} 
                   ORDER BY dm.device_name ASC`;
        } else {
          clSQL = `SELECT dm.Device_ID as Device_ID, CONCAT(dm.Device_ID, '~', dm.device_name) AS Device_name, dt.Dept_Location, dm.Dept_ID, dm.SDK_ID 
                   FROM devicemaster dm, deptmaster dt, branchmaster bm 
                   WHERE dm.status = 1 AND dm.dept_id = dt.dept_id AND dt.branch_id = bm.branch_id 
                   AND bm.branch_id = ${querydata.locationid} AND bm.customer_id = ${querydata.organizationid} 
                   ORDER BY dm.device_name ASC`;
        }
      }

      // Execute SQL query
      let rows = await db.query(clSQL);
      if (rows != "") {
        const data = helper.emptyOrRows(rows);
        return helper.getSuccessResponse(
          "DEVICE_LIST_FETCHED_SUCCESSFULLY",
          "The Customer Department Device List Fetched Successfully",
          data,
          secret
        );
      } else {
        return helper.getErrorResponse(
          "NO_DEVICE_AVAILABLE",
          "Device Not Available. Please add device.",
          "Error the entered department id is invalid or it has no Device",
          secret
        );
      }
    } else {
      return helper.getErrorResponse(
        "MISSING_PARAMETERS_ERROR",
        "Missing parameters: locationid or organization is missing.",
        "GET DEPARTMENT DEVICE LIST",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "DEVICE_LIST_FETCHING_ERROR",
      "Error fetching the list of devices. Please try again later.",
      er,
      secret
    );
  }
}

//#################################################################################################################################################################################################################
//##################### GET DEVICE CHANNEL LIST###################################################################################################################################################################################################
//#################################################################################################################################################################################################################
//#######################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345wd2w34esf,
//
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getdevicechannallist(customer) {
  try {
    //begin validation
    //sessiontoken not given as an input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET DEVICE CHANNEL LIST",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret===>>>" + secret);
    //1.sessiontoken size check
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET DEVICE CHANNEL LIST",
        secret
      );
    }
    //2.SESSIONTOKEN NOT AVAILABLE IN DATABASE
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custmail;",
      [customer.STOKEN]
    );
    const objectValue1 = result[1][0];
    console.log(
      "Get Department device List, objectValue->" + objectValue1["@result"]
    );
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET DEVICE CHANNEL LIST",
        secret
      );
    }

    //check if the device_id is given as an input or not
    if (customer.hasOwnProperty("deviceid") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_DEVICE_ID_MISSING",
        "Customer's device ID is missing. Please provide a valid device ID.",
        "GET DEVICE CHANNEL LIST",
        secret
      );
    }

    //const offset = helper.getOffset(page, config.listPerPage);
    let sql = "";
    let rows = "";
    if (customer.deviceid != "") {
      sql = `select channel_id,channel_name from channelmaster where device_id =${customer.deviceid}`;
      rows = await db.query(sql);
    }

    if (rows != "") {
      const data = JSON.stringify(helper.emptyOrRows(rows));
      console.log(data);
      return helper.getSuccessResponse(
        "CHANNEL_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Device Channel List Fetched Successfully",
        data,
        secret
      );
      //  message = 'Device channel list Fetched successfully';
      //  responsecode = "704"
      //  const encrypt = helper.encrypt(JSON.stringify({ responsecode, message, data }), secret);
      //   return ("encrypted response : "+encrypt);
    } else {
      return helper.getErrorResponse(
        "CHANNEL_LIST_FETCHING_ERROR",
        "Error fetching the list of channels. Please try again later.",
        "Entered device id has no channel or Device id is invalid",
        secret
      );
      //  message = 'SESSION ID is missing. Please give correct SESSIONID';
      //  responsecode = "7004"
      //  const encrypt = helper.encrypt(JSON.stringify({ responsecode, message }), secret);
      //   return ("encrypted response : "+encrypt);
    }
  } catch (er) {
    return helper.getErrorResponse(
      "CHANNEL_LIST_FETCHING_ERROR",
      "Error fetching the list of channels. Please try again later.",
      er,
      secret
    );
  }
}

//#################################################################################################################################################################################################################
//##################### GET CHANNEL CAMERA LIST###################################################################################################################################################################################################
//#################################################################################################################################################################################################################
//#######################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//          {
//            SESSIONTOKEN:12345wd2w34esf,
//
//          }
//Validation rule
//1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//####################################################################################################################################################################################################

async function getcameralist(customer) {
  try {
    //CHECK THE SESSIONTOKEN IS GIVEN OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET CHANNEL CAMERA LIST",
        ""
      );
    }

    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret key->" + secret);
    //begin validation
    //check if the given sessiontoken size is correct
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SEESIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET CHANNEL CAMERA LIST",
        secret
      );
    }
    //CHECK WHETHER SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log(
      "Get channel camera List, objectValue->" + objectvalue["@result"]
    );
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SEESIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET CHANNEL CAMERA LIST",
        secret
      );
    }

    //check if the channel id is given as input or not
    if (customer.hasOwnProperty("deviceid") == false) {
      return helper.getErrorResponse(
        "DEVICE_ID_MISSING",
        "Device ID is missing. Please provide a valid device ID.",
        "GET CHANNEL CAMERA LIST",
        secret
      );
    }
    let sql = "";
    let rows = "";
    if (customer.deviceid != "") {
      sql = `select camera_id from cameramaster where device_id =${customer.deviceid} and Camera_status =1 `;
      rows = await db.query(sql);
    }
    if (rows != "") {
      const data = helper.emptyOrRows(rows);
      console.log(data);
      return helper.getSuccessResponse(
        "CAMERA_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Channel Camera List Fetched SUccessfully",
        data,
        secret
      );
      // message = 'Channel camera list Fetched successfully';
      // responsecode = "704"
      // const encrypt = helper.encrypt(JSON.stringify({ responsecode, message, data }), secret);
      // return ("encrypted response : "+encrypt);
    } else {
      return helper.getErrorResponse(
        "CAMERA_LIST_FETCHING_ERROR",
        "Error fetching the list of cameras. Please try again later.",
        "Error entered device id has no cameras",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "CAMERA_LIST_FETCHING_ERROR",
      "Error fetching the list of cameras. Please try again later.",
      er,
      secret
    );
  }
}
//################################## GET CUSTOMER CONTACT LIST #####################################################################################################################################################
//################################################################################################################################################################################################################
//##################################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function getcontactlist(customer) {
  try {
    //IF SESSIONTOKEN IS NOT GIVEN AS AN INPUT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET CUSTOMER CONTACTS LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret-->" + secret);
    //BEGIN VALIDATIONs
    //CHECK IF THE GIVEN SESSIONTOKEN LENGTH IS CORRECT OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET CUSTOMER CONTACT LIST",
        secret
      );
    }
    //CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log("contact objectvalue->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET CUSTOEMR CONTACT LIST",
        secret
      );
    }

    //END OF VALIDATION

    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "CONTACT_QUERYSTRING_MISSING",
        "Contact query string is missing. Please provide a valid query string.",
        "GET CUSTOMER CONTACT LIST",
        secret
      );
    }
    console.log("customer querystring-->" + customer.querystring);

    try {
      querydata = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted data->" + querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "BRANCH_QUERYSTRING_ERROR",
        "Error in branch query string. Please provide a valid query string.",
        "GET CUSTOMER CONTACT LIST",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "BRANCH_JSON_ERROR",
        "Error parsing branch JSON data. Please provide valid JSON data.",
        "GET CUSTOMER CONTACT LIST",
        secret
      );
    }
    //A)CHECK IF INVOICE NUMBER IS GIVEN AS AN INPUT OR NOT
    if (querydata.hasOwnProperty("customerid") == false) {
      return helper.getErrorResponse(
        "BRANCH_CUSTOMER_ID_MISSING",
        "Branch customer ID is missing. Please provide a valid customer ID.",
        "GET CUSTOMER CONTACT LIST",
        secret
      );
    }
    let sql = "";
    if (querydata.customerid != "") {
      sql = `select contact_id,contactname,contactmobile,contactemail,dept_id from customercontacts where dept_id in(select dept_id from deptmaster where branch_id IN
      (SELECT branch_id from branchmaster WHERE customer_id= ${querydata.customerid} and status =1))`;
    }
    if (sql != "") {
      const rows = await db.query(sql);
      const data = helper.emptyOrRows(rows);
      console.log(data);
      return helper.getSuccessResponse(
        "CONTACT_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Department Contact List Fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "CONTACT_LIST_FETCHING_ERROR",
        "Error While Fetching Customer Department Contact List",
        "ERROR",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "CONTACT_LIST_FETCHING_ERROR",
      "Error While Fetching Customer Department Contact List",
      er,
      secret
    );
  }
}

//############################# GET CUSTOMER BILLING LIST########################################################################################################################################################################
//#####################################################################################################################################################################################################
//#######################################################################################################################################################################################################

async function getbillinglist(customer) {
  try {
    //IF SESSIONTOKEN IS NOT GIVEN AS AN INPUT
    if (customer.hasOwnProperty["STOKEN"] == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET CUSTOMER BILLING LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //BEGIN VALIDATION
    //CHECK IF THE GIVEN SESSIONTOKEN LENGTH IS CORRECT OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET CUSTOMER BILLING LIST",
        secret
      );
    }
    //CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log("billing objectvalue->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET CUSTOEMR BILLING LIST",
        secret
      );
    }

    //END OF VALIDATION 1
    let sql = "";
    if (cust_id != "") {
      let sql1 = `select bill_to_type from customerbillingmaster where bill_to_source IN (${cust_id})`;
      if (sql1 == 1) {
        sql = `select custbilltrans_id,custbill_id, Particulars, amount from customerbillingtrans where custbill_id in(select custbill_id from customerbillingmaster where bill_to_source IN
      (SELECT branch_id from branchmaster WHERE customer_id IN(${cust_id})))`;
      } else {
        sql = `select custbilltrans_id,custbill_id, Particulars, amount from customerbillingtrans where custbill_id in(select custbill_id from customerbillingmaster where bill_to_source IN
        (SELECT customerreg_id from customermaster WHERE customer_id In (${cust_id})))`;
      }
    }
    if (sql != "") {
      const rows = await db.query(sql);
      const data = helper.emptyOrRows(rows);
      console.log(data);
      return helper.getSuccessResponse(
        "BILLING_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Payment Billing List Fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "BILLING_LIST_FETCHING_ERROR",
        "Error While Fetching Customer Payment List",
        "ERROR",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "BILLING_LIST_FETCHING_ERROR",
      "Error While Fetching Customer Payment List",
      er,
      secret
    );
  }
}

//###############################################################################################################################################################################################################
//######################## GET CUSTOMER INVOICE LIST ######################################################################################################################################################################################
//####################################################################################################################################################################################################################

async function getinvoicelist(customer) {
  try {
    //CHECK IF THE SEESIONTOKEN IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET CUSTOMER INVOICE LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret key-->>" + secret);
    //BEGIN VALIDATION 1
    //CHECK IF THE SESSIONTOKEN SIZE IS CORRECT OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET CUSTOMER INVOICE LIST",
        secret
      );
    }
    //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log("objectvalue=->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET CUSTOMER INVOICE LIST",
        secret
      );
    }
    //END OF VALIDATION 1

    let sql = "";
    if (cust_id != "") {
      let sql1 = `select bill_to_type from customerbillingmaster where bill_to_source ='${cust_id}'`;
      if (sql1 == 1) {
        sql = `select invoice_id,invoice_number,particulars,invoice_date,invoice_amount from customerinvoices where custbill_id IN 
  (select custbill_id from customerbillingmaster where bill_to_source IN (SELECT branch_id from branchmaster WHERE customer_id= ${cust_id}))`;
      } else {
        sql = `select invoice_id,invoice_number,particulars,invoice_date,invoice_amount from customerinvoices where custbill_id in(select custbill_id from customerbillingmaster where bill_to_source IN
    (SELECT customerreg_id from customermaster WHERE customer_id= '${cust_id}'))`;
      }
    }
    if (sql != "") {
      const rows = await db.query(sql);
      const data = helper.emptyOrRows(rows);
      console.log(data);
      return helper.getSuccessResponse(
        "INVOICE_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Payment Invoice List Fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "INVOICE_LIST_FETCHING_ERROR",
        "Error While Fetching Customer Payment Invoice List",
        "ERROR",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "INVOICE_LIST_FETCHING_ERROR",
      "Error While Fetching Customer Payment Invoice List",
      er,
      secret
    );
  }
}
//######################################################################################################################################################################################################
//##################### GET CUSTOMER PAYMENT LIST#################################################################################################################################################################################
//######################################################################################################################################################################################################

async function getpaymentlist(customer) {
  try {
    //CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret key-->" + secret);
    //BEGIN VALIDATION 1
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }
    //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log("payment objectvalue=->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET CUSTOMER PAYMENT LIST",
        secret
      );
    }

    let sql = "";
    if (cust_id != "") {
      sql = `select cpayment_id,customer_id,tot_inv_amount,tds_value,paid_amount,reference_no from customerpayments where customer_id =${cust_id} and status = 1`;
    }
    if (sql != "") {
      const rows = await db.query(sql);
      const data = helper.emptyOrRows(rows);
      console.log(data);
      return helper.getSuccessResponse(
        "PAYMENT_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Payment List Fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "PAYMENT_LIST_FETCHING_ERROR",
        "Error While Fetching Customer Payment List",
        "error",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "PAYMENT_LIST_FETCHING_ERROR",
      "Error While Fetching Customer Payment List",
      er,
      secret
    );
  }
}

//#####################################################################################################################################################################################################\
//#################################### GET CUSTOMER PAYMENT BANK####################################################################################################################################################################
//######################################################################################################################################################################################################

async function getpaymentbanklist(customer) {
  try {
    //CHECK IF THE GIVEN SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "GET PAYMENT BANK LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret key->" + secret);
    //BEGIN VALIDATION 1
    //CHECK IF THE GIVEN SESSIONTOKEN SIZE IS CORRECT OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "GET PAYMENT BANK LIST",
        secret
      );
    }
    //CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "GET PAYMENT BANK LIST",
        secret
      );
    }

    var sql = "";
    if (cust_id != null) {
      sql = `select custbank_id,bank_name,cheque_no,cheque_amount from customerpaymentbanks where cpayment_id IN(select cpayment_id from customerpayments where customer_id = ${cust_id})`;
    }
    if (sql != "") {
      const rows = await db.query(sql);
      const data = JSON.stringify(helper.emptyOrRows(rows));
      console.log(data);
      return helper.getSuccessResponse(
        "PAYMENTBANK_LIST_FETCHED_SUCCESSFULLY",
        "The Customer Payment Bank List Fetched Successfully",
        data,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "PAYMENTBANK_LIST_FETCHING_ERROR",
        "Error While Fetching Customer Payment Bank List",
        "error",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "PAYMENTBANK_LIST_FETCHING_ERROR",
      "Error While Fetching Customer Payment Bank List",
      er,
      secret
    );
  }
}

//####################################################################################################################################################################################################
//####################  VERIFY REGISTERED CUSTOMER  #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to register the customer
//Input data
//   {
//    "querystring":"656e15ce-b442-11ed-997a-b42e9923475f"
//    }
//Validation rule
//      1. If the token is not available in the db, just show "TOKEN IS INVALID"
//      2. If the token is available, But already verified , Just show "EMAIL / PHONE is already verified"
//      3. If the token is available, and not verified Just show "EMAIL / PHONE is verified successfully"
//####################################################################################################################################################################################################

async function verifyaccount(customer) {
  console.log("acttoken ->" + customer.querystring);
  const [result] = await db.spcall(
    "CALL SP_ACTVERIFY_UPDATE(?,@ecode,@emsg);select @ecode,@emsg;",
    [customer.querystring]
  );
  const objectValue1 = result[1][0];
  const errorcode = objectValue1["@ecode"];
  const errormessage = objectValue1["@emsg"];
  console.log("errorcode=>" + errorcode);
  console.log("errormessage=>" + errormessage);
  if (errormessage == null) {
    return helper.getSuccessResponse(
      "ACT_VERIFY_SUCCESS",
      "Your Account Has Been Verified Successfully.",
      "",
      customer.Secret
    );
  } else {
    return helper.getErrorResponse(
      errorcode,
      "Server Error. Please Try again later.",
      errormessage,
      customer.Secret
    );
  }
}

//##############################################################################################################################################################################################################
//######################## ADD NEW SUBSCRIPTION TO THE CUSTOMER  #######################################################################################################################################################################
//##############################################################################################################################################################################################################

async function indisubscription(customer) {
  try {
    //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "ADD NEW CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    //check if the sessiontoken size is valid or not
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "ADD NEW CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    //CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [customer.STOKEN]
    );
    const objectvalue = result[1][0];
    console.log("subscription objectvalue->" + objectvalue["@result"]);
    const userid = objectvalue["@result"];
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "ADD NEW CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    const custid = objectvalue["@result"];

    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "CUST_QUERYSTRING_MISSING",
        "Subscription querystring is missing. Please provide a valid query string.",
        "CUSTOMER ADD SUBSCRIPTION",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "Error in subscription querystring. Please provide a valid querystring.",
        "CUSTOMER ADD SUBSCRIPTION",
        secret
      );
    }
    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing JSON querystring. Please provide a valid JSON string.",
        "CUSTOMER ADD SUBSCRIPTION",
        secret
      );
    }

    if (queryData.hasOwnProperty("packagename") == false) {
      return helper.getErrorResponse(
        "CUST_SUBSCRIPTION_NAME_MISSING",
        "Customer subscription name is missing. Please provide a valid subscription name.",
        "CUSTOMER ADD SUBSCRIPTION",
        secret
      );
    }
    if (queryData.hasOwnProperty("amount") == false) {
      return helper.getErrorResponse(
        "CUST_SUBSCRIPTION_AMOUNT_MISSING",
        "Customer subscription amount is missing. Please provide a valid subscription amount.",
        "CUSTOMER ADD SUBSCRIPTION",
        secret
      );
    }
    if (queryData.hasOwnProperty("customerid") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_ID_MISSING",
        "Customer ID is missing. Please provide a valid customer ID.",
        "CUSTOMER ADD SUBSCRIPTION",
        secret
      );
    }

    const [result1] = await db.spcall(
      "CALL SP_INDIVI_SUBSCRIPTION_ADD(?,?,@subid,@pacname,@prdesc,@noofcam,@valyears,@add1cam); select @subid,@pacname,@prdesc,@noofcam,@valyears,@add1cam",
      [queryData.packagename, queryData.amount]
    );
    const objectvalue1 = result1[1][0];
    const subscription_id = objectvalue1["@subid"];
    console.log(objectvalue1["@subid"]);
    const arrayvalues = Object.values(objectvalue1);
    console.log("array values : " + arrayvalues);
    if (arrayvalues != null) {
      try {
        const [result3] = await db.spcall(
          "CALL SP_CUST_SUBSCRIPTION_ADD(?,?,?,?,?,?,?,@result);select @result;",
          [
            queryData.customerid,
            subscription_id,
            queryData.amount,
            0,
            queryData.amount,
            1,
            5,
          ]
        );
        const objectvalue3 = result3[1][0];
        console.log(
          "New Subscription, objectValue -> " + objectvalue3["@result"]
        );

        if (objectvalue3["@result"] == null) {
          //      13. If the package id is already exist, show error
          return helper.getErrorResponse(
            "CUST_PACKAGE_ADD_ERROR",
            "Error adding package to customer. Please try again later.",
            "CUSTOMER ADD SUBSCRIPTION",
            secret
          );
        } else {
          var custsubid = objectvalue3["@result"];
          //Send Email to the customer for new subscription
          sql = `SELECT * from customersubscriptiontrans where custsub_id=${custsubid}`;
          console.error(`SQL data==>`, sql);
          if (sql != "") {
            const rows = await db.query(sql);
            const data = helper.emptyOrRows(rows);
            var pfeatures = "";
            var i = 1;
            data.forEach((element) => {
              pfeatures += "" + i + ".";
              if (element.trans_type == 0) pfeatures += "No of sites";
              if (element.trans_type == 1) pfeatures += "No of devices";
              if (element.trans_type == 2) pfeatures += "No of Channels";
              if (element.trans_type == 3) pfeatures += "Addl Channels";
              if (element.trans_type == 4) pfeatures += "Addl Devices";
              if (element.trans_type == 5) pfeatures += "Addl Site";
              if (element.trans_type == 6) pfeatures += "Cloud Storage";
              if (element.trans_type == 7) pfeatures += "Addl Storage";
              if (element.trans_type == 8) pfeatures += "No of patrols";
              if (element.trans_type == 9) pfeatures += "Patrol Hours";
              if (element.trans_type == 10) pfeatures += "Addl patrol";
              if (element.trans_type == 11) pfeatures += "AI features";

              pfeatures += "   " + element.tot_qty + "     ";
              pfeatures += "   " + element.amount + ".\n\r";
              i++;
            });
            console.log("pfeatures=>" + pfeatures);
            // var billingcyclestr = "";
            // if (queryData.billingcycle==1)
            //   billingcyclestr=queryData.billingcycle+"st ";
            // if (queryData.billingcycle==2)
            //   billingcyclestr=queryData.billingcycle+"nd ";
            // if (queryData.billingcycle==3)
            //   billingcyclestr=queryData.billingcycle+"rd ";
            // if (queryData.billingcycle>3)
            //   billingcyclestr=queryData.billingcycle+"th ";

            // billingcyclestr=billingcyclestr+"of every month.";
            // console.log("billingcyclestr=>"+billingcyclestr);
            //  EmailSent = await mailer.sendEmail(customername,customeremail,"NEW SUBSCRIPTION","newsubscription.html","","NEWSUB_EMAIL_CONF",queryData.packagename,billingcyclestr,pfeatures);
            return helper.getSuccessResponse(
              "CUST_PACKAGE_ADD_SUCCESS",
              "Package successfully added to customer.",
              "CUSTOMER ADD SUBSCRIPTION ",
              pfeatures,
              secret
            );
          } else {
            return helper.getSuccessResponse(
              "CUST_PACKAGE_ADD_SUCCESS",
              "Package successfully added to customer.",
              "CUSTOMER ADD SUBSCRIPTION ",
              pfeatures,
              secret
            );
          }
        }
      } catch (ex) {
        return helper.getErrorResponse(
          "SUBSCRIPTION_ADD_FAILED",
          er,
          "CUSTOMER ADD SUBSCRIPTION",
          secret
        );
      }
    }
  } catch (err) {
    return helper.getErrorResponse(
      "SUBSCRIPTION_ADD_FAILED",
      er,
      "CUSTOMER ADD SUBSCRIPTION",
      secret
    );
  }
}

//#####################################################################################################################################################################################
//#####################################################################################################################################################################################
//#####################################################################################################################################################################################

function validateStartDate(startDate) {
  // Regular expression for yyyy-mm-dd format
  var dateFormat = /^\d{4}-\d{2}-\d{2}$/;

  // Check if startDate matches the yyyy-mm-dd format
  if (!dateFormat.test(startDate)) {
    return false; // Invalid format
  }

  // Check if the date is valid
  var parts = startDate.split("-");
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  var dateObject = new Date(year, month - 1, day); // Note: month is zero-based

  if (
    dateObject.getFullYear() !== year ||
    dateObject.getMonth() + 1 !== month ||
    dateObject.getDate() !== day
  ) {
    return false; // Invalid date
  }

  return true; // Valid format and date
}
//####################################################################################################################################################################################################
//#################### NEW SUBSCRIPTION TO CUSTOMER ##############################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add new subscription to the customer
//Input data
//  {
//  "SESSIONTOKEN" : "12345",
//  "packagename":"textsub1",
//  "packageid":1,
//  "amount":1,
//  "taxamount":1,
//  "billingcycle":1,
//  "gracetime":1,
//  }
//#################################################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the package name is valid
//          d) Check the package ID is valid
//          e) Check the package amount is valid
//          f) Check the tax amount is valid
//          g) Check the billing cycle is valid
//          h) Check the grace time is valid
//      3. Get Customer ID from the session
//      4. Add subscrion to the customer
//      5. If more than one subscrion to the customer, then show warning "You are adding more subscritions to the same company. Are you are to add?".
//      6. Add subscription master record for the customer
//      7. Add the subscription features record for the customer
//      8. Encripted response
//      9. Send Email for new subscription confirmation
//      10. Send Email/SMS for subcribed new packages
//      11. Send Email
//      12. Send SMS
//      13. If the package id is already exist, show error
//      14. If any DB error occurs during the addition
//####################################################################################################################################################################################################
async function newsubscription(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "CUSTOMER ADD SUBSCRIPTION",
        ""
      );
    }
    //Begin Validation 1. SESSION TOKEN VALIDATION
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "CUSTOMER ADD SUBSCRIPTION",
        ""
      );
    }
    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log("New Subscription, objectValue->" + objectValue1["@result"]);
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "CUSTOMER ADD SUBSCRIPTION",
        ""
      );
    }

    //End of Validation 1
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "Error in the querystring. Please provide a valid querystring.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        customer.secret
      );
    }
    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing JSON data in the query string. Please provide valid JSON data.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        customer.secret
      );
    }
    //  c) Check the package name is valid
    if (queryData.hasOwnProperty("packagename") == false) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_NAME_MISSING",
        "Subscription package name is missing. Please provide a valid package name.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the package ID is valid
    if (queryData.hasOwnProperty("packageid") == false) {
      return helper.getErrorResponse(
        "SUBSCRIPTION_PACKAGE_ID_MISSING",
        "Subscription package ID is missing. Please provide a valid package ID.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the package Amount is valid
    if (queryData.hasOwnProperty("amount") == false) {
      return helper.getErrorResponse(
        "SUBSCRIPTION_PACKAGE_AMOUNT_MISSING",
        "Subscription package amount is missing. Please provide a valid package amount.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the TAX is valid
    if (queryData.hasOwnProperty("startdate") == false) {
      return helper.getErrorResponse(
        "SUBSCRIPTION_START_DATE_MISSING",
        "Subscription start date is missing. Please provide a valid start date.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the TAX is valid
    if (queryData.hasOwnProperty("enddate") == false) {
      return helper.getErrorResponse(
        "SUBSCRIPTION_END_DATE_MISSING",
        "Subscription end date is missing. Please provide a valid end date.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the TAX is valid
    if (!validateStartDate(queryData.startdate)) {
      return helper.getErrorResponse(
        "INVALID_SUBSCRIPTION_START_DATE ",
        "Subscription start date is invalid. Please provide a valid start date.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the TAX is valid
    if (!validateStartDate(queryData.enddate)) {
      return helper.getErrorResponse(
        "INVALID_SUBSCRIPTION_END_DATE",
        "Subscription end date is invalid. Please provide a valid end date.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the billing cycle is valid
    if (queryData.hasOwnProperty("billingcycle") == false) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_BCYCLE_MISSING",
        "Customer package billing cycle is missing. Please provide a valid billing cycle.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  d) Check the grace time is valid
    if (queryData.hasOwnProperty("gracetime") == false) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_GTIME_MISSING",
        "Customer package grace period is missing. Please provide a valid grace period.",
        "CUSTOMER ADD SUBSCRIPTION",
        "error",
        secret
      );
    }
    //End of Validation 2

    //Begin Validation:- 3. Get Customer ID from the session
    var custID = objectValue1["@custid"];
    console.log("custID==>" + custID);
    //End of Validation:- 3. Get Customer ID from the session

    //Begin Validation:- 4. Add subscrion to the customer
    try {
      const [result2] = await db.spcall(
        "CALL SP_CUST_SUBSCRIPTION_ADD(?,?,?,?,?,?,?,?,?,@result);select @result;",
        [
          custID,
          queryData.packageid,
          queryData.amount,
          0,
          queryData.amount,
          queryData.billingcycle,
          queryData.gracetime,
          queryData.startdate,
          queryData.enddate,
        ]
      );
      const objectValue2 = result2[1][0];
      console.log(
        "New Subscription, objectValue -> " + objectValue2["@result"]
      );

      if (objectValue2["@result"] == null) {
        //      13. If the package id is already exist, show error
        return helper.getErrorResponse(
          "ERROR_ADDING_SUBSCRIPTION",
          "Error while adding the Subscription.",
          "error",
          secret
        );
      } else if (objectValue2["@result"] == "Already Exists") {
        return helper.getErrorResponse(
          "PACKAGE_ALREADY_EXISTS",
          "The package already added.",
          "error",
          secret
        );
      } else {
        var custsubid = objectValue2["@result"];
        //Send Email to the customer for new subscription
        sql = `SELECT * from customersubscriptiontrans where custsub_id=${custsubid}`;
        console.error(`SQL data==>`, sql);
        if (sql != "") {
          const rows = await db.query(sql);
          const data = helper.emptyOrRows(rows);
          var pfeatures = "";
          var i = 1;
          data.forEach((element) => {
            pfeatures += "" + i + ".";
            if (element.trans_type == 0) pfeatures += "No of sites";
            if (element.trans_type == 1) pfeatures += "No of devices";
            if (element.trans_type == 2) pfeatures += "No of Channels";
            if (element.trans_type == 3) pfeatures += "Addl Channels";
            if (element.trans_type == 4) pfeatures += "Addl Devices";
            if (element.trans_type == 5) pfeatures += "Addl Site";
            if (element.trans_type == 6) pfeatures += "Cloud Storage";
            if (element.trans_type == 7) pfeatures += "Addl Storage";
            if (element.trans_type == 8) pfeatures += "No of patrols";
            if (element.trans_type == 9) pfeatures += "Patrol Hours";
            if (element.trans_type == 10) pfeatures += "Addl patrol";
            if (element.trans_type == 11) pfeatures += "AI features";

            pfeatures += "   " + element.tot_qty + "     ";
            pfeatures += "   " + element.amount + ".\n\r";
            i++;
          });
          console.log("pfeatures=>" + pfeatures);
          var billingcyclestr = "";
          if (queryData.billingcycle == 1)
            billingcyclestr = queryData.billingcycle + "st ";
          if (queryData.billingcycle == 2)
            billingcyclestr = queryData.billingcycle + "nd ";
          if (queryData.billingcycle == 3)
            billingcyclestr = queryData.billingcycle + "rd ";
          if (queryData.billingcycle > 3)
            billingcyclestr = queryData.billingcycle + "th ";

          billingcyclestr = billingcyclestr + "of every month.";
          console.log("billingcyclestr=>" + billingcyclestr);
          // EmailSent = await mailer.sendEmail(customername,customeremail,"NEW SUBSCRIPTION","newsubscription.html","","NEWSUB_EMAIL_CONF",queryData.packagename,billingcyclestr,pfeatures);
          return helper.getSuccessResponse(
            "CUST_PACKAGE_ADD_SUCCESS",
            "The subscription Added Successfully",
            objectValue2["@result"],
            secret
          );
        } else {
          return helper.getSuccessResponse(
            "CUST_PACKAGE_ADD_SUCCESS",
            "The subscription Added Successfully",
            objectValue1["@result"],
            secret
          );
        }
      }
    } catch (ex) {
      //      14. If any DB error occurs during the addition
      return helper.getErrorResponse(
        "ERROR_ADDING_SUBSCRIPTION",
        "Error adding subscription package",
        er,
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "ERROR_ADDING_SUBSCRIPTION",
      "Error adding subscription package",
      er,
      secret
    );
  }
  //End of Validation:- 4. Add subscrion to the customer
}

//####################################################################################################################################################################################################
//####################   ADD CUSTOMWER ITEMS TO THE SUBSCRIOTION  ##############################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add new customer items to the subscription for billing
//Input data
//  {
//  "SESSIONTOKEN" : "12345",
//  "mypackageid":"textsub1",
//  "billtotype":1,
//  "billsourceid":1,
//  "pan_gst":"1",
//  "billingcycle":1,
//  "billdate":"2023-03-06",
//  "gracetime":1,
//  "billemail":"ponraj4you@gmail.com",
//  "billcontactno":"9176470750",
//  "billingname":"TEST COMPANY NAME",
//  "contactname":"contactpersonname",
//  "billaddress":"TEST COMPANY NAME ADDRESS"
//  }
//####################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the package name is valid
//          d) Check the subscribed item billtotype is valid
//          e) Check the subscribed billsourceid is valid
//          f) Check the TAX(PAN or GST) is valid
//          g) Check the billing cycle is valid
//          h) h) Check the grace time is valid
//      3. If the mypackageid is not subscribed by that user, return "Product was not purchased by you"
//      4. Billing cycle should not exceed 5
//      5. Check the Pan or GST, it can be null
//      6. Check whether the bill source id is already there in the DB
//      7. If already available, throw error 'The Subscription for this site/company is already added for billing'
//      8. if new items, then show "The Subscription for this site/company is added successfully."
//####################################################################################################################################################################################################
async function addsubscriptionbilling(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "CUSTOMER SUBSCRIPTION",
        ""
      );
    }

    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log("New Subscription, objectValue->" + objectValue1["@result"]);
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "CUSTOMER SUBSCRIPTION",
        ""
      );
    }

    //End of Validation 1
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "CUSTOMER SUBSCRIPTION",
        "error",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "Error in the querystring. Please provide a valid querystring.",
        "CUSTOMER SUBSCRIPTION",
        "error",
        secret
      );
    }

    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing JSON data in the query string. Please provide valid JSON data.",
        "CUSTOMER SUBSCRIPTION",
        "error",
        secret
      );
    }
    //  c) Check the package name is valid
    if (queryData.hasOwnProperty("mypackageid") == false) {
      return helper.getErrorResponse(
        "SUBSCRIPTION_PACKAGE_ID_MISSING",
        "Subscription package ID is missing. Please provide a valid package ID.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //  d) Check the subscribed item billtotype is valid
    if (queryData.hasOwnProperty("billtotype") == false) {
      return helper.getErrorResponse(
        "CUST_BILLTOTYPE_MISSING",
        "Customer billing type is missing. Please provide a valid billing type.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //  e) Check the subscribed billsourceid is valid
    if (queryData.hasOwnProperty("billsourceid") == false) {
      return helper.getErrorResponse(
        "CUST_BILLSOURCEID_MISSING",
        "Customer bill source ID is missing. Please provide a valid bill source ID.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //  f) Check the TAX(PAN or GST) is valid
    if (queryData.hasOwnProperty("pan_gst") == false) {
      return helper.getErrorResponse(
        "CUST_PANGST_TAX_MISSING",
        "Customer PAN , GST is missing. Please provide a valid PAN , GST.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //  g) Check the billing cycle is valid
    if (queryData.hasOwnProperty("billingcycle") == false) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_BCYCLE_MISSING",
        "Customer package billing cycle is missing. Please provide a valid billing cycle.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //  h) Check the grace time is valid
    if (queryData.hasOwnProperty("gracetime") == false) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_GTIME_MISSING",
        "Customer package grace time is missing. Please provide a valid grace time.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //End of validation 2
    //Begin Validation:- 4.Billing cycle should not exceed 5
    if (queryData.billingcycle > 5) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_BCYCLE_INVALID",
        "Invalid billing cycle for the customer package. Please provide a valid billing cycle.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //End of Validation:- 4.Billing cycle should not exceed 5
    //Begin Validation:- 5. Check the Pan or GST, it can be null
    if (queryData.pan_gst.length > 50) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_PANGST_INVALID",
        "Invalid PAN GST for the customer package. Please provide a valid PAN GST.",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    }
    //End of Validation:- 5. Check the Pan or GST, it can be null

    //Begin Validation:- 3.If the mypackageid is not subscribed by that user, return "Product was not purchased by you"
    var custID = objectValue1["@custid"];
    var customername = objectValue1["@custname"];
    var customeremail = objectValue1["@custemail"];
    console.log("custID==>" + custID);
    const result2 = await db.query(
      "SELECT FN_ISCUSTOMERPACKAGE(" +
        custID +
        "," +
        queryData.mypackageid +
        ") IsSubscribed;"
    );
    console.log("helper->" + result2);
    if (result2[0]) {
      const IsSubscribed = result2[0].IsSubscribed;
      if (IsSubscribed == 0) {
        return helper.getErrorResponse(
          "CUST_PACKAGE_NOT_PURCHASED",
          "Customer has not purchased the package. Please purchase the package to proceed.",
          "CUSTOMER SUBSCRIPTION",
          secret
        );
      } else {
        try {
          const [result3] = await db.spcall(
            "CALL SP_CUST_BILLMASTER_ADD(?,?,?,?,?,?,?,?,?,?,?,?,@result);select @result;",
            [
              queryData.mypackageid,
              queryData.billtotype,
              queryData.billsourceid,
              queryData.pan_gst,
              queryData.billingcycle,
              queryData.billdate,
              queryData.gracetime,
              queryData.billemail,
              queryData.billcontactno,
              queryData.billingname,
              queryData.contactname,
              queryData.billaddress,
            ]
          );
          const objectValue3 = result3[1][0];
          if (objectValue3["@result"] == null) {
            return helper.getErrorResponse(
              "CUST_PACKAGEITEM_ADD_ERROR",
              "Error adding item to the customer's package. Please try again later.",
              "CUSTOMER SUBSCRIPTION",
              secret
            );
          } else {
            if (objectValue3["@result"] == 0) {
              return helper.getErrorResponse(
                "CUST_PACKAGE_ALREADY_ADDED",
                "The package has already been added to the customer's account.",
                "CUSTOMER SUBSCRIPTION",
                secret
              );
            } else {
              return helper.getSuccessResponse(
                "CUST_PACKAGE_ADD_SUCCESS",
                "The Customer package was added successfully for subscription billing.",
                objectValue3["@result"],
                secret
              );
            }
          }
        } catch (ex) {
          const errorcode = ex.code;
          const errormessage = ex.message;
          return helper.getErrorResponse(errorcode, errormessage, ex, secret);
          //return {errorcode,errormessage};
        }
      }
    }
  } catch (er) {
    return helper.getErrorResponse(
      "ERROR_GENERATING_THE_BILL",
      "Unable to generate the billing.",
      er,
      secret
    );
  }
  //End of Validation:- 3. If the mypackageid is not subscribed by that user, return "Product was not purchased by you"
}
//################################################################################################################################################################################################################
//######################## CHECK IF THE IF CUSTOMER IS FIRST TIME USER########################################################################################################################################################################################
//################################################################################################################################################################################################################

async function checkfirsttimeuser(customer) {
  try {
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        " IS CUSTOMER FIRST TIME USER",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [customer.STOKEN]
    );
    const objectvalue = result[1][0];
    console.log("FIRST TIME USER OBJECTVALUE->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "IS CUSTOMER FIRST TIME USER",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "IS CUSTOMER FIRST TIME USER",
        ""
      );
    }
    //Get secret key value from the stoken by taking the first 16 characters of Stoken

    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret key->" + secret);

    //CHECK IF THE CUSTOMER LOGIN IN FIRST TIME
    const userid = objectvalue["@result"];
    const result1 = await db.query(
      "select IsFirstTime from usermaster where user_id = ?",
      [userid]
    );
    const objectvalue1 = result1[0];
    const firsttime = objectvalue1["IsFirstTime"];
    if (firsttime != null) {
      if (firsttime == 1) {
        return helper.getSuccessResponse(
          "CUSTOMER_IS_FIRST_TIME",
          "IS CUSTOMER FIRST TIME USER",
          firsttime,
          secret
        );
      } else {
        return helper.getSuccessResponse(
          "CUSTOMER_IS_NOT_FIRST_TIME",
          "IS CUSTOMER FIRST TIME USER",
          firsttime,
          secret
        );
      }
    }
  } catch (er) {
    return helper.getErrorResponse(
      "ERROR_FETCHING_FIRST_TIME_USER",
      "Error Fetching the User Type",
      "FIRST TIME USER",
      secret
    );
  }
}

//####################################################################################################################################################################################################
//####################   ADD NEW COMPANY TO CUSTOMER   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add a new company to the customer
//Input data
// {
//   "companyname":"TestCompany1",
//   "contactemail":"ponraj4you@gmail.com",
//   "contactphone":"8838360294",
//   "address":"Test Address1",
//   "companytype":0
// }
//####################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the companyname is valid
//          d) Check the contactemail is valid
//          e) Check the contactphone is valid
//          f) Check the address is valid
//          g) Check the companytype is valid
//      3. Email id should be valid email format
//      4. Phone number should not be greater than 15 and should not be less than 8 number.
//      5. Company type should not be more than 2
//      6. Send OTP Email, if already verified email, donot send it
//      7. Send OTP SMS, if already verified email, donot send it
//####################################################################################################################################################################################################
async function addcompany(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Please provide the sessiontoken.",
        "ADD COMPANY",
        ""
      );
    }
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Please Provide the sessiontoken with the valid size.",
        "ADD COMPANY",
        ""
      );
    }

    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log("Add company, objectValue->" + objectValue1["@result"]);
    const user_id = objectValue1["@result"];
    const custID = objectValue1["@custid"];
    console.log("customer id->" + custID);
    if (user_id == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Please Provide the Valid Sessiontoken.",
        "CUSTOMER ADD COMPANY",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);

    //End of Validation 1

    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Please provide the Querystring data",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "Please provide the querystring with valid data",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Please provide the querystring with valid json",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //          c) Check the companyname is valid
    if (queryData.hasOwnProperty("companyname") == false) {
      return helper.getErrorResponse(
        "CUST_COMPANY_NAME_MISSING",
        "The Customer company name missing",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //check if the companyname is valid
    if (queryData.hasOwnProperty("companylegalname") == false) {
      return helper.getErrorResponse(
        "COMPANY_LEGAL_NAME_MISSING",
        "The Customer company legal name missing",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //Check if the companycode is given as an input or not
    if (queryData.hasOwnProperty("companycode") == false) {
      return helper.getErrorResponse(
        "COMPANY_CODE_MISSING",
        "The Customer company code missing.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //          d) Check the contactemail is valid
    if (queryData.hasOwnProperty("contactperson") == false) {
      return helper.getErrorResponse(
        "CUST_COMPANY_CONTACT_PERSON_MISSING",
        "The Company contact person name missing",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //)check if the contact person number is given as an input or not
    if (queryData.hasOwnProperty("contactpersonno") == false) {
      return helper.getErrorResponse(
        "CUST_CONTACT_PERSON_NUMBER_MISSING",
        "The Company contact person number missing",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //          e) Check the contactphone is valid
    if (queryData.hasOwnProperty("contactemail") == false) {
      return helper.getErrorResponse(
        "CUST_COMPANY_CONTACT_EMAIL_MISSING",
        "The Company contact person email id is missing",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //          f) Check the address is valid
    if (queryData.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        "CUST_COMPANY_ADDRESS_MISSING",
        "The Customer Company address missing.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //          g) Check the billing address is valid
    if (queryData.hasOwnProperty("billingaddress") == false) {
      return helper.getErrorResponse(
        "CUST_COMPANY_BILLING_ADDRESS_MISSING",
        "The Customer company billing address missing.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    // a) check if the pan number is given is given as input or noy
    if (queryData.hasOwnProperty("pannumber") == false) {
      return helper.getErrorResponse(
        "CUST_PAN_NUMBER_MISSING",
        "PAN number is missing. Please provide a valid PAN number.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    if (queryData.hasOwnProperty("cinno") == false) {
      return helper.getErrorResponse(
        "CUST_CIN_NUMBER_MISSING",
        "CIN number is missing. Please provide a valid CIN number.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    if (queryData.hasOwnProperty("gstno") == false) {
      return helper.getErrorResponse(
        "CUST_GST_NUMBER_MISSING",
        "GST number is missing. Please provide a valid GST number.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //End of Validation 2

    //Begin Validation:- 2. The name field should get updated to first character of a word to uppercase
    const str = queryData.companyname;
    const Fullname = str.charAt(0).toUpperCase() + str.slice(1);
    //End of Validation:- 2
    //Validation RULE 3 was set at the DB-Trigger
    if (
      queryData.contactemail.indexOf(".") == -1 ||
      queryData.contactemail.indexOf("@") == -1
    ) {
      return helper.getErrorResponse(
        "COMPANY_EMAIL_VALID_ERROR",
        "The provided email is invalid. Please provide a valid email address.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //Begin Validation:- 4. Phone number should not be greater than 15 and should not be less than 8 number.
    if (
      queryData.contactpersonno.length > 15 ||
      queryData.contactpersonno.length < 8
    ) {
      return helper.getErrorResponse(
        "COMPANY_PHONE_SIZE_ERROR",
        "The provided phone number does not meet the required size. Please provide a valid phone number.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    if (helper.phonenumber(queryData.contactpersonno)) {
      console.log("Valid");
    } else {
      console.log("Invalid");
      return helper.getErrorResponse(
        "COMPANY_PHONE_VALID_ERROR",
        "The provided phone number is invalid. Please provide a valid phone number.",
        "CUSTOMER ADD COMPANY",
        secret
      );
    }
    //End of Validation:- 4
    //Begin Validation:- 5. Company type should not be greater than 2
    //End of Validation:- 5

    try {
      console.log("user id ->" + user_id);
      //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
      const [result] = await db.spcall(
        "CALL SP_CUST_COMPANY_ADD(?,?,?,?,?,?,?,?,?,?,?,@cid);select @cid;",
        [
          2,
          custID,
          queryData.companyname,
          queryData.companylegalname,
          queryData.companycode,
          queryData.contactperson,
          queryData.contactemail,
          queryData.contactpersonno,
          queryData.address,
          queryData.billingaddress,
          user_id,
        ]
      );
      const objectValue1 = result[1][0];
      const mcustID = objectValue1["@cid"];
      console.log("custID=>" + mcustID);
      if (mcustID == null) {
        return helper.getErrorResponse(
          "ERROR_ADDING_COMPANY",
          "Error adding the company",
          "CUSTOMER ID NOT FOUND",
          secret
        );
      }
      try {
        if (mcustID != null) {
          const [pan] = await db.spcall(
            "CALL SP_PANNO_ADD(?,?,@panid); select @panid",
            [user_id, queryData.pannumber]
          );
          const objectvalu = pan[1][0];
          console.log("pan number->" + objectvalu["@panid"]);
        }
      } catch (er) {
        return helper.getErrorResponse(
          "COMPANY_PANNO_ADD_FAILED",
          "Error adding the pan number.",
          "CUSTOMER ADD COMPANY",
          secret
        );
      }
      try {
        if (mcustID != null) {
          const [gst] = await db.spcall(
            "CALL SP_GSTNUMBER_ADD(?,?,@gstnoid); select @gstnoid",
            [user_id, queryData.gstno]
          );
          const objectvalue2 = gst[1][0];
          console.log("gst number" + objectvalue2["@gstnoid"]);
        }
      } catch (er) {
        return helper.getErrorResponse(
          "COMPANY_GSTNUMBER_ADD_FAILED",
          "Error adding the company gst number.",
          "CUSTOMER ADD COMPANY",
          secret
        );
      }
      try {
        if (mcustID != null) {
          const [cinno] = await db.spcall(
            "CALL SP_CIN_NO_ADD(?,?,@cinnoid); select @cinnoid",
            [user_id, queryData.cinno]
          );
          const objectcin = cinno[1][0];
          console.log("cin no id" + objectcin["@cinnoid"]);
        }
      } catch (er) {
        return helper.getErrorResponse(
          "COMPANY_CIN_NO_ADD_FAILED",
          "The customer company cin number was not added",
          "",
          secret
        );
      }
      //End of Validation:- 6
      if (mcustID != null) {
        return helper.getSuccessResponse(
          "COMPANY_ADD_SUCCESS",
          "Company added successfully.",
          "CUSTOMER ADDCOMPANY",
          mcustID,
          secret
        );
      } else {
        return helper.getErrorResponse(
          "ERROR_ADDING_COMPANY",
          "Error adding the company. Please try again later",
          "CUSTOMER ADD COMPANY",
          secret
        );
      }
      // else
      // {
      //   if (EmailSent==false)
      //     return helper.getErrorResponse("COMPANY_EMAIL_SENT_ERROR","CUSTOMER ADDCOMPANY",secret);
      //   if (SMSSent==false)
      //     return helper.getErrorResponse("COMPANY_PHONE_SENT_ERROR","CUSTOMER ADDCOMPANY",secret);
      // }

      // else
      // {
      //   return helper.getErrorResponse("COMPANY_ERROR","CUSTOMER ADDCOMPANY",secret);
      // }
    } catch (ex) {
      if (ex.sqlMessage == "Wrong phone number")
        return helper.getErrorResponse(
          "COMPANY_PHONE_SIZE_ERROR",
          "Company contact person phone number Invalid.",
          "CUSTOMER ADDCOMPANY",
          secret
        );
      else if (ex.sqlMessage == "Wrong Email")
        return helper.getErrorResponse(
          "COMPANY_EMAIL_VALID_ERROR",
          "Company contact email address Invalid.",
          "CUSTOMER ADDCOMPANY",
          secret
        );
      else console.log({ ex });
      return helper.getErrorResponse(
        "ERROR_ADDING_COMAPANY",
        "Error while adding the company. Please contact the administration.",
        er,
        secret
      );
    }

    const responseData = { responsecode, message };
    responseData = JSON.parse(
      '{"message":' +
        helper.encrypt(responseData, helper.getEncryptionKey()) +
        "}"
    );
    return { responseData };
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//#####################################################################################################################################################################################################
//########################### ADD CUSTOMER INDIVIDUAL ##########################################################################################################################################################################
//###########################################################################################################################################################################################################

async function addindividual(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "CUSTOMER ADD INDIVIDUAL",
        ""
      );
    }
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid sessiontoken size. Please provide a valid sessiontoken.",
        "CUSTOMER ADD INDIVIDUAL",
        ""
      );
    }

    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log("Add individual, objectValue->" + objectValue1["@result"]);
    const userid = objectValue1["@result"];
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid sessiontoken. Please provide a valid sessiontoken.",
        "CUSTOMER ADD INDIVIDUAL",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);

    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "Error in the querystring. Please provide a valid querystring.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }

    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing JSON data in the querystring. Please provide valid JSON data.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }

    //          c) Check the FIRSTname is valid
    if (queryData.hasOwnProperty("name") == false) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_NAME_MISSING",
        "Individual name is missing. Please provide a valid name.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //          g) Check the email is valid
    if (queryData.hasOwnProperty("email") == false) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_EMAIL_ID_MISSING",
        "Individual email ID is missing. Please provide a valid email ID.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }

    //          e) Check the contactphone is valid
    if (queryData.hasOwnProperty("phoneno") == false) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_PHONE_NUMBER_MISSING",
        "Individual phone number is missing. Please provide a valid phone number.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //        d) Check the lastname is valid
    if (queryData.hasOwnProperty("dateofbirth") == false) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_DATEOFBIRTH_MISSING",
        "Individual date of birth is missing. Please provide a valid date of birth.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //          f) Check the address is valid
    if (queryData.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_ADDRESS_MISSING",
        "Individual address is missing. Please provide a valid address.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //          g) Check the billingaddress is valid
    if (queryData.hasOwnProperty("billingaddress") == false) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_BILLING_ADDRESS_MISSING",
        "Individual billing address is missing. Please provide a valid billing address.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //          g) Check the idtype is valid
    // if(queryData.hasOwnProperty('selectIdType')==false){
    //   return helper.getErrorResponse("ADD_INDIVIDUAL_SELECT_TYPE","CUSTOMER ADD INDIVIDUAL","");
    // }
    // if(queryData.hasOwnProperty('idNumber')==false){
    //   return helper.getErrorResponse("ADD_INDIVIDUAL_ID_NUMBER_MISSING","CUSTOMER ADD INDIVIDUAL","");
    // }
    // if(queryData.hasOwnProperty('fileimage')==false){
    //   return helper.getErrorResponse("ADD_INDIVIDUAL_FILE_IMAGE_MISSING","CUSTOMER ADD INDIVIDUAL","");
    // }
    // else{
    //   try {
    //     if (queryData.fileimage == undefined) {
    //       return res.status(400).send({ message: "Please upload a file!" });
    //     }
    //     queryData.fileimage.status(200).send({
    //     message: "Uploaded the file successfully: " + req.file.originalname,
    //     });
    //   } catch (err) {
    //     queryData.fileimage.status(500).send({
    //       message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    //     });
    //   }
    // }
    var custID = objectValue1["@custid"];

    //Begin Validation:- 2. The name field should get updated to first character of a word to uppercase
    const str = queryData.name;
    const name = str.charAt(0).toUpperCase() + str.slice(1);

    //Validation RULE 3 was set at the DB-Trigger
    if (
      queryData.email.indexOf(".") == -1 ||
      queryData.email.indexOf("@") == -1
    ) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_EMAIL_VALID_ERROR",
        "Invalid email format. Please provide a valid email address.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //Begin Validation:- 4. Phone number should not be greater than 15 and should not be less than 8 number.
    if (queryData.phoneno.length > 15 || queryData.phoneno.length < 8) {
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_PHONE_SIZE_ERROR",
        "Invalid phone number size. Please provide a valid phone number.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    if (helper.phonenumber(queryData.phoneno)) {
      console.log("Valid");
    } else {
      console.log("Invalid");
      return helper.getErrorResponse(
        "ADD_INDIVIDUAL_PHONE_INVALID_ERROR",
        "Invalid phone number. Please provide a valid phone number.",
        "CUSTOMER ADD INDIVIDUAL",
        secret
      );
    }
    //End of Validation:- 4

    try {
      const [result] = await db.spcall(
        "CALL SP_CUST_INDIVIDUAL_ADD(?,?,?,?,?,?,?,?,?,?,?,@cid); select @cid",
        [
          1,
          custID,
          name,
          queryData.email,
          queryData.phoneno,
          queryData.dateofbirth,
          queryData.address,
          queryData.billingaddress,
          queryData.selectIdType,
          queryData.idNumber,
          userid,
        ]
      );
      const objectValue = result[1][0];
      const INcustID = objectValue["@cid"];
      console.log("Individual custID=>" + INcustID);

      if (INcustID != null || INcustID != 0) {
        return helper.getSuccessResponse(
          "ADD_INDIVIDUAL_SUCCESS",
          "The customer Individual was added succcessfully",
          INcustID,
          secret
        );
      } else {
        return helper.getErrorResponse(
          "ADD_INDIVIDUAL_ERROR",
          "Error adding individual. Please try again later.",
          "CUSTOMER ADD INDIVIDUAL",
          secret
        );
      }
    } catch (ex) {
      if (ex.sqlMessage == "Wrong phone number")
        return helper.getErrorResponse(
          "ADD_INDIVIDUAL_PHONE_SIZE_ERROR",
          "Invalid phone number size. Please provide a valid phone number.",
          "CUSTOMER ADD INDIVIDUAL",
          secret
        );
      else if (ex.sqlMessage == "Wrong Email")
        return helper.getErrorResponse(
          "ADD_INDIVIDUAL_EMAIL_VALID_ERROR",
          "Invalid email format. Please provide a valid email address.",
          "CUSTOMER ADD INDIVIDUAL",
          secret
        );
      else
        return helper.getErrorResponse(
          "UNEXPECTED_ERROR",
          er.message,
          er,
          secret
        );
    }

    const responseData = { responsecode, message };
    responseData = JSON.parse(
      '{"message":' +
        helper.encrypt(responseData, helper.getEncryptionKey()) +
        "}"
    );
    return { responseData };
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//####################################################################################################################################################################################################
//######################### ADD ORGANIZATION ###############################################################################################################################################################################
//####################################################################################################################################################################################################

async function addorganization(customer) {
  try {
    //check if the sessiontoken is given as input or not
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "CUSTOMER ADD ORGANIZATION",
        ""
      );
    }
    //check if the sessiontoken size is valid or not
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid sessiontoken size. Please provide a valid sessiontoken.",
        "CUSTOMER ADD ORGANIZATION",
        ""
      );
    }
    //  b) If SESSION TOKEN not available
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result[1][0];
    const user_id = objectValue1["@result"];
    var custID = objectValue1["@custid"];
    console.log("customer id->" + custID);
    if (user_id == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "CUSTOMER ADD ORGANIZATION",
        ""
      );
    }
    //check if the querystring is given as input or not

    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_QUERYSTRING_MISSING",
        "Organization querystring is missing. Please provide a valid querystring.",
        "CUSTOMER ADD ORGANISATION",
        ""
      );
    }

    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret-->" + secret);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "ORGANIZATION_QUERYSTRING_ERROR",
        "Error in the organization querystring. Please provide a valid querystring.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }

    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "ORGANIZATION_QUERYSTRING_JSON_ERROR",
        "Error parsing JSON data in the organization query string. Please provide valid JSON data.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the organization name is given as input or not
    if (queryData.hasOwnProperty("organizationname") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_ORGANIZATION_NAME_MISSING",
        "Organization name is missing. Please provide a valid name for the organization.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the organization legal name is given as input or not
    if (queryData.hasOwnProperty("organizationlegalname") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_ORGANIZATION_LEGAL_NAME_MISSING",
        "Legal name of the organization is missing. Please provide a valid legal name.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the organization code is given as an input or not
    if (queryData.hasOwnProperty("organizationcode") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_ORGANIZATION_CODE_MISSING",
        "Organization code is missing. Please provide a valid organization code.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the contact person is given as input or not
    if (queryData.hasOwnProperty("contactperson") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_CONTACT_PERSON_MISSING",
        "Contact person for the organization is missing. Please provide a valid contact person.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the contact number is given as an input or nots
    if (queryData.hasOwnProperty("contactnumber") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_CONTACT_NUMBER_MISSING",
        "Contact number for the organization is missing. Please provide a valid contact number.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the contactemail is given as an input or not
    if (queryData.hasOwnProperty("contactemail") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_CONTACT_EMAIL_MISSING",
        "Contact email for the organization is missing. Please provide a valid contact email.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the organization address is given as an input or not
    if (queryData.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_ADDRESS_MISSING",
        "Organization address is missing. Please provide a valid address.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    //check if the organization billing address is given as an input or not
    if (queryData.hasOwnProperty("billingaddress") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_BILLING_ADDRESS_MISSING",
        "Organization billing address is missing. Please provide a valid billing address.",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
    // //check if the pannumber  is given as an input or not
    // if(queryData.hasOwnProperty('pannumber')==false){
    //   return helper.getErrorResponse("ORGANIZATION_PAN_NUMBER_MISSING","CUSTOMER ADD ORGANIZATION",secret);
    // }
    // //check if the cin number is given as an input or not
    // if(queryData.hasOwnProperty('cinnumber')==false){
    //   return helper.getErrorResponse("ORGANIZATION_CIN_NUMBER_MISSING","CUSTOMER ADD ORGANIZATION",secret);
    // }
    // //check if the gst number is given as an input or not
    // if(queryData.hasOwnProperty('gstnumber')==false){
    //   return helper.getErrorResponse("ORGANIZATION_GST_NUMBER_MISSING","CUSTOMER ADD ORGANIZATION",secret);
    // }
    const [result1] = await db.spcall(
      "CALL SP_ORGANIZATION_ADD(?,?,?,?,?,?,?,?,@organizationid); select @organizationid",
      [
        2,
        queryData.organizationname,
        queryData.contactemail,
        queryData.contactperson,
        queryData.contactnumber,
        queryData.address,
        user_id,
        queryData.organizationcode,
      ]
    );
    const objectvalue1 = result1[1][0];
    console.log("organization id-->" + objectvalue1["@organizationid"]);
    const organization_id = objectvalue1["@organizationid"];
    if (organization_id != null) {
      return helper.getSuccessResponse(
        "CUSTOMER_ORGANIZATION_ADD_SUCCESS",
        "The Organization was added successfully to the customer",
        organization_id,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "CUSTOMER_ORGANIZATION_ADDED_FAILED",
        "Error adding the customer organization. Please try again later",
        "CUSTOMER ADD ORGANIZATION",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected Error happened.",
      er,
      secret
    );
  }
}

//################################################################################################################################################################################################
//#######################  ADD NEW COMPANY TO THE ORGANIZATION #########################################################################################################################################################################
//################################################################################################################################################################################################

async function addorganizationcompany(customer) {
  try {
    //CHECK IF THE SESSION TOKEN IS GIVEN AS INPUT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Session token is missing. Please provide a valid session token.",
        "ADD CUSTOMER ORGANIZATION COOMPANY",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("SECRET ->" + secret);
    //CHECK IF THE LOGIN SESSIONTOKEN SIZE IS VALID OR NOT
    if (customer.STOKEN.length < 30 || customer.STOKEN.length > 50) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid session token size. Please provide a valid session token.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [customer.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    const custID = objectvalue["@custid"];
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid session token. Please provide a valid session token.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "COMPANY_QUERYSTRING_MISSING",
        "Company querystring is missing. Please provide a valid querystring.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "Error in the querystring. Please provide a valid querystring.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing JSON data from the querystring. Please provide valid JSON data.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //CHECK IF THE ORGANIZATION ID IS GIVEN AS AN INPUT OR NOT
    if (queryData.hasOwnProperty("organizationid") == false) {
      return helper.getErrorResponse(
        "COMPANY_ORGANIZATION_ID_MISSING",
        "Organization ID is missing. Please provide a valid organization ID.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //CHECK IF THE COMPANY IS GIVEN AS INPUT OR NOT
    if (queryData.hasOwnProperty("companyname") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_NAME_MISSING",
        "Company name is missing. Please provide a valid company name.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //check if the companyname is valid
    if (queryData.hasOwnProperty("companylegalname") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_LEGAL_NAME_MISSING",
        "Legal name of the company is missing. Please provide a valid legal name.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //Check if the companycode is given as an input or not
    if (queryData.hasOwnProperty("companycode") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_CODE_MISSING",
        "Company code is missing. Please provide a valid company code.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //          d) Check the contactemail is valid
    if (queryData.hasOwnProperty("contactperson") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_CONTACT_PERSON_MISSING",
        "Contact person for the organization's associated company is missing. Please provide a valid contact person.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //)check if the contact person number is given as an input or not
    if (queryData.hasOwnProperty("contactpersonno") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_CONTACT_PERSON_NUMBER_MISSING",
        "Contact person's number for the company is missing. Please provide a valid contact number.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //          e) Check the contactphone is valid
    if (queryData.hasOwnProperty("contactemail") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_CONTACT_EMAIL_MISSING",
        "Contact email for the company is missing. Please provide a valid contact email.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //          f) Check the address is valid
    if (queryData.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_ADDRESS_MISSING",
        "Address for the organization's associated company is missing. Please provide a valid address.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //          g) Check the billing address is valid
    if (queryData.hasOwnProperty("billingaddress") == false) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_BILLING_ADDRESS_MISSING",
        "Billing address for the organization's associated company is missing. Please provide a valid billing address.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    // // // a) check if the pan number is given is given as input or noy
    // if(queryData.hasOwnProperty('pannumber')==false){
    //   return helper.getErrorResponse("ORGANIZATION_COMPANY_PAN_NUMBER_MISSING","Organization company pan number is missing","ADD CUSTOMER ORGANIZATION COMPANY",secret);
    // }
    // if(queryData.hasOwnProperty('cinno')==false){
    //   return helper.getErrorResponse("ORGANIZATION_COMPANY_CIN_NUMBER_MISSING","Organization compant cin number is missing.","ADD CUSTOMER ORGANIZATION COMPANY",secret);
    // }
    // if(queryData.hasOwnProperty('gstno')==false){
    //   return helper.getErrorResponse("ORGANIZATION_COMPANY_GST_NUMBER_MISSING","Organization company gst number is missing. please provide the pan number","ADD CUSTOMER ORGANIZATION COMPANY",secret);
    // }

    //Begin Validation:- 2. The name field should get updated to first character of a word to uppercase
    const str = queryData.companyname;
    const Fullname = str.charAt(0).toUpperCase() + str.slice(1);
    //End of Validation:- 2
    //Validation RULE 3 was set at the DB-Trigger
    if (
      queryData.contactemail.indexOf(".") == -1 ||
      queryData.contactemail.indexOf("@") == -1
    ) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_EMAIL_VALID_ERROR",
        "Email is not valid. Please provide a valid email address.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //Begin Validation:- 4. Phone number should not be greater than 15 and should not be less than 8 number.
    if (
      queryData.contactpersonno.length > 15 ||
      queryData.contactpersonno.length < 8
    ) {
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_PHONE_SIZE_ERROR",
        "Phone number size is invalid. Please provide a valid phone number.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    if (helper.phonenumber(queryData.contactpersonno)) {
      console.log("Valid");
    } else {
      console.log("Invalid");
      return helper.getErrorResponse(
        "ORGANIZATION_COMPANY_PHONE_VALID_ERROR",
        "Phone number is not valid. Please provide a valid phone number.",
        "ADD CUSTOMER ORGANIZATION COMPANY",
        secret
      );
    }
    //End of Validation:- 4
    //Begin Validation:- 5. Company type should not be greater than 2
    //End of Validation:- 5

    try {
      console.log("user id ->" + userid);
      //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
      const [result] = await db.spcall(
        "CALL SP_ORGANIZATION_COMPANY_ADD(?,?,?,?,?,?,?,?,?,?,?,?,@cid);select @cid;",
        [
          1,
          queryData.organizationid,
          custID,
          queryData.companyname,
          queryData.companylegalname,
          queryData.companycode,
          queryData.contactperson,
          queryData.contactemail,
          queryData.contactpersonno,
          queryData.address,
          queryData.billingaddress,
          userid,
        ]
      );
      const objectValue1 = result[1][0];
      const mcustID = objectValue1["@cid"];
      console.log("custID=>" + mcustID);
      if (mcustID == null) {
        return helper.getErrorResponse(
          "ORGANISATION_COMPANY_CUST_ID_NOT_FOUND",
          "Customer ID associated with the organization's company is not found. Please provide a valid customer ID.",
          "ADD CUSTOMER ORGANIZATION COMPANY",
          secret
        );
      }
      //  try{
      //  if(mcustID!=null){
      //    const [pan] = await db.spcall('CALL SP_PANNO_ADD(?,?,@panid); select @panid',[userid,queryData.pannumber]);
      //    const objectvalu = pan[1][0];
      //    console.log("pan number->"+objectvalu["@panid"]);
      //  }
      // }catch(er){
      //   return helper.getErrorResponse("ORGANIZATION_COMPANY_PANNO_ADD_FAILED","Error adding the Organization Pan number.",er.message,secret);
      // }
      //    try{
      //    if(mcustID!=null){
      //      const [gst] = await db.spcall('CALL SP_GSTNUMBER_ADD(?,?,@gstnoid); select @gstnoid',[userid,queryData.gstno]);
      //      const objectvalue2= gst[1][0];
      //      console.log("gst number ->"+objectvalue2["@gstnoid"]);
      //  }}
      //  catch(er){
      //   return helper.getErrorResponse("ORGANIZATION_COMPANY_GSTNO_ADD_FAILED","Error adding the GST number.",er.message,secret);
      //  }
      //  try{
      //   if(mcustID!= null){
      //     const [cinno] =await db.spcall('CALL SP_CIN_NO_ADD(?,?,@cinnoid); select @cinnoid',[userid,queryData.cinno]);
      //     const objectcin = cinno[1][0];
      //     console.log('cin no id'+ objectcin["@cinnoid"]);
      //   }
      // }
      // catch(er){
      //   return helper.getErrorResponse("ORGANIZATION_COMPANY_CIN_NO_ADD_FAILED","The customer Organization company cin number was not added.Please the details",er.message,secret);
      // }

      //End of Validation:- 6
      if (mcustID != null || mcustID != 0) {
        return helper.getSuccessResponse(
          "ORGANIZATION_COMPANY_ADD_SUCCESS",
          "Organization's company has been successfully added.",
          mcustID,
          secret
        );
      } else {
        return helper.getErrorResponse(
          "ORGANIZATION_COMPANY_ADD_ERROR",
          "Error occurred while adding organization's company. Please try again later.",
          "ADD CUSTOMER ORGANIZATION COMPANY",
          secret
        );
      }
    } catch (ex) {
      if (ex.sqlMessage == "Wrong phone number")
        return helper.getErrorResponse(
          "ORGANIZATION_COMPANY_PHONE_SIZE_ERROR",
          "Invalid phone number size. Please provide a valid phone number.",
          "ADD CUSTOMER ORGANIZATION COMPANY",
          secret
        );
      else if (ex.sqlMessage == "Wrong Email")
        return helper.getErrorResponse(
          "ORGANIZATION_COMPANY_EMAIL_VALID_ERROR",
          "Email is not valid. Please provide a valid email address.",
          "ADD CUSTOMER ORGANIZATION COMPANY",
          secret
        );
      else console.log({ ex });
      return helper.getErrorResponse(
        "UNEXPECTED_ERROR",
        er.message,
        er,
        secret
      );
    }

    const responseData = { responsecode, message };
    responseData = JSON.parse(
      '{"message":' +
        helper.encrypt(responseData, helper.getEncryptionKey()) +
        "}"
    );
    return { responseData };
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//##############################################################################################################################################################################################
//##############################################################################################################################################################################################
//##############################################################################################################################################################################################

async function createFolder(siteName) {
  console.log("sitename ->" + siteName);

  // Ensure config.folderpath.storagepath has proper escaping
  const storagePath = config.folderpath.storagepath.replace(/\\/g, "/");

  console.log("storage path: " + storagePath);

  // Use path.join for creating platform-independent paths
  const folderPath = path.join(storagePath, siteName);

  console.log("folder path -> " + folderPath);

  try {
    await fs.mkdir(folderPath);

    console.log("Folder created successfully.");
    return folderPath;
  } catch (error) {
    if (error.code === "EEXIST") {
      console.log("Folder already exists.");
      return folderPath;
    } else {
      console.error("Error creating folder:", error.message);
      throw error;
    }
  }
}
//####################################################################################################################################################################################################
//####################   ADD NEW SITE TO THE COMPANY   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add a new site to the company
//Input data
// {
//   "companyid":"TestCompany1",
//   "sitename":"Sporada Main Branch - Ramanathapuram",
//   "contactname":"rajan",
//   "contactemail":"ponraj4you@gmail.com",
//   "contactphone":"8838360294",
//   "address":"Ramanathapuram",
// }
//####################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the companyid is valid
//          d) Check the sitename is valid
//          e) Check the contactname is valid
//          f) Check the contactemail is valid
//          g) Check the contactphone is valid
//          h) Check the address is valid
//      3. Email id should be valid email format
//      4. Phone number should not be greater than 15 and should not be less than 8 number.
//      5. contact name should not be more than 30
//      6. Send OTP Email, if already verified email
//      7. Send OTP SMS, if already verified email
//####################################################################################################################################################################################################
async function addcompanysite(customer) {
  try {
    //End of Validation 1

    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "CUSTOMER ADDCOMPANY",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid login sessiontoken size. Please provide a valid sessiontoken.",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    }

    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    const userid = objectValue1["@result"];
    const cust_id = objectValue1["@custid"];
    console.log("add site, objectValue->" + objectValue1["@result"]);
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login session token. Please provide a valid session token.",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    }

    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "There is an error with the querystring. Please check and try again.",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    }

    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing querystring as JSON. Please provide a valid JSON object in the querystring.",
        "CUSTOMER ADD SITE",
        secret
      );
    }

    //          d) Check the companyname is valid
    if (queryData.hasOwnProperty("companyid") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_SITE_COMPANY_ID_MISSING",
        "Company ID is missing. Please provide a valid company ID.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    if (queryData.hasOwnProperty("sitename") == false) {
      return helper.getErrorResponse(
        "CUST_SITE_NAME_MISSING",
        "Site name is missing. Please provide a valid site name.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    //          e) Check the contactname is valid
    if (queryData.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        "CUST_SITE_ADDRESS_MISSING",
        "Site address is missing. Please provide a valid site address.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    //          f) Check the contactemail is valid
    if (queryData.hasOwnProperty("city") == false) {
      return helper.getErrorResponse(
        "CUST_SITE_CITY_MISSING",
        "City for the site is missing. Please provide a valid city name.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    //          g) Check the contactphone is valid
    if (queryData.hasOwnProperty("state") == false) {
      return helper.getErrorResponse(
        "CUST_SITE_STATE_MISSING",
        "State for the site is missing. Please provide a valid state name.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    //          h) Check the address is valid
    if (queryData.hasOwnProperty("pincode") == false) {
      return helper.getErrorResponse(
        "CUST_SITE_PINCODE_MISSING",
        "PIN code for the site is missing. Please provide a valid PIN code.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    if (queryData.hasOwnProperty("latitude") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_BRANCH_LATITUTE_MISSING",
        "Latitude for the branch is missing. Please provide a valid latitude.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    if (queryData.hasOwnProperty("longitude") == false) {
      return helper.getErrorResponse(
        "CUSTOEMR_BRANCH_LATITUTE_MISSING",
        "Longitude for the branch is missing. Please provide a valid longitude.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    //End of Validation 2
    var custID = objectValue1["@custid"];

    //Begin Validation:- 2. The name field should get updated first letter of a word to uppercase
    const str = queryData.sitename;
    const Fullname = str.charAt(0).toUpperCase() + str.slice(1);
    //End of Validation:- 2

    //End of Validation:- 4
    //Begin Validation:- 5. Contact name should not be greater than 30
    if (queryData.pincode.length > 6 || queryData.pincode.length < 6) {
      return helper.getErrorResponse(
        "SITE_PINCODE_SIZE_ERROR",
        "Invalid PIN code size. Please provide a valid PIN code.",
        "CUSTOMER ADD SITE",
        secret
      );
    }
    //End of Validation:- 5

    //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
    // const [result] = await db.spcall('CALL SP_CUST_BRANCH_ADD(?,?,?,?,?,?,?,?,?,?,@result);select @result;',[queryData.companyid,queryData.sitename,queryData.contactname,queryData.contactemail,queryData.contactphone,queryData.address,userid,0,0,'']);
    const [result] = await db.spcall(
      "CALL SP_INDIVIDUAL_SITE_ADD(?,?,?,?,?,?,?,@result);select @result;",
      [
        queryData.companyid,
        queryData.sitename,
        queryData.address,
        queryData.city,
        queryData.state,
        queryData.pincode,
        userid,
      ]
    );
    const objectValue2 = result[1][0];
    const branch_id = objectValue2["@result"];
    console.log("result branch id=>" + branch_id);
    let deptid = 0;
    if (branch_id != null) {
      try {
        var strSitenane = queryData.sitename.replace(/\s/g, "");
        strSitenane = strSitenane.replace(/[^\w\s]/gi, "");
        const folderPath = await createFolder(strSitenane);
        console.log("eventfolderpath ->" + folderPath);
        const updateQuery = `UPDATE branchmaster SET SiteController_path = ? WHERE Branch_id = ?`;
        const result1 = await db.query(updateQuery, [folderPath, branch_id]);
        console.log("SQL Update Result: " + JSON.stringify(result1));
        if (result1.affectedRows) {
          const [result1] = await db.spcall(
            "CALL SP_SITE_DEPT_ADD(?,?,?,?,@result); select @result",
            [branch_id, queryData.sitename, queryData.city, userid]
          );
          const objectvalue2 = result1[1][0];
          console.log("deptid ->" + objectvalue2["@result"]);
          deptid = objectvalue2["@result"];
        }
        // const [result2] = await db.spcall('CALL SP_UPDATE_FOLDER_PATH(?, ?, @result); select @result', [branch_id, folderPath]);
        // const objectvalue3 =result2[1][0];
        // console.log("folder path creation ->"+ objectvalue3["@result"]);
        else {
          return helper.getErrorResponse(
            "ERROR_CREATING_FOLDER_PATH",
            "Error while creating the folderpath.",
            "ERROR WHILE CREATING THE FOLDER PATH",
            secret
          );
        }
      } catch (er) {
        return helper.getErrorResponse(
          "ERROR_CREATING_FOLDER_PATH",
          "Error while creating the folderpath.",
          er,
          secret
        );
      }
    }
    if (branch_id != null) {
      return helper.getSuccessResponse(
        "COMPANY_SITE_ADD_SUCCESS",
        "Customer site added successfully",
        branch_id + "," + deptid,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "COMPANY_SITE_ADD_ERROR",
        "Customer site added failed",
        "error",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "COMPANY_SITE_ADD_ERROR",
      "Customer site add failed",
      er,
      secret
    );
  }
}

// const responseData = {responsecode,message};
//responseData = JSON.parse("{\"message\":"+ helper.encrypt(responseData,helper.getEncryptionKey())+"}");
// return {responseData};

//###############################################################################################################################################################################################################################################################################
//####################   ADD NEW SITE DEPARTMENT TO THE COMPANY   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add a new site to the company
//Input data
// {
//   "branchid":"Testbranch1",
//   "deptname":"Sporada Main Branch - Ramanathapuram",
//   "dept_location":"Ramanathapuram",
//   "created_by":"0",
// }
//####################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the companyid is valid
//          d) Check the sitename is valid
//          e) Check the contactname is valid
//          f) Check the contactemail is valid
//          g) Check the contactphone is valid
//          h) Check the address is valid
//      3. department name should not be more than 30
//####################################################################################################################################################################################################
async function addsitedept(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "CUSTOMER ADD SITEDEPARTMENT",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //  a) If SESSION TOKEN Character sizes error
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid login sessiontoken size. Please provide a valid sessiontoken.",
        "CUSTOMER ADD SITEDEPARTMENT",
        secret
      );
    }

    //  b) If SESSION TOKEN not available
    const [result1] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
      [customer.STOKEN]
    );
    const objectValue1 = result1[1][0];
    console.log("Site dept objectValue->" + objectValue1["@result"]);
    if (objectValue1["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login sessiontoken. Please provide a valid sessiontoken.",
        "CUSTOMER ADD SITEDEPARTMENT",
        secret
      );
    }

    //End of Validation 1

    //Begin Validation 2. decrypt querystring data
    //  a) If Querystring not given as input
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "CUSTOMER ADD SITE DEPARTMENT",
        secret
      );
    }

    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "There is an error with the query string. Please check and try again.",
        "CUSTOMER ADD SITE DEPARTMENT",
        secret
      );
    }

    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing querystring as JSON. Please provide a valid JSON object in the querystring.",
        "CUSTOMER ADD SITEDEPARTMENT",
        secret
      );
    }
    //  c) Check the branchid is valid
    if (queryData.hasOwnProperty("branchid") == false) {
      return helper.getErrorResponse(
        "CUST_BRANCH_ID_MISSING",
        "Branch ID is missing. Please provide a valid branch ID.",
        "CUSTOMER ADD SITEDEPARTMENT",
        secret
      );
    }

    //  d) Check the departmentname is valid
    if (queryData.hasOwnProperty("deptname") == false) {
      return helper.getErrorResponse(
        "CUST_DEPT_NAME_MISSING",
        "Department name is missing. Please provide a valid department name.",
        "CUSTOMER ADD SITEDEPARTMENT",
        secret
      );
    }
    //  h) Check the deptlocation is valid
    if (queryData.hasOwnProperty("deptlocation") == false) {
      return helper.getErrorResponse(
        "CUST_DEPT_LOCATION_MISSING",
        "Department location is missing. Please provide a valid department location.",
        "CUSTOMER ADD SITEDEPARTMENT",
        secret
      );
    }

    //End of Validation 2
    var usrID = objectValue1["@result"];
    var custID = objectValue1["@custid"];
    const [result] = await db.spcall(
      "CALL SP_SITE_DEPT_ADD(?,?,?,?,@result);select @result;",
      [queryData.branchid, queryData.deptname, queryData.deptlocation, usrID]
    );
    const objectValue2 = result[1][0];
    const deptID = objectValue2["@result"];
    console.log("result dept id=>" + deptID);
    if (deptID != null) {
      return helper.getSuccessResponse(
        "SITE_DEPT_ADD_SUCCESS",
        "customer department added successfully",
        "CUSTOMER ADD SITE DEPARTMENT",
        secret
      );
      //  const responseData = {responsecode,message};
      // responseData = JSON.parse("{\"message\":"+ helper.encrypt(responseData,helper.getEncryptionKey())+"}");
      //  return {responseData};
    } else {
      return helper.getErrorResponse(
        "SITE_DEPT_ADD_FAILED",
        "Failed to add department to the site. Please try again later.",
        "customer department added Failed",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "SITE_DEPT_ADD_FAILED",
      "Failed to add department to the site. Please try again later.",
      er.message,
      secret
    );
  }
}

//################################### ADD NEW DEVICE TO DEPARTMENT #########################################################################################################################################################################################################################################################################################################################
//###########################################################################################################################################################################################################################################################################################################
//###################################################################################################################################################################################################################################################################################################################
async function adddevice(customer) {
  //  c) If SESSION TOKEN not given as input
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "Session token is missing. Please provide a valid session token.",
      "CUSTOMER ADD DEVICE",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  a) If SESSION TOKEN Character sizes error
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "Invalid login sessiontoken size. Please provide a valid sessiontoken.",
      "CUSTOMER ADD DEVICE",
      secret
    );
  }

  //  b) If SESSION TOKEN not available
  const [result1] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
    [customer.STOKEN]
  );
  const objectValue1 = result1[1][0];
  console.log(" DEVICE objectValue->" + objectValue1["@result"]);
  const userid = objectValue1["@result"];
  if (objectValue1["@result"] == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "Invalid login sessiontoken. Please provide a valid sessiontoken.",
      "CUSTOMER ADD DEVICE",
      secret
    );
  }

  //End of Validation 1
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "QUERYSTRING_MISSING",
      "Querystring is missing. Please provide a valid querystring.",
      "CUSTOMER ADD DEVICE",
      ""
    );
  }

  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "QUERYSTRING_ERROR",
      "There is an error with the querystring. Please check and try again.",
      "CUSTOMER ADD DEVICE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "QUERYSTRING_JSON_ERROR",
      "Error parsing querystring as JSON. Please provide a valid JSON object in the querystring.",
      "CUSTOMER ADD DEVICE",
      secret
    );
  }
  // a) CHECK IF THE DEPTID IS GIVEN AS AN INPUT OR NOT
  if (queryData.hasOwnProperty("deptid") == false) {
    return helper.getErrorResponse(
      "DEVICE_DEPT_ID_MISSING",
      "Department ID is missing. Please provide a valid department ID.",
      "CUSTOMER ADD DEPT DEVICE",
      secret
    );
  }
  //          h) Check the device_name is valid
  if (queryData.hasOwnProperty("deviceip") == false) {
    return helper.getErrorResponse(
      "DEVICE_IP_MISSING",
      "Device IP address is missing. Please provide a valid IP address.",
      "CUSTOMER ADD DEPT DEVICE",
      secret
    );
  }
  if (queryData.hasOwnProperty("deviceport") == false) {
    return helper.getErrorResponse(
      "DEVICE_PORT_MISSING",
      "Device tcp port is missing. Please provide a valid port number.",
      "CUSTOMER ADD DEPT DEVICE",
      secret
    );
  }
  //     h) Check the ip_domain is valid
  if (queryData.hasOwnProperty("username") == false) {
    return helper.getErrorResponse(
      "DEVICE_USERNAME_MISSING",
      "Device username is missing. Please provide a valid username.",
      "CUSTOMER ADD DEPT DEVICE",
      secret
    );
  }
  //          g) Check the ip_port is valid
  if (queryData.hasOwnProperty("password") == false) {
    return helper.getErrorResponse(
      "DEVICE_PASSWORD_MISSING",
      "Device password is missing. Please provide a valid password.",
      "CUSTOMER ADD DEPT DEVICE",
      secret
    );
  }
  //MQTT broker details
  const brokerUrl = "mqtt://192.168.0.198:1883";
  const topic = "devicedetails";

  //create an mqtt client
  const client = mqtt.connect(brokerUrl);

  // Convert event to a specified format
  const formattedEvent = {
    ip: queryData.deviceip,
    port: queryData.deviceport,
    username: queryData.username,
    password: queryData.password,
  };

  // Convert event to JSON string
  const payload = helper.encrypt(JSON.stringify(formattedEvent), "");
  client.publish(topic, payload);
  console.log("Event Published");
  // MQTT client event: 'connect'
  client.on("connect", () => {
    console.log("Connected to MQTT broker");
  });

  // MQTT client event: 'error'
  client.on("error", (err) => {
    console.error("MQTT error:", err);
  });

  // MQTT client event: 'close'
  client.on("close", () => {
    console.log("Connection to MQTT broker closed");
  });

  // MQTT client event: 'offline'
  client.on("offline", () => {
    console.log("MQTT client is offline");
  });

  // MQTT client event: 'end'
  client.on("end", () => {
    console.log("MQTT client has ended");
  });

  // MQTT client event: 'reconnect'
  client.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker");
  });

  const [result] = await db.spcall(
    "CALL SP_CUSTOMER_DEVICE_ADD(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,@result);select @result;",
    [
      queryData.deptid,
      queryData.devicename,
      queryData.devicetype,
      userid,
      queryData.devicebrand,
      queryData.deviceip,
      queryData.tcpport,
      queryData.username,
      queryData.password,
      queryData.noanalogch,
      queryData.noipch,
      queryData.noastream,
      queryData.motiondet,
      queryData.sdkid,
      queryData.serialno,
      queryData.httpport,
      queryData.rtspport,
    ]
  );
  const objectValue2 = result[1][0];
  const deviceID = objectValue2["@result"];
  console.log("result device id=>" + deviceID);
  if (deviceID != null) {
    return helper.getSuccessResponse(
      "DEPT_DEVICE_ADD_SUCCESS",
      "customer department device added successfully",
      deviceID,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "DEPT_DEVICE_ADD_FAILED",
      "customer department device added successfully",
      "",
      secret
    );
  }
}
//################################# ADD CUSTOMER CONTACT LIST ################################################################################################################################################################################################
//###################################################################################################################################################################################################################################################################################################################################
//#######################################################################

async function addcontacts(customer) {
  try {
    //BEGIN VALIDATION 1
    // CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT
    if (customer.hasOwnProperty["STOKEN"] == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "ADD CUSTOMER CONACT LIST",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS CORRECT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid login sessiontoken size. Please provide a valid sessiontoken.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("secret-->" + secret);
    //CHECK IF THE SESSIONTOKEN IS VALID
    const [result] = await db.spcall(
      `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log("contact objectvalue ->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login sessiontoken. Please provide a valid sessiontoken.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }

    //END OF VALIDATION 1.
    //BEGIN VALIDATION 2
    // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }

    console.log("customer querystring ->" + customer.querystring);
    var querydata;
    const custregid = objectvalue["@custid"];
    try {
      querydata = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted querydata->" + querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "CONTACT_QUERYSTRING_ERROR",
        "Error in the contact querystring. Please check and try again.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing querystring as JSON. Please provide a valid JSON object in the querystring.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    //  C) IF THE CONTACTEMAIL1 IS NOT GIVEN AS INPUT
    if (querydata.hasOwnProperty("deptid") == false) {
      return helper.getErrorResponse(
        "CUST_DEPT_ID_MISSING",
        "Department ID is missing. Please provide a valid department ID.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    //     A) IF THE CONTACTNAME1 IS NOT GIVEN AS INPUT
    if (querydata.hasOwnProperty("contactname") == false) {
      return helper.getErrorResponse(
        "CUST_CONTACT_NAME_MISSING",
        "Contact name is missing. Please provide a valid contact name.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    //  B) if the contactmobile1 is not given as input
    if (querydata.hasOwnProperty("contactphone") == false) {
      return helper.getErrorResponse(
        "CUST_CONTACT_MOBILE_MISSING",
        "Contact mobile number is missing. Please provide a valid mobile number.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    //  C) IF THE CONTACTEMAIL1 IS NOT GIVEN AS INPUT
    if (querydata.hasOwnProperty("contactemail") == false) {
      return helper.getErrorResponse(
        "CUST_CONTACT_EMAIL_MISSING",
        "Contact email address is missing. Please provide a valid email address.",
        "ADD CUSTOMER CONTACT LIST",
        secret
      );
    }
    if (querydata.hasOwnProperty("contacttype") == false) {
      querydata.contacttype = 0;
    }

    const [custid] = await db.spcall(
      "CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ",
      [customer.STOKEN]
    );
    const objectvalue3 = custid[1][0];
    console.log("customerid-->" + objectvalue3["@result"]);
    const customer_id = objectvalue3["@result"];
    const userid = objectvalue["@result"];
    console.log(`Result data==>`, userid);

    const [result1] = await db.spcall(
      "CALL SP_EMERGENCY_CONTACT_ADD(?,?,?,?,?,?,@emergencyid); Select @emergencyid",
      [
        querydata.deptid,
        querydata.contactname,
        querydata.contactphone,
        querydata.contactemail,
        querydata.contacttype,
        userid,
      ]
    );

    const objectvalue1 = result1[1][0];
    const contact_id = objectvalue1["@emergencyid"];
    console.log("CUSTOMER CONTACT ID -->" + contact_id);
    if (contact_id != null) {
      return helper.getSuccessResponse(
        "CUST_CONTACTS_ADD_SUCCESS",
        "Customer contact details added Successfully..",
        contact_id,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "CUST_CONTACT_ADD_FAILED",
        "Customer contacts add failed.",
        "error",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//#############################################################################################################################################################################################################
//#########################################A ADD CUSTOMER EMERGENCY SERVICE####################################################################################################################################################################
//#############################################################################################################################################################################################################

async function addemergencyservice(customer) {
  try {
    //  c) If SESSION TOKEN not given as input
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "CUSTOMER ADD EMERGENCY SERVICE",
        ""
      );
    }
    //BEGIN VALIDATION 1
    var secret = customer.STOKEN.substring(0, 16);
    console.log("SECRET-->" + secret);
    // CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "Invalid size for login sessiontoken. Please provide a valid sessiontoken.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,
      [customer.STOKEN]
    );
    const objectvalue = result[1][0];
    const custid = objectvalue["@custid"];
    const user_id = objectvalue["@result"];
    console.log("Payment Objectvalue-->" + objectvalue["@result"]);
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login sessiontoken. Please provide a valid token.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    //CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "Querystring is missing. Please provide a valid querystring.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    var querydata;
    try {
      querydata = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted querydata-->" + querydata);
    } catch (er) {
      return helper.getErrorResponse(
        "EMERGENCY_SERVICE_QUERYSTRING_ERROR",
        "Error in the emergency service querystring. Please check and try again.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (er) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "Error parsing querystring as JSON. Please provide a valid JSON object in the querystring.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    // A) CHECK IF THE NEAREST POLICE STATION IS GIVEN AS INPUT OR NOT
    if (querydata.hasOwnProperty("branchid") == false) {
      return helper.getErrorResponse(
        "CUSTOMER_EMERGENCY_BRANCH_ID_MISSING",
        "Branch ID is missing. Please provide a valid branch ID.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("nearestpolicestation") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_NEAREST_POLICE_STATION_MISSING",
        "Nearest police station information is missing. Please provide valid information.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("policecontactno") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_POLICE_CONTACT_NO_MISSING",
        "Police contact number is missing. Please provide a valid contact number.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("nearestfirestation") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_NEAREST_FIRE_STATION_MISSING",
        "Information about the nearest fire station is missing. Please provide valid information.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("firestationcontactno") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_FIRESTATION_CONTACT_NO_MISSING",
        "Contact number for the nearest fire station is missing. Please provide a valid contact number.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("nearesthospital") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_NEAREST_HOSPITAL_MISSING",
        "Information about the nearest hospital is missing. Please provide valid information.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("hospitalcontactno") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_HOSPITAL_CONTACT_NUMBER_MISSING",
        "Contact number for the nearest hospital is missing. Please provide a valid contact number.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("nearestEBoffice") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_NEAREST_EB_OFFICE_MISSING",
        "Information about the nearest electricity board office is missing. Please provide valid information.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
    if (querydata.hasOwnProperty("EBcontactno") == false) {
      return helper.getErrorResponse(
        "EMERGENCY_EB_CONTACT_NUMBER_MISSING",
        "Contact number for the nearest electricity board office is missing. Please provide a valid contact number.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        sssecret
      );
    }
    // const [customerid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[customer.STOKEN]);
    // const objectvalue3 = customerid[1][0];
    // console.log("customerid-->"+objectvalue3["@result"]);
    // const customer_id = objectvalue3["@result"];
    const [result1] = await db.spcall(
      "CALL SP_ADD_EMERGENCY_SERVICE(?,?,?,?,?,?,?,?,?,@emergencyserviceid); select @emergencyserviceid",
      [
        querydata.branchid,
        querydata.nearestpolicestation,
        querydata.policecontactno,
        querydata.nearestfirestation,
        querydata.firestationcontactno,
        querydata.nearesthospital,
        querydata.hospitalcontactno,
        querydata.nearestEBoffice,
        querydata.EBcontactno,
      ]
    );
    const objectvalue1 = result1[1][0];
    const emergencyserviceid = objectvalue1["@emergencyserviceid"];
    console.log("Emergency service Id ->" + emergencyserviceid);
    if (emergencyserviceid != null) {
      return helper.getSuccessResponse(
        "CUSTOMER_EMERGENCY_SERVICE_ADDED_SUCCESSFULLY",
        "The Customer emergency contact was added successfully.",
        emergencyserviceid,
        secret
      );
    } else {
      return helper.getErrorResponse(
        "CUSTOMER_EMERGENCY_SERVICE_ADDING_FAILED",
        "Failed to add emergency services. Please try again later.",
        "ADD CUSTOMER EMERGENCY SERVICE",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//#####################################################################################################################################################################################################################
//######################################## ADD CUSTOMER INVOICE ##########################################################################################################################################################################
//#######################################################################################################################################################################################################################

async function addpayment(customer) {
  //BEGIN VALIDATION 1
  try {
    // CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "Sessiontoken is missing. Please provide a valid sessiontoken.",
        "ADD CUSTOMER PAYMENT LIST",
        ""
      );
    }
    var secret = customer.STOKEN.substring(0, 16);
    console.log("Secret-->" + secret);
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "The size of the sessiontoken is invalid. Please provide a valid sessiontoken.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }
    //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,
      customer.STOKEN
    );
    const objectvalue = result[1][0];
    console.log("Payment Objectvalue-->" + objectvalue["@result"]);
    const user_id = objectvalue["@result"];
    if (objectvalue["@result"] == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid sessiontoken. Please provide a valid sessiontoken.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }

    //END OF VALIDATION 1
    //CHECK IF THE QUERYSTRING IS GIVEN AS INPUT OR NOT
    if (customer.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "PAYMENT_QUERYSTRING_MISSING",
        "Query string is missing. Please provide a valid query string.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }

    console.log("Customer querystring->" + customer.querystring);
    var queryData;

    try {
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "PAYMENT_QUERYSTRING_ERROR",
        "There's an error with the querystring. Please provide a valid querystring.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }
    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "There's an error with parsing the querystring as JSON. Please provide a valid JSON querystring.",
        "ADD CUSTOMER PAYMENT LIST",
        secret
      );
    }
    //  B) if the CUSTOMER_ID is not given as input
    if (queryData.hasOwnProperty("customerid") == false) {
      return helper.getErrorResponse(
        "BILLING_CUSTOMER_ID_MISSING",
        "Customer ID is missing. Please provide a valid customer ID.",
        "ADD CUSTOMER PAYMENT",
        secret
      );
    }
    if (queryData.hasOwnProperty("invoiceamount") == false) {
      return helper.getErrorResponse(
        "BILLING_INVOICE_AMOUNT_MISSING",
        "Invoice amount is missing. Please provide a valid amount for the invoice.",
        "ADD CUSTOMER PAYMENT",
        secret
      );
    }
    if (queryData.hasOwnProperty("tdsvalue") == false) {
      return helper.getErrorResponse(
        "BILLING_TDS_VALUE_MISSING",
        "TDS value is missing. Please provide a valid TDS value.",
        "ADD CUSTOMER PAYMENT",
        secret
      );
    }
    if (queryData.hasOwnProperty("taxamount") == false) {
      return helper.getErrorResponse(
        "BILLING_TAX_AMOUNT_MISSING",
        "Tax amount is missing. Please provide a valid tax amount.",
        "ADD CUSTOMER PAYMENT",
        secret
      );
    }
    if (queryData.hasOwnProperty("paymentmode") == false) {
      return helper.getErrorResponse(
        "PAYMENT_MODE_MISSING",
        "Payment mode is missing. Please provide a valid payment mode.",
        "ADD CUSTOMER PAYMENT",
        secret
      );
    }
    if (queryData.hasOwnProperty("referenceno") == false) {
      return helper.getErrorResponse(
        "BILLING_REFERENCE_NUMBMER_MISSING",
        "Reference number is missing. Please provide a valid reference number.",
        "ADD CUSTOMER PAYMENT",
        secret
      );
    }
    const [result1] = await db.spcall(
      "CALL SP_CUST_PAYMENT_ADD(?,?,?,?,?,?,?,@result); select @result;",
      [
        queryData.customerid,
        queryData.invoiceamount,
        queryData.tdsvalue,
        queryData.taxamount,
        queryData.paymentmode,
        queryData.referenceno,
        user_id,
      ]
    );
    const objectvalue1 = result1[1][0];
    var cpayment_id = objectvalue1["@result"];
    console.log("Customer payment ID -->" + cpayment_id);
    if (cpayment_id != "") {
      return helper.getSuccessResponse(
        "CUSTOMER_PAYMENT_ADD_SUCCESS",
        "Payment added successfully.",
        cpayment_id,
        secret
      );
    } else {
      return helper.getSuccessResponse(
        "CUSTOMER_PAYMENT_ADD_FAILED",
        "Failed to add payment. Please try again later.",
        "CUSTOMER PAYMENT ADD FAILED. PLEASE CHECK AND RE-ENTER CORRECT DETAILS",
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected error. Please try again later.",
      "ADD CUSTOMER PAYMENT",
      secret
    );
  }
}

//##################################################################################################################################################################################################
//################################ ADD CUSTOMER COMPANY INVOICE ###################################################################################################################################################################
//##################################################################################################################################################################################################

async function addinvoice(customer) {
  //BEGIN VALIDATION 1
  //CHECK IF THE SESSIONTOKEN SIZE IS CORRECT OR NOT
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "ADD CUSTOMER PAYMENT INVOICE",
      ""
    );
  }
  // CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result`,
    customer.STOKEN
  );
  const objectvalue = result[1][0];
  console.log("INVOICE OBJECTVALUE-->" + objectvalue["@result"]);
  if (objectvalue["@result"] == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "ADD CUSTOMER PAYMENT INVOICE",
      ""
    );
  }
  //CHECKIF THE SESSIONTOKEN IS GIVEN AS INPUT
  if (customer.hasOwnProperty["STOKEN"] == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "ADD CUSTOMER PAYMENT INVOICE",
      ""
    );
  }
  //END OF VALIDATION 1
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "INVOICE_QUERY_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret key->" + secret);
  console.log("customer querystring-->" + customer.querystring);
  var querydata;

  try {
    querydata = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + querydata);
  } catch (ex) {
    return helper.getErrorResponse(
      "INVOICE_PACKAGE_QUERY_ERROR",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  try {
    querydata = JSON.parse(querydata);
  } catch (ex) {
    return helper.getErrorResponse(
      "PAYMENT_INVOICE_JSON_ERROR",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //A)CHECK IF INVOICE NUMBER IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("invoice_no") == false) {
    return helper.getErrorResponse(
      "PAYMENT_INVOICE_NUMBER_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //B)CHECK IF CUSTBILL_ID IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("custbill_id") == false) {
    return helper.getErrorResponse(
      "INVOICE_CUSTBILL_ID_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //C)CHECK IF THE PARTICULARS IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("particulars") == false) {
    return helper.getErrorResponse(
      "INVOICE_PARTICULARS_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //D)CHECK IF THE INVOICE_DATA IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("invoice_date") == false) {
    return helper.getErrorResponse(
      "PAYMENT_INVOICE_DATA_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //E) CHECK IF THE TOTAL_AMOUNT IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("total_amount") == false) {
    return helper.getErrorResponse(
      "INVOICE_TOTAL_AMOUNT_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //F)CHECK IF THE TAX_AMOUNT IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("tax_amount") == false) {
    return helper.getErrorResponse(
      "INVOICE_TAX_AMOUNT_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //G)CHECK IF THE INVOICE_AMOUNT IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("invoice_amount") == false) {
    return helper.getErrorResponse(
      "PAYMENT_INVOICE_AMOUNT_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //I) CHECK IF THE TERMS IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("terms") == false) {
    return helper.getErrorResponse(
      "INVOICE_TERMS_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }
  //J)CHECK IF THE NOTES IS GIVEN AS AN INPUT OR NOT
  if (querydata.hasOwnProperty("notes") == false) {
    return helper.getErrorResponse(
      "INVOICE_NOTES_MISSING",
      "ADD CUSTOMER PAYMENT INVOICE",
      secret
    );
  }

  const [result1] = await db.spcall(
    `CALL SP_CUST_INV_ADD(?,?,?,?,?,?,?,?,?,@result); select @result`,
    [
      querydata.invoice_no,
      querydata.custbill_id,
      querydata.particulars,
      querydata.invoice_date,
      querydata.total_amount,
      querydata.tax_amount,
      querydata.invoice_amount,
      querydata.terms,
      querydata.notes,
    ]
  );
  const objectvalue1 = result1[1][0];
  let invoice_id = objectvalue1["@result"];
  console.log("ADDED INVOICE ID --->" + invoice_id);

  if (invoice_id != "") {
    return helper.getSuccessResponse(
      "PAYMENT_INVOICE_ADDED_SUCCESSFULLY",
      "THE CUSTOMER PAYMENT INVOICE IS ADDED SUCCESSFULLY",
      invoice_id,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "PAYMENT_INVOICE_ADDED_FAILED",
      "THE CUSTOMER PAYMENT INVOICE ADDED FAILED.. CHECK THE DETAILS AND RE-ENTER IT",
      secret
    );
  }
}

//################################# UPDATE CUSTOMER PROFILE #########################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
async function update(customer) {
  let message = "Error in updating customer profile";
  let responsecode = "5002";
  const resultAPI = await db.query(
    "select user_id,token from apitokenmaster where user_id=" +
      customer.userid +
      ' and token="' +
      customer.TOKEN +
      '" and valid_status=1;'
  );
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) {
    message = "Invalid TOKEN";
    return { responsecode, message };
  }

  const result = await db.query(
    `UPDATE customermaster SET Customer_Name="${customer.customername}", Email_ID="${customer.emailid}", Admin_username="${customer.username}", 
    Contact_No="${customer.phone}", Address="${customer.address}" , mobileotp="${customer.motp}" , emailotp="${customer.eotp}" 
    WHERE Customer_ID=${customer.customerid}`
  );

  if (result.affectedRows) {
    responsecode = "502";
    message = "Customer profile updated successfully";
  }

  return { message };
}

async function createpackage(customerpackage) {
  let message = "Error in creating customer subscription";
  let responsecode = "5002";
  const resultAPI = await db.query(
    "select user_id,token from apitokenmaster where user_id=" +
      customerpackage.userid +
      ' and token="' +
      customerpackage.TOKEN +
      '" and valid_status=1;'
  );
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) {
    responsecode = "5002";
    message = "Invalid TOKEN";
    return { responsecode, message };
  }
  const result = await db.query(
    "CALL addsubcustomer(" +
      customerpackage.subscriptionid +
      "," +
      customerpackage.customerid +
      "," +
      customerpackage.No_of_Devices +
      ", " +
      customerpackage.Cloud_Storage +
      ',"' +
      customerpackage.from_date +
      '","' +
      customerpackage.to_date +
      '",' +
      customerpackage.Amount +
      "," +
      customerpackage.userid +
      "," +
      customerpackage.billingperiod +
      ")"
  );
  if (result.affectedRows) {
    responsecode = "502";
    message = "Customer subscription created successfully";
  }

  return { message };
}

//######################################################################################################################################################################################################
//############################# GET COMPANY LIST #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getcompany(customer, clientIp) {
  try {
    // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
    if (customer.hasOwnProperty("STOKEN") == false) {
      // logger.error(`Login Sessiontoken Missing. Module : Customer Get Company. ip ->${clientIp}`);
      return helper.getErrorResponse(
        "SESSIONTOKEN_MISSING_ERROR",
        "GET CUSTOMER COMPANY LIST",
        ""
      );
    }
    // Check if the given session token size is valid or not
    if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
      // logger.error(`Login Sessiontoken Size Error. Module : Customer Get Company. ip ->${clientIp}`);
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_SIZE_ERROR",
        "GET CUSTOMER COMPANY LIST",
        ""
      );
    }

    // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [customer.STOKEN]
    );
    const objectvalue = result[1][0];
    let userType = 0;
    let customerId = 0;
    var userid = objectvalue["@result"];
    console.log("user_id ->" + userid);
    if (userid == null) {
      // logger.error(`Login Sessiontoken Invalid. Module : Customer Get Company. ip ->${clientIp}`);
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "GET CUSTOMER COMPANY LIST",
        ""
      );
    } else {
      const sql = `SELECT User_type, Customer_id FROM usermaster WHERE User_id = ${userid}`;
      const rows = await db.query(sql);
      if (rows.length > 0) {
        userType = rows[0].User_type;
        customerId = rows[0].Customer_id;
      }
      console.log(`userid -${userType} - customerid - ${customerId} `);
    }
    var secret = customer.STOKEN.substring(0, 16);

    // Construct SQL queries
    let clSQL = "";
    let clSQLOrg = "";

    if (userType == "0" && customerId == "0") {
      clSQL =
        "SELECT * FROM customermaster WHERE status=1 AND organization_id=0";
      clSQLOrg = "SELECT * FROM organizations WHERE status=1";
    } else {
      clSQL = `SELECT * FROM customermaster WHERE status=1 AND organization_id=0 AND customer_id=${customerId}`;
      clSQLOrg = `SELECT * FROM organizations WHERE status=1 AND Organization_ID IN (SELECT Organization_ID FROM customermaster WHERE customer_id=${customerId})`;
    }

    if (customer.dlist) {
      clSQL += ` AND customer_id IN (SELECT bm.customer_id FROM branchmaster bm, devicemaster dm, deptmaster dt WHERE dt.dept_id=dm.dept_id AND bm.branch_id=dt.branch_id AND dm.device_id IN (${customer.devicelist}))`;
      clSQLOrg += ` AND Organization_ID IN (SELECT Organization_ID FROM customermaster WHERE customer_id IN (SELECT bm.customer_id FROM branchmaster bm, devicemaster dm, deptmaster dt WHERE dt.dept_id=dm.dept_id AND bm.branch_id=dt.branch_id AND dm.device_id IN (${customer.devicelist})))`;
    }

    clSQL += " ORDER BY customer_name ASC";
    clSQLOrg += " ORDER BY Organization_Name ASC";

    try {
      // Execute the first query
      const rows = await db.query(clSQL);
      const companyDetails = [];

      if (rows.length > 0) {
        rows.forEach((row) => {
          companyDetails.push({
            Customer_ID: row.Customer_ID,
            Customer_Name: row.Customer_ID + "~" + row.Customer_Name,
          });
        });
      }

      // Execute the second query
      const orgRows = await db.query(clSQLOrg);
      const orgDetails = [];

      if (orgRows.length > 0) {
        orgRows.forEach((row) => {
          orgDetails.push({
            Customer_ID: row.Organization_ID,
            Customer_Name:
              "O_" + row.Organization_ID + "~" + row.Organization_Name,
          });
        });
      }

      const secret = customer.STOKEN.substring(0, 16);
      const response = {
        companyDetails: companyDetails,
        orgDetails: orgDetails,
      };

      // logger.info(`Company list Fetched Successfully. Module: Customer Get Company. IP: ${clientIp}`);
      return helper.getSuccessResponse(
        "COMPANY_LIST_FETCHED_SUCCESSFULLY",
        "The customer company list is fetched successfully",
        response,
        secret
      );
    } catch (er) {
      // logger.error(`Error executing SQL queries: ${error}`);
      return helper.getErrorResponse();
    }
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//######################################################################################################################################################################################################
//############################# GET CUSTOMER BRANCH LIST #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getbranch(customer) {
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET USERS BRANCH LIST",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET USERS BRANCH LIST",
      ""
    );
  }

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET USERS BRANCH LIST",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  var querydata;
  if (customer.hasOwnProperty("querystring") == true) {
    console.log("customer querystring-->" + customer.querystring);

    try {
      querydata = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted data->" + querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "BRANCH_PACKAGE_QUERY_ERROR",
        "GET USERS BRANCH LIST",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "BRANCH_JSON_ERROR",
        "GET USERS BRANCH LIST",
        secret
      );
    }
    //A)CHECK IF INVOICE NUMBER IS GIVEN AS AN INPUT OR NOT
    if (querydata.hasOwnProperty("customerid") == true) {
      let sql = "";
      let rows = "";
      //if the customer id is given as an input we will fetch the data from branchmaster using that customer id
      if (querydata.customer_id != "") {
        sql = `SELECT Branch_ID, Branch_name,Address,city,pincode,state,Row_updated_date  FROM branchmaster WHERE Customer_ID IN (${querydata.customerid})and status = 1`;
        console.error("SQL ->" + sql);
        rows = await db.query(sql);
      }
      let branchDetails = "";
      if (rows != "") {
        branchDetails = helper.emptyOrRows(rows);
        console.log("result data" + JSON.stringify(branchDetails));
      }
      if (branchDetails != "") {
        return helper.getSuccessResponse(
          "BRANCH_LIST_FETCHED_SUCCESSFULLY",
          "The customer company branch list fetched successfully",
          branchDetails,
          secret
        );
      } else {
        return helper.getErrorResponse(
          "GET_BRANCH_LIST_FAILED",
          "Unable to get the customer branch list",
          secret
        );
      }
    }
  }

  // Execute the Superadmin query
  let sql = "";
  let rows = "";
  if (customer.customer_id != "") {
    if (customer.lid == "0") {
      // Superadmin
      sql = `SELECT bm.branch_ID, dm.Device_name, dt.Dept_Location, dm.Dept_ID, dm.SDK_ID 
             FROM devicemaster dm, deptmaster dt, branchmaster bm 
             WHERE dm.status = 1 AND dm.dept_id = dt.dept_id AND bm.branch_id = dt.branch_id 
             AND dt.branch_id IN (SELECT branch_id FROM branchmaster WHERE customer_id = ${customer.customer_id})`;
    } else {
      // Non-Superadmin query
      sql = `SELECT bm.branch_ID, dm.Device_name, dt.Dept_Location, dm.Dept_ID, dm.SDK_ID 
             FROM devicemaster dm, deptmaster dt, branchmaster bm 
             WHERE dm.status = 1 AND dm.dept_id = dt.dept_id AND bm.branch_id = dt.branch_id 
             AND dt.branch_id IN (SELECT branch_id FROM branchmaster WHERE customer_id = ${customer.customer_id})`;
    }
    console.error("SQL ->" + sql);
    rows = await db.query(sql);
  }
  let branchDetails = "";
  if (rows != "") {
    branchDetails = helper.emptyOrRows(rows);
    console.log("result data" + JSON.stringify(branchDetails));
  }
  if (branchDetails != "") {
    return helper.getSuccessResponse(
      "BRANCH_LIST_FETCHED_SUCCESSFULLY",
      "The customer company branch list fetched successfully",
      branchDetails,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "GET_BRANCH_LIST_FAILED",
      "Unable to get the customer branch list",
      secret
    );
  }
}

//######################################################################################################################################################################################################
//############################# create group  #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function createGroup(customer) {
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "PLAYBACK CREATE GROUP",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "PLAYBACK CREATE GROUP",
      ""
    );
  }

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "PLAYBACK CREATE GROUP",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //END OF VALIDATION 1
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "INVOICE_QUERY_MISSING",
      "PLAYBACK CREATE GROUP",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "PLAYBACK_PACKAGE_QUERY_ERROR",
      "PLAYBACK CREATE GROUP",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "PLAYBACK_INVOICE_JSON_ERROR",
      "PLAYBACK CREATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("groupname") == false ||
    queryData.groupname == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_GROUPNAME_MISSING",
      "PLAYBACK CREATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("gridsize") == false ||
    queryData.gridsie == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_GRIDSIZE_MISSING",
      "PLAYBACK CREATE GROUP NAME",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("screentype") == false ||
    queryData.screentype == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_SCREENTYPE_MISSING",
      "PLAYBACK CREATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("timeintervel") == false ||
    queryData.timeintervel == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_TIME_INTERVEL_MISSING",
      "PLAYBACK CREATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("cameraid") == false ||
    queryData.cameraid == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_GROUP_CAMERA_ID_MISSING",
      "PLAYBACK CREATE GROUP",
      secret
    );
  }
  var cameraIds = "";
  if (queryData.hasOwnProperty("cameraid")) {
    cameraIds = queryData.cameraid.split(",");
    console.log(cameraIds);
  }

  const [result1] = await db.spcall(
    "CALL SP_CREATE_PLAYBACK_GROUP(?,?,?,?,?,@result); select @result",
    [
      queryData.groupname,
      queryData.gridsize,
      queryData.screentype,
      queryData.timeintervel,
      userid,
    ]
  );
  const objectvalue1 = result1[1][0];
  console.log("Group inserted value ->" + objectvalue1["@result"]);
  const groupid = objectvalue1["@result"];
  if (groupid != null) {
    if (queryData.hasOwnProperty("cameraid") && queryData.cameraid !== "") {
      const cameraIds = queryData.cameraid.split(",");
      const validCameraIds = cameraIds.filter(
        (cameraId) => cameraId.trim() !== ""
      );

      if (validCameraIds.length > 0) {
        const placeholders = validCameraIds.map(() => "(?,?)").join(",");
        const insertQuery = `
          INSERT INTO groupcameras (group_id, camera_id)
          VALUES ${placeholders}
        `;
        const insertValues = [];
        for (const cameraId of validCameraIds) {
          insertValues.push(groupid, cameraId.trim());
        }

        const insertResult = await db.query(insertQuery, insertValues);

        if (insertResult.affectedRows > 0) {
          // Groupcameras updated successfully
          return helper.getSuccessResponse(
            "PLAYBACK_GROUP_CREATED_SUCCESSFULLY",
            "The Playback Group create Successfully",
            "group_id :" + groupid,
            secret
          );
        } else {
          return helper.getErrorResponse(
            "PLAYBACK_GROUP_CAMERAS_CREATE_FAILED",
            "Error while creating the group. Please check the Error.",
            secret
          );
        }
      }
    }
  }
}

//######################################################################################################################################################################################################
//############################# get  group  #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getPlaybackGroup(customer) {
  // Check if the given session token size is valid or not
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "PLAYBACK GET GROUP",
      ""
    );
  }
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "PLAYBACK GET GROUP",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "PLAYBACK GET GROUP",
      ""
    );
  }

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //END OF VALIDATION 1
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  // if(customer.hasOwnProperty("querystring")==false){
  //   return helper.getErrorResponse("INVOICE_QUERY_MISSING","PLAYBACK GET GROUP","");
  // }
  // console.log("customer querystring-->"+customer.querystring);
  // var queryData;

  // try{
  //   queryData= await helper.decrypt(customer.querystring,secret);
  //   console.log("decrypted data->"+queryData);
  // }
  // catch(ex){
  //     return helper.getErrorResponse("PLAYBACK_PACKAGE_QUERY_ERROR","PLAYBACK GET GROUP",secret);
  // }
  // try{
  //   queryData=JSON.parse(queryData);
  // }
  // catch(ex){
  //   return helper.getErrorResponse("PLAYBACK_INVOICE_JSON_ERROR","PLAYBACK GET GROUP",secret);
  // }
  sql = "";
  rows = "";
  sql = `select group_name,group_id, group_grid, screen_type,time_interval from groupmaster where created_by = ${userid}`;
  rows = await db.query(sql);
  var groupdetails = "";
  if (rows != "") {
    groupdetails = helper.emptyOrRows(rows);
    console.log("result data" + JSON.stringify(groupdetails));
  }
  if (groupdetails != "") {
    return helper.getSuccessResponse(
      "GROUP_LIST_FETCHED_SUCCESSFULLY",
      "The user playback group list fetched successfully",
      groupdetails,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "GET_PLAYBACK_GROUP_FAILED",
      "Unable to get the playback group list ",
      secret
    );
  }
}

//######################################################################################################################################################################################################
//############################# create group  #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function UpdateGroup(customer) {
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "PLAYBACK UPDATE GROUP",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "PLAYBACK UPDATE GROUP",
      ""
    );
  }

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "PLAYBACK UPDATE GROUP",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //END OF VALIDATION 1
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "UPDATE_GROUP_QUERY_MISSING",
      "PLAYBACK UPDATE GROUP",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "UPDATE_GROUP_PACKAGE_QUERY_ERROR",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "UPDATE_GROUP_JSON_ERROR",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  if (queryData.hasOwnProperty("groupid") == false || queryData.groupid == "") {
    return helper.getErrorResponse(
      "PLAYBACK_GROUP_ID_MISSING",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("groupname") == false ||
    queryData.groupname == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_GROUPNAME_MISSING",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("gridsize") == false ||
    queryData.gridsie == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_GRIDSIZE_MISSING",
      "PLAYBACK UPDATE GROUP NAME",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("screentype") == false ||
    queryData.screentype == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_SCREENTYPE_MISSING",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("timeintervel") == false ||
    queryData.timeintervel == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_TIME_INTERVEL_MISSING",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("cameraid") == false ||
    queryData.cameraid == ""
  ) {
    return helper.getErrorResponse(
      "PLAYBACK_GROUP_CAMERA_ID_MISSING",
      "PLAYBACK UPDATE GROUP",
      secret
    );
  }
  var cameraIds = "";
  if (queryData.hasOwnProperty("cameraid")) {
    cameraIds = queryData.cameraid.split(",");
    console.log(cameraIds);
  }
  const result1 = await db.query(
    `
  UPDATE groupmaster
  SET
    group_name = ?,
    group_grid = ?,
    screen_type = ?,
    time_interval = ?,
    created_by = ?
  WHERE group_id = ?
`,
    [
      queryData.groupname,
      queryData.gridsize,
      queryData.screentype,
      queryData.timeintervel,
      userid,
      queryData.groupid,
    ]
  );
  console.log("Update Result:", result1);
  if (result1.affectedRows) {
    const groupid = queryData.groupid;
    if (groupid != null) {
      if (queryData.hasOwnProperty("cameraid") && queryData.cameraid !== "") {
        const cameraIds = queryData.cameraid.split(",");
        const validCameraIds = cameraIds.filter(
          (cameraId) => cameraId.trim() !== ""
        );

        if (validCameraIds.length > 0) {
          const placeholders = validCameraIds.map(() => "(?,?)").join(",");
          const insertQuery = `
          INSERT INTO groupcameras (group_id, camera_id)
          VALUES ${placeholders}
        `;
          const insertValues = [];
          for (const cameraId of validCameraIds) {
            insertValues.push(groupid, cameraId.trim());
          }

          const insertResult = await db.query(insertQuery, insertValues);
        }
        if (insertResult.affectedRows > 0) {
          // Groupcameras updated successfully
          return helper.getSuccessResponse(
            "PLAYBACK_GROUP_UPDATED_SUCCESSFULLY",
            "The Playback Group updated Successfully",
            groupid,
            secret
          );
        } else {
          return helper.getErrorResponse(
            "PLAYBACK_GROUP_CAMERAS_UPDATE_FAILED",
            "Error while updating groupcameras. Please check the Error.",
            secret
          );
        }
      } else {
        return helper.getErrorResponse(
          "PLAYBACK_GROUP_CAMERAS_UPDATE_FAILED",
          "Error while updating groupcameras. Please check the Error.",
          secret
        );
      }
    }
  }
}

//################################# ADD Escalation  ################################################################################################################################################################################################
//###################################################################################################################################################################################################################################################################################################################################
//#######################################################################

async function addescalation(customer) {
  //BEGIN VALIDATION 1
  //CHECK IF THE SESSIONTOKEN SIZE IS CORRECT
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }

  //CHECK IF THE SESSIONTOKEN IS VALID
  const [result] = await db.spcall(
    `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,
    customer.STOKEN
  );
  const objectvalue = result[1][0];
  console.log("contact objectvalue ->" + objectvalue["@result"]);
  if (objectvalue["@result"] == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }
  // CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT
  if (customer.hasOwnProperty["STOKEN"] == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }
  //END OF VALIDATION 1.
  //BEGIN VALIDATION 2
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CONTACT_PACKAGE_QUERY_MISSING",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret-->" + secret);
  console.log("customer querystring ->" + customer.querystring);
  var querydata;
  try {
    querydata = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted querydata->" + querydata);
  } catch (ex) {
    return helper.getErrorResponse(
      "CONTACT_PACKAGE_QUERY_ERROR",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  try {
    querydata = JSON.parse(querydata);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_CONTACT_JSON_ERROR",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  //  C) IF THE CONTACTEMAIL1 IS NOT GIVEN AS INPUT
  if (querydata.hasOwnProperty("deptid") == false || querydata.deptid == "") {
    return helper.getErrorResponse(
      "CUST_DEPT_ID_MISSING",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  //     A) IF THE CONTACTNAME1 IS NOT GIVEN AS INPUT
  if (
    querydata.hasOwnProperty("contactname") == false ||
    querydata.contactname == ""
  ) {
    return helper.getErrorResponse(
      "CUST_CONTACT_NAME_MISSING",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  //  B) if the contactmobile1 is not given as input
  if (
    querydata.hasOwnProperty("contactphone") == false ||
    querydata.contactphone == ""
  ) {
    return helper.getErrorResponse(
      "CUST_CONTACT_MOBILE_MISSING",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  //  C) IF THE CONTACTEMAIL1 IS NOT GIVEN AS INPUT
  if (
    querydata.hasOwnProperty("contactemail") == false ||
    querydata.contactemail == ""
  ) {
    return helper.getErrorResponse(
      "CUST_CONTACT_EMAIL_MISSING",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  if (
    querydata.hasOwnProperty("escalationtype") == false ||
    querydata.escalationtype == ""
  ) {
    return helper.getErrorResponse(
      "CUST_CONTACT_TYPE_MISSING",
      "ADD CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }

  if (querydata.escalationtype == "Escalation 1") {
    querydata.escalationtype = "0";
  } else if (querydata.escalationtype == "Escalation 2") {
    querydata.escalationtype = "1";
  } else if (querydata.escalationtype == "Escalation 3") {
    querydata.escalationtype = "2";
  } else if (querydata.escalationtype == "Emergency") {
    querydata.escalationtype = "3";
  } else if (querydata.escalationtype == "Technical") {
    querydata.escalationtype = "4";
  }
  const userid = objectvalue["@result"];
  console.log(`Result data==>`, userid);

  const [result1] = await db.spcall(
    "CALL SP_ESCALATION_CONTACT_ADD(?,?,?,?,?,?,@escalationid); Select @escalationid",
    [
      querydata.deptid,
      querydata.contactname,
      querydata.contactphone,
      querydata.contactemail,
      querydata.escalationtype,
      userid,
    ]
  );

  const objectvalue1 = result1[1][0];
  const contact_id = objectvalue1["@escalationid"];
  console.log("CUSTOMER ESCALATION CONTACT ID -->" + contact_id);
  if (contact_id != null && contact_id != 0) {
    return helper.getSuccessResponse(
      "CUST_CONTACTS_UPDATE_SUCCESS",
      "Customer contact details Updated Successfully..",
      contact_id,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "CUST_CONTACT_UPDATE_FAILED",
      "Customer contacts Updation failed .  Please check the details and re-enter correct details",
      secret
    );
  }
}

//################################# Get the dept Escalation contact  ################################################################################################################################################################################################
//###################################################################################################################################################################################################################################################################################################################################
//#######################################################################

async function Getescalation(customer) {
  let message = "Error in fetching department escalation contact";
  let responsecode = "8005";
  //BEGIN VALIDATION 1
  //CHECK IF THE SESSIONTOKEN SIZE IS CORRECT
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }

  //CHECK IF THE SESSIONTOKEN IS VALID
  const [result] = await db.spcall(
    `CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,
    customer.STOKEN
  );
  const objectvalue = result[1][0];
  console.log("contact objectvalue ->" + objectvalue["@result"]);
  if (objectvalue["@result"] == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }
  // CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT
  if (customer.hasOwnProperty["STOKEN"] == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }
  //END OF VALIDATION 1.
  //BEGIN VALIDATION 2
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUTS
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CONTACT_PACKAGE_QUERY_MISSING",
      "GET CUSTOMER ESCALATION CONTACT LIST",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret-->" + secret);
  console.log("customer querystring ->" + customer.querystring);
  var querydata;
  try {
    querydata = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted querydata->" + querydata);
  } catch (ex) {
    return helper.getErrorResponse(
      "CONTACT_PACKAGE_QUERY_ERROR",
      "GET CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  try {
    querydata = JSON.parse(querydata);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_CONTACT_JSON_ERROR",
      "GET CUSTOMER ESCALATION CONTACT LIST",
      secret
    );
  }
  let sql = "";
  //  C) IF THE CONTACTEMAIL1 IS NOT GIVEN AS INPUT
  if (
    querydata.deptid != "" &&
    querydata.deptid != null &&
    querydata.hasOwnProperty("deptid") == true
  ) {
    sql = `select DISTINCT Dept_id,ID,Name1,Name2,Name3,Contact_mobile1,Contact_mobile2,Contact_mobile3,Contact_Email1,Contact_Email2,Contact_Email3,Emerg_mobile,Emerg_Email,Technical_Email,Technical_contact,Dept_id,ID from deptcontacts where Dept_ID in(${querydata.deptid})`;
    console.error(`SQL==>`, sql);
  } else if (
    querydata.customerid != null &&
    querydata.customerid != "" &&
    querydata.hasOwnProperty("customerid") == true
  ) {
    sql = `select DISTINCT Name1,Name2,Name3,Contact_mobile1,Contact_mobile2,Contact_mobile3,Contact_Email1,Contact_Email2,Contact_Email3,Emerg_mobile,Emerg_Email,Technical_Email,Technical_contact,Dept_id,ID from deptcontacts where Dept_ID IN
      (select Dept_ID from deptmaster where Branch_ID IN (select Branch_ID from branchmaster where Customer_id IN(${querydata.customerid})))`;
    console.error(`SQL==>`, sql);
  }
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const data = helper.emptyOrRows(rows);
  message = "The department escalation contact Fetching successfully";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      data,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# delete group  #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function DeleteGroup(customer) {
  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "PLAYBACK DELETE GROUP",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "PLAYBACK DELETE GROUP",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "PLAYBACK DELETE GROUP",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //END OF VALIDATION 1
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "DELETE_GROUP_QUERYSTRING_MISSING",
      "PLAYBACK DELETE GROUP",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "DELETE_GROUP_QUERYSTRING_ERROR",
      "PLAYBACK DELETE GROUP",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "DELETE_GROUP_QUERY_JSON_ERROR",
      "PLAYBACK DELETE GROUP",
      secret
    );
  }
  if (queryData.hasOwnProperty("groupid") == false || queryData.groupid == "") {
    return helper.getErrorResponse(
      "DELETE_GROUP_ID_MISSING",
      "PLAYBACK DELETE PLAYBACK GROUP ID IS MISSING",
      secret
    );
  }
  let sql = "";
  let rows = "";
  sql = `DELETE FROM groupmaster where group_id =${queryData.groupid} AND created_by = ${userid}`;
  rows = await db.query(sql);

  if (rows.affectedRows) {
    return helper.getSuccessResponse(
      "PLAYBACK_GROUP_DELETED_SUCCESSFULLY",
      "The Playback Group deleted Succcessfully",
      "",
      secret
    );
  } else {
    return helper.getErrorResponse(
      "PLAYBACK_GROUP_DELETING_FAILED",
      "Error while deleting the playback group. Please check the Error.",
      secret
    );
  }
}

//######################################################################################################################################################################################################
//############################# delete group camera #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function DeleteCamera(customer) {
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "PLAYBACK DELETE GROUP CAMERA",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "PLAYBACK DELETE GROUP CAMERA",
      ""
    );
  }

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "PLAYBACK DELETE GROUP CAMERA",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //END OF VALIDATION 1
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "DELETE_GROUP_QUERY_MISSING",
      "PLAYBACK DELETE GROUP CAMERA",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "DELETE_GROUP_PACKAGE_QUERY_ERROR",
      "PLAYBACK DELETE GROUP CAMERA",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "DELETE_GROUP_JSON_ERROR",
      "PLAYBACK DELETE GROUP CAMERA",
      secret
    );
  }
  if (queryData.hasOwnProperty("groupid") == false || queryData.groupid == "") {
    return helper.getErrorResponse(
      "DELETE_GROUP_ID_MISSING",
      "PLAYBACK DELETE GROUP CAMERA PLAYBACK GROUP ID IS MISSING",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("cameraid") == false ||
    queryData.cameraid == ""
  ) {
    return helper.getErrorResponse(
      "DELETE_GROUP_CAMERA_ID_MISSING",
      "PLAYBACK DELETE GROUP CAMERA",
      secret
    );
  }
  let sql = "";
  let rows = "";
  sql = `DELETE FROM groupcameras where camera_id= ${queryData.cameraid} and  group_id= ${queryData.groupid} `;
  console.error("Sql->" + sql);
  rows = await db.query(sql);

  if (rows.affectedRows) {
    return helper.getSuccessResponse(
      "PLAYBACK_GROUP_CAMERA_DELETED_SUCCESSFULLY",
      "The Playback Group camera deleted Succcessfully",
      queryData.cameraid,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "PLAYBACK_GROUP_CAMERA_DELETING_FAILED",
      "Error while deleting the playback group camera. Please check the Error.",
      secret
    );
  }
}

//######################################################################################################################################################################################################
//############################# get  group  #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getGroupInfo(customer) {
  message = "Error while fetchingGroup Info list";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "PLAYBACK GET GROUP INFO",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "PLAYBACK GET GROUP INFO",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "PLAYBACK GET GROUP INFO",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "GROUP_INFO_QUERY_MISSING",
      "PLAYBACK GET GROUP INFO",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "GROUP_PACKAGE_QUERY_ERROR",
      "PLAYBACK GET GROUP INFO",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "GROUP_INVOICE_JSON_ERROR",
      "PLAYBACK GET GROUP INFO",
      secret
    );
  }
  if (queryData.hasOwnProperty("groupid") == false || queryData.groupid == "") {
  }
  let sql = "";
  //  rows ="";
  //    sql = `select group_name,group_id, group_grid, screen_type,time_interval from groupmaster where group_id =${queryData.groupid}`;
  //    rows = await db.query(sql);
  //   var groupdetails ='';
  // if (rows != "") {
  //     groupdetails = helper.emptyOrRows(rows);
  //     console.log("result data"+JSON.stringify(groupdetails));
  sql = `select group_name,group_id, group_grid, screen_type,time_interval from groupmaster where group_id =${queryData.groupid}`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const groupdetails = helper.emptyOrRows(rows);

  let sql1 = "";
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
  sql1 = `select camera_id from groupcameras where group_id =${queryData.groupid}`;
  console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  console.error(`rows==>`, rows);
  const groupcameras = helper.emptyOrRows(rows1);

  message = "Group Info list Fetching successfully";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      groupdetails,
      groupcameras,
    }),
    secret
  );
  return encrypt;
}

//     if(groupdetails != ''){
//       return helper.getSuccessResponse("GROUP_LIST_FETCHED_SUCCESSFULLY" , "The user playback group list fetched successfully",groupdetails,secret);
//     }
//     else {
//       return helper.getErrorResponse("GET_PLAYBACK_GROUP_FAILED", "Unable to get the playback group list ", secret);
//     }

//####################################################################################################################################################################################################
//####################   UPDATE SITE   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add a new company to the customer
//Input data
// {
//   "companyname":"TestCompany1",
//   "contactemail":"ponraj4you@gmail.com",
//   "contactphone":"8838360294",
//   "address":"Test Address1",
//   "companytype":0
// }
//####################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the companyname is valid
//          d) Check the contactemail is valid
//          e) Check the contactphone is valid
//          f) Check the address is valid
//          g) Check the companytype is valid
//      3. Email id should be valid email format
//      4. Phone number should not be greater than 15 and should not be less than 8 number.
//      5. Company type should not be more than 2
//      6. Send OTP Email, if already verified email, donot send it
//      7. Send OTP SMS, if already verified email, donot send it
//####################################################################################################################################################################################################
async function updatesite(customer) {
  //  a) If SESSION TOKEN Character sizes error
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "CUSTOMER UPDATE SITE",
      ""
    );
  }

  //  b) If SESSION TOKEN not available
  const [result1] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
    [customer.STOKEN]
  );
  const objectValue1 = result1[1][0];
  console.log("Add company, objectValue->" + objectValue1["@result"]);
  const user_id = objectValue1["@result"];
  const custID = objectValue1["@custid"];
  console.log("customer id->" + custID);
  if (user_id == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "CUSTOMER UPDATE SITE",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  c) If SESSION TOKEN not given as input
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "CUSTOMER UPDATE SITE",
      ""
    );
  }
  //End of Validation 1

  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "CUSTOMER UPDATE SITE",
      ""
    );
  }

  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //          c) Check the companyname is valid
  if (queryData.hasOwnProperty("branchname") == false) {
    return helper.getErrorResponse(
      "CUST_BRANCH_NAME_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //check if the companyname is valid
  if (queryData.hasOwnProperty("Address") == false) {
    return helper.getErrorResponse(
      "COMPANY_ADDRESS_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //Check if the companycode is given as an input or not
  if (queryData.hasOwnProperty("city") == false) {
    return helper.getErrorResponse(
      "COMPANY_CITY_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //          d) Check the contactemail is valid
  if (queryData.hasOwnProperty("pincode") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_PINCODE_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //)check if the contact person number is given as an input or not
  if (queryData.hasOwnProperty("state") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_STATE_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //          e) Check the contactphone is valid
  if (queryData.hasOwnProperty("emailid") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_CONTACT_EMAIL_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }
  //          g) Check the billing address is valid
  if (queryData.hasOwnProperty("branchid") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_BRANCH_ID_MISSING",
      "CUSTOMER UPDATE SITE",
      secret
    );
  }

  //End of Validation 2

  const result = await db.query(
    `
   UPDATE branchmaster
   SET Branch_name = ?, Address = ?, city = ?, pincode = ?, state = ?, Email_ID =?, Created_by = ? WHERE Branch_ID  = ?`,
    [
      queryData.branchname,
      queryData.Address,
      queryData.city,
      queryData.pincode,
      queryData.state,
      queryData.emailid,
      user_id,
      queryData.branchid,
    ]
  );

  if (result.affectedRows) {
    return helper.getSuccessResponse(
      "SITE_UPDATED_SUCCESSFULLY",
      "The company site was updated successfully",
      queryData.branchid,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "ERROR_UPDATING_SITE",
      "Error while updating the company site",
      secret
    );
  }
}

//####################################################################################################################################################################################################
//####################   UPDATE DEVICE   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add a new company to the customer
//Input data

//####################################################################################################################################################################################################
//Validation rule
//      1. SESSION TOKEN VALIDATION
//          a) If SESSION TOKEN Character sizes error
//          b) If SESSION TOKEN not available
//          c) If SESSION TOKEN not given as input
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//          c) Check the companyname is valid
//          d) Check the contactemail is valid
//          e) Check the contactphone is valid
//          f) Check the address is valid
//          g) Check the companytype is valid
//      3. Email id should be valid email format
//      4. Phone number should not be greater than 15 and should not be less than 8 number.
//      5. Company type should not be more than 2
//      6. Send OTP Email, if already verified email, donot send it
//      7. Send OTP SMS, if already verified email, donot send it
//####################################################################################################################################################################################################
async function updateDevice(customer) {
  //  a) If SESSION TOKEN Character sizes error
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "CUSTOMER UPDATE DEVICE",
      ""
    );
  }

  //  b) If SESSION TOKEN not available
  const [result1] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;",
    [customer.STOKEN]
  );
  const objectValue1 = result1[1][0];
  console.log("Add company, objectValue->" + objectValue1["@result"]);
  const user_id = objectValue1["@result"];
  const custID = objectValue1["@custid"];
  console.log("customer id->" + custID);
  if (user_id == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "CUSTOMER UPDATE DEVICE",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  c) If SESSION TOKEN not given as input
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "CUSTOMER UPDATE DEVICE",
      ""
    );
  }
  //End of Validation 1
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "CUSTOMER UPDATE DEVICE",
      ""
    );
  }

  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          c) Check the serialno is valid
  if (queryData.hasOwnProperty("serialno") == false) {
    return helper.getErrorResponse(
      "DEVICE_SERIAL_NO_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //check if the devicename is valid
  if (queryData.hasOwnProperty("devicename") == false) {
    return helper.getErrorResponse(
      "DEVICE_NAME_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //Check if the devicetype is given as an input or not
  if (queryData.hasOwnProperty("devicetype") == false) {
    return helper.getErrorResponse(
      "DEVICE_TYPE_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          d) Check the sdkid is valid
  if (queryData.hasOwnProperty("sdkid") == false) {
    return helper.getErrorResponse(
      "DEVICE_SDK_ID_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //)check if the ipdomain is given as an input or not
  if (queryData.hasOwnProperty("ipdomain") == false) {
    return helper.getErrorResponse(
      "DEVICE_IP_DOMAIN_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          e) Check the ipport is valid
  if (queryData.hasOwnProperty("ipport") == false) {
    return helper.getErrorResponse(
      "DEVICE_IP_PORT_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the ipuname is valid
  if (queryData.hasOwnProperty("ipuname") == false) {
    return helper.getErrorResponse(
      "DEVICE_IP_USERNAME_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the ippassword is valid
  if (queryData.hasOwnProperty("ippassword") == false) {
    return helper.getErrorResponse(
      "DEVICE_IP_PASSWORD_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //)check if the noanalog is given as an input or not
  if (queryData.hasOwnProperty("noanalog") == false) {
    return helper.getErrorResponse(
      "DEVICE_NO__MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          e) Check the noipch is valid
  if (queryData.hasOwnProperty("noipch") == false) {
    return helper.getErrorResponse(
      "DEVICE_NO_IPCHANNEL_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check thenoavailablestream is valid
  if (queryData.hasOwnProperty("noavailablestream") == false) {
    return helper.getErrorResponse(
      "DEVICE_NO_AVAILBL_STREAM_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check motiondetection is valid
  if (queryData.hasOwnProperty("motiondetection") == false) {
    return helper.getErrorResponse(
      "DEVICE_MOTION_DETECTION_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          e) Check the rtspavailble is valid
  if (queryData.hasOwnProperty("rtspavailble") == false) {
    return helper.getErrorResponse(
      "DEVICE_RTSP_AVAILABILITY_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the httpport is valid
  if (queryData.hasOwnProperty("httpport") == false) {
    return helper.getErrorResponse(
      "DEVICE_HTTP_PORT_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the runivs is valid
  if (queryData.hasOwnProperty("runivs") == false) {
    return helper.getErrorResponse(
      "DEVICE_RUN_IVS_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          e) Check the resolutions is valid
  if (queryData.hasOwnProperty("resolutions") == false) {
    return helper.getErrorResponse(
      "DEVICE_RESOLUTION_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the rtspport is valid
  if (queryData.hasOwnProperty("rtspport") == false) {
    return helper.getErrorResponse(
      "DEVICE_RTSP_PORT_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the harddisk is valid
  if (queryData.hasOwnProperty("harddisk") == false) {
    return helper.getErrorResponse(
      "DEVICE_HARD_DISK_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          e) Check the harddiskcap is valid
  if (queryData.hasOwnProperty("harddiskcap") == false) {
    return helper.getErrorResponse(
      "DEVICE_HARD_DISK_CAPACITY_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the modelno is valid
  if (queryData.hasOwnProperty("modelno") == false) {
    return helper.getErrorResponse(
      "DEVICE_MODEL_NO_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }
  //          g) Check the deviceid is valid
  if (
    queryData.hasOwnProperty("deviceid") == false ||
    queryData.deviceid == "" ||
    queryData.deviceid == null
  ) {
    return helper.getErrorResponse(
      "UPDATE_DEVICE_ID_MISSING",
      "CUSTOMER UPDATE DEVICE",
      secret
    );
  }

  //End of Validation 2
  const result = await db.query(
    `UPDATE devicemaster
   SET SerialNo  =?, Device_name =?, Device_Type =?, SDK_ID =?, IP_Domain =?, IP_Port =?, IP_Uname =?, IP_Pwd  =?, No_AnalogCH =?, No_IpCH =?, No_AStream =?, No_streamavail =?,
   MotionDetection =?, IsRTSPAvailable =?, httpport  =?, RTSP_Port =?, Run_IVS =?, Resolutions =?, Model_no =?, Harddisk =?, harddiskcap =?, modified_by =? WHERE Device_ID  =?`,
    [
      queryData.serialno,
      queryData.devicename,
      queryData.devicetype,
      queryData.sdkid,
      queryData.ipdomain,
      queryData.ipport,
      queryData.ipuname,
      queryData.ippassword,
      queryData.noanalog,
      queryData.noipch,
      queryData.noavailablestream,
      queryData.motiondetection,
      queryData.rtspavailble,
      queryData.httpport,
      queryData.rtspport,
      queryData.runivs,
      queryData.resolutions,
      queryData.modelno,
      queryData.harddisk,
      queryData.harddiskcap,
      user_id,
      queryData.deviceid,
    ]
  );

  if (result.affectedRows) {
    return helper.getSuccessResponse(
      "DEVICE_UPDATED_SUCCESSFULLY",
      "The customer device was updated successfully",
      queryData.deviceid,
      secret
    );
  } else {
    return helper.getErrorResponse(
      "ERROR_UPDATING_DEVICE_DATA",
      "Error while updating the customer device",
      secret
    );
  }
}

//######################################################################################################################################################################################################
//############################# get Payment History #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getPaymentHistory(customer) {
  message = "Error while fetching Payment History";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET PAYMENT HISTORY",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET PAYMENT HISTORY",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET PAYMENT HISTORY",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    let sql1 = "";
    sql1 = `SELECT COUNT(*) as Total_history FROM customerpayments ci LEFT JOIN customerpaymentinvoices cpi ON 
    ci.cpayment_id = cpi.cpayment_id WHERE ci.customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerregid})`;
    console.error(`SQL==>`, sql1);
    const rows1 = await db.query(sql1);
    console.error(`rows==>`, rows1);
    const TotalPaymentHistory = helper.emptyOrRows(rows1);

    let sql = "";
    sql = `SELECT ci.cpayment_id,ci.Customer_id,ci.paid_amount,ci.payment_mode,ci.reference_no,DATE_FORMAT(ci.row_updated_date, '%Y-%m-%d %H:%i:%s') AS Payment_date,
    COUNT(cpi.invoice_id) AS Invoice_Count, ci.status as payment_status FROM customerpayments ci JOIN customerpaymentinvoices cpi ON ci.cpayment_id = cpi.cpayment_id
  WHERE customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerregid}) GROUP BY ci.cpayment_id, ci.Customer_id, ci.paid_amount, ci.payment_mode, 
  ci.reference_no, Payment_date`;
    const rows = await db.query(sql);
    console.error(`rows==>`, rows);
    const PaymentHistory = helper.emptyOrRows(rows);

    message = "Payment History Fetched successfully";
    responsecode = "807";
    const encrypt = helper.encrypt(
      JSON.stringify({
        responsecode,
        message,
        PaymentHistory,
        TotalPaymentHistory,
      }),
      secret
    );
    return encrypt;
  } else {
    console.log("querystring=>" + customer.querystring);
    var queryData;
    try {
      //  b) If Querystring decryption fails
      queryData = await helper.decrypt(customer.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "CUST_PACKAGE_QUERY_ERROR",
        "GET PAYMENT HISTORY",
        secret
      );
    }
    try {
      queryData = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse(
        "CUST_COMPANY_JSON_ERROR",
        "GET PAYMENT HISTORY",
        secret
      );
    }
    //          c) Check the serialno is valid
    if (queryData.hasOwnProperty("paymentmode") == false) {
      return helper.getErrorResponse(
        "PAYMENT_MODE_MISSING",
        "GET PAYMENT HISTORY",
        secret
      );
    }
    let sql1 = "";
    sql1 = `SELECT COUNT(*) as Total_count FROM customerpayments ci WHERE ci.customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerregid}) AND ci.payment_mode = ${queryData.paymentmode};`;
    console.error(`SQL==>`, sql1);
    const rows1 = await db.query(sql1);
    console.error(`rows==>`, rows1);
    const TotalPaymentHistory = helper.emptyOrRows(rows1);
    let sql = "";
    sql = `SELECT ci.cpayment_id, ci.Customer_id, SUM(ci.paid_amount) AS total_paid_amount, ci.payment_mode, ci.reference_no, DATE_FORMAT(MAX(ci.row_updated_date), '%Y-%m-%d %H:%i:%s') 
    AS Payment_date, COUNT(cpi.invoice_id) AS Invoice_Count, MAX(ci.status) AS payment_status FROM customerpayments ci JOIN customerpaymentinvoices cpi ON 
    ci.cpayment_id = cpi.cpayment_id WHERE customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerregid}) AND ci.payment_mode 
    = ${queryData.paymentmode} GROUP BY ci.cpayment_id, ci.Customer_id, ci.payment_mode, ci.reference_no;`;
    const rows = await db.query(sql);
    console.error(`rows==>`, rows);
    const PaymentHistory = helper.emptyOrRows(rows);

    message = "Payment History Fetched successfully";
    responsecode = "807";
    const encrypt = helper.encrypt(
      JSON.stringify({
        responsecode,
        message,
        PaymentHistory,
        TotalPaymentHistory,
      }),
      secret
    );
    return encrypt;
  }
}

//######################################################################################################################################################################################################
//############################# get Payment Invoice Items #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getPaymentInvoice(customer) {
  message = "Error while fetching Payment";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET PAYMENT INVOICE",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET PAYMENT INVOICE",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET PAYMENT INVOICE",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  let sql1 = `select count(*) as Total_Invoice from customerinvoices where custbill_id in(select custbill_id from customerbillingmaster where custsub_id
  in(select custsub_id from customersubscriptions where customer_id in(select customer_id from customermaster where customerreg_id = ${customerregid})));`;
  const invoice = await db.query(sql1);
  console.error(`rows==>`, invoice);
  const Total_Invoice = helper.emptyOrRows(invoice);

  let sql2 = `select sum(ci.invoice_amount) as Total_amount, sum(ci.paid_amount) as Paid_amount,sum(ci.invoice_amount - ci.paid_amount) 
  as outstanding_amount from customerinvoices ci , customerpaymentinvoices cpi where ci.invoice_id = cpi.invoice_id and ci.custbill_id IN( select custbill_id from 
  customerbillingmaster where custsub_id In(select custsub_id from customersubscriptions where  customer_id in(SELECT customer_id from customermaster where
  customerreg_id = ${customerregid})))`;
  const pending = await db.query(sql2);
  console.error(`rows==>`, pending);
  const pending_amount = helper.emptyOrRows(pending);

  let sql = "";
  sql = `SELECT custbill_id, invoice_number, DATE_FORMAT(invoice_date, '%Y-%m-%d') as Invoice_date, DATE_FORMAT(due_date, '%Y-%m-%d') as Due_date, paid_status as Payment_status, 
  invoice_amount as total_amount, paid_amount, (invoice_amount - paid_amount) as outstanding_amount FROM customerinvoices WHERE custbill_id IN ( SELECT custbill_id FROM 
  customerbillingmaster WHERE custsub_id IN ( SELECT custsub_id FROM customersubscriptions WHERE customer_id IN ( SELECT customer_id FROM customermaster WHERE 
  customerreg_id = ${customerregid})));`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const PaymentInvoice = helper.emptyOrRows(rows);

  message = "Customer Payment Invoice Fetched successfully";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      Total_Invoice,
      PaymentInvoice,
      pending_amount,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# get Payment Invoice Items #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getPendingInvoice(customer) {
  message = "Error while fetching Payment Invoice";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET PAYMENT INVOICE",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET PAYMENT INVOICE",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET PAYMENT INVOICE",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);

  let sql = "";
  sql = `select custpinvoice_id,cpayment_id,invoice_id,invoice_amount from customerpaymentinvoices 
  where invoice_id in(select invoice_id from customerinvoices where custbill_id IN(select custbill_id from customerbillingmaster where custsub_id In(select custsub_id 
    from customersubscriptions where customer_id IN(select customer_id from customermaster where customerreg_id = ${customerregid}))))`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const PaymentInvoice = helper.emptyOrRows(rows);
  message = "Customer Payment Invoice Fetched successfully";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      PaymentInvoice,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# get Payment Invoice Items #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getStatementAccount(customer) {
  message = "Error while fetching statements of the account";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET PAYMENT ACCOUNT STATEMENT",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET PAYMENT ACCOUNT STATEMENT",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerreg_id = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET PAYMENT ACCOUNT STATEMENT",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  let sql = "";
  sql = `SELECT (SELECT COUNT(*) FROM customerinvoices WHERE custbill_id IN (SELECT custbill_id FROM customerbillingmaster WHERE custsub_id IN 
     (SELECT custsub_id FROM customersubscriptions WHERE customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerreg_id})))) AS
     Total_Invoices, SUM(cp.tot_tax_amount) AS Total_tax_amount, SUM(cp.tds_amount) AS Total_TDS_Amount, SUM(cp.tot_inv_amount) AS Total_amount, 
     SUM(cpi.invoice_amount) AS Paid_amount, (SELECT SUM(cp.tot_inv_amount - cpi.invoice_amount) FROM customerpayments cp, customerpaymentinvoices cpi WHERE 
     cp.cpayment_id = cpi.cpayment_id AND cp.customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerreg_id})) AS Outstanding_Amount FROM customerpayments cp, 
     customerpaymentinvoices cpi WHERE cp.cpayment_id = cpi.cpayment_id AND cp.customer_id IN (SELECT customer_id FROM customermaster WHERE customerreg_id = ${customerreg_id}) LIMIT 0, 25;`;

  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const Statement = helper.emptyOrRows(rows);
  message = "Customer Account statements fetched successfully.";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      Statement,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# get Payment Invoice Items #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function UpdateSubscription(customer) {
  message = "Error while updating the subscription package ";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "UPDATE SUBSCRIPTION PACKAGE",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "UPDATE SUBSCRIPTION PACKAGE",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "UPDATE SUBSCRIPTION PACKAGE",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      ""
    );
  }
  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("subscriptionid") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_SUBSCRIPTION_ID_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("customerid") == false) {
    return helper.getErrorResponse(
      "SUBSCRIPTION_CUSTOMER_ID_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("amount") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_SUB_AMOUNT_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("noofdevice") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_NO_OF_DEVICE_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("cloudstorage") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_CLOUD_STORAGE_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("billingcycle") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_BILLING_CYCLE_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("gracetime") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_GRACE_TIME_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("startdate") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_START_DATE_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  if (queryData.hasOwnProperty("enddate") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_END_DATE_MISSING",
      "UPDATE SUBSCRIPTION PACKAGE",
      secret
    );
  }
  try {
    let sql = "";
    sql = `UPDATE customersubscription SET status = 2 where customer_id  = ${queryData.customerid}`;
    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    console.error(`rows==>`, rows);
    const [result1] = await db.spcall(
      `CALL SP_CUST_SUBSCRIPTION_ADD(?,?,?,?,?,?,?,?,?,@result); select @result;`,
      [
        queryData.customerid,
        queryData.subscriptionid,
        queryData.amount,
        0,
        queryData.amount,
        queryData.billingcycle,
        queryData.gracetime,
        queryData.startdate,
        queryData.enddate,
      ]
    );
    const objectValue2 = result2[1][0];
    console.log("New Subscription, objectValue->" + objectValue2["@result"]);
    if (objectValue2["@result"] == null) {
      //      13. If the package id is already exist, show error
      return helper.getErrorResponse(
        "CUST_PACKAGE_ADD_ERROR",
        "CUSTOMER SUBSCRIPTION",
        secret
      );
    } else {
      var custsubid = objectValue2["@result"];
      //Send Email to the customer for new subscription
      sql = `SELECT * from customersubscriptiontrans where custsub_id=${custsubid}`;
      console.error(`SQL data==>`, sql);
      if (sql != "") {
        const rows = await db.query(sql);
        const data = helper.emptyOrRows(rows);
        var pfeatures = "";
        var i = 1;
        data.forEach((element) => {
          pfeatures += "" + i + ".";
          if (element.trans_type == 0) pfeatures += "No of sites";
          if (element.trans_type == 1) pfeatures += "No of devices";
          if (element.trans_type == 2) pfeatures += "No of Channels";
          if (element.trans_type == 3) pfeatures += "Addl Channels";
          if (element.trans_type == 4) pfeatures += "Addl Devices";
          if (element.trans_type == 5) pfeatures += "Addl Site";
          if (element.trans_type == 6) pfeatures += "Cloud Storage";
          if (element.trans_type == 7) pfeatures += "Addl Storage";
          if (element.trans_type == 8) pfeatures += "No of patrols";
          if (element.trans_type == 9) pfeatures += "Patrol Hours";
          if (element.trans_type == 10) pfeatures += "Addl patrol";
          if (element.trans_type == 11) pfeatures += "AI features";

          pfeatures += "   " + element.tot_qty + "     ";
          pfeatures += "   " + element.amount + ".\n\r";
          i++;
        });
        console.log("pfeatures=>" + pfeatures);
        var billingcyclestr = "";
        if (queryData.billingcycle == 1)
          billingcyclestr = queryData.billingcycle + "st ";
        if (queryData.billingcycle == 2)
          billingcyclestr = queryData.billingcycle + "nd ";
        if (queryData.billingcycle == 3)
          billingcyclestr = queryData.billingcycle + "rd ";
        if (queryData.billingcycle > 3)
          billingcyclestr = queryData.billingcycle + "th ";

        billingcyclestr = billingcyclestr + "of every month.";
        console.log("billingcyclestr=>" + billingcyclestr);
        EmailSent = await mailer.sendEmail(
          customername,
          customeremail,
          "UPDATE SUBSCRIPTION",
          "newsubscription.html",
          "",
          "NEWSUB_EMAIL_CONF",
          queryData.packagename,
          billingcyclestr,
          pfeatures
        );
        return helper.getSuccessResponse(
          "CUST_PACKAGE_ADD_SUCCESS",
          objectValue1["@result"],
          secret
        );
      } else {
        return helper.getSuccessResponse(
          "CUST_PACKAGE_ADD_SUCCESS",
          objectValue1["@result"],
          secret
        );
      }
    }
  } catch (ex) {
    //      14. If any DB error occurs during the addition
    return ex;
  }
  //End of Validation:- 4. Add subscrion to the customer
}

//######################################################################################################################################################################################################
//############################# get Payment Invoice Items #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getInvoiceforbillid(customer) {
  message = "Error while fetching invoice id for the customer bill_id";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET INVOICE ID",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET INVOICE ID",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerreg_id = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET INVOICE ID",
      ""
    );
  }
  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "GET INVOICE ID",
      ""
    );
  }
  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "GET INVOICE ID",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "GET INVOICE ID",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("cpayment_id") == false ||
    queryData.cpayment_id == null ||
    queryData.cpayment_id == ""
  ) {
    return helper.getErrorResponse(
      "CUSTOMER_ID_MISSING",
      "GET INVOICE ID FOR THE CUSTOMER",
      secret
    );
  }
  let sql1 = `select invoice_number from customerinvoices where invoice_id in(select invoice_id from customerpaymentinvoices where cpayment_id=${queryData.cpayment_id});`;
  const invoice = await db.query(sql1);
  console.error(`rows==>`, invoice);
  const Invoice_id = helper.emptyOrRows(invoice);
  message = "Customer Invoice ID fetched successfully.";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      Invoice_id,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# DELETE SITE #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function deletesite(customer) {
  message = "Error while deleting customer site";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "DELETE CUSTOMER SITE",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "DELETE CUSTOMER SITE",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR  NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregidid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "DELETE CUSTOMER SITE",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "DELETE CUSTOMER SITE",
      ""
    );
  }
  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "DELETE CUSTOMER SITE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "DELETE CUSTOMER SITE",
      secret
    );
  }
  let sql = "";
  if (queryData.customerid != "" && queryData.customerid != null) {
    sql = `DELETE branchmaster FROM branchmaster INNER JOIN (SELECT branch_id FROM branchmaster WHERE customer_id = ${queryData.customerid}) AS subquery ON branchmaster.branch_id = subquery.branch_id;`;
  } else if (queryData.branchid != "" && queryData.branchid != null) {
    sql = `DELETE FROM branchmaster where branch_id In(${queryData.branchid})`;
  }
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  if (rows.affectedRows) {
    message = " Customer site/sites deleted successfully";
    responsecode = "807";
  }
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# DELETE SITE #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function deletedevice(customer) {
  message = "Error while deleting customer site device";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "DELETE CUSTOMER SITE DEVICE",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "DELETE CUSTOMER SITE DEVICE",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregidid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "DELETE CUSTOMER SITE DEVICE",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "DELETE CUSTOMER SITE DEVICE",
      ""
    );
  }

  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "DELETE CUSTOMER SITE DEVICE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "DELETE CUSTOMER SITE DEVICE",
      secret
    );
  }
  let sql = "";
  if (queryData.customerid != "" && queryData.customerid != null) {
    sql = `DELETE FROM devicemaster WHERE dept_id IN (SELECT dept_id FROM deptmaster WHERE branch_id IN (SELECT branch_id FROM branchmaster WHERE customer_id = ${queryData.customerid}))`;
  } else if (queryData.branchid != "" && queryData.branchid != null) {
    sql = `DELETE FROM devicemaster WHERE dept_id IN (SELECT dept_id FROM deptmaster WHERE branch_id = ${queryData.branchid})`;
  } else if (queryData.deptid != "" && queryData.deptid != null) {
    sql = `DELETE FROM devicemaster WHERE dept_id IN (${queryData.deptid})`;
  } else if (queryData.deviceid != "" && queryData.deviceid != null) {
    sql = `DELETE FROM devicemaster WHERE device_id IN (${queryData.deviceid})`;
  }
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  if (rows.affectedRows) {
    message = " Customer site device deleted successfully";
    responsecode = "807";
  }
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
    }),
    secret
  );
  return encrypt;
}

//######################################################################################################################################################################################################
//############################# get total number of dvr and nvr  #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function getdvrnvr(customer) {
  message = "Error while fetching Total number of dvr and nvr for the company";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET TOTAL DVR/NVR",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET TOTAL DVR/NVR",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET TOTAL DVR/NVR",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "TOTAL_DVR/NVR_QUERY_MISSING",
      "GET TOTAL DVR/NVR",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "TOTAL_DVR_PACKAGE_QUERY_ERROR",
      "GET TOTAL DVR/NVR",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "TOTAL_DVR_INVOICE_JSON_ERROR",
      "GET TOTAL DVR/NVR",
      secret
    );
  }
  let sql = "";
  if (
    queryData.hasOwnProperty("customerid") == true &&
    queryData.customerid != "" &&
    queryData.customerid != null
  ) {
    sql = `select Count(*) as Total_Device from devicemaster where Dept_id in(select Dept_ID from deptmaster where Branch_id IN (select Branch_id from branchmaster where customer_id IN(${queryData.customerid})))`;
    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    console.error(`rows==>`, rows);
    const Total_Device = helper.emptyOrRows(rows);

    let sql1 = "";
    sql1 = `SELECT 
  SUM(CASE WHEN device_type = 0 THEN 1 ELSE 0 END) AS total_dvrs, SUM(CASE WHEN device_type = 1 THEN 1 ELSE 0 END) AS Total_nvrs FROM
  devicemaster where Dept_id in(select Dept_ID from deptmaster where Branch_id IN (select Branch_id from branchmaster where customer_id IN(${queryData.customerid})));`;
    console.error(`SQL==>`, sql1);
    const rows1 = await db.query(sql1);
    console.error(`rows==>`, rows1);
    const Totaldvrnvr = helper.emptyOrRows(rows1);

    let sql2 = "";
    sql2 = `SELECT 
  SUM(CASE WHEN device_type = 0 AND status = '1' THEN 1 ELSE 0 END) AS active_dvrs, SUM(CASE WHEN device_type = 1 AND status = '1' THEN 1 ELSE 0 END) AS active_nvrs FROM
  devicemaster where Dept_id in(select Dept_ID from deptmaster where Branch_id IN (select Branch_id from branchmaster where customer_id IN(${queryData.customerid})));`;
    console.error(`SQL==>`, sql2);
    const rows2 = await db.query(sql2);
    console.error(`rows==>`, rows2);
    const Activedvrnvr = helper.emptyOrRows(rows2);

    message = "Total number of dvr and nvr list Fetching successfully";
    responsecode = "807";
    const encrypt = helper.encrypt(
      JSON.stringify({
        responsecode,
        message,
        Total_Device,
        Totaldvrnvr,
        Activedvrnvr,
      }),
      secret
    );
    return encrypt;
  }
}

//######################################################################################################################################################################################################
//############################# FILTER THE INVOICE BASED ON THE VALUE #########################################################################################################################################################################
//######################################################################################################################################################################################################

async function Filterinvoice(customer) {
  message = "Error while filtering the invoice for the customer";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "INVOICE FILTER",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "INVOICE FILTER",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "INVOICE FILTER",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "INVOICE_FILTER_QUERYSTRING_MISSING",
      "INVOICE FILTER",
      ""
    );
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "INVOICE_FILTER_QUERYSTRING_ERROR",
      "INVOICE FILTER",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "INVOICE_FILTER_JSON_ERROR",
      "INVOICE FILTER",
      secret
    );
  }

  if (queryData.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      "FILTER_STATUS_MISSING",
      "INVOICE FILTER",
      secret
    );
  }

  let sql1 = `select count(*) as Total_Invoice from customerinvoices where custbill_id in(select custbill_id from customerbillingmaster where custsub_id
    in(select custsub_id from customersubscriptions where customer_id in(select customer_id from customermaster where customerreg_id = ${customerregid}))) and paid_status = ${queryData.status};`;
  const invoice = await db.query(sql1);
  console.error(`rows==>`, invoice);
  const Total_Invoice = helper.emptyOrRows(invoice);

  let sql = "";
  sql = `SELECT custbill_id, invoice_number, DATE_FORMAT(invoice_date, '%Y-%m-%d') as Invoice_date, DATE_FORMAT(due_date, '%Y-%m-%d') as Due_date, paid_status as Payment_status, 
  invoice_amount as total_amount, paid_amount, (invoice_amount - paid_amount) as outstanding_amount FROM customerinvoices WHERE custbill_id IN ( SELECT custbill_id FROM 
  customerbillingmaster WHERE custsub_id IN ( SELECT custsub_id FROM customersubscriptions WHERE customer_id IN ( SELECT customer_id FROM customermaster WHERE 
  customerreg_id = ${customerregid}))) and paid_status = ${queryData.status};`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const PaymentInvoice = helper.emptyOrRows(rows);

  message = "Customer Invoice filtered Successfully";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      Total_Invoice,
      PaymentInvoice,
    }),
    secret
  );
  return encrypt;
}

//###########################################################################################################################################################################################
//#######################################################################################################################################################################################
//############################################# GENERARTE THE GST AND TDS FOR THE BILL VALUE ################################################################################################
//#######################################################################################################################################################################################

async function generateGst(customer) {
  message = "Error while generating the gst and tds value for the amount";
  responsecode = "8005";

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (customer.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_MISSING_ERROR",
      "GET BILL VALUE",
      ""
    );
  }
  // Check if the given session token size is valid or not
  if (customer.STOKEN.length > 50 || customer.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_SIZE_ERROR",
      "GET BILL VALUE",
      ""
    );
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [customer.STOKEN]
  );
  const objectvalue = result[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  var customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET BILL VALUE",
      ""
    );
  }

  var secret = customer.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse("QUERYSTRING_MISSING", "GET BILL VALUE", "");
  }
  console.log("customer querystring-->" + customer.querystring);
  var queryData;

  try {
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted data->" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "QUERYSTRING_ERROR",
      "GET BILL VALUE",
      secret
    );
  }
  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "QUERYSTRING_JSON_ERROR",
      "GET BILL VALUE",
      secret
    );
  }

  if (queryData.hasOwnProperty("amount") == false) {
    return helper.getErrorResponse(
      "PAYMENT_AMOUNT_MISSING",
      "GET THE BILL VALUE",
      secret
    );
  }

  if (queryData.hasOwnProperty("tdsvalue") == false) {
    return helper.getErrorResponse(
      "TDS_VALUE_MISSING",
      "GET THE BILL VALUE",
      secret
    );
  }

  if (queryData.hasOwnProperty("customerid") == false) {
    return helper.getErrorResponse(
      "CUSTOMER_ID_MISSING",
      "GET THE BILL VALUE",
      secret
    );
  }

  let sql1 = `select state from branchmaster where customer_id in(${queryData.customerid});`;
  const rows = await db.query(sql1);
  if (rows.length === 0) {
    console.log("No records found");
    return helper.getErrorResponse(
      "CUSTOMER_STATE_NOT_FOUND",
      "The customer state was not found for the given customer id",
      secret
    );
  }

  const mState = rows[0].state || ""; // Handle NULL
  // Normalize the state
  const normalizedState = mState.toLowerCase().trim();
  // Calculate GST based on the normalized state
  let mSGST = 0;
  let mCGST = 0;
  let mIGST = 0;
  let mUGST = 0;
  switch (normalizedState) {
    case "tamilnadu":
      // Tamil Nadu: 9% SGST + 9% CGST
      mSGST = 0.09 * queryData.amount;
      mCGST = 0.09 * queryData.amount;
      break;
    case "andamanandnicobarislands":
    case "chandigarh":
    case "dadraandnagarhavelianddamananddiu":
    case "delhi":
    case "jammuandkashmir":
    case "ladakh":
    case "lakshadweep":
    case "puducherry":
      // Other states: 0% SGST and CGST, 9% IGST
      mUGST = 0.09 * queryData.amount;
      break;
    default:
      // Other states: 0% SGST and CGST, 18% IGST
      mIGST = 0.18 * queryData.amount;
  }

  //caluculate the total gst amount and total amount for the payment
  let amount = 1 * queryData.amount;
  let Total_gstAmount = mSGST + mCGST + mIGST + mUGST;
  let tdsvalue = (queryData.amount * queryData.tdsvalue) / 100;
  let Total_payment_amount = amount + Total_gstAmount - tdsvalue;
  console.log("queryData.amount:", queryData.amount);
  console.log("Total_Amount:", Total_payment_amount);
  console.log("tdsvalue:", tdsvalue);
  console.log("SGST:", mSGST);
  console.log("CGST:", mCGST);
  console.log("IGST:", mIGST);
  console.log("UGST:", mUGST);
  console.log("GST Amount:", Total_gstAmount);

  message = "Customer Payment gst calculated successfully";
  responsecode = "807";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      Total_gstAmount,
      tdsvalue,
      Total_payment_amount,
      mUGST,
      mIGST,
      mCGST,
      mSGST,
    }),
    secret
  );
  return encrypt;
}

//###############################################################################################################################################################################################
//###############################################################################################################################################################################################
//###############################################################################################################################################################################################
//###############################################################################################################################################################################################

async function Query(customer) {
  const sql = await db.query(`${customer.query}`);
  if (sql) {
    return sql;
  } else {
    return sql;
  }
}

module.exports = {
  create,
  register,
  verifyaccount,
  getCompanylist,
  getCompanySitelist,
  getSiteDeptlist,
  getdeptdevicelist,
  getdevicechannallist,
  getcameralist,
  getcontactlist,
  getbillinglist,
  getinvoicelist,
  getpaymentlist,
  getpaymentbanklist,
  newsubscription,
  indisubscription,
  addsubscriptionbilling,
  checkfirsttimeuser,
  addcompany,
  addindividual,
  addorganization,
  addorganizationcompany,
  addcompanysite,
  addsitedept,
  adddevice,
  addcontacts,
  addpayment,
  addemergencyservice,
  addinvoice,
  update,
  createpackage,
  getcompany,
  getbranch,
  createGroup,
  getPlaybackGroup,
  UpdateGroup,
  addescalation,
  Getescalation,
  DeleteGroup,
  DeleteCamera,
  getGroupInfo,
  updatesite,
  updateDevice,
  getPaymentHistory,
  getPendingInvoice,
  getPaymentInvoice,
  getStatementAccount,
  getInvoiceforbillid,
  deletesite,
  deletedevice,
  getdvrnvr,
  UpdateSubscription,
  Filterinvoice,
  generateGst,
  Query,
};
