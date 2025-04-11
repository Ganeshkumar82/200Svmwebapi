const db = require("./db");
const helper = require("../helper");
const config = require("../config");
const fs = require("fs").promises;
const path = require("path");
const cpy = require("fs-extra");
const axios = require("axios");
const { ca, el, he } = require("date-fns/locale");
const { REFUSED } = require("dns");
const { ErrorWithReasonCode } = require("mqtt");
const { json } = require("express");
const { truncate } = require("fs");
const { Console } = require("console");

//####################################################################################################################################################################################################
//####################   GENERATE CUSTOMER INVOICE  ##############################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add new customer items to the subscription for billing
//  Input data
//  {
//     "APIKey":"15b97917-b296-11ed-997a-b42e9923",
//     "Secret":"15b97956-b296-11",
//     "customer_id":"1" or multiple id,
//     "customer_company_id":"1" or multiple,
//     "customer_site_id":"1" or multiple
//   }
//####################################################################################################################################################################################################
//Validation rule
//      1. API KEY AND SECRET KEY VALIDATION
//      2. Decode input data with session ID
//          a) If Querystring not given as input
//          b) If Querystring decryption fails
//      3. Check the validation of the query string
//          a) Check if the customer id is present and it is valid or not
//          b) Check if the customer company id is present and it is valid or not
//          c) Check if the customer company site id is present and it is valid or not
//          d) Show warning, if all the three fields are given for input "At a time only one type of invoice generation is possible. Please provide Customer or Company or Site ID, either one."
//      4. If the customer id is present, then generate the consolidated invoice for all the companies/sites invoices under this customer id
//      5. If the customer company id is present, then generate the consolidated invoice for all the sites invoices under this customer company id
//      6. If the customer company site id is present, then generate the indivudual for the given site id
//      7. Send the Email to the respective contact person email
//      8. Send the SMS to the respective contact person
//####################################################################################################################################################################################################
async function genCustomerSiteInvoice(customer) {
  //Begin Validation 1. API Key checking
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
      "CUSTOMER INVOICE",
      customer.Secret
    );
  }
  //End of Validation 1

  var secret = customer.Secret;
  console.log("secret->" + secret);
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "CUSTOMER INVOICE",
      ""
    );
  }

  var queryData;
  try {
    //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring, secret);
    console.log("decrypted queryData=>" + queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_ERROR",
      "CUSTOMER INVOICE",
      customer.Secret
    );
  }

  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_JSON_ERROR",
      "CUSTOMER INVOICE",
      customer.Secret
    );
  }
  //  3. Check the validation of the query string
  //     a) Check if the customer id is present and it is valid or not
  var invgentype = 0;
  if (queryData.hasOwnProperty("customerid") == true) {
    console.log(
      "queryData.customerid=>" + Number.isInteger(Number(queryData.customerid))
    );

    if (Number.isInteger(Number(queryData.customerid)) == false) {
      return helper.getErrorResponse(
        "CUSTINV_GEN_ID_MISSING",
        "CUSTOMER INVOICE",
        secret
      );
    } else {
      invgentype = 1;
    }
  } else if (queryData.hasOwnProperty("customercompanyid") == true) {
    //       b) Check if the customer company id is present and it is valid or not
    if (helper.phonenumber(queryData.customercompanyid) == false) {
      return helper.getErrorResponse(
        "CUSTINV_GEN_CID_MISSING",
        "CUSTOMER INVOICE",
        secret
      );
    } else {
      invgentype = 2;
    }
  } else if (queryData.hasOwnProperty("customercompanysiteid") == true) {
    //       c) Check if the customer company site id is present and it is valid or not
    if (helper.phonenumber(queryData.customercompanysiteid) == false) {
      return helper.getErrorResponse(
        "CUSTINV_GEN_CSID_MISSING",
        "CUSTOMER INVOICE",
        secret
      );
    } else {
      invgentype = 3;
    }
  }
  //        d) Show warning, if all the three fields are given for input "At a time only one type of invoice generation is possible. Please provide Customer or Company or Site ID, either one."
  if (
    queryData.hasOwnProperty("customerid") == true &&
    queryData.hasOwnProperty("customercompanyid") == true &&
    queryData.hasOwnProperty("customercompanysiteid") == true
  ) {
    return helper.getErrorResponse(
      "CUSTINV_GEN_ALLID_ERROR",
      "CUSTOMER INVOICE",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("customerid") == true &&
    queryData.hasOwnProperty("customercompanyid") == true
  ) {
    return helper.getErrorResponse(
      "CUSTINV_GEN_ALLID_ERROR",
      "CUSTOMER INVOICE",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("customerid") == true &&
    queryData.hasOwnProperty("customercompanysiteid") == true
  ) {
    return helper.getErrorResponse(
      "CUSTINV_GEN_ALLID_ERROR",
      "CUSTOMER INVOICE",
      secret
    );
  }
  if (
    queryData.hasOwnProperty("customercompanyid") == true &&
    queryData.hasOwnProperty("customercompanysiteid") == true
  ) {
    return helper.getErrorResponse(
      "CUSTINV_GEN_ALLID_ERROR",
      "CUSTOMER INVOICE",
      secret
    );
  }
  //End of Validation 3

  //Begin Validation:- 4. If the customer id is present, then generate the consolidated invoice for all the companies/sites invoices under this customer id
  if (invgentype == 1) {
    //Generate Customer Invoice for all
    try {
      const result = await db.query(
        "select * from customerbillingmaster where custsub_id in (select custsub_id from customersubscriptions where customer_id=" +
          queryData.customerid +
          ");"
      );
      console.log(
        "all records result for customer id" + JSON.stringify(result)
      );
      if (result[0]) {
        for (var i = 0; i < result.length; i++) {
          const element = result[i];
          //async result.forEach(element => {
          const custbill_id = element.custbill_id;
          //Generate individual site/company invoice for the customer
          const [result1] = await db.spcall(
            "CALL SP_CUST_INV_GEN(?,@result);select @result;",
            [custbill_id]
          );
          const objectValue1 = result1[1][0];
          const result3 = objectValue1["@result"];
          console.log("custID=>" + result3);
          if (result == null) {
            return helper.getErrorResponse(
              "CUSTINV_GEN_SC_ERROR",
              "CUSTOMER INVOICE",
              secret
            );
          }
          //});
        }
        return helper.getSuccessResponse(
          "CUSTINV_GEN_C_SUCCESS",
          "The customer invoice was generated successfully",
          secret
        );
      } else {
        return helper.getErrorResponse(
          "CUSTINV_GEN_CNO_RECORDS",
          "CUSTOMER INVOICE",
          secret
        );
      }
    } catch (ex) {
      const code = ex.code;
      const message = ex.message;
      return helper.getErrorResponse(code, message, secret);
      //return {code,message};
    }
  }
  //End of Validation:- 4
}

//####################################################################################################################################################################################################
//####################   ADD NEW COMPANY TO CUSTOMER   #######################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add a new company to the customer
//Input data
// {
//   "customerid":"1",
//   "companyname":"TestCompany1",
//   "contactemail":"ponraj4you@gmail.com",
//   "contactphone":"8838360294",
//   "address":"Test Address1",
//   "companytype":0
// }
//####################################################################################################################################################################################################
//Validation rule
//      1. API KEY AND SECRET KEY VALIDATION
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
  //Begin Validation 1. API Key checking
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
      "CUSTOMER ADDCOMPANY",
      customer.Secret
    );
  }
  //End of Validation 1

  var secret = customer.Secret;
  console.log("secret->" + secret);
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "CUSTOMER ADDCOMPANY",
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
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }

  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANY_JSON_ERROR",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //          c) Check the companyname is valid
  if (queryData.hasOwnProperty("companyname") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_NAME_MISSING",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //          d) Check the contactemail is valid
  if (queryData.hasOwnProperty("contactemail") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_EMAIL_MISSING",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //          e) Check the contactphone is valid
  if (queryData.hasOwnProperty("contactphone") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_PHONE_MISSING",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //          f) Check the address is valid
  if (queryData.hasOwnProperty("address") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_ADDRESS_MISSING",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //          g) Check the companytype is valid
  if (queryData.hasOwnProperty("companytype") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_TYPE_MISSING",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //          h) Check the customerid is valid
  if (queryData.hasOwnProperty("customerid") == false) {
    return helper.getErrorResponse(
      "CUST_COMPANY_CID_MISSING",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //End of Validation 2
  var custID = queryData.customerid;

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
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //Begin Validation:- 4. Phone number should not be greater than 15 and should not be less than 8 number.
  if (queryData.contactphone.length > 15 || queryData.contactphone.length < 8) {
    return helper.getErrorResponse(
      "COMPANY_PHONE_SIZE_ERROR",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  if (helper.phonenumber(queryData.contactphone)) {
    console.log("Valid");
  } else {
    console.log("Invalid");
    return helper.getErrorResponse(
      "COMPANY_PHONE_VALID_ERROR",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //End of Validation:- 4
  //Begin Validation:- 5. Company type should not be greater than 2
  if (queryData.companytype > 2) {
    return helper.getErrorResponse(
      "COMPANY_TYPE_INVALID",
      "CUSTOMER ADDCOMPANY",
      secret
    );
  }
  //End of Validation:- 5

  try {
    //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
    const [result] = await db.spcall(
      "CALL SP_CUST_MAS_ADD(?,?,?,?,?,?,?,@custid);select @custid;",
      [
        custID,
        queryData.companyname,
        queryData.contactemail,
        queryData.contactphone,
        0,
        queryData.companytype,
        queryData.address,
      ]
    );
    const objectValue1 = result[1][0];
    const mcustID = objectValue1["@custid"];
    console.log("custID=>" + mcustID);
    if (mcustID != null) {
      //Begin Validation:- 6. Send OTP Email, if already verified email, donot send it
      const [result1] = await db.spcall(
        "CALL SP_OTP_VERIFY(?,?,@result);select @result;",
        [0, queryData.contactemail]
      );
      const objectValue2 = result1[1][0];
      const rest1 = objectValue2["@result"];
      var EmailSent = false;
      var SMSSent = false;
      console.log("rest1=>" + JSON.stringify(rest1));
      if (rest1 != null) {
        EmailSent = await mailer.sendEmail(
          queryData.companyname,
          queryData.contactemail,
          "Account Verification",
          "acverification.html",
          rest1,
          "REG_ACVERIFY_EMAIL_CONF"
        );
        console.log("EmailSent=>" + EmailSent);
        EmailSent = true;
      } else {
        console.log("rest1=>" + rest1);
      }
      //End of Validation:- 6
      //Begin Validation:- 7. Send OTP SMS, if already verified email, donot send it
      const [result2] = await db.spcall(
        "CALL SP_OTP_VERIFY(?,?,@result);select @result;",
        [1, queryData.contactphone]
      );
      const objectValue3 = result2[1][0];
      const rest2 = objectValue3["@result"];
      if (rest2 != null) {
        SMSSent = true;
      }
      //End of Validation:- 6
      if (EmailSent && SMSSent) {
        return helper.getSuccessResponse(
          "COMPANY_ADD_SUCCESS",
          "CUSTOMER ADDCOMPANY",
          secret
        );
      } else {
        if (EmailSent == false)
          return helper.getErrorResponse(
            "COMPANY_EMAIL_SENT_ERROR",
            "CUSTOMER ADDCOMPANY",
            secret
          );
        else if (SMSSent == false)
          return helper.getErrorResponse(
            "COMPANY_PHONE_SENT_ERROR",
            "CUSTOMER ADDCOMPANY",
            secret
          );
        else
          return helper.getSuccessResponse(
            "COMPANY_ADD_SUCCESS",
            "CUSTOMER ADDCOMPANY",
            secret
          );
      }
    } else {
      return helper.getErrorResponse(
        "COMPANY_ERROR",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    }
  } catch (ex) {
    if (ex.sqlMessage == "Wrong phone number")
      return helper.getErrorResponse(
        "COMPANY_PHONE_SIZE_ERROR",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    else if (ex.sqlMessage == "Wrong Email")
      return helper.getErrorResponse(
        "COMPANY_EMAIL_VALID_ERROR",
        "CUSTOMER ADDCOMPANY",
        secret
      );
    else return JSON.stringify(ex);
  }

  // const responseData = {responsecode,message};
  // responseData = JSON.parse("{\"message\":"+ helper.encrypt(responseData,helper.getEncryptionKey())+"}");
  // return {responseData};
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
//      1. API KEY AND SECRET KEY VALIDATION
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
// async function addcompanysite(customer){
//   //Begin Validation 1. API Key checking
//   const ApiCheck = helper.checkAPIKey(customer.APIKey,customer.Secret);
//   var isValid = 0;
//   await ApiCheck.then(
//     function(value) {
//         isValid = value.IsValidAPI;
//       },
//     function(error) {
//       isValid = 0;
//      }
//   );
//   if (isValid==0)
//   {
//     return helper.getErrorResponse("API_KEY_ERROR","CUSTOMER ADDCOMPANYSITE",customer.Secret);
//   }
//   //End of Validation 1

//   var secret = customer.Secret;
//   console.log("secret->"+secret);
//   //Begin Validation 2. decrypt querystring data
//   //  a) If Querystring not given as input
//   if(customer.hasOwnProperty('querystring')==false){
//     return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","CUSTOMER ADDCOMPANYSITE","");
//   }

//   console.log("querystring=>"+customer.querystring);
//   var queryData;
//   try
//   {
//   //  b) If Querystring decryption fails
//     queryData = await helper.decrypt(customer.querystring,secret);
//     console.log("decrypted queryData=>"+queryData);
//   }
//   catch(ex)
//   {
//     return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//   }

//   try
//   {
//     queryData = JSON.parse(queryData);
//   }
//   catch(ex)
//   {
//     return helper.getErrorResponse("CUST_COMPANYSITE_JSON_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//   }
// //          c) Check the companyid is valid
// if(queryData.hasOwnProperty('companyid')==false){
//   return helper.getErrorResponse("CUST_COMPANY_ID_MISSING","CUSTOMER ADDCOMPANYSITE",secret);
// }
// //          d) Check the companyname is valid
//   if(queryData.hasOwnProperty('sitename')==false){
//     return helper.getErrorResponse("CUST_SITE_NAME_MISSING","CUSTOMER ADDCOMPANYSITE",secret);
//   }
// //          e) Check the contactname is valid
// if(queryData.hasOwnProperty('contactname')==false){
//   return helper.getErrorResponse("CUST_SITE_CNAME_MISSING","CUSTOMER ADDCOMPANYSITE",secret);
// }
// //          f) Check the contactemail is valid
//   if(queryData.hasOwnProperty('contactemail')==false){
//     return helper.getErrorResponse("CUST_SITE_EMAIL_MISSING","CUSTOMER ADDCOMPANYSITE",secret);
//   }
// //          g) Check the contactphone is valid
//   if(queryData.hasOwnProperty('contactphone')==false){
//     return helper.getErrorResponse("CUST_SITE_PHONE_MISSING","CUSTOMER ADDCOMPANYSITE",secret);
//   }
// //          h) Check the address is valid
//   if(queryData.hasOwnProperty('address')==false){
//     return helper.getErrorResponse("CUST_SITE_ADDRESS_MISSING","CUSTOMER ADDCOMPANYSITE",secret);
//   }
// //End of Validation 2
//   var usrID = 0;

//   //Begin Validation:- 2. The name field should get updated to first character of a word to uppercase
//    const str = queryData.sitename;
//    const Fullname = str.charAt(0).toUpperCase() + str.slice(1);
//   //End of Validation:- 2
//   //Validation RULE 3 was set at the DB-Trigger
//   if (queryData.contactemail.indexOf('.')==-1 || queryData.contactemail.indexOf('@')==-1)
//   {
//     return helper.getErrorResponse("SITE_EMAIL_VALID_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//   }
//   //Begin Validation:- 4. Phone number should not be greater than 15 and should not be less than 8 number.
//   if (queryData.contactphone.length>15 || queryData.contactphone.length<8)
//   {
//     return helper.getErrorResponse("SITE_PHONE_SIZE_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//   }
//   if (helper.phonenumber(queryData.contactphone)) {
//       console.log("Valid");
//   } else {
//     console.log("Invalid");
//     return helper.getErrorResponse("SITE_PHONE_SIZE_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//   }
//   //End of Validation:- 4
//   //Begin Validation:- 5. Contact name should not be greater than 2
//   if (queryData.contactname.length>30)
//   {
//     return helper.getErrorResponse("SITE_CNAME_SIZE_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//   }
//   //End of Validation:- 5

//   try
//   {
//     //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
//     const [result] = await db.spcall('CALL SP_CUST_BRANCH_ADD(?,?,?,?,?,?,?,?,?,?,@result);select @result;',[queryData.companyid,queryData.sitename,queryData.contactname,queryData.contactemail,queryData.contactphone,queryData.address,usrID,0,0,'']);
//     const objectValue1 = result[1][0];
//     const mcustID = objectValue1["@result"];
//     console.log("result branch id=>"+mcustID);
//     if (mcustID!=null) {
//       //Begin Validation:- 6. Send OTP Email, if already verified email, donot send it
//       const [result1] = await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',[0,queryData.contactemail]);
//       const objectValue2 = result1[1][0];
//       const rest1 = objectValue2["@result"];
//       console.log("Email OTP result=>"+JSON.parse(objectValue2));
//       var EmailSent = false;
//       var SMSSent = false;
//       if (rest1!=null)
//       {
//         EmailSent = await mailer.sendEmail(queryData.companyname,queryData.contactemail,"Account Verification","acverification.html",rest1,"REG_ACVERIFY_EMAIL_CONF");
//         console.log("EmailSent=>"+EmailSent);
//         EmailSent = true;
//       }
//       //End of Validation:- 6
//       //Begin Validation:- 7. Send OTP SMS, if already verified email, donot send it
//       const [result2] = await db.spcall('CALL SP_OTP_VERIFY(?,?,@result);select @result;',[1,queryData.contactphone]);
//       const objectValue3 = result2[1][0];
//       const rest2 = objectValue3["@result"];
//       console.log("Email OTP result=>"+JSON.parse(objectValue3));
//       if (rest2!=null)
//       {
//         SMSSent = true;
//       }
//       //End of Validation:- 6
//       if (EmailSent && SMSSent )
//       {
//         return helper.getSuccessResponse("SITE_ADD_SUCCESS","CUSTOMER ADDCOMPANYSITE",secret);
//       }
//       else
//       {
//         if (EmailSent==false)
//           return helper.getErrorResponse("SITE_EMAIL_SENT_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//         if (SMSSent==false)
//           return helper.getErrorResponse("SITE_PHONE_SENT_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//       }
//     }
//     else
//     {
//       return helper.getErrorResponse("SITE_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//     }
//   }
//   catch(ex)
//   {
//     if (ex.sqlMessage=='Wrong phone number')
//       return helper.getErrorResponse("SITE_PHONE_SIZE_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//     else if (ex.sqlMessage=='Wrong Email')
//       return helper.getErrorResponse("SITE_EMAIL_VALID_ERROR","CUSTOMER ADDCOMPANYSITE",secret);
//     else
//       return {ex};
//       // return helper.getSuccessResponse("SITE_ADD_SUCCESS","CUSTOMER ADDCOMPANYSITE",secret);
//   }

//   // const responseData = {responsecode,message};
//   // responseData = JSON.parse("{\"message\":"+ helper.encrypt(responseData,helper.getEncryptionKey())+"}");
//   // return {responseData};
// }

//####################################################################################################################################################################################################
//####################   NEW SUBSCRIOTION TO CUSTOMER   ##############################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to add new subscriotion to the customer
//Input data
// {
//   "customerid":"1",
//   "packagename":"Secure - 360",
//   "packageid":1,
//   "amount":7500,
//   "taxamount":0,
//   "billingcycle":1,
//   "gracetime":5
// }
//####################################################################################################################################################################################################
//Validation rule
//      1. API KEY AND SECRET KEY VALIDATION
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
  //Begin Validation 1. API Key checking
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
      "CUSTOMER SUBSCRIPTION",
      customer.Secret
    );
  }
  //End of Validation 1

  var secret = customer.Secret;
  console.log("secret->" + secret);
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "CUSTOMER SUBSCRIPTION",
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
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }

  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANYSITE_JSON_ERROR",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }

  //  c) Check the package name is valid
  if (queryData.hasOwnProperty("packagename") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_NAME_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //  d) Check the package ID is valid
  if (queryData.hasOwnProperty("packageid") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_ID_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //  e) Check the package Amount is valid
  if (queryData.hasOwnProperty("amount") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_AMOUNT_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //  f) Check the TAX is valid
  if (queryData.hasOwnProperty("taxamount") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_TAX_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //  g) Check the billing cycle is valid
  if (queryData.hasOwnProperty("billingcycle") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_BCYCLE_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //  h) Check the grace time is valid
  if (queryData.hasOwnProperty("gracetime") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_GTIME_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //  i) Check the grace time is valid
  if (queryData.hasOwnProperty("customerid") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_CID_MISSING",
      "CUSTOMER SUBSCRIPTION",
      ""
    );
  }
  //End of Validation 2

  //Begin Validation:- 3. Get Customer ID from the session
  var custID = queryData.customerid;
  console.log("custID==>" + custID);
  //End of Validation:- 3. Get Customer ID from the session

  //Begin Validation:- 4. Add subscrion to the customer
  try {
    const [result2] = await db.spcall(
      "CALL SP_CUST_SUBSCRIPTION_ADD(?,?,?,?,?,?,?,@result);select @result;",
      [
        custID,
        queryData.packageid,
        queryData.amount,
        queryData.taxamount,
        queryData.amount - queryData.taxamount,
        queryData.billingcycle,
        queryData.gracetime,
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
          "NEW SUBSCRIPTION",
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
//      1. API KEY AND SECRET KEY VALIDATION
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
  //Begin Validation 1. API Key checking
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
      "CUSTOMER SUBSCRIPTION",
      customer.Secret
    );
  }
  //End of Validation 1

  var secret = customer.Secret;
  console.log("secret->" + secret);
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if (customer.hasOwnProperty("querystring") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_QUERY_MISSING",
      "CUSTOMER SUBSCRIPTION",
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
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }

  try {
    queryData = JSON.parse(queryData);
  } catch (ex) {
    return helper.getErrorResponse(
      "CUST_COMPANYSITE_JSON_ERROR",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }

  //  c) Check the package name is valid
  if (queryData.hasOwnProperty("mypackageid") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_ID_MISSING",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //  d) Check the subscribed item billtotype is valid
  if (queryData.hasOwnProperty("billtotype") == false) {
    return helper.getErrorResponse(
      "CUST_BILLTOTYPE_MISSING",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //  e) Check the subscribed billsourceid is valid
  if (queryData.hasOwnProperty("billsourceid") == false) {
    return helper.getErrorResponse(
      "CUST_BILLSOURCEID_MISSING",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //  f) Check the TAX(PAN or GST) is valid
  if (queryData.hasOwnProperty("pan_gst") == false) {
    return helper.getErrorResponse(
      "CUST_PANGST_TAX_MISSING",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //  g) Check the billing cycle is valid
  if (queryData.hasOwnProperty("billingcycle") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_BCYCLE_MISSING",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //  h) Check the grace time is valid
  if (queryData.hasOwnProperty("gracetime") == false) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_GTIME_MISSING",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //End of Validation 2
  //Begin Validation:- 4.Billing cycle should not exceed 5
  if (queryData.billingcycle > 5) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_BCYCLE_INVALID",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //End of Validation:- 4.Billing cycle should not exceed 5
  //Begin Validation:- 5. Check the Pan or GST, it can be null
  if (queryData.pan_gst.length > 50) {
    return helper.getErrorResponse(
      "CUST_PACKAGE_PANGST_INVALID",
      "CUSTOMER SUBSCRIPTION",
      secret
    );
  }
  //End of Validation:- 5. Check the Pan or GST, it can be null

  //Begin Validation:- 3.If the mypackageid is not subscribed by that user, return "Product was not purchased by you"
  var custID = await helper.getCustomerID(
    queryData.billsourceid,
    queryData.billtotype
  );
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
        console.log(
          "Customer subscribed item, objectValue3->" + objectValue3["@result"]
        );
        if (objectValue3["@result"] == null) {
          return helper.getErrorResponse(
            "CUST_PACKAGEITEM_ADD_ERROR",
            "CUSTOMER SUBSCRIPTION",
            secret
          );
        } else {
          if (objectValue3["@result"] == 0) {
            return helper.getErrorResponse(
              "CUST_PACKAGE_ALREADY_ADDED",
              "CUSTOMER SUBSCRIPTION",
              secret
            );
          } else {
            return helper.getSuccessResponse(
              "CUST_PACKAGE_ADD_SUCCESS",
              objectValue3["@result"],
              secret
            );
          }
        }
      } catch (ex) {
        const code = ex.code;
        const message = ex.message;
        return helper.getErrorResponse(code, message, secret);
        //return {code,message};
      }
    }
  }
  //End of Validation:- 3. If the mypackageid is not subscribed by that user, return "Product was not purchased by you"
}

//####################################################################################################################################################################################################
//####################   NEW CUSTOMER PAYMENTS   #########################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to get the customer payments for invoices
//Input data
// {
//   "customerid":1,
//   "invoices":[{	"invoiceid":1,	"amount":7500},{	"invoiceid":2,	"amount":2500}],
//   "totalinvamount":10000,
//   "paidamount":8000,
//   "tdsvalue":2,
//   "taxamount":1800,
//   "bankdetails":[
//       {
//           "bankname":"Indian Bank - T.Nagar, Chennai",
//           "chequeno":"778569","chequedate":"2023-03-15",
//           "amount":5000,
//           "bankrecons":0
//       },
//       {
//           "bankname":"Indian Bank - T.Nagar, Chennai",
//           "chequeno":"778570","chequedate":"2023-03-15",
//           "amount":3000,
//           "bankrecons":0
//       }
//   ],
//   "paymentmode":1,
//   "referenceno":""
//   }
//    Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Validate the input data
//      4. check the customer id exist
//      5. check with the invoices amount and total invoice amount
//      6. check with the bank amount and total invoice amount
//      7. validate the payment should not be breater than 4 //0 - Cash , 1 - Cheqye, 2 - DD, 3 - Bank transfer, 4 - Wallet transfer
//      8. Created by should be numeric digit, and ID value of 11 charactors
//      9. Invalid invoice id checking
//     10. Invalid cheque no checking
//     11. Exception handling
//     12. create encrypted response message for error and success
//####################################################################################################################################################################################################
async function createcustomerpayment(customer) {
  //Begin Validation 1. API Key checking
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
      "CUSTOMER PAYMENT",
      customer.Secret
    );
  }
  //End of Validation 1
  //Begin Validation 2. decrypt querystring data
  console.log("querystring=>" + customer.querystring);
  var queryData;
  try {
    queryData = JSON.parse(
      await helper.decrypt(customer.querystring, customer.Secret)
    );
    console.log("decrypted queryData=>" + JSON.stringify(queryData));
  } catch (ex) {
    return helper.getErrorResponse(
      "CPAYMENT_QUERY_ERROR",
      "CUSTOMER PAYMENT",
      customer.Secret
    );
  }
  //End of Validation 2

  //Begin Validation 3. Validate the input data
  if (queryData.hasOwnProperty("invoices") == false) {
    return helper.getErrorResponse(
      "CPAY_DATA_MISSING_ERROR",
      "CUSTOMER PAYMENT",
      customer.Secret
    );
  }
  if (queryData.invoices.length == 0) {
    return helper.getErrorResponse(
      "CPAY_DATA_SIZE_ERROR",
      "CUSTOMER PAYMENT",
      customer.Secret
    );
  }

  if (queryData.hasOwnProperty("bankdetails") == false) {
    return helper.getErrorResponse(
      "CPAY_DATA_MISSING_ERROR",
      "CUSTOMER PAYMENT",
      customer.Secret
    );
  }
  if (queryData.invoices.length == 0) {
    return helper.getErrorResponse(
      "CPAY_DATA_SIZE_ERROR",
      "CUSTOMER PAYMENT",
      customer.Secret
    );
  }

  if (queryData.hasOwnProperty("customerid") == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_CID_MISSING",
      "CUSTOMER PAYMENT - CUSTOMER ID",
      ""
    );
  }

  if (queryData.hasOwnProperty("paidamount") == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_CID_MISSING",
      "CUSTOMER PAYMENT - PAID AMOUNT",
      ""
    );
  }

  if (Number.isInteger(queryData.invoices[0].invoiceid) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - INVOICE ID",
      customer.Secret
    );
  }

  if (Number.isInteger(queryData.invoices[0].amount) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - INVOICE AMOUNT",
      customer.Secret
    );
  }

  //Bank cheque details
  if (Number.isInteger(queryData.bankdetails[0].bankname) == true) {
    console.log(
      "queryData.bankdetails->" + JSON.stringify(queryData.bankdetails)
    );
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - BANK CHEQUE DETAILS",
      customer.Secret
    );
  }

  if (Number.isInteger(queryData.bankdetails[0].amount) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - BANK CHEQUE AMOUNT",
      customer.Secret
    );
  }

  //Begin Validation - amount should be number
  if (Number.isInteger(queryData.totalinvamount) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - TOTAL INVOICE AMOUNT",
      customer.Secret
    );
  }
  //End of Validation

  if (Number.isInteger(queryData.tdsvalue) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - TDS VALUE",
      customer.Secret
    );
  }

  if (Number.isInteger(queryData.taxamount) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - TAX AMOUNT",
      customer.Secret
    );
  }

  if (Number.isInteger(queryData.paymentmode) == false) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_DATA_TYPE_ERROR",
      "CUSTOMER PAYMENT - PAYMENT MODE",
      customer.Secret
    );
  }
  var invAmt = 0;
  for await (const element of queryData.invoices) {
    invAmt += element.amount;
  }
  console.log("\r\ninvoice, Total amount ->" + invAmt);
  if (invAmt != queryData.totalinvamount) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_INV_AMT_ERROR",
      "CUSTOMER PAYMENT - TOTAL MISMATCH",
      customer.Secret
    );
  }

  var ChqAmt = 0;
  for await (const element of queryData.bankdetails) {
    ChqAmt += element.amount;
  }
  console.log("\rCheque payments, Total amount ->" + ChqAmt);
  if (ChqAmt != queryData.paidamount) {
    return helper.getErrorResponse(
      "CUST_PAYMENT_CHQ_AMT_ERROR",
      "CUSTOMER PAYMENT - TOTAL MISMATCH",
      customer.Secret
    );
  }

  try {
    //Calling CUSTOMER payment add stored procedure
    const [result] = await db.spcall(
      "CALL SP_CUST_PAYMENT_ADD(?,?,?,?,?,?,?,@result);select @result;",
      [
        queryData.customerid,
        queryData.totalinvamount,
        queryData.tdsvalue,
        queryData.taxamount,
        queryData.paymentmode,
        queryData.referenceno,
        0,
      ]
    );
    const objectValue = result[1][0];
    console.log("Customer Payment, objectValue->" + JSON.stringify(result));
    if (objectValue["@result"] == null) {
      return helper.getErrorResponse(
        "CPAYMENT_QUERY_ERROR",
        "CUSTOMER PAYMENT - INSERT ERROR",
        customer.Secret
      );
    } else {
      const cpayid = objectValue["@result"];
      //Customer payment invoice add stored procedure call
      for await (const element of queryData.invoices) {
        const [result1] = await db.spcall(
          "CALL SP_CUST_PAYMENT_INV_ADD(?,?,?,@result);select @result;",
          [cpayid, element.invoiceid, element.amount]
        );
        const objectValue1 = result1[1][0];
        console.log("invoice, objectValue1->" + objectValue1["@result"]);
      }
      //Customer payment cheque details add stored procedure call
      for await (const element of queryData.bankdetails) {
        const [result1] = await db.spcall(
          "CALL SP_CUST_PAYMENT_CHQ_ADD(?,?,?,?,?,?,@result);select @result;",
          [
            cpayid,
            element.bankname,
            element.chequeno,
            element.chequedate,
            element.amount,
            element.bankrecons,
          ]
        );
        const objectValue1 = result1[1][0];
        console.log("invoice, objectValue1->" + objectValue1["@result"]);
      }
      return helper.getSuccessResponse(
        "CUSTOMERPAYMENT_SUCCESS",
        "Customer payment was successfully added",
        customer.Secret
      );
    }
  } catch (ex) {
    const code = ex.code;
    const message = ex.message;
    return helper.getErrorResponse(code, message, customer.Secret);
  }
}

//#########################################################################################################################################################################################################
//##################### Get the Total NUmber of Sites #################################################################################################################################################################################
//#####################################################################################################################################################################################################
async function getTotalSite(admin) {
  try {
    console.log("total site" + JSON.stringify(admin));
    let message = "Error in fetching the total number sites";
    let responsecode = "8005";
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "GET TOTAL NUMBER OF SITES",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "GET TOTAL NUMBER OF SITE",
        ""
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    const customerregid = objectvalue["@custid"];
    console.log("total number of sites userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "GET TOTAL NUMBER OF SITES",
        ""
      );
    }

    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    var querydata;
    if (admin.hasOwnProperty("querystring") == true) {
      console.log("customer querystring-->" + admin.querystring);

      try {
        querydata = await helper.decrypt(admin.querystring, secret);
        console.log("decrypted data->" + querydata);
      } catch (ex) {
        return helper.getErrorResponse(
          "QUERYSTRING_ERROR",
          "GET TOTAL NUMBER OF SITES",
          secret
        );
      }
      try {
        querydata = JSON.parse(querydata);
      } catch (ex) {
        return helper.getErrorResponse(
          "QUERYSTRING_JSON_ERROR",
          "GET TOTAL NUMBER OF SITES",
          secret
        );
      }
      //A)CHECK IF INVOICE NUMBER IS GIVEN AS AN INPUT OR NOT
      if (querydata.hasOwnProperty("customerid") == true) {
        //if the customer id is given as an input we will fetch the data from branchmaster using that customer id
        if (querydata.customer_id != "") {
          let sql = "";
          sql = `select COUNT(*) as Total_site FROM branchmaster where Customer_ID IN(${querydata.customerid})`;
          const rows = await db.query(sql);
          const total_site = helper.emptyOrRows(rows);
          let sql1 = `select COUNT(*) as Active_site FROM branchmaster where Customer_ID IN(${querydata.customerid}) AND status = 1`;
          const rows1 = await db.query(sql1);
          const active_site = helper.emptyOrRows(rows1);
          let sql2 = `select COUNT(*) as InActive_site FROM branchmaster where Customer_ID IN(${querydata.customerid}) AND status = 0`;
          const rows2 = await db.query(sql2);
          const Inactive_site = helper.emptyOrRows(rows2);
          message = "Total number of sites Fetched successfully";
          responsecode = "806";
          const encrypt = helper.encrypt(
            JSON.stringify({
              responsecode,
              message,
              total_site,
              active_site,
              Inactive_site,
            }),
            secret
          );
          return encrypt;
        }
      }
    } else {
      //BEGIN VALIDATION 2

      let sql = "";
      sql = `select COUNT(*) as Total_site FROM branchmaster where Customer_ID IN(select Customer_ID from customermaster where customerreg_id = ${customerregid})`;
      const rows = await db.query(sql);
      const total_site = helper.emptyOrRows(rows);
      let sql1 = `select COUNT(*) as Active_site FROM branchmaster where Customer_ID IN(select Customer_ID from customermaster where customerreg_id = ${customerregid}) AND status = 1`;
      const rows1 = await db.query(sql1);
      const active_site = helper.emptyOrRows(rows1);
      let sql2 = `select COUNT(*) as InActive_site FROM branchmaster where Customer_ID IN(select Customer_ID from customermaster where customerreg_id = ${customerregid}) AND status = 0`;
      const rows2 = await db.query(sql2);
      const Inactive_site = helper.emptyOrRows(rows2);
      message = "Total number of sites Fetched successfully";
      responsecode = "806";
      const encrypt = helper.encrypt(
        JSON.stringify({
          responsecode,
          message,
          total_site,
          active_site,
          Inactive_site,
        }),
        secret
      );
      return encrypt;
    }
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected Error. Please try again later",
      er,
      secret
    );
  }
}

//#########################################################################################################################################################################################################
//##################### Get Total NUmber of Camera for the customer #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getNoofCamera(page = 1, admin) {
  try {
    console.log("total getNoofCamera" + admin);
    let message = "Error in fetching the No of camera for each site";
    let responsecode = "8005";
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "GET TOTAL NUMBER OF CAMERA FOR EACH SITE",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "GET TOTAL NUMBER OF CAMERA FOR EACH SITE",
        ""
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    const customerregid = objectvalue["@custid"];
    console.log("total number of sites userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "GET TOTAL NUMBER OF CAMERA FOR EACH SITE",
        ""
      );
    }

    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //BEGIN VALIDATION 2

    const offset = helper.getOffset(page, config.listPerPage);

    let sql2 = "";
    //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
    sql2 = `select COUNT(ca.Camera_ID) as Total_camera FROM cameramaster ca, customermaster cm,branchmaster bm, deptmaster dt where ca.Place = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID  AND cm.customerreg_id = ${customerregid} AND cm.Customer_Type NOT IN (0)`;
    // console.error(`SQL==>`, sql2);
    const rows2 = await db.query(sql2);
    // console.error(`rows==>`, rows2);
    const Total_camera = helper.emptyOrRows(rows2);

    let sql = "";
    //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
    sql = `select COUNT(ca.Camera_ID) as active_camera FROM cameramaster ca, customermaster cm,branchmaster bm, deptmaster dt  where ca.Place = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID AND cm.customerreg_id = ${customerregid} AND ca.status = 1 AND cm.Customer_Type NOT IN (0)`;
    // console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    // console.error(`rows==>`, rows);
    const active_camera = helper.emptyOrRows(rows);

    let sql1 = "";
    //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
    sql1 = `select COUNT(ca.Camera_ID) as Inactive_camera FROM cameramaster ca, customermaster cm,branchmaster bm, deptmaster dt  where ca.Place = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID AND cm.customerreg_id = ${customerregid} AND ca.status = 0 AND cm.Customer_Type NOT IN (0) `;
    // console.error(`SQL==>`, sql1);
    const rows1 = await db.query(sql1);
    // console.error(`rows==>`, rows);
    const Inactive_camera = helper.emptyOrRows(rows1);
    const meta = { page };
    message = "Total number of camera for each sites is Fetched successfully";
    responsecode = "806";
    const encrypt = helper.encrypt(
      JSON.stringify({
        responsecode,
        message,
        Total_camera,
        active_camera,
        Inactive_camera,
        meta,
      }),
      secret
    );
    return encrypt;
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected Error. Please try again later",
      er,
      secret
    );
  }
}

//#########################################################################################################################################################################################################
//##################### Get the Total NUmber of Device #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getTotalDevice(admin) {
  try {
    console.log("total number of DEVICE userid ->" + admin);
    // let message = 'Error in fetching the total number Device';
    // let responsecode = "8005";
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "GET TOTAL NUMBER OF DEVICE",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "GET TOTAL NUMBER OF DEVICE",
        ""
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    const customerregid = objectvalue["@custid"];
    console;
    console.log("total number of DEVICE userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "GET TOTAL NUMBER OF DEVICE",
        ""
      );
    }

    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    var querydata;
    if (admin.hasOwnProperty("querystring") == true) {
      console.log("customer querystring-->" + admin.querystring);

      try {
        querydata = await helper.decrypt(admin.querystring, secret);
        console.log("decrypted data->" + querydata);
      } catch (ex) {
        return helper.getErrorResponse(
          "QUERYSTRING_ERROR",
          "GET TOTAL NUMBER OF DEVICE",
          secret
        );
      }
      try {
        querydata = JSON.parse(querydata);
      } catch (ex) {
        return helper.getErrorResponse(
          "QUERYSTRING_JSON_ERROR",
          "GET TOTAL NUMBER OF DEVICE",
          secret
        );
      }
      //A)CHECK IF INVOICE NUMBER IS GIVEN AS AN INPUT OR NOT
      if (querydata.hasOwnProperty("customerid") == true) {
        //if the customer id is given as an input we will fetch the data from branchmaster using that customer id
        if (querydata.customer_id != "") {
          let sql = "";
          sql = `select COUNT(*) as Total_Device FROM devicemaster where Dept_id In(select Dept_id from deptmaster where Branch_id in(select Branch_id from branchmaster where Customer_ID IN(${querydata.customerid})))`;
          const rows = await db.query(sql);
          const total_device = rows[0].Total_Device;
          let sql1 = `select COUNT(*) as Active_Device FROM devicemaster where Dept_id In(select Dept_id from deptmaster where Branch_id in(select Branch_id from branchmaster where Customer_ID IN(${querydata.customerid}))) AND status = 1`;
          const rows1 = await db.query(sql1);
          const active_device = rows1[0].Active_Device;
          let sql2 = `select COUNT(*) as InActive_Device FROM devicemaster where Dept_id In(select Dept_id from deptmaster where Branch_id in(select Branch_id from branchmaster where Customer_ID IN(${querydata.customerid}))) AND status = 0`;
          const rows2 = await db.query(sql2);
          const Inactive_device = rows2[0].InActive_Device;
          // message = 'success';
          // responsecode = "200"
          const data = {
            total_device,
            active_device,
            Inactive_device,
          };
          if (data != null && data != "") {
            return helper.getSuccessResponse(
              "DEVICE_FETCHED_SUCCESSFULLY",
              "The Total number of devices Fetched Successfully",
              data,
              secret
            );
          } else {
            return helper.getErrorResponse(
              "DEVICE_LIST_NOT_AVAILABLE",
              "Device Not available for the site",
              "Total_device",
              secret
            );
          }
          // const encrypt = helper.encrypt(JSON.stringify({
          //   responsecode,
          //   message,
          //   total_device,
          //   active_device,
          //   Inactive_device }), secret);
          // return encrypt;
        }
      }
    } else {
      //BEGIN VALIDATION 2

      let sql = "";
      sql = `select COUNT(*) as Total_Device FROM devicemaster where Dept_id In(select Dept_id from deptmaster where Branch_id in(select Branch_id from branchmaster where Customer_ID IN(select Customer_ID from customermaster where customerreg_id = ${customerregid})))`;
      const rows = await db.query(sql);
      const total_device = rows[0].Total_Device;
      let sql1 = `select COUNT(*) as Active_Device FROM devicemaster where Dept_id In(select Dept_id from deptmaster where Branch_id in(select Branch_id from branchmaster where Customer_ID IN(select Customer_ID from customermaster where customerreg_id = ${customerregid}))) AND status = 1`;
      const rows1 = await db.query(sql1);
      const active_device = rows1[0].Active_Device;
      let sql2 = `select COUNT(*) as InActive_Device FROM devicemaster where Dept_id In(select Dept_id from deptmaster where Branch_id in(select Branch_id from branchmaster where Customer_ID IN(select Customer_ID from customermaster where customerreg_id = ${customerregid}))) AND status = 0`;
      const rows2 = await db.query(sql2);
      const Inactive_device = rows2[0].InActive_Device;
      // message = 'success';
      // responsecode = "200"
      // const encrypt = helper.encrypt(JSON.stringify({
      //   responsecode,
      //   message,
      //   total_device,
      //   active_device,
      //   Inactive_device }), secret);
      // return encrypt;
      const data = {
        total_device,
        active_device,
        Inactive_device,
      };
      return helper.getSuccessResponse(
        "DEVICE_FETCHED_SUCCESSFULLY",
        "The Total number of devices Fetched Successfully",
        data,
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected Error. Please try again later",
      er,
      secret
    );
  }
}

//#########################################################################################################################################################################################################
//##################### Get Total NUmber of Events for the customer #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getTotalEvents(page = 1, admin) {
  try {
    let message =
      "Error in fetching the Total Number of Events for the customer";
    let responsecode = "8005";
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "GET TOTAL NUMBER OF EVENTS",
        ""
      );
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "GET TOTAL NUMBER OF EVENTS",
        ""
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    const customerregid = objectvalue["@custid"];
    console.log("total number of sites userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "GET TOTAL NUMBER OF EVENTS",
        ""
      );
    }

    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //BEGIN VALIDATION 2

    const offset = helper.getOffset(page, config.listPerPage);
    let sql = `select count(em.Event_ID) as total_events,em.Event_Name from eventmaster em,
cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm, customermaster cs where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id
 and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and bm.Customer_ID = cs.Customer_ID and  cs.customerreg_id = ${customerregid}`;

    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    console.error(`rows==>`, rows);
    const total_events = helper.emptyOrRows(rows);

    let sql1 = `select count(em.Event_ID) as total_device_health_events,em.Event_Name from eventmaster em,
cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm, customermaster cs where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id
 and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and bm.Customer_ID = cs.Customer_ID and cs.customerreg_id = ${customerregid} and
 (Event_Name like 'Tampering%' or Event_Name like 'HDD%' or Event_Name like 'Video%' or Event_Name like '%FULL%' or Event_Name like '%Device%')`;
    console.error(`SQL==>`, sql1);
    const rows1 = await db.query(sql1);
    console.error(`rows==>`, rows1);
    const total_device_health_events = helper.emptyOrRows(rows1);

    let sql2 = `SELECT COUNT(DISTINCT el.Event_ID) as total_security_threads
FROM eventlog el 
WHERE el.flag = 1;`;
    console.error(`SQL==>`, sql2);
    const rows2 = await db.query(sql2);
    console.error(`rows==>`, rows2);
    const total_security_threads = helper.emptyOrRows(rows1);
    const meta = { page };
    message = "Total number of events is Fetched successfully";
    responsecode = "806";
    const encrypt = helper.encrypt(
      JSON.stringify({
        responsecode,
        message,
        total_events,
        total_device_health_events,
        total_security_threads,
        meta,
      }),
      secret
    );
    return encrypt;
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected Error. Please try again later",
      er,
      secret
    );
  }
}

//#########################################################################################################################################################################################################
//##################### GET DEVICE EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getCritEvent(page = 1, admin) {
  try {
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "Invalid login sessiontoken. Please provide a valid sessiontoken.",
        "CUSTOMER DEVICE EVENT LIST",
        ""
      );
    }
    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret-->" + secret);
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "Invalid size for the session token. Please provide a session token of valid size.",
        "CUSTOMER DEVICE EVENT LIST",
        secret
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    console.log("event list userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login sessiontoken. Please provide a valid sessiontoken.",
        "CUSTOMER DEVICE EVENT LIST",
        secret
      );
    }

    const offset = helper.getOffset(page, config.listPerPage);
    //BEGIN VALIDATION 2
    // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
    if (admin.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "QUERYSTRING_MISSING",
        "The querystring is missing. Please provide a valid querystring.",
        "CUSTOMER DEVICE EVENT",
        secret
      );
    }
    console.log("filter event querystring ->" + admin.querystring);
    var querydata;

    try {
      querydata = await helper.decrypt(admin.querystring, secret);
      console.log("decrypted querydata->" + querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "There was an error with the querystring. Please provide a valid querystring.",
        "CUSTOMER DEVICE EVENT LIST",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "There was an error parsing the querystring as JSON. Please provide a valid JSON querystring.",
        "CUSTOMER DEVICE EVENT LIST",
        secret
      );
    }
    // const offset = helper.getOffset(page, config.listPerPage);

    if (querydata.hasOwnProperty("currentdate") == false) {
      return helper.getErrorResponse(
        "EVENT_CURRENT_DATE_MISSING",
        "The current date is missing. Please provide the current date.",
        "Please enter the current date for the device event",
        secret
      );
    }

    try {
      let sql = "";
      //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
      sql = `select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and DATE(em.Row_updated_date) = '${querydata.currentdate}'  and (Event_Name like 'Tampering%' or Event_Name like 'HDD%' or Event_Name like 'Video%' or Event_Name like '%FULL%' or Event_Name like '%Device%') ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
      console.error(`SQL==>`, sql);
      const rows = await db.query(sql);
      // console.error(`rows==>`, rows);
      const data = helper.emptyOrRows(rows);
      const imageLinks = [];
      const eventsWithImages = [];

      for (const event of data) {
        const str = event.enddate;
        const evDate = new Date(str);
        const yyyy = evDate.getFullYear().toString();
        const mm = (evDate.getMonth() + 1).toString();
        const dd = evDate.getDate().toString();

        const strDate =
          yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]);
        var strSitenane = event.Branch_name.replace(/\s/g, "");
        strSitenane = strSitenane.replace(/[^\w\s]/gi, "");
        const strCamID = event.camera_id;
        const strEventID = event.Event_ID;

        const FullPaththumb = `\\\\192.168.0.198\\volumes\\${strDate}\\${strSitenane}\\cam${strCamID}\\ivs\\Event${strEventID}\\thumb`;

        const testFolder = FullPaththumb;
        try {
          const folderImages = fs.readdirSync(testFolder).map((file) => {
            return FullPaththumb + "\\" + file;
          });

          if (folderImages.length > 0) {
            imageLinks.push(folderImages);
            eventsWithImages.push(event);
          } else {
            console.error("Image files not found for Event", strEventID);
            continue;
          }
        } catch (error) {
          if (error.code === "ENOENT") {
            console.error("Image files not found for Event", strEventID);
            continue;
          } else {
            console.error("Error while processing Event", strEventID, error);
          }
        }
      }

      const eventLinks = eventsWithImages.map((event, index) => {
        const firstImageFile = imageLinks[index][0]; // Select the first image file

        return {
          Event_ID: event.Event_ID,
          Event_Name: event.Event_Name,
          Row_updated_date: event.Row_updated_date,
          device_name: event.device_name,
          enddate: event.enddate,
          Alertmessage: event.Alertmessage,
          IsHumanDetected: event.IsHumanDetected,
          camera_id: event.camera_id,
          camera_name: event.camera_name,
          Branch_name: event.Branch_name,
          Dept_Location: event.Dept_Location,
          imagepath: imageLinks,
          imageUrls: firstImageFile
            ? [
                `http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(
                  firstImageFile
                )}`,
              ]
            : [], // Create an array with a single image URL or an empty array if there's no image
        };
      });

      const meta = { page };
      return helper.getSuccessResponse(
        "CRITICAL_EVENT_FETCHED_SUCCESSFULLY",
        "Critical Event list fetched successfully",
        eventLinks,
        secret
      );
      // message = 'Critical event list Fetching successfully';
      // responsecode = "";
      // const encrypt = helper.encrypt(JSON.stringify({
      //   responsecode,
      //   message,
      //   eventLinks
      // }), secret);

      // return encrypt;
    } catch (er) {
      return helper.getErrorResponse(
        "UNEXPECTED_ERROR",
        "Unexpected error happened. Please try again",
        er,
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected error happened. Please try again",
      er,
      secret
    );
  }
}

//#########################################################################################################################################################################################################
//##################### Get Total NUmber of Camera for the customer #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getNoofDevice(page = 1, admin) {
  try {
    let message = "Error in fetching the No of device for each site";
    let responsecode = "8005";
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "Login sessiontoken is missing. Please provide a valid sessiontoken.",
        "GET TOTAL NUMBER OF DEVICE FOR EACH SITE",
        secret
      );
    }
    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret->" + secret);
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "Invalid size for the sessiontoken. Please provide a sessiontoken of valid size.",
        "GET TOTAL NUMBER OF DEVICE FOR EACH SITE",
        secret
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    console.log("total number of sites userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login sessiontoken. Please provide a valid sessiontoken.",
        "GET TOTAL NUMBER OF DEVICE FOR EACH SITE",
        secret
      );
    }
    //BEGIN VALIDATION 2

    let sql = "";
    //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
    sql = `select cm.Customer_id,cm.Customer_Type,bm.Branch_id,bm.Branch_name,COUNT(dm.Device_ID) as Total_Device FROM devicemaster dm, customermaster cm,branchmaster bm, deptmaster dt where dm.Dept_ID = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID AND bm.status = 1 AND Customer_Type NOT IN (0) GROUP BY bm.branch_name ORDER BY bm.Branch_Name`;
    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    const active_site = helper.emptyOrRows(rows);

    let sql1 = "";
    //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
    sql1 = `select cm.Customer_id,cm.Customer_Type,bm.Branch_id,bm.Branch_name,COUNT(dm.Device_ID) as Total_Device FROM devicemaster dm, customermaster cm,branchmaster bm, deptmaster dt where dm.Dept_ID = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID AND bm.status = 0 AND Customer_Type NOT IN (0) GROUP BY bm.branch_name ORDER BY bm.Branch_Name`;
    const rows1 = await db.query(sql1);
    const Inactive_site = helper.emptyOrRows(rows1);
    const data = { active_site, Inactive_site };
    return helper.getSuccessResponse(
      "NO_OF_DEVICE_FETCHED_SUCCESSFULLY",
      "No of Device fetched successfully",
      data,
      secret
    );
    // message = 'Total number of device for each sites is Fetched successfully';
    // responsecode = "806";
    // const encrypt = helper.encrypt(JSON.stringify({
    //   responsecode,
    //   message,
    //   active_site,
    //   Inactive_site,
    //   meta }), secret);
    // return encrypt;
  } catch (er) {
    return helper.getErrorResponse("UNEXPECTED_ERROR", er.message, er, secret);
  }
}

//#########################################################################################################################################################################################################
//##################### Get Total NUmber of Camera for the customer #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getNoofSpeakers(page = 1, admin) {
  let message = "Error in fetching the No of device for each site";
  let responsecode = "8005";
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
    return helper.getErrorResponse(
      "SESSIONTOKEN_SIZE_ERROR",
      "GET TOTAL NUMBER OF DEVICE FOR EACH SITE",
      ""
    );
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(
    "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
    [admin.STOKEN]
  );
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  const customerregid = objectvalue["@custid"];
  console.log("total number of sites userid ->" + userid);
  if (userid == null) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_ERROR",
      "GET TOTAL NUMBER OF DEVICE FOR EACH SITE",
      ""
    );
  }

  if (admin.hasOwnProperty("STOKEN") == false) {
    return helper.getErrorResponse(
      "LOGIN_SESSIONTOKEN_MISSING",
      "GET TOTAL NUMBER OF DEVICE FOR EACH SITE",
      ""
    );
  }
  var secret = admin.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //BEGIN VALIDATION 2

  const offset = helper.getOffset(page, config.listPerPage);

  let sql = "";
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
  sql = `select cm.Customer_Type,bm.Branch_name,COUNT(dm.Device_ID) as Total_Device FROM devicemaster dm, customermaster cm,branchmaster bm, deptmaster dt where dm.Dept_ID = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID AND bm.status = 1 AND Customer_Type NOT IN (0) GROUP BY bm.branch_name ORDER BY bm.Branch_Name`;
  // console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  // console.error(`rows==>`, rows);
  const active_site = helper.emptyOrRows(rows);

  let sql1 = "";
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
  sql1 = `select cm.Customer_Type,bm.Branch_name,COUNT(dm.Device_ID) as Total_Device FROM devicemaster dm, customermaster cm,branchmaster bm, deptmaster dt where dm.Dept_ID = dt.Dept_ID AND dt.Branch_ID = bm.Branch_ID AND bm.Customer_ID = cm.Customer_ID AND bm.status = 0 AND Customer_Type NOT IN (0) GROUP BY bm.branch_name ORDER BY bm.Branch_Name`;
  // console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  // console.error(`rows==>`, rows);
  const Inactive_site = helper.emptyOrRows(rows1);
  const meta = { page };
  message = "Total number of device for each sites is Fetched successfully";
  responsecode = "806";
  const encrypt = helper.encrypt(
    JSON.stringify({
      responsecode,
      message,
      active_site,
      Inactive_site,
      meta,
    }),
    secret
  );
  return encrypt;
}

//##################################################################################################################################################################################################################################
//##########################################################################################################################################################################################################################
//#######################################################################################################################################################################################################################################
//THIS FUNCTION IS USED TO GENERATE THE NEW API KEY FOR THE USERS
//{
//  "emailid" : "your email address",
//  "phonrno" : "your phone number",
//  "changingreason" : "your reason for changing the password",
//  "apiusers" : "apiusers details"
//}
//#####################################################################################################################################################################################################################################
//#####################################################################################################################################################################################################################################
//#####################################################################################################################################################################################################################################

async function ApikeyGeneration(admin) {
  if (admin.hasOwnProperty("emailid") == false) {
    return helper.getErrorResponse(
      "API_GENERATION_EMAILID_MISSING",
      "PLEASE PROVIDE THE EMAILID FOR APIKEY GENARATION",
      ""
    );
  }
  if (admin.hasOwnProperty("phoneno") == false) {
    return helper.getErrorResponse(
      "API_GENERATION_PHONENO_MISSING",
      "PLEASE PROVIDE THE PHONE NUMBER FOR APIKEY GENARATION",
      ""
    );
  }
  if (admin.hasOwnProperty("changingreason") == false) {
    return helper.getErrorResponse(
      "API_GENERATION_CHANGING_REASON_MISSING",
      "PLEASE PROVIDE THE CHANGING REASON FOR APIKEY GENARATION",
      ""
    );
  }
  if (admin.hasOwnProperty("apiusers") == false) {
    return helper.getErrorResponse(
      "API_GENERATION_API_USERS_MISSING",
      "PLEASE PROVIDE THE API USERS FOR APIKEY GENARATION",
      ""
    );
  }

  const [result] = await db.spcall(
    "CALL SP_API_KEY_ADD(?,?,?,?,@apikeys); select @apikeys",
    [admin.apiusers, admin.emailid, admin.phoneno, admin.changingreason]
  );
  const objectvalue = result[1][0];
  const apikeys = objectvalue["@apikeys"];
  if (apikeys != null && apikeys != "") {
    return helper.getSuccessResponse(
      "API_KEY_GENERATED_SUCCESSFULLY",
      "THE API KEY IS GENERATED SUCCESSFULLY.",
      "",
      ""
    );
  } else {
    return helper.getErrorResponse(
      "ERROR_GENERATING_API_KEY",
      "ERROR_WHILE_GENERATING THE API KEY",
      ""
    );
  }
}

//#############################################################################################################################################################################################################################################
//#########################################################################################################################################################################################################################################################
//#############################################################################################################################################################################################################################################################

async function getWhatsappEvent(page = 1, admin) {
  try {
    if (admin.hasOwnProperty("STOKEN") == false) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_MISSING",
        "Login sessiontoken is missing. Please provide a valid sessiontoken.",
        "CUSTOMER RECENT REAL EVENT LIST",
        ""
      );
    }
    var secret = admin.STOKEN.substring(0, 16);
    console.log("secret-->" + secret);
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (admin.STOKEN.length > 50 || admin.STOKEN.length < 30) {
      return helper.getErrorResponse(
        "SESSIONTOKEN_SIZE_ERROR",
        "Invalid size for the sessiontoken. Please provide a sessiontoken of valid size.",
        "CUSTOMER RECENT REAL EVENT LIST",
        secret
      );
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall(
      "CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail",
      [admin.STOKEN]
    );
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    console.log("event list userid ->" + userid);
    if (userid == null) {
      return helper.getErrorResponse(
        "LOGIN_SESSIONTOKEN_ERROR",
        "Invalid login sessiontoken. Please provide a valid sessiontoken.",
        "CUSTOMER RECENT REAL EVENT LIST",
        secret
      );
    }

    //BEGIN VALIDATION 2
    // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
    if (admin.hasOwnProperty("querystring") == false) {
      return helper.getErrorResponse(
        "EVENT_QUERYSTRING_MISSING",
        "The querystring for the event is missing. Please provide a valid querystring.",
        "CUSTOMER RECENT REAL EVENTS EVENT",
        secret
      );
    }
    console.log("Event querystring ->" + admin.querystring);
    var querydata;

    try {
      querydata = await helper.decrypt(admin.querystring, secret);
      console.log("decrypted querydata->" + querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_ERROR",
        "There was an error with the querystring. Please provide a valid querystring.",
        "CUSTOMER RECENT REAL EVENT LIST",
        secret
      );
    }
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(
        "QUERYSTRING_JSON_ERROR",
        "There was an error parsing the querystring as JSON. Please provide a valid JSON querystring.",
        "CUSTOMER RECENT REAL EVENT LIST",
        secret
      );
    }
    // const offset = helper.getOffset(page, config.listPerPage);
    const offset = helper.getOffset(page, config.listPerPage);
    if (querydata.hasOwnProperty("currentdate") == false) {
      return helper.getErrorResponse(
        "EVENT_CURRENT_DATE_MISSING",
        "The current date is missing. Please provide the current date.",
        "Please enter the current date for the recent real event",
        secret
      );
    }
    try {
      let sql = "";
      //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;
      sql = `select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and DATE(em.Row_updated_date) = '${querydata.currentdate}'  and Event_id IN (select Event_id from whatsapplog where DATE(em.Row_updated_date) = '${querydata.currentdate}')  ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
      console.error(`SQL==>`, sql);
      const rows = await db.query(sql);
      // console.error(`rows==>`, rows);
      const data = helper.emptyOrRows(rows);
      const imageLinks = [];
      const eventsWithImages = [];

      for (const event of data) {
        const str = event.enddate;
        const evDate = new Date(str);
        const yyyy = evDate.getFullYear().toString();
        const mm = (evDate.getMonth() + 1).toString();
        const dd = evDate.getDate().toString();

        const strDate =
          yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]);
        var strSitenane = event.Branch_name.replace(/\s/g, "");
        strSitenane = strSitenane.replace(/[^\w\s]/gi, "");
        const strCamID = event.camera_id;
        const strEventID = event.Event_ID;

        const FullPaththumb = `\\\\192.168.0.198\\volumes\\${strDate}\\${strSitenane}\\cam${strCamID}\\ivs\\Event${strEventID}\\thumb`;

        const testFolder = FullPaththumb;
        try {
          const folderImages = fs.readdirSync(testFolder).map((file) => {
            return FullPaththumb + "\\" + file;
          });

          if (folderImages.length > 0) {
            imageLinks.push(folderImages);
            eventsWithImages.push(event);
          } else {
            console.error("Image files not found for Event", strEventID);
            continue;
          }
        } catch (error) {
          if (error.code === "ENOENT") {
            console.error("Image files not found for Event", strEventID);
            continue;
          } else {
            console.error("Error while processing Event", strEventID, error);
          }
        }
      }

      const eventLinks = eventsWithImages.map((event, index) => {
        const firstImageFile = imageLinks[index][0]; // Select the first image file

        return {
          Event_ID: event.Event_ID,
          Event_Name: event.Event_Name,
          Row_updated_date: event.Row_updated_date,
          device_name: event.device_name,
          enddate: event.enddate,
          Alertmessage: event.Alertmessage,
          IsHumanDetected: event.IsHumanDetected,
          camera_id: event.camera_id,
          camera_name: event.camera_name,
          Branch_name: event.Branch_name,
          Dept_Location: event.Dept_Location,
          imagepath: imageLinks,
          imageUrls: firstImageFile
            ? [
                `http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(
                  firstImageFile
                )}`,
              ]
            : [], // Create an array with a single image URL or an empty array if there's no image
        };
      });
      const meta = { page };
      return helper.getSuccessResponse(
        "WHATSAPP_EVENT_FETCHED_SUCCESSFULLY",
        "Whatsapp Event list fetched successfully",
        eventLinks,
        secret
      );
      // message = 'Recent real event list Fetching successfully';
      // responsecode = "807";
      // const encrypt = helper.encrypt(JSON.stringify({
      //   responsecode,
      //   message,
      //   eventLinks
      // }), secret);

      // return encrypt;
    } catch (er) {
      return helper.getErrorResponse(
        "UNEXPECTED_ERROR",
        "Unexpected error happened. Please try again",
        er,
        secret
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      "UNEXPECTED_ERROR",
      "Unexpected error happened. Please try again",
      er,
      secret
    );
  }
}

//########################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################

async function addcompanysite(admin) {
  var sitename;
  try {
    console.log(`admin -> ${admin}`);
    const sites = Array.isArray(admin) ? admin : [admin];
    const results = [];
    //          d) Check the companyname is valid
    for (const admin of sites) {
      if (admin.hasOwnProperty("sitename") == false) {
        results.push({
          code: false,
          message: "Site name is missing. Please provide a valid site name.",
          value: admin.customerid,
          name: null,
        });
        continue;
      }
      sitename = admin.sitename;
      if (admin.hasOwnProperty("customerid") == false) {
        results.push({
          code: false,
          message: "Customer ID is missing. Please provide a valid customer ID",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      //          e) Check the contactname is valid
      if (admin.hasOwnProperty("address") == false) {
        results.push({
          code: false,
          message:
            "Site address is missing. Please provide a valid site address.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      //          f) Check the contactemail is valid
      if (admin.hasOwnProperty("city") == false) {
        results.push({
          code: false,
          message:
            "City for the site is missing. Please provide a valid city name.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      //          g) Check the contactphone is valid
      if (admin.hasOwnProperty("state") == false) {
        results.push({
          code: false,
          message:
            "State for the site is missing. Please provide a valid state name.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      //          h) Check the address is valid
      if (admin.hasOwnProperty("pincode") == false) {
        results.push({
          code: false,
          message:
            "PIN code for the site is missing. Please provide a valid PIN code.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("hotlinestorage") == false) {
        results.push({
          code: false,
          message:
            "Hotline storage path for the site is missing. Please provide a valid Hotline storage path.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("archivalpath") == false) {
        results.push({
          code: false,
          message:
            "Archival storage path for the site is missing. Please provide a valid archival storage path.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("backupdays") == false) {
        results.push({
          code: false,
          message:
            "Image backup days for the site is missing. Please provide a valid Image backup days.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("sitecontrollerpath") == false) {
        results.push({
          code: false,
          message:
            "Site Controller path Missing. Please provide the site controller path",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("snapcount") == false) {
        results.push({
          code: false,
          message:
            "Number of snap per event is missing. Please provide the snapcount",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("starttime") == false) {
        results.push({
          code: false,
          message:
            "Site alerm panel start time missing.Please provide the start time.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("endtime") == false) {
        results.push({
          code: false,
          message:
            "Site alarm panel end time missing. Please provide the end time",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("branchcode") == false) {
        results.push({
          code: false,
          message: "Branch code missing. Please provide the branch code",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("gstno") == false) {
        results.push({
          code: false,
          message: "Gst number missing. Please provide the gst number",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      if (admin.hasOwnProperty("sitetype") == false) {
        results.push({
          code: false,
          message: "Site type missing. Please provide the Site type",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      // const sql = await db.query(`select Branch_name from branchmaster where branch_name = '${admin.sitename}';`);
      // if(sql[0]){
      //   return helper.getErrorResponse("BRANCH_NAME_ALREADY_EXIST","Branch name already exist. Please provide the another name for branch.","CUSTOMER ADD SITE","");
      // }

      //End of Validation:- 4
      //Begin Validation:- 5. Contact name should not be greater than 30
      if (admin.pincode.length > 6 || admin.pincode.length < 6) {
        results.push({
          code: false,
          message: "Invalid PIN code size. Please provide a valid PIN code.",
          value: admin.customerid,
          name: sitename,
        });
        continue;
      }
      //End of Validation:- 5
      if (admin.sitecontrollerpath == null || admin.sitecontrollerpath == "") {
        admin.sitecontrollerpath = "\\\\192.168.0.155\\Site_controllers";
      }
      if (admin.hotlinestorage == null || admin.hotlinestorage == "") {
        admin.hotlinestorage = "\\\\192.168.0.156\\Volumes1";
      }
      if (admin.archivalpath == null || admin.archivalpath == "") {
        admin.archivalpath = "\\\\192.168.0.198\\Volumes2";
      }
      if (admin.whatsappgroupname == null || admin.whatsappgroupname == "") {
        admin.whatsappgroupname = "No whatsapp group";
      }

      try {
        var folderPath;
        var strSitenane = admin.sitename.replace(/\s/g, "");
        strSitenane = strSitenane.replace(/[^\w\s]/gi, "");
        const sitefolderPath = path.join(admin.sitecontrollerpath, strSitenane);
        //const result = await db.query('CALL SP_CUST_ADD("'+queryData.name+'", "'+queryData.emailid+'","'+queryData.phoneno+'","'+queryData.password+'")');
        // const [result] = await db.spcall('CALL SP_CUST_BRANCH_ADD(?,?,?,?,?,?,?,?,?,?,@result);select @result;',[queryData.companyid,queryData.sitename,queryData.contactname,queryData.contactemail,queryData.contactphone,queryData.address,userid,0,0,'']);
        const [result] = await db.spcall(
          "CALL SP_INDIVIDUAL_SITE_ADD(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,@result);select @result;",
          [
            admin.customerid,
            admin.sitename,
            admin.address,
            admin.city,
            admin.state,
            admin.pincode,
            1,
            admin.hotlinestorage,
            admin.archivalpath,
            admin.backupdays,
            sitefolderPath,
            admin.snapcount,
            admin.starttime,
            admin.endtime,
            admin.branchcode,
            admin.gstno,
            admin.whatsappgroupname,
            admin.sitetype,
          ]
        );
        const objectValue2 = result[1][0];
        const branch_id = objectValue2["@result"];
        console.log("result branch id=>" + branch_id);
        let deptid = 0;
        if (branch_id != null) {
          try {
            0;
            folderPath = await createFolder(
              admin.sitecontrollerpath,
              strSitenane
            );
            console.log("eventfolderpath ->" + folderPath);
            const [result1] = await db.spcall(
              "CALL SP_SITE_DEPT_ADD(?,?,?,?,@result); select @result",
              [branch_id, admin.sitename, admin.sitename, 0]
            );
            const objectvalue2 = result1[1][0];
            console.log("deptid ->" + objectvalue2["@result"]);
            deptid = objectvalue2["@result"];
          } catch (er) {
            console.log(er);
            results.push({
              code: false,
              message: "Error while creating the folderpath.",
              value: admin.customerid,
              name: sitename,
            });
            continue;
          }
        }
        if (branch_id != null) {
          const sourcefolder = config.sitecontrollerpath;
          cpy
            .copy(sourcefolder, folderPath)
            .then(async () => {
              // const subfolder = '\\Site_Controller';
              console.log("Files copied successfully!");
            })
            .catch((err) => {
              console.error("Error copying files:", err);
              return err;
            });

          results.push({
            code: true,
            message: "Customer site added successfully",
            branch_id,
            deptid,
            name: sitename,
          });
        } else {
          results.push({
            code: false,
            message: "Customer site added failed",
            value: admin.customerid,
            name: sitename,
          });
          continue;
        }
      } catch (er) {
        results.push({
          code: false,
          message: er.message,
          value: admin.customerid,
          er,
          name: sitename,
        });
        continue;
      }
    }
    return results;
  } catch (er) {
    return {
      code: false,
      message: "Customer site add failed",
      value: admin.customerid,
      name: sitename,
    };
  }
}

async function createFolder(path1, siteName) {
  console.log("sitename ->" + siteName);

  // Ensure config.folderpath.storagepath has proper escaping
  const storagePath = path1.replace(/\\/g, "/");

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

//########################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################

async function addsiteconfig(siteid) {
  try {
    let jsonArray = [];
    const sql =
      await db.query(`select bm.Branch_id as SitecontrollerID,bm.Branch_name as Sitename,bm.Branch_id as Siteid,db.database_name as ServerDBName,db.database_port as ServerDBPort,db.database_host 
    as SVMDBServerIP,db.username SVMDBUserName,db.password SVMDBPassword,bm.SiteController_path SiteControllerpath,bm.Image_hotlinepath SVMStoragePath,
    bm.Image_archivalpath SVMArchivalPath, bm.Image_backupdays BackupDays,bm.snapcount Snapcount,sc.Eventaction_path Site_status,sc.mqtt_ip MqttIp,
    sc.Mqtt_Port MqttPort,sc.Api_server apiserver,sc.Nginxserver1 nginxserver1,sc.Nginxserver2 nginxserver2,sc.ArchivalTime ArchivalTime,SC.svmAI_Path SVMAiPath from branchmaster bm, databasemaster db,siteconfigmaster sc where bm.Branch_ID = ${siteid} and bm.status= 1 and 
    sc.status = 1 and db.status =1 and db.database_type = 'primary'; `);
    const siteinfo = sql[0];
    const sql1 =
      await db.query(`SELECT dm.SDK_ID AS SDKID, dm.Device_id AS DeviceID, dt.branch_id AS Siteid, dm.device_name AS DeviceName, dm.IP_Domain AS Ip, dm.IP_Port AS Port,
     dm.IP_Uname AS UserName, dm.IP_Pwd AS Password, COALESCE(TIME_FORMAT(bm.site_starttime, '%H:%i:%s'), '18:00:00') AS StartTime, COALESCE(TIME_FORMAT(bm.site_endtime, '%H:%i:%s'),
      '06:00:00') AS EndTime FROM devicemaster dm, deptmaster dt, branchmaster bm WHERE dm.dept_id = dt.dept_id AND dm.status = 1 AND dt.status = 1 AND bm.status = 1 
      AND dt.branch_id = bm.branch_id AND dt.branch_id = ${siteid};`);
    const deviceinfo = sql1;
    // Check if siteconfig is available
    if (siteinfo) {
      jsonArray.push(siteinfo);
    } else {
      console.log("Siteconfig data is not available.");
      return;
    }
    if (deviceinfo.length > 0) {
      jsonArray.push(...deviceinfo); // Push all device info rows
    } else {
      console.log("deviceconfig data is not available.");
    }
    // const jsonString = JSON.stringify(jsonArray, null, 4);
    const sitepath = sql[0].SiteControllerpath;
    console.log("sitepath:", sitepath);
    if (sitepath) {
      await fs.mkdir(sitepath, { recursive: true });
    } else {
      return helper.getErrorResponse(
        false,
        "Site controller path not available.",
        "ADD CONFIG FILE",
        ""
      );
    }
    const filename = "serverandsiteinfo.json";
    const filepath = path.join(sitepath, filename);
    console.log(`combined patt ` + filepath);

    try {
      // Write JSON data to file
      const fileHandle = await fs.open(filepath, "w");
      await fileHandle.writeFile(JSON.stringify(jsonArray, null, 4));
      await fileHandle.close();
      console.log("success");
      return "Success";
    } catch (er) {
      console.log(er);
      return er;
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Error while adding the site config file.",
      er,
      ""
    );
  }
}

//####################################################################################################################################################################################################
//####################################################################################################################################################################################################
//####################################################################################################################################################################################################

async function UpdateDevice(admin) {
  try {
    deviceDetailsArray = [];
    const adminArray = Array.isArray(admin) ? admin : [admin];
    var siteid;
    var deviceid;
    var deptid;
    const deviceDetailsArray1 = [];
    deviceDetailsArray = [];
    if (adminArray.length == 0) {
      deviceDetailsArray.push({
        code: false,
        message: "Request data not available. Please provide the request data",
        id: 0,
      });
    }
    // PROCESS EACH DEVICE INFO
    for (const deviceInfo of adminArray) {
      siteid;
      try {
        if (deviceInfo.hasOwnProperty("deviceid") == false) {
          // return helper.getErrorResponse('DEVICE_PASSWORD_MISSING', "Device password missing. Please provide the Device password.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Device id missing. Please provide the Device id.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        deviceid = deviceInfo.deviceid;
        if (
          deviceInfo.hasOwnProperty("devicename") == false ||
          deviceInfo.devicename == ""
        ) {
          // return helper.getErrorResponse("DEVICE_NAME_MISSING", "Device name missing. Please provide the device name.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Device name missing. Please provide the device name.",
            id: deviceid,
            name: null,
          });
          continue;
        }
        devicename = deviceInfo.devicename;

        if (
          deviceInfo.hasOwnProperty("siteid") == false ||
          deviceInfo.siteid == ""
        ) {
          // return helper.getErrorResponse("SITE_ID_MISSING", "Site id missing. Please provide the siteid.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Site id missing. Please provide the siteid.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("sdkid") == false ||
          deviceInfo.sdkid == ""
        ) {
          // return helper.getErrorResponse("DEVICE_SDKID_MISSING", "Device sdkid missing. Please provide the device sdkid.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Device sdkid missing. Please provide the device sdkid.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("wanip") == false ||
          deviceInfo.wanip == ""
        ) {
          // return helper.getErrorResponse("DEVICE_IP_DOMAIN_MISSING", "Wan ip address missing. Please provide the Wan IP.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Wan ip address missing. Please provide the Wan IP.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("ipport") == false ||
          deviceInfo.ipport == ""
        ) {
          // /  return helper.getErrorResponse('DEVICE_IP_PORT_MISSING', "TCP port missing. Please provide the TCP port.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "TCP port missing. Please provide the TCP port.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("httpport") == false ||
          deviceInfo.httpport == ""
        ) {
          // return helper.getErrorResponse('DEVICE_HTTP_PORT_MISSING', "HTTP port missing. Please provide the HTTP port.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "HTTP port missing. Please provide the HTTP port.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("rtspport") == false ||
          deviceInfo.rtspport == ""
        ) {
          // return helper.getErrorResponse("DEVICE_RTSP_PORT_MISSING", "RTSP port missing. Please provide the RTSP port.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "RTSP port missing. Please provide the RTSP port.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("username") == false ||
          deviceInfo.username == ""
        ) {
          // return helper.getErrorResponse("DEVICE_USER_NAME_MISSING", "Device username missing. Please provide the Device username.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message:
              "Device username missing. Please provide the Device username.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("password") == false ||
          deviceInfo.password == ""
        ) {
          // return helper.getErrorResponse('DEVICE_PASSWORD_MISSING', "Device password missing. Please provide the Device password.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message:
              "Device password missing. Please provide the Device password.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (deviceInfo.hasOwnProperty("sitetype") == false) {
          // return helper.getErrorResponse('DEVICE_PASSWORD_MISSING', "Device password missing. Please provide the Device password.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Site Type missing. Please provide the site type.",
            id: deviceid,
            name: deviceInfo.devicename,
          });
          continue;
        }

        if (deviceDetailsArray.length >= 1) {
          // return deviceDetailsArray;
        } else {
          var sdkid;
          var brand;
          if (deviceInfo.sdkid == "Dahua") {
            sdkid = 1;
            brand = 1;
          } else if (deviceInfo.sdkid == "Hikvision") {
            sdkid = 2;
            brand = 2;
          } else if (deviceInfo.sdkid == "CP Plus") {
            sdkid = 1;
            brand = 3;
          } else {
            // return helper.getErrorResponse("UNKNOWN_SDK","Unknown Brand name. Please provide valid Brand name.","ADD/UPDATE DEVICE","");
            deviceDetailsArray.push({
              code: false,
              message: "Unknown Brand name. Please provide valid Brand name.",
              id: deviceid,
              name: deviceInfo.devicename,
            });
            continue;
          }
          siteid = deviceInfo.siteid;
          var result;
          var dep = await db.query(
            `select Dept_id from deptmaster where branch_id = ${deviceInfo.siteid} LIMIT 1;`
          );
          deptid = dep[0].Dept_id;
          try {
            if (deviceInfo.wanip != "")
              // Execute stored procedure for each device
              [result] = await db.spcall(
                "CALL SP_DEVICE_UPDATE(?,?,?,?,?,?,?,?,?,?,?,?,?);",
                [
                  deptid,
                  deviceInfo.devicename,
                  brand,
                  deviceInfo.secondary_ip,
                  deviceInfo.wanip,
                  deviceInfo.ipport,
                  deviceInfo.username,
                  deviceInfo.password,
                  deviceInfo.httpport,
                  deviceInfo.rtspport,
                  0,
                  deviceInfo.sitetype,
                  deviceInfo.deviceid,
                ]
              );
          } catch (er) {
            console.log(er);
            deviceDetailsArray.push({
              code: false,
              message: er,
              id: 0,
              name: deviceInfo.devicename,
            });
          }
        }
        if (deviceDetailsArray.length >= 1) {
        } else {
          // const objectvalue = result[1][0];
          if (result.affectedRows < 1) {
            // return helper.getErrorResponse("ERROR_ADDING_DEVICE", "Error while adding device. Please try again later.","ADD DEVICE","");
            deviceDetailsArray.push({
              code: false,
              message: "Error while adding device. Please try again later.",
              id: deviceid,
              name: deviceInfo.devicename,
            });
            continue;
          } else {
            var siteFolderPath;
            const folderpath = `select SiteController_path from branchmaster where branch_id in(${siteid});`;
            const result1 = await db.query(folderpath);
            if (
              result1 &&
              result1.length !== 0 &&
              result1[0] &&
              result1[0].SiteController_path
            ) {
              siteFolderPath = result1[0].SiteController_path;
              const deviceDetails = {
                device_id: deviceid,
                sdk_id: sdkid,
                ip_domain: deviceInfo.wanip,
                ip_port: deviceInfo.ipport,
                username: deviceInfo.username,
                password: deviceInfo.password,
                sitefolderpath: siteFolderPath,
                pathusername: config.folderpath.username,
                pathpassword: config.folderpath.password,
              };
              deviceDetailsArray1.push(deviceDetails);
              console.log(
                `Device added successfully to the database. Device ID: ${deviceid}`
              );
            } else {
              // return helper.getErrorResponse("ERROR_FETCHING_FOLDER_PATH", "Error creating the folder path. Please try again","ADD DEVICE","");
              deviceDetailsArray.push({
                code: false,
                message: "Error creating the folder path. Please try again.",
                id: deviceid,
                name: deviceInfo.devicename,
              });
              continue;
            }
          }
        }
      } catch (er) {
        // return helper.getErrorResponse("ERROR_ADDING_DEVICE", er.message,"ADD DEVICE","");
        deviceDetailsArray.push({
          code: false,
          message: er.message,
          id: deviceid,
          name: devicename,
        });
        continue;
      }
    }
    try {
      if (deviceDetailsArray.length >= 1) {
      } else {
        // Make a POST request to the second API with deviceDetailsArray
        const secondApiEndpoint = config.deviceinfopath;
        const response = await axios.post(
          secondApiEndpoint,
          deviceDetailsArray1
        );
        console.log("Second API Response:", JSON.stringify(response.data));
        const deviceInfoArray = response.data.data;
        try {
          if (Array.isArray(deviceInfoArray)) {
            // If it's an array, iterate over each item
            for (const item of deviceInfoArray) {
              await processEvent(item, siteid, deptid);
            }
          } else if (deviceInfoArray && typeof deviceInfoArray === "object") {
            // If it's a single object, process it directly
            await processEvent(deviceInfoArray, siteid, deptid);
          } else {
            // Handle unexpected data structure
            console.error(
              "Unexpected data structure in deviceInfoArray:",
              deviceInfoArray
            );
            return helper.getErrorResponse({
              code: false,
              message: "Unexpected data structure in deviceInfoArray",
              id: deviceid,
              name: devicename,
            });
          }
        } catch (er) {
          console.log(er);
          deviceDetailsArray.push({
            code: false,
            message: er,
            id: deviceid,
            name: devicename,
          });
        }
      }
    } catch (ex) {
      console.error("Error:", ex.message);
      deviceDetailsArray.push({
        code: false,
        message: ex.message,
        id: deviceid,
        name: devicename,
      });
    }
    return deviceDetailsArray;
  } catch (ex) {
    return { code: false, message: ex.message, error: ex };
  }
}
//############################################################################################################################################################################################################
//#############################################################################################################################################################################################################
//###############################################################################################################################################################################################################
var deviceDetailsArray = [];
var devicename;
async function getDeviceinfo(admin) {
  try {
    deviceDetailsArray = [];
    const adminArray = Array.isArray(admin) ? admin : [admin];
    var siteid;
    var deptid;
    const deviceDetailsArray1 = [];
    deviceDetailsArray = [];
    if (adminArray.length == 0) {
      deviceDetailsArray.push({
        code: false,
        message: "Request data not available. Please provide the request data",
        id: 0,
      });
    }
    // PROCESS EACH DEVICE INFO
    for (const deviceInfo of adminArray) {
      siteid;
      try {
        if (
          deviceInfo.hasOwnProperty("devicename") == false ||
          deviceInfo.devicename == ""
        ) {
          // return helper.getErrorResponse("DEVICE_NAME_MISSING", "Device name missing. Please provide the device name.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Device name missing. Please provide the device name.",
            id: 0,
            name: null,
          });
          continue;
        }
        devicename = deviceInfo.devicename;
        if (
          deviceInfo.hasOwnProperty("siteid") == false ||
          deviceInfo.siteid == ""
        ) {
          // return helper.getErrorResponse("SITE_ID_MISSING", "Site id missing. Please provide the siteid.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Site id missing. Please provide the siteid.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("sdkid") == false ||
          deviceInfo.sdkid == ""
        ) {
          // return helper.getErrorResponse("DEVICE_SDKID_MISSING", "Device sdkid missing. Please provide the device sdkid.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Device sdkid missing. Please provide the device sdkid.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("wanip") == false ||
          deviceInfo.wanip == ""
        ) {
          // return helper.getErrorResponse("DEVICE_IP_DOMAIN_MISSING", "Wan ip address missing. Please provide the Wan IP.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Wan ip address missing. Please provide the Wan IP.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("ipport") == false ||
          deviceInfo.ipport == ""
        ) {
          // /  return helper.getErrorResponse('DEVICE_IP_PORT_MISSING', "TCP port missing. Please provide the TCP port.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "TCP port missing. Please provide the TCP port.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("httpport") == false ||
          deviceInfo.httpport == ""
        ) {
          // return helper.getErrorResponse('DEVICE_HTTP_PORT_MISSING', "HTTP port missing. Please provide the HTTP port.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "HTTP port missing. Please provide the HTTP port.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("rtspport") == false ||
          deviceInfo.rtspport == ""
        ) {
          // return helper.getErrorResponse("DEVICE_RTSP_PORT_MISSING", "RTSP port missing. Please provide the RTSP port.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "RTSP port missing. Please provide the RTSP port.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("username") == false ||
          deviceInfo.username == ""
        ) {
          // return helper.getErrorResponse("DEVICE_USER_NAME_MISSING", "Device username missing. Please provide the Device username.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message:
              "Device username missing. Please provide the Device username.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (
          deviceInfo.hasOwnProperty("password") == false ||
          deviceInfo.password == ""
        ) {
          // return helper.getErrorResponse('DEVICE_PASSWORD_MISSING', "Device password missing. Please provide the Device password.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message:
              "Device password missing. Please provide the Device password.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (deviceInfo.hasOwnProperty("sitetype") == false) {
          // return helper.getErrorResponse('DEVICE_PASSWORD_MISSING', "Device password missing. Please provide the Device password.","ADD DEVICE","");
          deviceDetailsArray.push({
            code: false,
            message: "Site Type missing. Please provide the site type.",
            id: 0,
            name: deviceInfo.devicename,
          });
          continue;
        }
        if (deviceDetailsArray.length >= 1) {
          // return deviceDetailsArray;
        } else {
          var sdkid;
          var brand;
          if (deviceInfo.sdkid == "Dahua") {
            sdkid = 1;
            brand = 1;
          } else if (deviceInfo.sdkid == "Hikvision") {
            sdkid = 2;
            brand = 2;
          } else if (deviceInfo.sdkid == "CP Plus") {
            sdkid = 1;
            brand = 3;
          } else {
            // return helper.getErrorResponse("UNKNOWN_SDK","Unknown Brand name. Please provide valid Brand name.","ADD/UPDATE DEVICE","");
            deviceDetailsArray.push({
              code: false,
              message: "Unknown Brand name. Please provide valid Brand name.",
              id: 0,
              name: deviceInfo.devicename,
            });
            continue;
          }
          siteid = deviceInfo.siteid;
          var result;
          var dep = await db.query(
            `select Dept_id from deptmaster where branch_id = ${deviceInfo.siteid} LIMIT 1;`
          );
          deptid = dep[0].Dept_id;
          try {
            if (deviceInfo.wanip != "")
              // Execute stored procedure for each device
              [result] = await db.spcall(
                "CALL SP_DEVICE_ADD(?,?,?,?,?,?,?,?,?,?,?,?,@deviceid); select @deviceid",
                [
                  deptid,
                  deviceInfo.devicename,
                  brand,
                  deviceInfo.secondary_ip,
                  deviceInfo.wanip,
                  deviceInfo.ipport,
                  deviceInfo.username,
                  deviceInfo.password,
                  deviceInfo.httpport,
                  deviceInfo.rtspport,
                  0,
                  deviceInfo.sitetype,
                ]
              );
            const objectvalue = result[1][0];
            const deviceId = objectvalue["@deviceid"];
            console.log("device id ->" + deviceId);
          } catch (er) {
            console.log(er);
            deviceDetailsArray.push({
              code: false,
              message: er,
              id: 0,
              name: deviceInfo.devicename,
            });
          }
        }
        if (deviceDetailsArray.length >= 1) {
        } else {
          const objectvalue = result[1][0];
          const deviceId = objectvalue["@deviceid"];
          console.log("device id ->" + deviceId);

          if (deviceId == null || deviceId === 0) {
            // return helper.getErrorResponse("ERROR_ADDING_DEVICE", "Error while adding device. Please try again later.","ADD DEVICE","");
            deviceDetailsArray.push({
              code: false,
              message: "Error while adding device. Please try again later.",
              id: 0,
              name: deviceInfo.devicename,
            });
            continue;
          } else {
            var siteFolderPath;
            const folderpath = `select SiteController_path from branchmaster where branch_id in(${siteid});`;
            const result1 = await db.query(folderpath);
            if (
              result1 &&
              result1.length !== 0 &&
              result1[0] &&
              result1[0].SiteController_path
            ) {
              siteFolderPath = result1[0].SiteController_path;
              const deviceDetails = {
                device_id: deviceId,
                sdk_id: sdkid,
                ip_domain: deviceInfo.wanip,
                ip_port: deviceInfo.ipport,
                username: deviceInfo.username,
                password: deviceInfo.password,
                sitefolderpath: siteFolderPath,
                pathusername: config.folderpath.username,
                pathpassword: config.folderpath.password,
              };
              deviceDetailsArray1.push(deviceDetails);
              console.log(
                `Device added successfully to the database. Device ID: ${deviceId}`
              );
            } else {
              // return helper.getErrorResponse("ERROR_FETCHING_FOLDER_PATH", "Error creating the folder path. Please try again","ADD DEVICE","");
              deviceDetailsArray.push({
                code: false,
                message: "Error creating the folder path. Please try again.",
                id: 0,
                name: deviceInfo.devicename,
              });
              continue;
            }
          }
        }
      } catch (er) {
        // return helper.getErrorResponse("ERROR_ADDING_DEVICE", er.message,"ADD DEVICE","");
        deviceDetailsArray.push({
          code: false,
          message: er.message,
          id: 0,
          name: devicename,
        });
        continue;
      }
    }
    try {
      if (deviceDetailsArray.length >= 1) {
      } else {
        // Make a POST request to the second API with deviceDetailsArray
        const secondApiEndpoint = config.deviceinfopath;
        const response = await axios.post(
          secondApiEndpoint,
          deviceDetailsArray1
        );
        
        console.log("Second API Response:", JSON.stringify(response.data));
        const deviceInfoArray = response.data.data;
        try {
          if (Array.isArray(deviceInfoArray)) {
            // If it's an array, iterate over each item
            for (const item of deviceInfoArray) {
              await processEvent(item, siteid, deptid);
            }
          } else if (deviceInfoArray && typeof deviceInfoArray === "object") {
            // If it's a single object, process it directly
            await processEvent(deviceInfoArray, siteid, deptid);
          } else {
            // Handle unexpected data structure
            console.error(
              "Unexpected data structure in deviceInfoArray:",
              deviceInfoArray
            );
            return helper.getErrorResponse({
              code: false,
              message: "Unexpected data structure in deviceInfoArray",
              id: 0,
              name: devicename,
            });
          }
        } catch (er) {
          console.log(er);
          deviceDetailsArray.push({
            code: false,
            message: er,
            id: 0,
            name: devicename,
          });
        }
      }
    } catch (ex) {
      console.error("Error:", ex.message);
      deviceDetailsArray.push({
        code: false,
        message: ex.message,
        id: 0,
        name: devicename,
      });
    }
    return deviceDetailsArray;
  } catch (ex) {
    return { code: false, message: ex.message, error: ex };
  }
}
async function processEvent(event, siteid, deptid) {
  const hikError = event?.HikInfo?.Error;
  const dahuaError = event?.DahuaInfo?.Error;
  const deviceid = event?.HikInfo?.DeviceID || event?.DahuaInfo?.DeviceID;
  // const dahuaError = event?.DahuaInfo?.Error;

  if (!hikError && !dahuaError) {
    try {
      await processDeviceInfo(event, siteid, deptid);
      deviceDetailsArray.push({
        code: true,
        message: "Device added successfully",
        id: deviceid,
        name: devicename,
      });
    } catch (er) {
      console.log(er);
      deviceDetailsArray.push({
        code: false,
        message: er,
        id: 0,
        name: devicename,
      });
    }
  } else {
    deviceDetailsArray.push({
      code: false,
      message: hikError || dahuaError,
      id: deviceid,
      name: devicename,
    });
  }
}

async function processDeviceInfo(item, siteid, deptid) {
  try {
    console.log(`Site id -> ${siteid}`);
    if (!item.DahuaInfo && !item.HikInfo) {
      console.error("No information available for Dahua or Hikvision.");
      return;
    }
    
    let deviceId,
      serialNumber,
      devicetype,
      ipchannel,
      ipchannellist,
      analogchannellist,
      analogchannel,
      harddisk,
      harddiskcap,
      freespace,
      alarminport,
      alarmoutport,
      softwareversion,
      devicemodel,
      devicetime,
      NTPtime,
      AdjustedTime;

    // Loop through available information (DahuaInfo or HikInfo)
    for (const key in item) {
      const info = item[key];
      if (info) {
        deviceId = info.DeviceID ?? null;
        serialNumber = info.SerialNumber ?? null;
        ipchannel = info.IPCameraCount ?? 0;
        analogchannel = info.AnalogCameraCount ?? info.CameraCount;
        harddisk = info.DiskNumber ?? 0;
        let diskInfo;
        if (key === "DahuaInfo") {
          ipchannellist = info.AlgcamList ?? null;
          analogchannellist = info.CameraList ?? null;
          diskInfo = info.DiskInfoList?.[0] ?? {};
          freespace = diskInfo.FreeSpace ?? "0";
          harddiskcap = diskInfo.TotalSpace ?? "0";
        } else if (key === "HikInfo") {
          ipchannellist = info.IPcamList ?? null;
          analogchannellist = info.AlgcamList ?? null;
          diskInfo = info.DiskInfoHIKList?.[0] ?? {};
          freespace = diskInfo.FreeSpace ?? "0";
          harddiskcap = diskInfo.TotalSpace ?? "0";
          iplist = info.IPChannels?.[0] ?? {};
        }
        alarminport = info.AlarmInPortNum ?? 0;
        alarmoutport = info.AlarmOutPortNum ?? 0;
        softwareversion = info.Software_version ?? null;
        devicemodel = info.ModelNumber ?? null;
        devicetype = info.DeviceType ?? null;
        devicetime = info.DeviceTime ?? null;
        NTPtime = info.NTPTime ?? null;
        AdjustedTime = info.AdjustedDeviceTime ?? null;
        cameraNames = info.CameraName ?? null;
        cameraTypes = info.CameraName ?? null;
        break;
      }
    }

    if (deviceId === null || deviceId === "" || deviceId === undefined) {
      return {
        code: false,
        message: "ERROR WHILE FETCHING THE DEVICE INFO",
        id: 0,
        name: devicename,
      };
    }

    // Update database with fetched information
    const sql = `UPDATE devicemaster SET SerialNo = ?, Model_no = ?, Product_name = ?, No_AnalogCH = ?, No_IpCH = ?, Harddisk = ?, harddiskcap = ?, harddiskfreespace = ?, software_version = ?, status = 1 WHERE Device_id = ?`;
    await db.query(sql, [
      serialNumber,
      devicemodel,
      serialNumber,
      analogchannel,
      ipchannel,
      harddisk,
      harddiskcap,
      freespace,
      softwareversion,
      deviceId,
    ]);
    const sql1 = await db.query(`select Dept_id,Branch_id from deptmaster where Dept_id IN(select Dept_id from devicemaster where Device_id = ?) LIMIT 1`,[deviceId]);
    if(sql1[0]){
      siteid = sql1[0].Branch_id;
      deptid = sql1[0].Dept_id;
    }
    await addsiteconfig(siteid);
    console.log("Updated device information for device ID:", deviceId);
    if (deviceId === null || deviceId === "" || deviceId === undefined) {
      return {
        code: false,
        message: "ERROR WHILE FETCHING THE DEVICE INFO",
        id: 0,
        name: devicename,
      };
    }
    if (analogchannellist) {
      await insertCameraInfo(
        deviceId,
        analogchannellist,
        cameraNames,
        cameraTypes,
        "analog",
        deptid
      );
    }
    if (ipchannellist) {
      await insertCameraInfo(
        deviceId,
        ipchannellist,
        cameraNames,
        cameraTypes,
        "ip",
        deptid
      );
    }
  } catch (error) {
    console.error("Error in DeviceInfo:", error.message);
    return error.message;
  }
}

async function insertCameraInfo(
  deviceId,
  channelList,
  cameraNames,
  cameraTypes,
  channelType,
  deptid
) {
  try {
    const sql1 = `select SDK_ID, Dept_id, IP_domain, IP_port, IP_Uname, IP_Pwd from devicemaster where Device_id = ${deviceId} LIMIT 1`;
    const rows = await db.query(sql1);
    const sdk_id = rows[0].SDK_ID;
    const IP_domain = rows[0].IP_domain || "";
    const IP_Port = rows[0].IP_port || "";
    const IP_username = rows[0].IP_Uname || ""; // Fix variable name here
    const IP_password = rows[0].IP_Pwd || ""; // Fix variable name here
    console.log("IP_domain ->" + IP_domain);
    console.log("IP_port ->" + IP_Port);
    console.log("IP_Uname ->" + IP_username);
    console.log("IP_Password ->" + IP_password);

    for (let i = 0; i < channelList.length; i++) {
      const channelNumber = channelList[i];
      // const channelName = channelNumber ? `channel${channelNumber}` : null;
      const cameraName = cameraNames ? cameraNames[i] || "" : "";
      const cameraType = cameraTypes ? cameraTypes[i] || "" : "";

      try {
        if (channelType === "ip") {
          var chltype = 1;
          const channelName = channelNumber
            ? `channel${channelNumber + 32}`
            : "";

          const [result] = await db.spcall(
            "CALL SP_CHANNAL_UPDATE(?,?,?,?,?,?,@channelid);select @channelid",
            [channelName, channelName, sdk_id, chltype, deviceId, 0]
          );
          const objectvalue = result[1][0];
          const channelid = objectvalue["@channelid"];
          console.log(
            `chaneeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee ${channelid}`
          );
          const [result1] = await db.spcall(
            "CALL SP_CAMERA_UPDATE(?,?,?,?,?,?,?,?,?,?,?,?,@cameraid);select @cameraid",
            [
              channelid,
              deptid,
              channelName,
              channelName,
              sdk_id,
              chltype,
              deviceId,
              0,
              IP_domain,
              IP_Port,
              IP_username,
              IP_password,
            ]
          );
          const objectvalue2 = result1[1][0];
          const camera_id = objectvalue2["@cameraid"];
          console.log(`cameraid -> ${camera_id}`);
        } else if (channelType === "analog") {
          var chltype = 0;
          const channelName = channelNumber ? `channel${channelNumber}` : null;
          const [result] = await db.spcall(
            `CALL SP_CHANNAL_UPDATE(?,?,?,?,?,?,@channelid);select @channelid`,
            [channelName, channelName, sdk_id, chltype, deviceId, 0]
          );
          const objectvalue = result[1][0];
          const channelid = objectvalue["@channelid"];
          console.log(
            `chaneeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee ${channelid}`
          );
          const [result1] = await db.spcall(
            `CALL SP_CAMERA_UPDATE(?,?,?,?,?,?,?,?,?,?,?,?,@cameraid);select @cameraid`,
            [
              channelid,
              deptid,
              channelName,
              channelName,
              sdk_id,
              chltype,
              deviceId,
              0,
              IP_domain,
              IP_Port,
              IP_username,
              IP_password,
            ]
          );
          const objectvalue2 = result1[1][0];
          const camera_id = objectvalue2["@cameraid"];
          console.log(`cameraid -> ${camera_id}`);
        }
      } catch (er) {
        console.log(er);
        return {
          code: "ERROR_FETCHING_CAMERA_LIST",
          message: `Internal error. Please contact Administration`,
          error: er.message,
          id: 0,
          name: devicename,
        };
      }
    }
    console.log(
      `Inserted ${channelType} camera information for device ID:`,
      deviceId
    );
  } catch (error) {
    console.error(
      `Error inserting ${channelType} camera information:`,
      error.message
    );
    throw error;
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

// async function getsitelist(admin){
//     try{
//       if(admin.hasOwnProperty('filter') == false){
//         return helper.getErrorResponse(false,"Filter type missing. Please provide the filter type.","FETCH SITE LIST","");
//       }
//       if(admin.hasOwnProperty('organizationid') == false){
//         return helper.getErrorResponse(false,"Organization id missing. Please provide the organization id.","FETCH SITE LIST","");
//       }
//       if(admin.hasOwnProperty('companyid') == false){
//         return helper.getErrorResponse(false,"Company missing. Please provide the company id","FETCH SITE LIST","");
//       }
//       if(admin.hasOwnProperty('sitetype') == false){
//         return helper.getErrorResponse(false,"Site type missing. Please provide the site type","FETCH SITE LIST","");
//       }

//     var sql;

//     if(admin.filter == 'ALL' && admin.organizationid == 0 && admin.companyid == 0){
//     sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//        bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays,
//       CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time,
//        bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime,
//       COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices,
//       SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id
//       LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id, bm.Customer_id,
//       bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no, bm.whatsappgroupname,
//       bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status,
//       bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;`);
//     }
//     else if(admin.filter == 'ACTIVE' && admin.organizationid == 0 && admin.companyid == 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//       bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount,
//       bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s')
//       END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno,
//       SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN
//       deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 1 AND
//       bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//       bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
//       bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
//       `);
//     }
//     else if(admin.filter == 'INACTIVE' && admin.organizationid == 0 && admin.companyid == 0){
//       sql =await db.query(`SELECT bm.Branch_id,bm.Customer_id,bm.contact_person,bm.Address,bm.city,bm.state,bm.pincode,bm.site_starttime,bm.site_endtime,bm.Email_id,bm.Contact_no,bm.whatsappgroupname,
//       bm.Image_hotlinepath hotline,bm.Image_archivalpath Archival,bm.Image_backupdays,bm.snapcount, bm.Sitecontroller_path , CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s')
//       ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time,
//       bm.Branch_name,bm.status as Sitestatus, bm.SiteController_Status, bm.Site_uptime,
//       bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices,bm.branch_code,bm.gstno,
//       SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices,bm.hidestatus FROM branchmaster bm LEFT JOIN
//       deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id  and bm.Customer_ID != 0 where bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id,
//       bm.Branch_name, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime;`);
//     }
//     else if(admin.filter == 'ALL' && admin.organizationid != 0 && admin.companyid == 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
//        bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN
//        bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS
//        Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END)
//        AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT
//        JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id,
//        bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no, bm.whatsappgroupname,
//        bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status, bm.SiteController_Status, bm.Site_uptime,
//        bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
//       `);
//     }
//     else if(admin.filter == 'ACTIVE' && admin.organizationid != 0 && admin.companyid == 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
//         bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1
//         THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status,
//         bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0
//         THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id AND
//         bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 1 AND bm.site_type = ${admin.sitetype} AND bm.Customer_id IN (SELECT Customer_id FROM customermaster WHERE
//         Organization_id = ${admin.organizationid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//         bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
//         bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
//       `);
//     }
//     else if(admin.filter == 'INACTIVE' && admin.organizationid != 0 && admin.companyid == 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
//        bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1
//        THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.branch_code, bm.gstno,
//        bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN
//        dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id
//        = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} AND bm.Customer_id IN (SELECT Customer_id FROM customermaster WHERE
//        Organization_id = ${admin.organizationid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//        bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status,
//        bm.branch_code, bm.gstno, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.hidestatus ORDER BY bm.Branch_id;
//       `);
//     }
//     else if(admin.filter == 'ALL' && admin.organizationid == 0 && admin.companyid != 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
//       bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN
//       bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name,
//       bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1
//       THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON
//       bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.site_type = ${admin.sitetype} AND
//       bm.Customer_id = ${admin.companyid} GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//       bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
//       bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
//       `);
//     }
//     else if(admin.filter == 'ACTIVE' && admin.organizationid == 0 && admin.companyid != 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
//        bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN
//        bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name,
//        bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1
//        THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id
//        = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 1 AND bm.site_type = ${admin.sitetype} AND
//        bm.Customer_id IN (${admin.companyid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
//        bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
//        bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus;`);
//     }
//     else if(admin.filter == 'INACTIVE' && admin.organizationid == 0 && admin.companyid != 0){
//       sql =await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
//        bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status
//        = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus,
//        bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS
//        Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN
//        devicemaster dm ON dt.Dept_id = dm.Dept_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} AND bm.Customer_id IN
//        (${admin.companyid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id,
//        bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status,
//        bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus;
//       `);
//     }else{
//       return helper.getErrorResponse(false,"Please provide the correct value for the fields.","FETCH SITE LIST","");
//     }
//     const code = true;
//     const message = 'Branch list Fetched Successfully';
//     return {code,message,sql};
//     }catch(er){
//       const code = false;
//       const message = 'Internel error. Please try again later.';
//       const error = er.sqlMessage;
//       return {code,message,error}
//     }
// }
async function getsitelist(admin) {
  try {
    if (admin.hasOwnProperty("filter") == false) {
      return helper.getErrorResponse(
        false,
        "Filter type missing. Please provide the filter type.",
        "FETCH SITE LIST",
        ""
      );
    }
    if (admin.hasOwnProperty("organizationid") == false) {
      return helper.getErrorResponse(
        false,
        "Organization id missing. Please provide the organization id.",
        "FETCH SITE LIST",
        ""
      );
    }
    if (admin.hasOwnProperty("companyid") == false) {
      return helper.getErrorResponse(
        false,
        "Company missing. Please provide the company id",
        "FETCH SITE LIST",
        ""
      );
    }
    if (admin.hasOwnProperty("sitetype") == false) {
      return helper.getErrorResponse(
        false,
        "Site type missing. Please provide the site type",
        "FETCH SITE LIST",
        ""
      );
    }

    var sql;

    if (
      admin.filter == "ALL" &&
      admin.organizationid == 0 &&
      admin.companyid == 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
       bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, 
      CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time,
       bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime,
      COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices,
      SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id 
      LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id, bm.Customer_id,
      bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no, bm.whatsappgroupname,
      bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status,
      bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;`);
    } else if (
      admin.filter == "ACTIVE" &&
      admin.organizationid == 0 &&
      admin.companyid == 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, 
      bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount,
      bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s')
      END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno,
      SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN
      deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 1 AND 
      bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
      bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
      bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
      `);
    } else if (
      admin.filter == "INACTIVE" &&
      admin.organizationid == 0 &&
      admin.companyid == 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id,bm.Customer_id,bm.contact_person,bm.Address,bm.city,bm.state,bm.pincode,bm.site_starttime,bm.site_endtime,bm.Email_id,bm.Contact_no,bm.whatsappgroupname,
      bm.Image_hotlinepath hotline,bm.Image_archivalpath Archival,bm.Image_backupdays,bm.snapcount, bm.Sitecontroller_path , CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s')
      ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time,
      bm.Branch_name,bm.status as Sitestatus, bm.SiteController_Status, bm.Site_uptime, 
      bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices,bm.branch_code,bm.gstno,
      SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices,bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN 
      deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id and bm.Customer_ID != 0 where bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} GROUP BY bm.Branch_id, 
      bm.Branch_name, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime;`);
    } else if (
      admin.filter == "ALL" &&
      admin.organizationid != 0 &&
      admin.companyid == 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
      bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1 
      THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status,
      bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 
      THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus, CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND
      bm.Customer_ID != 0 WHERE bm.site_type = ${admin.sitetype} AND bm.Customer_id IN (SELECT Customer_id FROM customermaster WHERE
      Organization_id = ${admin.organizationid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
      bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
      bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
      `);
    } else if (
      admin.filter == "ACTIVE" &&
      admin.organizationid != 0 &&
      admin.companyid == 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
        bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1 
        THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.SiteController_Status,
        bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 
        THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND
        bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 1 AND bm.site_type = ${admin.sitetype} AND bm.Customer_id IN (SELECT Customer_id FROM customermaster WHERE
        Organization_id = ${admin.organizationid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
        bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
        bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
      `);
    } else if (
      admin.filter == "INACTIVE" &&
      admin.organizationid != 0 &&
      admin.companyid == 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
       bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status = 1
       THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus, bm.branch_code, bm.gstno,
       bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN
       dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id 
       = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} AND bm.Customer_id IN (SELECT Customer_id FROM customermaster WHERE
       Organization_id = ${admin.organizationid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, 
       bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status,
       bm.branch_code, bm.gstno, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.hidestatus ORDER BY bm.Branch_id;
      `);
    } else if (
      admin.filter == "ALL" &&
      admin.organizationid == 0 &&
      admin.companyid != 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no, 
      bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN 
      bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name,
      bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 
      THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON
      bm.Branch_id = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.site_type = ${admin.sitetype} AND
      bm.Customer_id = ${admin.companyid} GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, 
      bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
      bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus ORDER BY bm.Branch_id;
      `);
    } else if (
      admin.filter == "ACTIVE" &&
      admin.organizationid == 0 &&
      admin.companyid != 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
       bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN
       bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name,
       bm.status AS Sitestatus, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 
       THEN 1 ELSE 0 END) AS Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id
       = dt.Branch_id LEFT JOIN devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 1 AND bm.site_type = ${admin.sitetype} AND
       bm.Customer_id IN (${admin.companyid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime,
       bm.Email_id, bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name,
       bm.status, bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus;`);
    } else if (
      admin.filter == "INACTIVE" &&
      admin.organizationid == 0 &&
      admin.companyid != 0
    ) {
      sql =
        await db.query(`SELECT bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, bm.Contact_no,
       bm.whatsappgroupname, bm.Image_hotlinepath AS hotline, bm.Image_archivalpath AS Archival, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, CASE WHEN bm.sitecontroller_status 
       = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s') ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.Branch_name, bm.status AS Sitestatus,
       bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, COUNT(dm.Device_id) AS Total_Devices, bm.branch_code, bm.gstno, SUM(CASE WHEN dm.status = 1 THEN 1 ELSE 0 END) AS
       Active_Devices, SUM(CASE WHEN dm.status = 0 THEN 1 ELSE 0 END) AS Inactive_Devices, bm.hidestatus,CASE WHEN cst.branch_id IS NOT NULL THEN 1 ELSE 0 END AS subscription FROM branchmaster bm LEFT JOIN deptmaster dt ON bm.Branch_id = dt.Branch_id LEFT JOIN 
       devicemaster dm ON dt.Dept_id = dm.Dept_id LEFT JOIN subscriptioncustomertrans cst ON cst.branch_id = bm.Branch_id AND bm.Customer_ID != 0 WHERE bm.Deleted_Flag = 0 AND bm.status = 0 AND bm.site_type = ${admin.sitetype} AND bm.Customer_id IN
       (${admin.companyid}) GROUP BY bm.Branch_id, bm.Customer_id, bm.contact_person, bm.Address, bm.city, bm.state, bm.pincode, bm.site_starttime, bm.site_endtime, bm.Email_id, 
       bm.Contact_no, bm.whatsappgroupname, bm.Image_hotlinepath, bm.Image_archivalpath, bm.Image_backupdays, bm.snapcount, bm.Sitecontroller_path, bm.Branch_name, bm.status, 
       bm.SiteController_Status, bm.Site_uptime, bm.Site_Downtime, bm.branch_code, bm.gstno, bm.hidestatus;
      `);
    } else {
      return helper.getErrorResponse(
        false,
        "Please provide the correct value for the fields.",
        "FETCH SITE LIST",
        ""
      );
    }
    const code = true;
    const message = "Branch list Fetched Successfully";
    return { code, message, sql };
  } catch (er) {
    const code = false;
    const message = "Internel error. Please try again later.";
    const error = er.sqlMessage;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function getdevicelist(admin) {
  try {
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        "SITE_ID_MISSING",
        "Site is missing. Please provide the site id.",
        "GET DEVICE LIST",
        ""
      );
    }
    const sql =
      await db.query(`SELECT dm.Device_ID,dm.Dept_ID,dm.Device_name,CASE WHEN dm.Device_Type = 0 THEN 'DVR' WHEN dm.Device_Type = 1 THEN 'NVR' ELSE 'Unknown' END AS
   Device_type,CASE WHEN dm.SDK_ID = 1 THEN 'Dahua' WHEN dm.SDK_ID = 2 THEN 'Hikvision' WHEN dm.SDK_ID = 3 THEN 'CP plus 'ELSE 'Unknown' END AS Brand_Name,dm.IP_Domain,dm.secondary_ip,dm.IP_Port,dm.IP_Uname,dm.IP_Pwd,
   dm.No_AnalogCH,dm.No_IpCH,dm.httpport,dm.RTSP_Port, COALESCE(dr.status, 0) AS Devicestatus, dr.starttime, dr.endtime, dm.SerialNo,dm.Model_no,dm.status FROM devicemaster dm LEFT JOIN ( SELECT d1.Device_id, 
    d1.status, d1.starttime, d1.endtime FROM devicerunningstatuslog d1 INNER JOIN ( SELECT Device_id, MAX(starttime) AS max_starttime FROM devicerunningstatuslog 
    GROUP BY Device_id ) d2 ON d1.Device_id = d2.Device_id AND d1.starttime = d2.max_starttime ) dr ON dm.Device_id = dr.Device_id WHERE dm.Deleted_flag = 0 AND dm.Dept_id 
    IN (SELECT Dept_id FROM deptmaster WHERE branch_id = ${admin.siteid});`);
    const sql1 = await db.query(
      `SELECT o.Organization_name, c.Customer_Name,c.Customer_id, b.branch_name,b.Branch_id FROM customermaster c LEFT JOIN organizations o ON o.Organization_ID = c.Organization_ID LEFT JOIN branchmaster b ON c.Customer_ID = b.Customer_ID where b.branch_id = ${admin.siteid} and b.status =1 and c.status = 1;`
    );
    const code = true;
    const message = "Device list Fetched Successfully";
    return { code, message, sql, sql1 };
  } catch (er) {
    const code = false;
    const message = "Internel error. Please try again later.";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################
//##############################################################################################################################################################################################

async function SiteStatus(admin) {
  try {
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id.",
        "FETCH_SITE_STATUS",
        ""
      );
    }
    if (admin.siteid) {
      const sql = await db.query(
        `select SiteController_Status,Site_uptime,Site_downtime from branchmaster where branch_id = ${admin.siteid}`
      );
      if (sql) {
        const code = true;
        const message = "Site Status Fetched Successfully";
        const SiteController_Status = sql[0].SiteController_Status;
        const Site_starttime = new Date(sql[0].Site_uptime)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19)
          .replace("Z", "");
        const Site_stoptime = new Date(sql[0].Site_downtime)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19)
          .replace("Z", "");
        return {
          code,
          message,
          SiteController_Status,
          Site_starttime,
          Site_stoptime,
        };
      } else {
        const code = false;
        const message =
          "Site status not found for this site. Please try after sometime";
        return { code, message };
      }
    }
  } catch (er) {
    const code = false;
    const message = "Internal error. Please try again";
    const error = er.message;
    return { code, message, error };
  }
}

//#######################################################################################################################################################################################################
//#######################################################################################################################################################################################################
//#######################################################################################################################################################################################################

async function DeviceStatus(admin) {
  try {
    if (admin.hasOwnProperty("deviceid") == false) {
      return helper.getErrorResponse(
        false,
        "Site device id is missing. Please provide the device id.",
        "FETCH_DEVICE_STATUS",
        ""
      );
    }
    if (admin.deviceid) {
      const data = await db.query(
        `SELECT devicelog_id, status, starttime, endtime FROM devicerunningstatuslog WHERE device_id = ${admin.deviceid} ORDER BY devicelog_id DESC LIMIT 1;`
      );
      console.log(`sql ${data}`);
      if (data) {
        const code = true;
        const message = "Device Status Fetched Successfully";
        const Device_Status = data[0].status;
        const Device_starttime = new Date(data[0].starttime)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19)
          .replace("Z", "");
        const Device_stoptime = new Date(data[0].endtime)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19)
          .replace("Z", "");
        return {
          code,
          message,
          Device_Status,
          Device_starttime,
          Device_stoptime,
        };
      } else {
        const code = false;
        const message = "Device status not found. Please try after sometime";
        return { code, message };
      }
    }
  } catch (er) {
    const code = false;
    const message = "Internel error. Please try again";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function Dblist(admin) {
  try {
    const sql = await db.query(`SELECT * from databasemaster where status = 1`);
    const code = true;
    const message = "Available Databases Fetched Successfully";
    return { code, message, sql };
  } catch (er) {
    const code = false;
    const message = "Internel error. Please try again";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function Fetchconfigpath(admin) {
  try {
    const sql = await db.query(
      `SELECT * from siteconfigmaster where status = 1`
    );
    const code = true;
    const message = "Available Databases Fetched Successfully";
    return { code, message, sql };
  } catch (er) {
    const code = false;
    const message = "Internel error. Please try again";
    const error = er.message;
    return { code, message, error };
  }
}

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function StoragePath(admin) {
  try {
    const Hotline_Storage = await db.query(
      `select * from storagepathmaster where status=1 and storage_type = 1`
    );
    const Archival_Storage = await db.query(
      `select * from storagepathmaster where status=1 and storage_type = 2`
    );
    const SiteController_Storage = await db.query(
      `select * from storagepathmaster where status=1 and storage_type = 3`
    );

    // if (Hotline_Storage.length === 0 || Archival_Storage.length === 0 || SiteController_Storage.length === 0) {
    //  return helper.getErrorResponse("STORAGE_NOT_AVAILABLE","Storage paths not available. Please add the storage paths.");
    // }

    const Hotline_paths = Hotline_Storage.map((storage) => storage.serverpath);
    const Archival_paths = Archival_Storage.map(
      (storage) => storage.serverpath
    );
    const Sitecontroller_paths = SiteController_Storage.map(
      (storage) => storage.serverpath
    );

    const code = true;
    const message = "Storage paths Fetched successfully";
    console.log(code);
    return {
      code,
      message,
      Hotline_paths,
      Archival_paths,
      Sitecontroller_paths,
      Hotline_Storage,
      Archival_Storage,
      SiteController_Storage,
    };
  } catch (er) {
    const code = false;
    const message = "Internel error. Please try again";
    const error = er.message;
    console.log(message);
    return { code, message, error };
  }
}

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function SiteModify(admin) {
  try {
    if (!admin.hasOwnProperty("siteid")) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id",
        "SITE MODIFY",
        ""
      );
    }
    if (!admin.hasOwnProperty("status")) {
      return helper.getErrorResponse(
        false,
        "Site status missing. Please provide the site status",
        "SITE MODIFY",
        ""
      );
    }

    let siteIds = [];

    if (admin.siteid.includes(",")) {
      siteIds = admin.siteid.split(",").map((id) => parseInt(id.trim()));
    } else {
      const siteId = parseInt(admin.siteid.trim());
      if (isNaN(siteId)) {
        return helper.getErrorResponse(
          false,
          "Invalid site id provided",
          "SITE MODIFY",
          ""
        );
      }
      siteIds.push(siteId);
    }

    const responses = [];
    let dbstatus;
    for (const siteId of siteIds) {
      switch (admin.status) {
        case "activate":
          dbstatus = 1;
          break;
        case "deactivate":
          dbstatus = 0;
          break;
        case "delete":
          dbstatus = 3;
          break;
        default:
          return helper.getErrorResponse(
            false,
            `Invalid status "${admin.status}" provided for site with ID ${siteId}`,
            "SITE MODIFY",
            ""
          );
          continue;
      }

      try {
        const [result] = await db.spcall(
          `CALL SP_SITE_MODIFY(?,?,@result); SELECT @result;`,
          [siteId, dbstatus]
        );
        const objectvalue = result[1][0];
        const status = objectvalue["@result"];
        console.log(`status ${status}`);
        if (status !== undefined && status !== null && status !== 0) {
          responses.push(`Site ${siteId} Modified successfully.`);
        } else {
          responses.push(`Error while modifying site ${siteId}`);
        }
      } catch (er) {
        responses.push(er);
      }
    }
    return helper.getSuccessResponse(true, "SUCCESS", responses, "");
    // if(dbstatus == 1){
    //   return helper.getSuccessResponse("SITE_ACTIVATED_SUCCESSFULLY","Site has been activated successfully.",responses,"");
    // }else if(dbstatus == 0){
    //   return helper.getSuccessResponse("SITE_DEACTIVATED_SUCCESSFULLY","Site has been deactivated successfully.",responses,"");
    // }else{
    //   return helper.getSuccessResponse("SITE_DELETED_SUCCESSFULLY","Site has been deleted successfully.",responses,"");
    // }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internel error. Please try again",
      er.message,
      ""
    );
  }
}

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function DeviceModify(admin) {
  try {
    if (!admin.hasOwnProperty("deviceid")) {
      return helper.getErrorResponse(
        false,
        "Device id missing. Please provide the device id",
        "DEVICE MODIFY",
        ""
      );
    }
    if (!admin.hasOwnProperty("status")) {
      return helper.getErrorResponse(
        false,
        "Device status missing. Please provide the device status",
        "DEVICE MODIFY",
        ""
      );
    }

    var sql;
    try {
      if (admin.status == "activate") {
        sql = await db.query(
          `UPDATE devicemaster set status =1 , deleted_flag = 0 where device_id IN(${admin.deviceid})`
        );
      } else if (admin.status == "deactivate") {
        sql = await db.query(
          `UPDATE devicemaster set status = 0 , deleted_flag = 0 where device_id IN(${admin.deviceid})`
        );
      } else if (admin.status == "delete") {
        sql = await db.query(
          `UPDATE devicemaster set status =0 , deleted_flag = 1 where device_id IN(${admin.deviceid})`
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Unknown status type",
          "DEVICE MODIFY",
          ""
        );
      }
      if (sql.affectedRows) {
        return helper.getSuccessResponse(
          true,
          "Device modified successfully",
          "DEVICE MODIFY",
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error modifying the Device status.",
          "DEVICE MODIFY",
          ""
        );
      }
    } catch (er) {
      return {
        code: false,
        message: "Internal error. Please try again",
        error: er.message,
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please try again",
      error: er.message,
    };
  }
}

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function UpdateSite(admin) {
  try {
    //          d) Check the companyname is valid
    if (admin.hasOwnProperty("companyid") == false) {
      return helper.getErrorResponse(
        false,
        "Company ID is missing. Please provide a valid company ID.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("sitename") == false) {
      return helper.getErrorResponse(
        false,
        "Site name is missing. Please provide a valid site name.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    //          e) Check the contactname is valid
    if (admin.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        false,
        "Site address is missing. Please provide a valid site address.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    //          f) Check the contactemail is valid
    if (admin.hasOwnProperty("city") == false) {
      return helper.getErrorResponse(
        false,
        "City for the site is missing. Please provide a valid city name.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    //          g) Check the contactphone is valid
    if (admin.hasOwnProperty("state") == false) {
      return helper.getErrorResponse(
        false,
        "State for the site is missing. Please provide a valid state name.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    //          h) Check the address is valid
    if (admin.hasOwnProperty("pincode") == false) {
      return helper.getErrorResponse(
        false,
        "PIN code for the site is missing. Please provide a valid PIN code.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("hotlinestorage") == false) {
      return helper.getErrorResponse(
        false,
        "Hotline storage path for the site is missing. Please provide a valid Hotline storage path.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("archivalpath") == false) {
      return helper.getErrorResponse(
        false,
        "Archival storage path for the site is missing. Please provide a valid archival storage path.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("backupdays") == false) {
      return helper.getErrorResponse(
        false,
        "Image backup days for the site is missing. Please provide a valid Image backup days.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("sitecontrollerpath") == false) {
      return helper.getErrorResponse(
        false,
        "Site Controller path Missing. Please provide the site controller path",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("snapcount") == false) {
      return helper.getErrorResponse(
        false,
        "Number of snap per event is missing. Please provide the snapcount",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("starttime") == false) {
      return helper.getErrorResponse(
        false,
        "Site alerm panel start time missing.Please provide the start time",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("endtime") == false) {
      return helper.getErrorResponse(
        false,
        "Site alarm panel end time missing. Please provide the end time",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id.",
        "CUSTOMER UPDATE SITE",
        ""
      );
    }
    if (admin.hasOwnProperty("branchcode") == false) {
      results.push({
        code: false,
        message: "Branch code missing. Please provide the branch code",
        Value: admin.customerid,
        name: sitename,
      });
    }
    if (admin.hasOwnProperty("gstno") == false) {
      results.push({
        code: false,
        message: "Gst number missing. Please provide the gst number",
        Value: admin.customerid,
        name: sitename,
      });
    }
    try {
      var folderPath;
      var strSitenane = admin.sitename.replace(/\s/g, "");
      strSitenane = strSitenane.replace(/[^\w\s]/gi, "");
      const sitefolderPath = path.join(admin.sitecontrollerpath, strSitenane);
      const [result] = await db.spcall(
        "CALL SP_SITE_UPDATE(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,@result);select @result;",
        [
          admin.companyid,
          admin.sitename,
          admin.address,
          admin.city,
          admin.state,
          admin.pincode,
          1,
          admin.hotlinestorage,
          admin.archivalpath,
          admin.backupdays,
          sitefolderPath,
          admin.snapcount,
          admin.starttime,
          admin.endtime,
          admin.siteid,
          admin.branchcode,
          admin.gstno,
        ]
      );
      const objectValue2 = result[1][0];
      const status = objectValue2["@result"];
      console.log("result branch id=>" + status);
      if (status == 1) {
        try {
          folderPath = await createFolder(
            admin.sitecontrollerpath,
            strSitenane
          );
          console.log("eventfolderpath ->" + folderPath);
        } catch (er) {
          return helper.getErrorResponse(
            false,
            "Error while creating the folderpath.",
            er,
            ""
          );
        }
        const sourcefolder = config.sitecontrollerpath;
        cpy
          .copy(sourcefolder, folderPath)
          .then(async () => {
            // const subfolder = '\\Site_Controller';
            // const hikalarmexeold = '\\HikAlarmListener\\HikAlarmlistener.exe';
            // const dahuaalarmexeold = '\\DahuaAlarmListener\\DahuaAlarmlistener.exe';
            // const newhikpath = '\\HikAlarmListener\\HA_'+strSitenane.toLowerCase()+'.exe';
            // const newdahuapath = '\\DahuaAlarmListener\\DA_'+strSitenane.toLowerCase()+'.exe';
            // const scexepath = '\\sitecontroller.exe';
            // const newexepath = "sc_"+strSitenane.toLowerCase()+".exe";
            // const scoldpath  = path.join(sitefolderPath,subfolder,scexepath);
            // const scnewpath = path.join(sitefolderPath,subfolder,newexepath);
            // const hikoldpath = path.join(sitefolderPath,subfolder,hikalarmexeold);
            // const hiknewpath = path.join(sitefolderPath,subfolder,newhikpath);
            // const dahuaoldpath = path.join(sitefolderPath,subfolder,dahuaalarmexeold);
            // const dahuanewpath = path.join(sitefolderPath,subfolder,newdahuapath);
            // console.log(`oldpath -> ${scoldpath}  newpath -> ${scnewpath}`);
            // await fs.access(scoldpath);
            //  fs.rename(scoldpath,scnewpath);
            //  console.log(`oldpath -> ${hikoldpath}  newpath -> ${hiknewpath}`);
            // await fs.access(hikoldpath);
            //  fs.rename(hikoldpath,hiknewpath);
            //  console.log(`oldpath -> ${dahuaoldpath}  newpath -> ${dahuanewpath}`);
            // await fs.access(dahuaoldpath);
            //  fs.rename(dahuaoldpath,dahuanewpath);
            // console.log(`oldpath -> ${scoldpath}  newpath -> ${scnewpath}`);
            await addsiteconfig(admin.siteid);
            console.log("Files copied successfully!");
          })
          .catch((err) => {
            console.error("Error copying files:", err);
          });
        code = true;
        message = "Customer site updated successfully";
        return { code, message, status };
      } else {
        return helper.getErrorResponse(
          false,
          "Customer site updation failed. Please try again",
          "error",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Customer site updation failed. Please try again",
        er.message,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Customer site updation failed. Please try again",
      er.message,
      ""
    );
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function OrganizationList(admin) {
  try {
    if (admin.hasOwnProperty("sitetype") == false) {
      return helper.getErrorResponse(
        false,
        "Size type missing. Please provide the size type",
        "FETCH ORGANIZATION LIST",
        ""
      );
    }
    var data;
    if (admin.sitetype == 0) {
      data = await db.query(
        `SELECT Organization_id,Email_id,Organization_Name,orgcode from organizations where status = 1 and deleted_flag =0 and Organization_type =2  and Site_type =0`
      );
    } else if (admin.sitetype == 1) {
      data = await db.query(
        `SELECT Organization_id,Email_id,Organization_Name,orgcode from organizations where status = 1 and deleted_flag =0 and Organization_type =2  and Site_type =1`
      );
    }
    const code = true;
    const message = "Available organizations Fetched Successfully";
    return { code, message, data };
  } catch (er) {
    const code = false;
    const message = "Internal error.Please contact Administration.";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function Companylist(admin) {
  try {
    var data;
    if (admin.hasOwnProperty("sitetype") == false) {
      return helper.getErrorResponse(
        false,
        "Site type missing. Please provide the site type",
        "FETCH COMPANY LIST",
        ""
      );
    }
    if (admin.sitetype == 0) {
      if (
        admin.hasOwnProperty("organizationid") == true &&
        admin.organizationid != 0
      ) {
        data = await db.query(
          `SELECT Customer_id,Organization_id,Customer_name,ccode,Email_id from customermaster where site_type = 0 and status = 1 and deleted_flag =0 and Customer_type In(1,2) and Organization_id = ${admin.organizationid};`
        );
      } else {
        data = await db.query(
          `SELECT Customer_id,Organization_id,Customer_name,ccode,Email_id from customermaster where site_type = 0 and status = 1 and deleted_flag =0 and Customer_type = 1 and Organization_id = 0;`
        );
      }
    } else if (admin.sitetype == 1) {
      if (
        admin.hasOwnProperty("organizationid") == true &&
        admin.organizationid != 0
      ) {
        data = await db.query(
          `SELECT Customer_id,Organization_id,Customer_name,ccode,Email_id from customermaster where site_type = 1 and status = 1 and deleted_flag =0 and Customer_type In(1,2) and Organization_id = ${admin.organizationid};`
        );
      } else {
        data = await db.query(
          `SELECT Customer_id,Organization_id,Customer_name,ccode,Email_id from customermaster where site_type = 1 and status = 1 and deleted_flag =0 and Customer_type = 1 and Organization_id = 0;`
        );
      }
    }
    const code = true;
    const message = "Company list Fetched Successfully";
    return { code, message, data };
  } catch (er) {
    const code = false;
    const message = "Internal error. Please try again.";
    const error = er.message;
    return { code, message, error };
  }
}
//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function Individuallist(admin) {
  try {
    var data;
    if (admin.hasOwnProperty("sitetype") == false) {
      return helper.getErrorResponse(
        false,
        "Site type missing. Please provide the site type",
        "FETCH INDIVIDUAL LIST",
        ""
      );
    }
    if (admin.sitetype == 0) {
      data = await db.query(
        `SELECT Customer_id,Customer_name,ccode,Email_id from customermaster where Site_type = 0 and status = 1 and deleted_flag =0 and Customer_type = 3 and Organization_id = 0;`
      );
    } else {
      data = await db.query(
        `SELECT Customer_id,Customer_name,ccode,Email_id from customermaster where Site_type = 1 and status = 1 and deleted_flag =0 and Customer_type = 3 and Organization_id = 0;`
      );
    }
    const code = true;
    const message = "Individual list Fetched Successfully";
    return { code, message, data };
  } catch (er) {
    const code = false;
    const message = "Internal error. Please try again.";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function DemoList(admin) {
  try {
    var data;

    data = await db.query(
      `SELECT Customer_id,Customer_name,ccode,Email_id from customermaster where Site_type = 1 and status = 1 and deleted_flag =0 and Customer_type in(1,2,3);`
    );
    const code = true;
    const message = "Demo list Fetched Successfully";
    return { code, message, data };
  } catch (er) {
    const code = false;
    const message = "Internal error. Please try again";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################

async function Sdklist(admin) {
  try {
    data = await db.query(
      `SELECT Sdk_id,Brand_name from sdkmaster where status =1`
    );
    const code = true;
    const message = "Brand list Fetched Successfully";
    return { code, message, data };
  } catch (er) {
    const code = false;
    const message = "Internal error. Please try again.";
    const error = er.message;
    return { code, message, error };
  }
}

//##############################################################################################################################################################################################################
//##############################################################################################################################################################################################################
async function AddUpdatecompany(admins) {
  let results = [];

  const validateAdmin = (admin) => {
    if (!admin.hasOwnProperty("companyid")) {
      return {
        code: false,
        message: "Company ID is missing. Please provide a valid company ID",
        id: 0,
        name: null,
      };
    }
    if (!admin.hasOwnProperty("companyname")) {
      return {
        code: false,
        message:
          "Company name is missing. Please provide a valid company name.",
        id: admin.companyid,
        name: null,
      };
    }
    if (!admin.hasOwnProperty("sitetype")) {
      return {
        code: false,
        message: "Site type missing. Please provide the site type.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("organizationid")) {
      return {
        code: false,
        message:
          "Organization ID is missing. Please provide a valid organization ID.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("contactperson")) {
      return {
        code: false,
        message:
          "Contact person for the company is missing. Please provide a valid contact person.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("contactpersonno")) {
      return {
        code: false,
        message:
          "Contact person's number for the company is missing. Please provide a valid contact number.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("contactemail")) {
      return {
        code: false,
        message:
          "Contact email for the company is missing. Please provide a valid contact email.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("address")) {
      return {
        code: false,
        message:
          "Address for the company is missing. Please provide a valid address.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("billingaddress")) {
      return {
        code: false,
        message:
          "Billing address for the company is missing. Please provide a valid billing address.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("pannumber")) {
      return {
        code: false,
        message: "Organization company PAN number is missing",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("cinno")) {
      return {
        code: false,
        message: "Organization company CIN number is missing.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!admin.hasOwnProperty("customercode")) {
      return {
        code: false,
        message: "Customer code missing. Please provide the customer code.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (
      admin.contactemail.indexOf(".") === -1 ||
      admin.contactemail.indexOf("@") === -1
    ) {
      return {
        code: false,
        message: "Email is not valid. Please provide a valid email address.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (admin.contactpersonno.length > 15 || admin.contactpersonno.length < 8) {
      return {
        code: false,
        message:
          "Phone number size is invalid. Please provide a valid phone number.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    if (!helper.phonenumber(admin.contactpersonno)) {
      return {
        code: false,
        message:
          "Phone number is not valid. Please provide a valid phone number.",
        id: admin.companyid,
        name: admin.companyname,
      };
    }
    return null;
  };

  try {
    const sites = Array.isArray(admins) ? admins : [admins];
    for (const admin of sites) {
      const validationError = validateAdmin(admin);
      if (validationError) {
        results.push(validationError);
        continue;
      }

      const companyname = admin.companyname;
      const companytype =
        admin.organizationid == 0 || admin.organizationid === "" ? 1 : 2;
      const Fullname =
        admin.companyname.charAt(0).toUpperCase() + admin.companyname.slice(1);

      try {
        const [result] = await db.spcall(
          "CALL SP_COMPANY_ADD(?,?,?,?,?,?,?,?,?,?,?,?,?,?,@cid);select @cid;",
          [
            admin.organizationid,
            admin.companyid,
            companytype,
            Fullname,
            admin.contactperson,
            admin.pannumber,
            admin.cinno,
            admin.customercode,
            admin.contactemail,
            admin.contactpersonno,
            admin.address,
            admin.billingaddress,
            0,
            admin.sitetype,
          ]
        );
        const objectValue1 = result[1][0];
        const mcustID = objectValue1["@cid"];

        if (mcustID == null || mcustID == 0) {
          results.push({
            code: false,
            message: "Error while Adding/Updating company. Please try again",
            id: mcustID,
            name: companyname,
          });
        } else {
          results.push({
            code: true,
            message: "Company has been added/updated successfully.",
            id: mcustID,
            name: admin.companyname,
          });
        }
      } catch (ex) {
        const errorMsg =
          ex.sqlMessage === "Wrong phone number"
            ? "Invalid phone number. Please provide a valid phone number."
            : ex.sqlMessage === "Wrong Email"
            ? "Invalid Email address. Please provide a valid email address."
            : ex.message;
        results.push({
          code: false,
          message: errorMsg,
          error: ex,
          id: 0,
          name: companyname,
        });
      }
    }
    return results;
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration.",
      error: er.message,
      name: null,
    };
  }
}

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function AddOrganization(admin) {
  var organizationname;
  try {
    // Ensure we handle a single organization or multiple organizations
    const organization = Array.isArray(admin) ? admin : [admin];
    const results = []; // To store results of each organization process

    for (const admin of organization) {
      organizationname = admin.organizationname || "";

      // Check if organization name exists
      if (!admin.hasOwnProperty("organizationname")) {
        results.push({
          code: false,
          message: "Organization name is missing. Please provide the name.",
          name: organizationname,
        });
        continue;
      }

      // Check if emailid exists
      if (!admin.hasOwnProperty("emailid")) {
        results.push({
          code: false,
          message: "Organization Email ID is missing. Please provide the Email ID.",
          name: organizationname,
        });
        continue;
      }

      // Check if contact number exists
      if (!admin.hasOwnProperty("contactno")) {
        results.push({
          code: false,
          message: "Organization contact number is missing. Please provide the contact number.",
          name: organizationname,
        });
        continue;
      }

      // Check if address exists
      if (!admin.hasOwnProperty("address")) {
        results.push({
          code: false,
          message: "Organization address is missing. Please provide the address.",
          name: organizationname,
        });
        continue;
      }

      // Check if contact person exists
      if (!admin.hasOwnProperty("contactperson")) {
        results.push({
          code: false,
          message: "Organization contact person is missing. Please provide the contact person.",
          name: organizationname,
        });
        continue;
      }

      // Check if site type exists
      if (!admin.hasOwnProperty("sitetype")) {
        results.push({
          code: false,
          message: "Site type is missing. Please provide the site type.",
          name: organizationname,
        });
        continue;
      }

      const str = admin.organizationname;
      const Fullname = str.charAt(0).toUpperCase() + str.slice(1);

      try {
        // Execute stored procedure to add organization
        const [result] = await db.spcall(
          `CALL SP_ORGANIZATION_ADD(?,?,?,?,?,?,?,?,@organizationid); select @organizationid;`,
          [
            2, // Assuming this is a constant value in your call
            Fullname,
            admin.emailid,
            admin.contactperson,
            admin.contactno,
            admin.address,
            2, // Another constant value
            admin.sitetype,
          ]
        );

        // Extract organization_id from the result
        const objectvalue = result[1][0];
        const organization_id = objectvalue["@organizationid"];

        if (organization_id != null && organization_id != 0) {
          // Organization added successfully
          results.push({
            code: true,
            message: "Organization added successfully",
            id: organization_id,
            name: organizationname,
          });
        } else {
          // Error while adding the organization
          results.push({
            code: false,
            message: "Error while adding the organization. Please try again.",
            name: organizationname,
          });
        }
      } catch (er) {
        // Handle error during stored procedure call
        results.push({
          code: false,
          message: er.message,
          name: organizationname,
        });
      }
    }

    // Return results for all organizations processed
    return results;
  } catch (er) {
    // Handle general errors
    return {
      code: false,
      message: `Internal error. ${er}`,
      name: organizationname,
    };
  }
}

// async function AddOrganization(admin) {
//   var organizationname;
//   try {
//     // const organization = Array.isArray(admin) ? admin : [admin];
//     // const results = [];
//     // for (const admin of organization) {
//     if (admin.hasOwnProperty("organizationname") == false) {
//       return helper.getErrorResponse(
//         false,
//         "Organization name missing. Please provide the organization name.",
//         "ADD ORGANIZATION",
//         ""
//       );
//       // continue;
//     }
//     organizationname = admin.organizationname;
//     if (admin.hasOwnProperty("emailid") == false) {
//       // results.push({
//       //   code: false,
//       //   message:
//       //     "Organization Emailid is missing. Please provide the Emailid.",
//       //   name: organizationname,
//       // });
//       // continue;
//       return helper.getErrorResponse(
//         "ORGANIZATION_EMAILID_MISSING",
//         "Organization Emailid is missing. Please provide the Emailid.",
//         "ADD ORGANIZATION",
//         ""
//       );
//     }
//     if (admin.hasOwnProperty("contactno") == false) {
//       // results.push({
//       //   code: false,
//       //   message:
//       //     "Organization contact number is missing. Please provide the Organization contact number",
//       //   name: organizationname,
//       // });
//       // continue;
//       return helper.getErrorResponse(
//         "ORGANIZATION_CONTACT_NO_MISSING",
//         "Organization contact number is missing. Please provide the Organization contact number",
//         "ADD ORGANIZATION",
//         ""
//       );
//     }
//     if (admin.hasOwnProperty("address") == false) {
//       // results.push({
//       //   code: false,
//       //   message:
//       //     "Organization address number is missing. Please provide the Organizaition address.",
//       //   name: organizationname,
//       // });
//       // continue;
//       return helper.getErrorResponse(
//         "ORGANIZATION_ADDRESS_MISSING",
//         "Organization address number is missing. Please provide the Organizaition address.",
//         "ADD ORGANIZATION",
//         ""
//       );
//     }
//     if (admin.hasOwnProperty("contactperson") == false) {
//       // results.push({
//       //   code: false,
//       //   message:
//       //     "Organization contact person missing. Please provide the contact person name.",
//       //   name: organizationname,
//       // });
//       // continue;
//       return helper.getErrorResponse(
//         "ORGANIZATION_CONTACT_PERSON_MISSING",
//         "Organization contact person missing. Please provide the contact person name.",
//         "ADD ORGANIZATION",
//         ""
//       );
//     }
//     if (admin.hasOwnProperty("sitetype") == false) {
//       // results.push({
//       //   code: false,
//       //   message: "Site type missing. Please provide the site type.",
//       //   name: organizationname,
//       // });
//       // continue;
//       return helper.getErrorResponse(
//         "SITE_TYPE_MISSING",
//         "Site type missing. Please provide the site type.",
//         "ADD ORGANIZATION",
//         ""
//       );
//     }
//     const str = admin.organizationname;
//     const Fullname = str.charAt(0).toUpperCase() + str.slice(1);
//     try {
//       const [result] = await db.spcall(
//         `CALL SP_ORGANIZATION_ADD(?,?,?,?,?,?,?,?,@organizationid); select @organizationid;`,
//         [
//           2,
//           Fullname,
//           admin.emailid,
//           admin.contactperson,
//           admin.contactno,
//           admin.address,
//           2,
//           admin.sitetype,
//         ]
//       );
//       const objectvalue = result[1][0];
//       const organization_id = objectvalue["@organizationid"];
//       if (organization_id != null && organization_id != 0) {
//         return {
//           code: true,
//           message: "Organization added successfully",
//           id: organization_id,
//           name: organizationname,
//         };
//         // continue;
//         return helper.getSuccessResponse(
//           "ORGANIZATION_ADDED_SUCCESSFULLY",
//           "Organization added successfully",
//           organization_id,
//           ""
//         );
//       } else {
//         return {
//           code: false,
//           message: "Error while adding the organization.Please try again",
//           name: organizationname,
//         };
//         // continue;
//         return helper.getErrorResponse(
//           "ERROR_ADDING_ORGANIZATION",
//           "Error while adding the organization.Please try again",
//           "ADD ORGANIZATION",
//           ""
//         );
//       }
//     } catch (er) {
//       return {
//         code: false,
//         message: er.message,
//         name: organizationname,
//       };
//       // continue;
//       return helper.getErrorResponse(
//         "ERROR_ADDING_ORGANIZATION",
//         er,
//         er.message,
//         ""
//       );
//     }
//     // }
//     // return results;
//   } catch (er) {
//     return {
//       code: false,
//       message: `Internal error. ${er}`,
//       name: organizationname,
//     };
//     return helper.getErrorResponse(
//       false,
//       `Internal error. ${er}`,
//       "ADD ORGANIZATION",
//       ""
//     );
//   }
// }

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function cameralist(admin) {
  try {
    var data;
    if (!admin.hasOwnProperty("deviceid")) {
      return helper.getErrorResponse(
        false,
        "Device id missing. Please provide the device id.",
        "FETCH CAMERA LIST",
        ""
      );
    }

    // Fetching site controller path and camera details
    const sql = await db.query(`
      SELECT bm.Sitecontroller_path, cm.camera_id, cm.camera_name, cm.display_name,cm.severity, COALESCE(sc.status, 0) AS status,ac.poly_poly,ac.rect_poly,ac.line_poly,ac.arrow_poly FROM cameramaster cm  LEFT JOIN subscriptioncameras sc ON sc.camera_id = cm.camera_id 
      LEFT JOIN devicemaster dm ON cm.device_id = dm.device_id LEFT JOIN deptmaster dm2 ON dm.dept_id = dm2.dept_id LEFT JOIN branchmaster bm ON dm2.branch_id = bm.branch_id LEFT JOIN analyticcoordinates ac ON ac.camera_id = cm.camera_id WHERE cm.status = 1 AND
       cm.device_id = ${admin.deviceid} GROUP BY CM.CAMERA_ID ORDER BY cm.camera_id;`);

    // Constructing camera details with path
    data = sql.map((row) => {
      const cameraPath = `${row.Sitecontroller_path}\\${admin.deviceid}\\${row.camera_name}\\${row.camera_name}.jpg`;
      return {
        camera_id: row.camera_id,
        camera_name: row.camera_name,
        display_name: row.display_name,
        status: row.status,
        severity: row.severity,
        camera_path: cameraPath,
        poly_poly:row.poly_poly,
        rect_poly:row.rect_poly,
        line_poly:row.line_poly,
        arrow_poly:row.arrow_poly
      };
    });

    const code = true;
    const message = "Camera list Fetched Successfully";
    return { code, message, data };
  } catch (er) {
    const code = false;
    const message = "Internal error. Please try again";
    const error = er.message;
    return { code, message, error };
  }
}

//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function CameraSeverity(admin) {
  if (admin.hasOwnProperty("cameraid") == false) {
    return helper.getErrorResponse(
      false,
      "Camera id missing. Please provide the cameraid",
      "ADD CAMERA SEVERITY LEVEL",
      ""
    );
  }
  if (admin.hasOwnProperty("severity") == false) {
    return helper.getErrorResponse(
      false,
      "Camera severity level missing. Please provide the camera severity",
      "ADD CAMERA SEVERITY LEVEL",
      ""
    );
  }
  try {
    const result = await db.query(
      `UPDATE cameramaster SET severity = ? where camera_id = ?`,
      [admin.severity, admin.cameraid]
    );
    if (result.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Camera Severity added successfully",
        "ADD CAMERA SEVERITY LEVEL",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error adding camera severity leval",
        "ADD CAMERA SEVERITY LEVEL",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration.",
      "ADD CAMERA SEVERITY LEVEL",
      ""
    );
  }
}
//###############################################################################################################################################################################################################
//################################################################################################################################################################################################################
//################################################################################################################################################################################################################

async function CameraActivate(admin) {
  try {
    if (!Array.isArray(admin)) {
      admin = [admin];
    }

    const results = [];

    for (const adminItem of admin) {
      if (!adminItem.hasOwnProperty("cameraid")) {
        return helper.getErrorResponse(
          false,
          "Camera IDs missing. Please provide the camera IDs",
          "ACTIVATE CAMERA",
          ""
        );
      }
      const cameraIds = adminItem.cameraid || [];

      for (const cameraid of cameraIds) {
        const sql = await db.query(
          `SELECT Subscription_id, Customer_id, from_date, to_date FROM subscriptioncustomertrans WHERE Branch_id IN (SELECT branch_id FROM deptmaster WHERE dept_id IN (SELECT place FROM cameramaster WHERE camera_id = ${cameraid})) LIMIT 1;`
        );

        if (sql[0] && sql[0].Subscription_id) {
          const subscriptionid = sql[0].Subscription_id;
          const customer_id = sql[0].Customer_id;
          const from_date = await formatDate(sql[0].from_date);
          const to_date = await formatDate(sql[0].to_date);
          const [sql1] = await db.spcall(
            "CALL SP_SUB_CAMERA(?,?,?,?,?,@result); SELECT @result",
            [subscriptionid, cameraid, 0, from_date, to_date]
          );
          const objectvalue = sql1[1][0];
          const result = objectvalue["@result"];

          if (result != null && result != 0) {
            results.push({
              code: true,
              message: "Camera Activated Successfully",
              cameraid,
              result,
            });
          } else {
            results.push({
              code: false,
              message: "Error activating camera",
              cameraid,
              result,
            });
          }
        } else {
          results.push({
            code: false,
            message:
              "Customer doesn't have any subscription. Please choose any subscription to activate camera.",
            cameraid,
          });
        }
      }
    }

    return results;
  } catch (er) {
    console.log(`Error ${er}`);
    return helper.getErrorResponse(
      false,
      "Internal error. Please try again",
      er.message,
      ""
    );
  }
}

async function formatDate(date) {
  const formattedDate = new Date(date)
    .toISOString()
    .slice(0, 19)
    .replace("T", " "); // Format to yyyy-MM-dd hh:mm:ss
  return formattedDate;
}

//###############################################################################################################################################################################################
//###############################################################################################################################################################################################
//###############################################################################################################################################################################################

async function CameraDeactivate(admin) {
  try {
    if (!Array.isArray(admin)) {
      admin = [admin];
    }
    const results = [];
    for (const adminItem of admin) {
      if (!adminItem.hasOwnProperty("cameraid")) {
        return helper.getErrorResponse(
          false,
          "Camera IDs missing. Please provide the camera IDs",
          "ACTIVATE CAMERA",
          ""
        );
      }
      const cameraIds = adminItem.cameraid || [];

      for (const cameraid of cameraIds) {
        const sql = await db.query(
          `UPDATE subscriptioncameras SET status = 0,deleted_flag = 1 where Camera_ID IN (${cameraid});`
        );

        if (sql.affectedRows) {
          results.push({
            code: true,
            message: "Camera Deactivated Successfully",
            cameraid: cameraid,
          });
        } else {
          results.push({
            code: false,
            message: "Error Deactivating camera",
            cameraid: cameraid,
          });
        }
      }
    }
    return results;
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Error Deactivaing the camera. Please try again.",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function addCustomerSubscription(admin) {
  try {
    if (admin.hasOwnProperty("subscriptionid") == false) {
      return helper.getErrorResponse(
        false,
        "Subscription id missing. Please provide the subscription id.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id is missing. Please provide the Site id.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("Noofdevices") == false) {
      return helper.getErrorResponse(
        false,
        "Number of devices for subscription is missing.Please provide the Number of devices",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("startdate") == false) {
      return helper.getErrorResponse(
        false,
        "Subscription start date missing. Please provide the start date",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("enddate") == false) {
      return helper.getErrorResponse(
        false,
        "Subscription end date missing. Please provide the end date.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("amount") == false) {
      return helper.getErrorResponse(
        false,
        "Subscription amount missing. Please provide the valid amount",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("billingperiod") == false) {
      return helper.getErrorResponse(
        false,
        "Billing period missing. Please provide the billing period.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("noofcamera") == false) {
      return helper.getErrorResponse(
        false,
        "Number of camera missing. Please provide the total number of camera's.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("plantype") == false) {
      return helper.getErrorResponse(
        false,
        "Plan type missing. Please provide the plan type.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("gracetime") == false) {
      return helper.getErrorResponse(
        false,
        "Billing grace time missing. Please provide the billing grace time.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("billmode") == false) {
      return helper.getErrorResponse(
        false,
        "Billing mode missing. Please provide the billing mode.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("billtype") == false) {
      return helper.getErrorResponse(
        false,
        "Billing type missing. Please provide the billing type.",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    if (admin.hasOwnProperty("custom_subscription") == false) {
      return helper.getErrorResponse(
        false,
        "Custom subscription missing. Please provide the customer subscrition"
      );
    }
    if (admin.hasOwnProperty("relationship_id") == false) {
      return helper.getErrorResponse(
        false,
        "Relationship id missing. Please provide the relationship id",
        "ADD CUSTOMER SUBSCRIPTION",
        ""
      );
    }
    var cloudstorage, subscriptionname, noodanalytic;
    try {
      const sql = await db.query(
        `select Cloud_storage,No_of_Devices,No_of_Cameras,Subscription_Name,No_of_Analytics from subscriptionmaster where Subscription_ID = ${admin.subscriptionid}`
      );
      if (sql[0]) {
        cloudstorage = sql[0].Cloud_storage;
        subscriptionname = sql[0].Subscription_Name;
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er.message,
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_CUSTOMER_SUBSCRIPTION(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,@subid); select @subid;`,
        [
          admin.subscriptionid,
          admin.siteid,
          admin.Noofdevices,
          cloudstorage,
          admin.startdate,
          admin.enddate,
          admin.amount,
          admin.noofcamera,
          admin.billingperiod,
          admin.plantype,
          admin.gracetime,
          admin.billmode,
          admin.billtype,
          admin.custom_subscription,
          admin.relationship_id,
        ]
      );
      const objectvalue = result[1][0];
      const customersub_id = objectvalue["@subid"];
      console.log(`Customer sub id ${customersub_id}`);
      if (customersub_id != null && customersub_id != 0) {
        return helper.getSuccessResponse(
          true,
          "The subscription successfully added to the customer.",
          customersub_id
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Error while adding the customer subscription.Please try again",
        er.message,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Error while adding the customer subscription.Please try again",
      er.message,
      ""
    );
  }
}
//#######################################S############################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetSiteSub(admin) {
  try {
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id.",
        "GET THE SUBSCRIPTION FOR SITE ID",
        ""
      );
    }
    const sql =
      await db.query(`SELECT SubCust_id,subscription_id, branch_id, DATE_FORMAT(Date_of_subscription, '%Y-%m-%d %H:%i:%s') AS Date_of_subscription, no_of_devices,
      No_of_Analytics, Cloud_storage, billingperiod,billing_gracetime,billing_plan, DATE_FORMAT(from_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(to_date, '%Y-%m-%d') AS end_date,Bill_mode billmode,Bill_type billtype,Custom_amount custom_subscription,Relationship_id relationshipid,
      Amount FROM subscriptioncustomertrans WHERE status = 1 AND branch_id = ${admin.siteid} limit 1`);
    return {
      code: true,
      message: "Subscription list fetched successfully.",
      sql,
    };
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er.sqlMessage,
      ""
    );
  }
}
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetSubscriptionlist(admin) {
  try {
    if (admin.hasOwnProperty("customertype") == false) {
      return helper.getErrorResponse(
        false,
        "Customer type missing. Please provide the customer type.",
        "FETCH SUBSCRIPTION LIST",
        ""
      );
    }
    if (admin.hasOwnProperty("id") == false) {
      return helper.getErrorResponse(
        false,
        "Customer type id missing.",
        "FETCH SUBSCRIPTION LIST",
        ""
      );
    }
    console.log(JSON.stringify(admin));
    try {
      var data;
      if (admin.customertype == "individual" && admin.id == 0) {
        data = await db.query(
          `select DISTINCT * from subscriptionmaster where status = 1 and deleted_flag = 0 and subscription_type = 1 and customerbased_id =0;`
        );
      } else if (admin.customertype == "company" && admin.id == 0) {
        data = await db.query(
          `select DISTINCT * from subscriptionmaster where status = 1 and deleted_flag = 0 and subscription_type = 1 and customerbased_id =0;`
        );
      } else if (admin.customertype == "organization" && admin.id == 0) {
        data = await db.query(
          `select DISTINCT * from subscriptionmaster where status = 1 and deleted_flag = 0 and subscription_type = 1 and customerbased_id =0;`
        );
      } else if (admin.customertype == "individual" && admin.id != 0) {
        data = await db.query(
          `SELECT DISTINCT * FROM subscriptionmaster WHERE (status = 1 AND deleted_flag = 0 AND subscription_type = 1)OR (customerbased_type = 1 and customerbased_id = ${admin.id} and Subscription_type = 1 and status = 1);`
        );
      } else if (admin.customertype == "company" && admin.id != 0) {
        data = await db.query(
          `SELECT DISTINCT * FROM subscriptionmaster WHERE (status = 1 AND deleted_flag = 0 AND subscription_type = 1)OR (customerbased_type = 2 and customerbased_id = ${admin.id} and Subscription_type = 1 and status = 1);`
        );
      } else if (admin.customertype == "organization" && admin.id != 0) {
        data = await db.query(
          `SELECT DISTINCT * FROM subscriptionmaster WHERE (status = 1 AND deleted_flag = 0 AND subscription_type = 1)OR (customerbased_type = 3 and customerbased_id = ${admin.id} and Subscription_type = 1 and status = 1);`
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Unknown type. Please provide the valid type",
          "FETCH SUBSCRIPTION LIST",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration.",
        er.message,
        ""
      );
    }
    if (data) {
      return helper.getSuccessResponse(
        true,
        "Subscription details fetched successfully",
        data,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error fetching subscription details. Please try again later.",
        "FETCH SUBSCRIPTION LIST",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er.message,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Addcontact(admin) {
  try {
    if (!Array.isArray(admin)) {
      admin = [admin];
    }
    const results = [];
    if (admin.length == 0) {
      results.push({
        code: false,
        message: "Request data not available. Please provide the request data",
      });
    }
    for (const contact of admin) {
      if (contact.hasOwnProperty("contactname") == false) {
        results.push({
          code: false,
          message:
            "Contact person name missing. Please provide the contact person name",
        });
        continue;
      }
      if (contact.hasOwnProperty("contactnumber") == false) {
        results.push({
          code: false,
          message:
            "Branch contact number missing. Please provide the contact number",
        });
        continue;
      }
      if (contact.hasOwnProperty("contactemail") == false) {
        results.push({
          code: false,
          message:
            "Branch Email address missing. Please provide the email address",
        });
        continue;
      }
      if (contact.hasOwnProperty("branchid") == false) {
        results.push({
          code: false,
          message: "Customer branch id missing. Please provide the branch id.",
        });
        continue;
      }

      try {
        const [result] = await db.spcall(
          "CALL SP_EMERGENCY_CONTACT_ADD(?,?,?,?,@emergencyid); select @emergencyid;",
          [
            contact.branchid,
            contact.contactname,
            contact.contactnumber,
            contact.contactemail,
          ]
        );
        const objectvalue = result[1][0];
        const contactid = objectvalue["@emergencyid"];
        console.log(`Contact id of branch ${contactid}`);
        if (contactid != null && contactid != 0) {
          results.push({
            code: true,
            message: "The branch contact details added successfully",
            contactid,
          });
        } else {
          results.push({
            code: false,
            message:
              "Error while adding the customer contacts. Please try again later.",
          });
        }
      } catch (error) {
        results.push({
          code: false,
          message: "Internal error. Please contact Administration",
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      error.message
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Emergencyservice(admin) {
  try {
    // Convert single emergency service to an array if necessary
    if (!Array.isArray(admin)) {
      admin = [admin];
    }
    if (admin.length == 0) {
      results.push({
        code: false,
        message: "Request data not available. Please provide the request data",
      });
    }
    const results = [];
    for (const emergencyService of admin) {
      if (!emergencyService.hasOwnProperty("nearestpolicestation")) {
        results.push({
          code: false,
          message:
            "Nearest police station missing. Please provide the nearest police station name.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("policestationnumber")) {
        results.push({
          code: false,
          message:
            "Police station contact number missing. Please provide the contact number of the nearest police station.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("nearestfirestation")) {
        results.push({
          code: false,
          message: "Nearest fire station address missing.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("firestationnumber")) {
        results.push({
          code: false,
          message: "Nearest fire station contact missing.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("hospitalname")) {
        results.push({
          code: false,
          message:
            "Nearest hospital name missing. Please provide the nearest hospital name.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("hospitalphone")) {
        results.push({
          code: false,
          message:
            "Nearest hospital contact number missing. Please provide the contact number.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("nearestEBoffice")) {
        results.push({
          code: false,
          message:
            "Nearest EB office address missing. Please provide the EB office name.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("EBcontactno")) {
        results.push({
          code: false,
          message:
            "Nearest EB contact number missing. Please provide the EB contact number.",
        });
        continue;
      }
      if (!emergencyService.hasOwnProperty("branchid")) {
        results.push({
          code: false,
          message: "Branch id is missing. Please provide the branch id.",
        });
        continue;
      }

      try {
        const [sql] = await db.spcall(
          "CALL SP_ADD_EMERGENCY_SERVICE(?,?,?,?,?,?,?,?,?,@bemergencyid); select @bemergencyid;",
          [
            emergencyService.branchid,
            emergencyService.nearestpolicestation,
            emergencyService.policestationnumber,
            emergencyService.nearestfirestation,
            emergencyService.firestationnumber,
            emergencyService.hospitalname,
            emergencyService.hospitalphone,
            emergencyService.nearestEBoffice,
            emergencyService.EBcontactno,
          ]
        );
        const objectvalue = sql[1][0];
        const emergencyservice = objectvalue["@bemergencyid"];
        if (emergencyservice != null && emergencyservice !== 0) {
          results.push({
            code: true,
            message: "Emergency service added successfully.",
            emergencyservice,
          });
        } else {
          results.push({
            code: false,
            message: "Error while adding emergency service. Please try again.",
          });
        }
      } catch (error) {
        results.push({
          code: false,
          message: "Internal error. Please contact Administration",
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      error.message
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function SiteGraph(admin) {
  try {
    const [sql1] = await db.spcall(
      "CALL SP_SITE_GRAPH1(@sitecon,@devicestatus);select @sitecon,@devicestatus;"
    );
    //  console.log(sql1[1][0]);
    const objectvalue = sql1[1][0];
    const sitecontroller_run_percentage =
      parseFloat(objectvalue["@sitecon"]).toFixed(2) + "%";
    const device_run_percentage =
      parseFloat(objectvalue["@devicestatus"]).toFixed(2) + "%";
    const code = true;
    const message = "Graph data for Site controller fetched successfully.";
    return {
      code,
      message,
      sitecontroller_run_percentage,
      device_run_percentage,
    };
  } catch (er) {
    const code = false;
    const message = "Internal error. Please contact Administration";
    return { code: code, message: message, error: er };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddIndividual(admin) {
  try {
    if (admin.hasOwnProperty("individualname") == false) {
      return helper.getErrorResponse(
        false,
        "Individual name missing. Please provide the individual name.",
        "ADD INDIVIDUAL",
        ""
      );
    }
    if (admin.hasOwnProperty("emailid") == false) {
      return helper.getErrorResponse(
        false,
        "Individual emailid missing. Please provide the individual email address.",
        "ADD INDIVIDUAL",
        ""
      );
    }
    if (admin.hasOwnProperty("contactno") == false) {
      return helper.getErrorResponse(
        false,
        "Individual contact number missing. Please provide the contact number",
        "ADD INDIVIDUAL",
        ""
      );
    }
    if (admin.hasOwnProperty("address") == false) {
      return helper.getErrorResponse(
        false,
        "Individual address missing. Please provide the individual address.",
        "ADD INDIVIDUAL",
        ""
      );
    }
    if (admin.hasOwnProperty("billingaddress") == false) {
      return helper.getErrorResponse(
        false,
        "Individual billing address missing. Please provde the billing address",
        "ADD INDIVIDUAL"
      );
    }
    if (admin.hasOwnProperty("idtype") == false) {
      return helper.getErrorResponse(
        false,
        "Id type missing. Please provide the Id number missing",
        "ADD INDIVIDUAL",
        ""
      );
    }
    if (admin.hasOwnProperty("idnumber") == false) {
      return helper.getErrorResponse(
        false,
        "Id number missing. Please provide the Id number.",
        "ADD INDIVIDUAL",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_CUST_INDIVIDUAL_ADD(?,?,?,?,?,?,?,@cid); select @cid;`,
        [
          3,
          admin.individualname,
          admin.emailid,
          admin.contactno,
          admin.address,
          admin.billingaddress,
          admin.idnumber,
        ]
      );
      const objectvalue = result[1][0];
      const customerid = objectvalue["@cid"];
      console.log(`add individual customer id -> ${customerid}`);
      if (customerid != null && customerid != 0) {
        return {
          code: true,
          message: "Individual site added successfully.",
          individualid: customerid,
        };
      } else {
        return helper.getErrorResponse(
          false,
          "Error while adding the individual site. Please try again later.",
          "ADD INDIVIDUAL SITE",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration.",
        er.message,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration.",
      er.message,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FetchCustomerlist(admin) {
  try {
    const result = await db.query(
      `select DISTINCT * from customermaster where status= 1 and customer_type != 0`
    );
    const code = true;
    const message = "Customer list fetched successfully";
    return { code, message, result };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//##############################################################################################################################################################################################
//##############################################################################################################################################################################################
//##############################################################################################################################################################################################

async function Sitelist(admin) {
  try {
    var result;
    if (admin.customerid != "" && admin.customerid != 0) {
      result = await db.query(
        `select DISTINCT branch_id, branch_name from branchmaster where status= 1 and deleted_flag = 0 and customer_id = ${admin.customerid}`
      );
    } else {
      result = await db.query(
        `select DISTINCT branch_id,branch_name from branchmaster where status= 1 and deleted_flag = 0`
      );
    }
    const code = true;
    const message = "Site list fetched successfull  y";
    return { code, message, result };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Adminsitration",
      error: er,
    };
  }
}

//#############################################################################################################################################################################################
//##############################################################################################################################################################################################
//##############################################################################################################################################################################################

async function AddRegion(admin) {
  try {
    // console.log(JSON.stringify(admin));
    if (admin.hasOwnProperty("cameraid") == false) {
      return {
        code: false,
        message:
          "Analytic region camera id was missing. Please provide the cameraid.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("channelname") == false) {
      return {
        code: false,
        message:
          "Analytic channel name was missing. Please provide the channelname",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("coordinate") == false) {
      return {
        code: false,
        message: "Analytic Coordinates missing. Please provide the Coordinates",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("resolution") == false) {
      return {
        code: false,
        message: "Analytic Resolution missing. Please provide the Resolution",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("actualresolution") == false) {
      return {
        code: false,
        message:
          "Actaul resolution missing. Please provide the actual resolution.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("rect_poly") == false) {
      return {
        code: false,
        message:
          "Rectangular polygon missing. Please provide the rectangular polygon.",
        module: "ADD ANALTIC REGION",
      };
    }
    if (admin.hasOwnProperty("line_poly") == false) {
      return {
        code: false,
        message: "Line polygon missing. Please provide the line polygon",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("arrow_poly") == false) {
      return {
        code: false,
        message: "Arrow polygon missing. Please provide the arrow polygon",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("poly_poly") == false) {
      return {
        code: false,
        message: "Polygon region missing. Please provide the polygon region.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("rect_colors") == false) {
      return {
        code: false,
        message:
          "Rectangular nonpolygon missing. Please provide the rectangular nonpolygon.",
        module: "ADD ANALTIC REGION",
      };
    }
    if (admin.hasOwnProperty("line_colors") == false) {
      return {
        code: false,
        message: "Line nonpolygon missing. Please provide the line nonpolygon",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("arrow_colors") == false) {
      return {
        code: false,
        message:
          "Arrow nonpolygon missing. Please provide the arrow nonpolygon",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("poly_colors") == false) {
      return {
        code: false,
        message:
          "Poly colors region missing. Please provide the nonpolygon region.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("poly_check_ROI") == false) {
      return {
        code: false,
        message:
          "poly check ROI region missing. Please provide the poly check ROI.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("rectangle_check_ROI") == false) {
      return {
        code: false,
        message:
          "rectangle check ROI region missing. Please provide the rectangle check ROI.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("line_check_ROI") == false) {
      return {
        code: false,
        message:
          "line check ROI region missing. Please provide the line check ROI.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("arrow_check_ROI") == false) {
      return {
        code: false,
        message:
          "arrow check ROI region missing. Please provide the arrow check ROI.",
        module: "ADD ANALYTIC REGION",
      };
    }
    if (admin.hasOwnProperty("objectnames") == false) {
      return {
        code: false,
        message: "Object names missing. Please provide the Object names.",
        module: "ADD ANALYTIC REGION",
      };
    }

    try {
      // Step 1: Call the stored procedure without selecting @coorid
      await db.spcall(
        `CALL SP_ANALYTIC_ADD(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,@coorid);`,
        [
          admin.channelname,
          admin.cameraid,
          admin.coordinate,
          admin.resolution,
          admin.actualresolution,
          JSON.stringify(admin.rect_poly),
          JSON.stringify(admin.line_poly),
          JSON.stringify(admin.arrow_poly),
          JSON.stringify(admin.poly_poly),
          JSON.stringify(admin.rect_colors),
          JSON.stringify(admin.line_colors),
          JSON.stringify(admin.arrow_colors),
          JSON.stringify(admin.poly_colors),
          JSON.stringify(admin.poly_check_ROI),
          JSON.stringify(admin.rectangle_check_ROI),
          JSON.stringify(admin.line_check_ROI),
          JSON.stringify(admin.arrow_check_ROI),
          JSON.stringify(admin.objectnames),
        ]
      );
    
      // Step 2: Retrieve the OUT parameter @coorid
      const [result] = await db.spcall('SELECT @coorid;');
      const coordinateid = result[0]['@coorid'];
    
      // Step 3: Check and handle the coordinate ID
      if (coordinateid != null && coordinateid != 0) {
        return {
          code: true,
          message: 'Analytic coordinates added successfully.',
          coordinateid: coordinateid,
        };
      } else {
        return {
          code: false,
          message: 'Error while adding analytic coordinates.',
          module: 'ADD ANALYTIC REGION',
        };
      }
    } catch (error) {
      // console.error('Error executing SP_ANALYTIC_ADD:', error);
      return {
        code: false,
        message: 'An error occurred while processing the request.',
        error: error.message,
      };
    }
   } catch (er) {
    // console.log(JSON.stringify(er));
    return {
      code: false,
      message: "Internal error. Please contact Administration.",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetNotificationServer(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("notificationid") == true) {
      sql =
        await db.query(`SELECT DISTINCT notification_id notificationid, notificationmachine_name notificationmachinename,notification_type notificationtype,notificationmachine_ip notificationmachineip, notificationmachine_port notificationport, notification_path notificationpath,
    server_status running_status,status FROM notificationmaster WHERE deleted_flag = 0 and notificationid = ${admin.notificationid};`);
    } else {
      sql =
        await db.query(`SELECT DISTINCT notification_id notificationid, notificationmachine_name notificationmachinename,notification_type notificationtype,notificationmachine_ip notificationmachineip, notificationmachine_port notificationport, notification_path notificationpath,
   server_status running_status,status FROM notificationmaster WHERE deleted_flag = 0;`);
    }
    const code = true;
    const message = "Notification server path fetched successfully.";
    return { code, message, sql };
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er.message,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function addnotificationserver(admin) {
  try {
    if (admin.hasOwnProperty("notificationmachinename") == false) {
      return helper.getErrorResponse(
        false,
        "Notification machine name missing. Please provide the name.",
        "ADD NOTIICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("notificationmachineip") == false) {
      return helper.getErrorResponse(
        false,
        "Notification machine IP address missing. Please provide the IP address.",
        "ADD NOTIICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("notificationport") == false) {
      return helper.getErrorResponse(
        false,
        "Notification port missing. Please provide the notification port.",
        "ADD NOTIFICATION SERVER ",
        ""
      );
    }
    if (admin.hasOwnProperty("notificationpath") == false) {
      return helper.getErrorResponse(
        false,
        "Notification path missing. Please provide the notification path.",
        "ADD NOTIFICATION PATH",
        ""
      );
    }
    if (admin.hasOwnProperty("notificationtype") == false) {
      return helper.getErrorResponse(
        false,
        "Notification type missing. Please provide the notification type.",
        "ADD NOTIFICATION PATH",
        ""
      );
    }

    try {
      const [result] = await db.spcall(
        `CALL SP_INSERT_NOTIFICATION(?,?,?,?,?,@notifyid); SELECT @notifyid;`,
        [
          admin.notificationmachinename,
          admin.notificationtype,
          admin.notificationmachineip,
          admin.notificationport,
          admin.notificationpath,
        ]
      );
      const objectvalue = result[1][0];
      const notificationid = objectvalue["@notifyid"];
      if (notificationid != null && notificationid != 0) {
        return helper.getSuccessResponse(
          true,
          "Notification server added successfully.",
          notificationid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error while adding the notification server. Please try again later.",
          "ADD NOTIFICATION SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateNotificationserver(admin) {
  // console.log(JSON.stringify(admin));
  if (admin.hasOwnProperty("notificationmachinename") == false) {
    return helper.getErrorResponse(
      false,
      "Notification machine name missing. Please provide the name.",
      "UPDATE NOTIICATION SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("notificationmachineip") == false) {
    return helper.getErrorResponse(
      false,
      "Notification machine IP address missing. Please provide the IP address.",
      "UPDATE NOTIICATION SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("notificationport") == false) {
    return helper.getErrorResponse(
      false,
      "Notification port missing. Please provide the notification port.",
      "UPDATE NOTIFICATION SERVER ",
      ""
    );
  }
  if (admin.hasOwnProperty("notificationpath") == false) {
    return helper.getErrorResponse(
      false,
      "Notification path missing. Please provide the notification path.",
      "UPDATE NOTIFICATION PATH",
      ""
    );
  }
  if (admin.hasOwnProperty("notificationtype") == false) {
    return helper.getErrorResponse(
      false,
      "Notification type missing. Please provide the notification type.",
      "UPDATE NOTIFICATION PATH",
      ""
    );
  }
  if (admin.hasOwnProperty("notificationid") == false) {
    return helper.getErrorResponse(
      false,
      "Notification id missing. Please provide the notification id.",
      "UPDATE NOTIFICATION SERVER",
      ""
    );
  }
  try {
    const [sql] = await db.spcall(
      `CALL SP_UPDATE_NOTIFICATION(?,?,?,?,?,?,@notifyid); select @notifyid`,
      [
        admin.notificationmachinename,
        admin.notificationtype,
        admin.notificationmachineip,
        admin.notificationport,
        admin.notificationpath,
        admin.notificationid,
      ]
    );
    const objectvalue = sql[1][0];
    const notifyid = objectvalue["@notifyid"];
    if (notifyid != null && notifyid != "") {
      return helper.getSuccessResponse(
        true,
        "Notification server updated successfully",
        notifyid,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error while fetching fetching the notification path",
        "UPDATE NOTIFICATION SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration.",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function getDeviceDetails(admin) {
  try {
    if (admin.hasOwnProperty("deviceid") == false) {
      return helper.getErrorResponse(
        fasle,
        "Device id missing. Please provide the device id.",
        "FETCH DEVICE DETAILS",
        ""
      );
    }
    const sql = await db.query(
      `SELECT SerialNo ,Dept_ID,Device_name,SDK_ID, Product_name,secondary_ip,	IP_Domain,IP_Port,IP_Uname,IP_Pwd,No_AnalogCH,No_IpCH,	MotionDetection,httpport,RTSP_Port,Model_no,Harddisk,harddiskcap,	harddiskfreespace,software_version from devicemaster where device_id in(${admin.deviceid});`
    );
    return { code: true, message: "Device details fetched successfully.", sql };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration.",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddAIMachine(admin) {
  try {
    if (admin.hasOwnProperty("aimachinename") == false) {
      return helper.getErrorResponse(
        false,
        "AI machine name missing. Please provide the AI machine name",
        "ADD AI SERVER MACHINE",
        ""
      );
    }
    if (admin.hasOwnProperty("AImachineip") == false) {
      return helper.getErrorResponse(
        false,
        "AI machine ip address missing. Please provide the IP address.",
        "ADD AI SERVER MACHINE",
        ""
      );
    }
    if (admin.hasOwnProperty("aiinputpath") == false) {
      return helper.getErrorResponse(
        false,
        "AI machine input file path missing. Please provide the input file path.",
        "ADD AI SERVER MACHINE",
        ""
      );
    }
    if (admin.hasOwnProperty("aioutputpath") == false) {
      return helper.getErrorResponse(
        false,
        "AI machine output path missing. Please provide the output path.",
        "ADD AI SERVER MACHINE",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("aimachinepath") == false) {
      return helper.getErrorResponse(
        false,
        "AI machine path missing. Please provide the AI machine path.",
        "ADD AI SERVER MACHINE",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_ADD_AI_SERVER(?,?,?,?,?,@aiid); select @aiid;`,
        [
          admin.aimachinename,
          admin.AImachineip,
          admin.aiinputpath,
          admin.aioutputpath,
          admin.aimachinepath,
        ]
      );
      const objectvalue = result[1][0];
      const aiid = objectvalue["@aiid"];
      console.log(`event ai id -> ${aiid}`);
      if (aiid != null && aiid != 0) {
        return helper.getSuccessResponse(
          true,
          "AI server added successfully",
          aiid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error adding the ai server. Please provide the ai server.",
          "ADD AI SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Admnistration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetAImachine(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("aimachineid") == true) {
      sql =
        await db.query(`select DISTINCT Machine_id aimachineid,Machine_name aimachinename,MachineIP AImachineip,imagepath aiinputpath,Bat_filepath batfilepath,Stop_batpath batstoppath,Restart_batpath restartbat ,notificationfilepath aioutputpath,aimachine_path aimachinepath,Process_id processid,error_log,error_time,status,
      runningstatus running_status from aisysmaster where Machine_id = ${admin.aimachineid} and deleted_flag = 0 ORDER BY Machine_id;`);
    } else {
      sql =
        await db.query(`select DISTINCT Machine_id aimachineid,Machine_name aimachinename,MachineIP AImachineip,imagepath aiinputpath,Bat_filepath batfilepath,Stop_batpath batstoppath,Restart_batpath restartbat ,notificationfilepath aioutputpath,aimachine_path aimachinepath,Process_id processid,error_log,error_time,status,
      runningstatus running_status from aisysmaster where  deleted_flag = 0 ORDER BY Machine_id;`);
    }
    return {
      code: true,
      message: "Available AI machine fetched successfully.",
      sql,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateAImachine(admin) {
  try {
    // console.log(JSON.stringify(admin));
    if (!admin.aimachinename) {
      return helper.getErrorResponse(
        false,
        "AI machine name missing. Please provide the AI machine name",
        "UPDATE AI SERVER MACHINE",
        ""
      );
    }
    if (!admin.AImachineip) {
      return helper.getErrorResponse(
        false,
        "AI machine ip address missing. Please provide the IP address.",
        "UPDATE AI SERVER MACHINE",
        ""
      );
    }
    if (!admin.aiinputpath) {
      return helper.getErrorResponse(
        false,
        "AI machine input file path missing. Please provide the input file path.",
        "UPDATE AI SERVER MACHINE",
        ""
      );
    }
    if (!admin.aioutputpath) {
      return helper.getErrorResponse(
        false,
        "AI machine output path missing. Please provide the output path.",
        "UPDATE AI SERVER MACHINE",
        ""
      );
    }
    if (!admin.aimachinepath) {
      return helper.getErrorResponse(
        false,
        "AI machine path missing. Please provide the AI machine path.",
        "UPDATE AI SERVER MACHINE",
        ""
      );
    }
    if (!admin.aimachineid) {
      return helper.getErrorResponse(
        false,
        "AI machine id missing. Please provide the AI machine id.",
        "UPDATE AI SERVER MACHINE",
        ""
      );
    }

    try {
      const query = `
        UPDATE aisysmaster 
        SET Machine_name = ?, 
            MachineIP = ?, 
            imagepath = ?, 
            notificationfilepath = ?, 
            aimachine_path = ? 
        WHERE Machine_id = ?;
      `;

      const values = [
        admin.aimachinename,
        admin.AImachineip,
        admin.aiinputpath,
        admin.aioutputpath,
        admin.aimachinepath,
        admin.aimachineid,
      ];

      const result = await db.query(query, values);

      if (result.affectedRows) {
        return helper.getSuccessResponse(
          true,
          "AI server added successfully",
          admin.aimachineid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error adding the AI server. Please provide the AI server.",
          "UPDATE AI SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddStorageServer(admin) {
  try {
    if (admin.hasOwnProperty("servername") == false) {
      return helper.getErrorResponse(
        false,
        "Storage server name missing. Please provide the servername.",
        "ADD STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("servertype") == false) {
      return helper.getErrorResponse(
        false,
        "Server type missing. Please provide the server type.",
        "ADD SERVER TYPE",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip missing. Please provide the server ip.",
        "ADD STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverpath") == false) {
      return helper.getErrorResponse(
        false,
        "Server path missing. Please provide the server path.",
        "ADD STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverusername") == false) {
      return helper.getErrorResponse(
        false,
        "Server username missing. Please provide the server username",
        "ADD SERVER TYPE",
        ""
      );
    }
    // if (admin.hasOwnProperty("availablestorage") == false) {
    //   return helper.getErrorResponse(
    //     false,
    //     "Available storage space missing. Please provide the storage path",
    //     "ADD APPLICATION SERVER",
    //     ""
    //   );
    // }
    if (admin.hasOwnProperty("serverpassword") == false) {
      return helper.getErrorResponse(
        false,
        "Server password missing. Please provide the server password.",
        "ADD STORAGE PATH",
        ""
      );
    }
    if (admin.hasOwnProperty("serverstoragetype") == false) {
      return helper.getErrorResponse(
        false,
        "Server storage path missing. Please provide the storage path",
        "ADD STORAGE SERVER",
        ""
      );
    }
    var stype;
    if (admin.serverstoragetype == "1" || admin.serverstoragetype == 1) {
      stype = 1;
    } else if (admin.serverstoragetype == "2" || admin.serverstoragetype == 2) {
      stype = 2;
    } else if (admin.serverstoragetype == "Site controller") {
      stype = 3;
    } else {
      return helper.getErrorResponse(
        false,
        "Please provide the valid storage type.",
        "ADD STORAGE SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_STORAGE_SERVER_ADD(?,?,?,?,?,?,?,@strgeid); select @strgeid;`,
        [
          admin.servername,
          admin.servertype,
          admin.serverip,
          admin.serverpath,
          admin.serverusername,
          admin.serverpassword,
          stype,
        ]
      );
      const objectvalue = result[1][0];
      const storageid = objectvalue["@strgeid"];
      if (storageid != null && storageid != 0) {
        return helper.getSuccessResponse(
          true,
          "Storage server added successfully.",
          storageid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error while adding the storage server. Please try again.",
          "ADD STORAGE SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Fetchstoragepath(admin) {
  try {
    // console.log(JSON.stringify(admin));
    var sql;
    if (admin.hasOwnProperty("storagepath_id") == true) {
      sql = await db.query(
        `select DISTINCT storageservername servername,storagepath_id,server_type servertype,server_ip serverip,Available_storage availablestorage,serverpath,server_username serverusername,server_password serverpassword,Storage_type serverstoragetype, running_status,status from storagepathmaster where storage_type in(1,2) and storagepath_id in(${admin.storagepath_id}) and deleted_flag = 0;`
      );
    } else {
      sql = await db.query(
        `select DISTINCT storageservername servername,storagepath_id,server_type servertype,server_ip serverip,Available_storage availablestorage,serverpath,server_username serverusername,server_password serverpassword,Storage_type serverstoragetype, running_status,status from storagepathmaster where storage_type in(1,2) and deleted_flag = 0;`
      );
    }
    return { code: true, message: "storage path fetched successfully", sql };
  } catch (er) {
    console.log(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddDatabaseserver(admin) {
  try {
    if (admin.hasOwnProperty("dbservername") == false) {
      return helper.getErrorResponse(
        false,
        "Database server name missing. Please provide the Database server name",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("dbtype") == false) {
      return helper.getErrorResponse(
        false,
        "Database type missing. Please provide the database type.",
        "ADD DATABASE SERVER.",
        ""
      );
    }
    if (admin.hasOwnProperty("dbhost") == false) {
      return helper.getErrorResponse(
        false,
        "Database ip address missing. Please provide the ip address.",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("dbport") == false) {
      return helper.getErrorResponse(
        false,
        "Database port missing. Please provide the database port.",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("dbname") == false) {
      return helper.getErrorResponse(
        false,
        "Database name missing. Please provide the database name",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("dbusername") == false) {
      return helper.getErrorResponse(
        false,
        "Database username missing. Please provide the database name",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("dbpassword") == false) {
      return helper.getErrorResponse(
        false,
        "Database password missing. Please provide the database password",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("backupschedule") == false) {
      return helper.getErrorResponse(
        false,
        "Database backup schedule misisng",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("backuptime") == false) {
      return helper.getErrorResponse(
        false,
        "Database backup time missing. Please provide the backup time",
        "ADD DATABASE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("backupstoragepath") == false) {
      return helper.getErrorResponse(
        false,
        "Database storage backup storage path missing",
        "ADD DATABASE SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_DATABASE_ADD(?,?,?,?,?,?,?,?,?,?,@databaseid); select @databaseid;`,
        [
          admin.dbservername,
          admin.dbtype,
          admin.dbhost,
          admin.dbport,
          admin.dbname,
          admin.dbusername,
          admin.dbpassword,
          admin.backupschedule,
          admin.backuptime,
          admin.backupstoragepath,
        ]
      );
      const objectvalue = result[1][0];
      const databaseid = objectvalue["@databaseid"];
      console.log(`database id -. ${databaseid}`);
      if (databaseid != null && databaseid != 0) {
        return helper.getSuccessResponse(
          true,
          "Database server added successfully.",
          databaseid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error while adding the database server. Please try again.",
          "ADD DATABASE SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FetchDatabaseServer(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("databaseid") == true) {
      sql = await db.query(
        `select database_id databaseid,databaseservername dbservername,database_host dbhost,database_port dbport,database_name dbname,database_type dbtype,username dbusername,password dbpassword,backup_schedule backupschedule,backup_time backuptime, backupstorage_path backupstoragepath,runningstatus running_status,status from databasemaster where database_id in(${admin.databaseid}) and deleted_flag = 0`
      );
    } else {
      sql = await db.query(
        `select database_id databaseid,databaseservername dbservername,database_host dbhost,database_port dbport,database_name dbname,database_type dbtype,username dbusername,password dbpassword,backup_schedule backupschedule,backup_time backuptime, backupstorage_path backupstoragepath,runningstatus running_status,status from databasemaster where deleted_flag = 0`
      );
    }
    return {
      code: true,
      message: "Database server list fetched successfully.",
      sql,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddApplicationserver(admin) {
  try {
    if (admin.hasOwnProperty("applicaitonservername") == false) {
      return helper.getErrorResponse(
        false,
        "Application server name missing. Please provide the servername.",
        "ADD APPLICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("applicationservertype") == false) {
      return helper.getErrorResponse(
        false,
        "StorApplicationage server type missing. Please provide the storage server",
        "ADD APPLICATION SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("serverpath") == false) {
      return helper.getErrorResponse(
        false,
        "Application folder path missing. Please provide the storage path",
        "ADD APPLICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("username") == false) {
      return helper.getErrorResponse(
        false,
        "Server username missing. Please provide the server username",
        "ADD APPLICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("password") == false) {
      return helper.getErrorResponse(
        false,
        "Server password missing. Please provide the server password",
        "ADD APPLICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Application Server ip missing. Please provide the server ip.",
        "ADD APPLICATION SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_APPLICATION_SERVER_ADD(?,?,?,?,?,?,@appid); select @appid;`,
        [
          admin.applicaitonservername,
          admin.applicationservertype,
          admin.serverip,
          admin.serverpath,
          admin.username,
          admin.password,
        ]
      );
      const objectvalue = result[1][0];
      const applicationid = objectvalue["@appid"];
      if (applicationid != null && applicationid != 0) {
        return helper.getSuccessResponse(
          true,
          "Application server added successfully.",
          applicationid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error while adding the application server. Please try again.",
          "ADD APPLICATION SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FetchApplicationserver(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("applicationid") == true) {
      sql =
        await db.query(`select applicationserver_id applicationid,applicationserver_name applicaitonservername,servertype applicationservertype,serverip, serverpath,username,password,runningstatus,status from applicationservermaster where 
 applicationserver_id  in(${admin.applicationid}) and deleted_flag =0`);
    }
    sql =
      await db.query(`select applicationserver_id applicationid,applicationserver_name applicaitonservername,servertype applicationservertype,serverip, serverpath,username,password,runningstatus,status from applicationservermaster where 
     deleted_flag =0`);
    return {
      code: true,
      message: "Application server fetched successfully.",
      sql,
    };
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Updatestorageserver(admin) {
  try {
    if (admin.hasOwnProperty("servername") == false) {
      return helper.getErrorResponse(
        false,
        "Storage server name missing. Please provide the servername.",
        "UPDATE SERVER NAME",
        ""
      );
    }
    if (admin.hasOwnProperty("servertype") == false) {
      return helper.getErrorResponse(
        false,
        "Server type missing. Please provide the server type.",
        "UPDATE STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip address missing. Please provide the server ip",
        "UPDATE STORAGE SERVER.",
        ""
      );
    }
    if (admin.hasOwnProperty("serverpath") == false) {
      return helper.getErrorResponse(
        false,
        "Server path missing. Please provide the server path.",
        "UPDATE STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverusername") == false) {
      return helper.getErrorResponse(
        false,
        "Storage server username missing. Please provide the storage server username.",
        "UPDATE STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverpassword") == false) {
      return helper.getErrorResponse(
        false,
        "Storage server password missing. Please provide the storage server password.",
        "UPDATE STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("storageserverid") == false) {
      return helper.getErrorResponse(
        false,
        "Storage server id missing. Please provide the storage server id",
        "UPDATE STORAGE SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverstoragetype") == false) {
      return helper.getErrorResponse(
        false,
        "Server storage path missing. Please provide the storage path",
        "UPDATE STORAGE SERVER",
        ""
      );
    }
    var stype;
    if (admin.serverstoragetype == "1" || admin.serverstoragetype == 1) {
      stype = 1;
    } else if (admin.serverstoragetype == "2" || admin.serverstoragetype == 2) {
      stype = 2;
    } else if (admin.serverstoragetype == "Site controller") {
      stype = 3;
    } else {
      return helper.getErrorResponse(
        false,
        "Please provide the valid storage type.",
        "ADD STORAGE SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_STORAGE_SERVER_MODIFY(?,?,?,?,?,?,?,?);`,
        [
          admin.storageserverid,
          admin.servername,
          admin.servertype,
          admin.serverip,
          admin.serverpath,
          admin.serverusername,
          admin.serverpassword,
          admin.serverstoragetype,
        ]
      );
      console.log(`stored procedure ${JSON.stringify(result.affectedRows)}`);
      if (result.affectedRows) {
        const affectedRows = result.affectedRows;
        return helper.getSuccessResponse(
          true,
          "Storage server updated successfully.",
          affectedRows,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error updating the storage server. Please try again",
          "UPDATE STORAGE PATH",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Administration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration.",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

// async function UpdateApplicationserver(admin){
//   try {
//     // Check for required properties
//     if (!admin.hasOwnProperty('applicaitonservername')) {
//         return helper.getErrorResponse(false, "Application server name missing. Please provide the servername.", "UPDATE APPLICATION SERVER", "");
//     }
//     if (!admin.hasOwnProperty('applicationservertype')) {
//         return helper.getErrorResponse(false, "Application server type missing. Please provide the server type.", "UPDATE APPLICATION SERVER", "");
//     }
//     if (!admin.hasOwnProperty('serverpath')) {
//         return helper.getErrorResponse(false, "Application folder path missing. Please provide the storage path.", "UPDATE APPLICATION SERVER", "");
//     }
//     if (!admin.hasOwnProperty('username')) {
//         return helper.getErrorResponse(false, "Server username missing. Please provide the server username.", "UPDATE APPLICATION SERVER", "");
//     }
//     if (!admin.hasOwnProperty('password')) {
//         return helper.getErrorResponse(false, "Server password missing. Please provide the server password.", "UPDATE APPLICATION SERVER", "");
//     }
//     if (!admin.hasOwnProperty('serverip')) {
//         return helper.getErrorResponse(false, "Application Server IP missing. Please provide the server IP.", "UPDATE APPLICATION SERVER", "");
//     }
//     if (!admin.hasOwnProperty('applicationid')) {
//         return helper.getErrorResponse(false, "Application ID missing. Please provide the application ID.", "UPDATE APPLICATION SERVER", "");
//     }

//     try {
//         const result = await db.query(`UPDATE applicationservermaster SET applicaitonserver_name = '${admin.applicaitonservername}', servertype = '${admin.applicationservertype}', serverip = '${admin.serverip}', serverpath = '${admin.serverpath}', username = '${admin.username}', password = '${admin.password}' WHERE applicationserver_id = '${admin.applicationid}';`);

//         if (result.affectedRows) {
//             const affectedRows = result.affectedRows;
//             return helper.getSuccessResponse(true, "Application server updated successfully.", affectedRows, "");
//         } else {
//             return helper.getErrorResponse(false, "Error updating the application server. Please try again.", "UPDATE APPLICATION SERVER", "");
//         }
//     } catch (er) {
//         return helper.getErrorResponse(false,'Internal error. Please contact Addminstration', er, "");
//     }
// } catch (er) {
//     return helper.getErrorResponse(false,'Internal error. Please contact Addminstration', er, "");
// }
//  }
async function UpdateApplicationserver(admin) {
  try {
    // Check for required properties
    if (!admin.hasOwnProperty("applicaitonservername")) {
      return helper.getErrorResponse(
        false,
        "Application server name missing. Please provide the server name.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("applicationservertype")) {
      return helper.getErrorResponse(
        false,
        "Application server type missing. Please provide the server type.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("serverpath")) {
      return helper.getErrorResponse(
        false,
        "Application folder path missing. Please provide the storage path.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("username")) {
      return helper.getErrorResponse(
        false,
        "Server username missing. Please provide the server username.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("password")) {
      return helper.getErrorResponse(
        false,
        "Server password missing. Please provide the server password.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("serverip")) {
      return helper.getErrorResponse(
        false,
        "Application Server IP missing. Please provide the server IP.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("applicationid")) {
      return helper.getErrorResponse(
        false,
        "Application ID missing. Please provide the application ID.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }

    const query = `
      UPDATE applicationservermaster 
      SET applicaitonserver_name = ?, 
          servertype = ?, 
          serverip = ?, 
          serverpath = ?, 
          username = ?, 
          password = ? 
      WHERE applicationserver_id = ?;
    `;

    const values = [
      admin.applicaitonservername,
      admin.applicationservertype,
      admin.serverip,
      admin.serverpath,
      admin.username,
      admin.password,
      admin.applicationid,
    ];

    const result = await db.query(query, values);

    if (result.affectedRows) {
      const affectedRows = result.affectedRows;
      return helper.getSuccessResponse(
        true,
        "Application server updated successfully.",
        affectedRows,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error updating the application server. Please try again.",
        "UPDATE APPLICATION SERVER",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateDatabaseserver(admin) {
  try {
    if (!admin.dbservername) {
      return helper.getErrorResponse(
        false,
        "Database server name missing. Please provide the database server name",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.dbhost) {
      return helper.getErrorResponse(
        false,
        "Database host missing. Please provide the database host",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.dbport) {
      return helper.getErrorResponse(
        false,
        "Database port missing. Please provide the database port",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.dbname) {
      return helper.getErrorResponse(
        false,
        "Database name missing. Please provide the database name.",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.dbusername) {
      return helper.getErrorResponse(
        false,
        "Database username missing. Please provide the username",
        "UPDATE DATABASE SERVER"
      );
    }
    if (!admin.dbpassword) {
      return helper.getErrorResponse(
        false,
        "Database password missing. Please provide the Database password",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.dbtype) {
      return helper.getErrorResponse(
        false,
        "Database type missing. Please provide the database type",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.backupschedule) {
      return helper.getErrorResponse(
        false,
        "Database backup schedule missing. Please provide the backup schedule",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.backuptime) {
      return helper.getErrorResponse(
        false,
        "Database backup time missing. Please provide the backup time.",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.backupstoragepath) {
      return helper.getErrorResponse(
        false,
        "Database backup storage path missing. Please provide the database backup path.",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
    if (!admin.databaseid) {
      return helper.getErrorResponse(
        false,
        "Database id missing. Please provide the database id",
        "UPDATE DATABASE SERVER",
        ""
      );
    }

    const query = `
      UPDATE databasemaster 
      SET databaseservername = ?, 
          database_host = ?, 
          database_port = ?, 
          database_name = ?, 
          username = ?, 
          password = ?, 
          database_type = ?, 
          backup_schedule = ?, 
          backup_time = ?, 
          backupstorage_path = ? 
      WHERE database_id = ?;
    `;

    const values = [
      admin.dbservername,
      admin.dbhost,
      admin.dbport,
      admin.dbname,
      admin.dbusername,
      admin.dbpassword,
      admin.dbtype,
      admin.backupschedule,
      admin.backuptime,
      admin.backupstoragepath,
      admin.databaseid,
    ];

    const result = await db.query(query, values);
    // console.log(`sql -> ${JSON.stringify(result)}`);

    if (result.affectedRows >= 1) {
      const updated = result.affectedRows;
      return helper.getSuccessResponse(
        true,
        "Database server updated successfully.",
        updated,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error updating database server. Please try again later.",
        "UPDATE DATABASE SERVER",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//ADD THE WEB SERVER TO THE DATABASE
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Addwebserver(admin) {
  try {
    if (admin.hasOwnProperty("webservername") == false) {
      return helper.getErrorResponse(
        false,
        "Web servername missing. Please provide the web server name.",
        "ADD WEB SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("servertype") == false) {
      return helper.getErrorResponse(
        false,
        "Server type missing. Please provide the server type.",
        "ADD WEB SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip missing. Please provide the server ip.",
        "ADD WEB SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("httpport") == false) {
      return helper.getErrorResponse(
        false,
        "Http port missing. Please provide the http.",
        "ADD WEB SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("networkusername") == false) {
      return helper.getErrorResponse(
        false,
        "Network username missing. Please provide the network username.",
        "ADD WEB SERVER.",
        ""
      );
    }
    if (admin.hasOwnProperty("networkpassword") == false) {
      return helper.getErrorResponse(
        false,
        "Network password missing. Please provide the network password",
        "ADD WEB SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_WEB_SERVER_ADD(?,?,?,?,?,?,@webid); select @webid;`,
        [
          admin.webservername,
          admin.servertype,
          admin.serverip,
          admin.httpport,
          admin.networkusername,
          admin.networkpassword,
        ]
      );
      const objectvalue = result[1][0];
      const webid = objectvalue["@webid"];
      console.log(`web server id -> ${webid}`);
      if (webid != "" && webid != 0) {
        return helper.getSuccessResponse(
          true,
          "Web server added successfully.",
          webid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error while adding the web server.",
          "ADD WEB SERVER",
          ""
        );
      }
    } catch (er) {
      return helper.getErrorResponse(
        false,
        "Internal error. Please contact Addminstration",
        er,
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Addminstration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Fetchwebserver(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("webserverid") == true) {
      sql =
        await db.query(`select webserver_id webserverid,webserver_name webservername,server_type servertype,server_ip serverip ,httpport,network_username networkusername,network_password networkpassword,
       runningstatus running_status,status from webservermaster and webserver_id IN(${admin.webserverid}) and deleted_flag =0;`);
    } else {
      sql =
        await db.query(`select webserver_id webserverid,webserver_name webservername,server_type servertype,server_ip serverip ,httpport,network_username networkusername,network_password networkpassword, 
     runningstatus running_status,status from webservermaster where deleted_flag =0;`);
    }
    return { code: true, message: "Web server fetched successfully.", sql };
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Addminstration",
      er,
      ""
    );
  }
}

//UPDATE THE WEB SERVER TO THE DATABASE
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Updatewebserver(admin) {
  try {
    if (!admin.hasOwnProperty("webservername")) {
      return helper.getErrorResponse(
        false,
        "Web server name missing. Please provide the web server name.",
        "UPDATE WEB SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("servertype")) {
      return helper.getErrorResponse(
        false,
        "Server type missing. Please provide the server type.",
        "UPDATE WEB SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("serverip")) {
      return helper.getErrorResponse(
        false,
        "Server IP missing. Please provide the server IP.",
        "UPDATE WEB SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("httpport")) {
      return helper.getErrorResponse(
        false,
        "HTTP port missing. Please provide the HTTP port.",
        "UPDATE WEB SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("networkusername")) {
      return helper.getErrorResponse(
        false,
        "Network username missing. Please provide the network username.",
        "UPDATE WEB SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("networkpassword")) {
      return helper.getErrorResponse(
        false,
        "Network password missing. Please provide the network password.",
        "UPDATE WEB SERVER",
        ""
      );
    }
    if (!admin.hasOwnProperty("webserverid")) {
      return helper.getErrorResponse(
        false,
        "Webserver ID missing. Please provide the web server ID.",
        "UPDATE WEB SERVER",
        ""
      );
    }

    const query = `
      UPDATE webservermaster 
      SET webserver_name = ?, 
          server_type = ?, 
          server_ip = ?, 
          httpport = ?, 
          network_username = ?, 
          network_password = ? 
      WHERE webserver_id = ?;
    `;

    const values = [
      admin.webservername,
      admin.servertype,
      admin.serverip,
      admin.httpport,
      admin.networkusername,
      admin.networkpassword,
      admin.webserverid,
    ];

    const result = await db.query(query, values);
    console.log(JSON.stringify(result));

    if (result.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Web server updated successfully.",
        "UPDATE WEB SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error while updating the web server. Please try again.",
        "UPDATE WEB SERVER",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ExportSite(admin) {
  try {
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id",
        "FETCH SITE DETAILS",
        ""
      );
    }
    const sql =
      await db.query(`SELECT c.organization_id AS 'ORGANIZATION ID', CASE WHEN c.Customer_type IN (1, 2) THEN c.customer_id ELSE 0 END AS 'COMPANY ID', 
    CASE WHEN c.Customer_type = 3 THEN c.customer_id ELSE 0 END AS 'INDIVIDUAL ID', b.BRANCH_NAME AS 'SITE NAME', b.SITE_STARTTIME AS 'START TIME', b.site_endtime AS 'END TIME',
     b.SiteController_path AS 'SITECONTROLLER PATH', b.Image_hotlinepath AS 'HOTLINESTORAGE PATH', b.Image_archivalpath AS 'ARCHIVAL PATH', b.Image_backupdays AS 'BACKUP DAYS',
      b.Address AS 'ADDRESS', b.city AS 'CITY', b.STATE AS 'STATE', b.pincode AS 'PINCODE' FROM branchmaster b JOIN Customermaster c ON b.Customer_ID = c.Customer_ID 
      WHERE b.Branch_ID IN(${admin.siteid}) AND b.status = 1;`);
    return { code: true, message: "Site fetched successfully.", sql };
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Addminstration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
// async function Takecamerasnapshot(admin) {
//   try {
//     if (!Array.isArray(admin)) {
//       admin = [admin];
//     }

//     const results = [];

//     for (const adminItem of admin) {
//       if (!adminItem.hasOwnProperty('cameraid')) {
//         results.push({code :'DEVICE_CAMERA_ID_MISSING', message : "Camera IDs missing. Please provide the camera IDs",errorresponse : "ACTIVATE CAMERA"});
//       }

//       const cameraIds = Array.isArray(adminItem.cameraid) ? adminItem.cameraid : [adminItem.cameraid];
//       const channelIds = cameraIds.map(id => `Channel${id}`).join(',');
//       const cameraNamesResponse = await db.query(`SELECT camera_name FROM cameramaster WHERE camera_id IN (${cameraIds.join(',')})`);

//       if (cameraNamesResponse.length === 0) {
//         return helper.getErrorResponse({code :'CAMERA_NAMES_NOT_FOUND', message : "Camera names not found for the provided camera IDs",errorresponse :"TAKE CAMERA SNAPSHOT"});
//       }

//       const cameraNames = cameraNamesResponse.map(row => {
//         const name = row.camera_name;
//         return name.charAt(0).toUpperCase() + name.slice(1);}).join(',');

//       for (const cameraid of cameraIds) {
//         const sql = await db.query(`SELECT dm.device_id, dm.device_name, dm.sdk_id, dm.IP_domain, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, bm.SiteController_path FROM devicemaster dm, branchmaster bm, deptmaster dt WHERE dm.Dept_id = dt.Dept_id AND dt.Branch_id = bm.Branch_id AND dm.device_id IN (SELECT device_id FROM cameramaster WHERE camera_id = ${cameraid} )LIMIT 1;`);

//         if (sql[0]) {
//           const deviceDetails = [{
//             device_id: sql[0].device_id,
//             sdk_id: sql[0].sdk_id,
//             ip_domain: sql[0].IP_domain,
//             ip_port: sql[0].IP_port,
//             username: sql[0].IP_Uname,
//             password: sql[0].IP_Pwd,
//             sitefolderpath: sql[0].SiteController_path,
//             pathusername: config.folderpath.username,
//             pathpassword: config.folderpath.password,
//             channel: cameraNames
//           }];
//           console.log(deviceDetails);
//           const secondApiEndpoint = config.deviceinfopath;
//           const response = await axios.post(secondApiEndpoint, deviceDetails);
//           console.log(response.data);
//           if (response.data.data.success != null || response.data.data.success != '') {
//             results.push({
//               code: "SNAPSHOT_CAPTURED_SUCCESSFULLY",
//               message: response.data.data.success,
//               successresponse: response.data
//             });
//           } else {
//             results.push({
//               code: "ERROR_TAKING_SNAPSHOT",
//               message: response.data.data.Failer,
//               errorresponse: response.data
//             });
//           }
//         } else {
//           results.push({
//             code: "SNAPSHOT_FAILED",
//             message: "Snapshot not available for camera ID: " + cameraid,
//             cameraid
//           });
//         }
//       }
//     }

//     return results;
//   } catch (er) {
//     console.log(`Error ${er}`);
//     return helper.getErrorResponse("CAMERA_ACTIVATION_FAILED", er, "ACTIVATE CAMERA", "");
//   }
// }

//########################################################################################################################################################################################
//########################################################################################################################################################################################
//########################################################################################################################################################################################

async function Takecamerasnapshot(admin) {
  try {
    if (!Array.isArray(admin)) {
      admin = [admin];
    }

    const results = [];

    for (const adminItem of admin) {
      if (!adminItem.hasOwnProperty("cameraid")) {
        results.push({
          code: "Failed",
          message: "Camera IDs missing. Please provide the camera IDs",
          response: "ACTIVATE CAMERA",
        });
        continue;
      }

      const cameraIds = Array.isArray(adminItem.cameraid)
        ? adminItem.cameraid
        : [adminItem.cameraid];
      const cameraNamesResponse = await db.query(
        `SELECT camera_name, camera_id FROM cameramaster WHERE camera_id IN (${cameraIds.join(
          ","
        )})`
      );

      if (cameraNamesResponse.length === 0) {
        results.push({
          code: "Failed",
          message: "Camera names not found for the provided camera IDs",
          response: "TAKE CAMERA SNAPSHOT",
        });
        continue;
      }

      const cameraData = cameraNamesResponse.map((row) => {
        return {
          camera_id: row.camera_id,
          camera_name: row.camera_name,
        };
      });

      console.log(cameraData);
      const sql = await db.query(
        `SELECT dm.device_id, dm.device_name, dm.sdk_id, dm.IP_domain, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, bm.SiteController_path FROM devicemaster dm, branchmaster bm, deptmaster dt WHERE dm.Dept_id = dt.Dept_id AND dt.Branch_id = bm.Branch_id AND dm.device_id IN (SELECT device_id FROM cameramaster WHERE camera_id in (${adminItem.cameraid}) )LIMIT 1;`
      );
      var deviceDetails;
      if (sql[0]) {
        deviceDetails = [
          {
            device_id: sql[0].device_id,
            sdk_id: sql[0].sdk_id,
            ip_domain: sql[0].IP_domain,
            ip_port: sql[0].IP_port,
            username: sql[0].IP_Uname,
            password: sql[0].IP_Pwd,
            sitefolderpath: sql[0].SiteController_path,
            pathusername: config.folderpath.username,
            pathpassword: config.folderpath.password,
            channel: cameraData
              .map((camera) => capitalizeFirstLetter(camera.camera_name))
              .join(","),
          },
        ];
      }
      console.log(deviceDetails);
      const secondApiEndpoint = config.deviceinfopath;
      const response = await axios.post(secondApiEndpoint, deviceDetails);
      console.log(JSON.stringify(response.data));
      if (Array.isArray(response.data)) {
        // console.log(
        // `12111111111111111111111111111111111 ${cameraData} 3545555555555555555553 ${response.data}`
        // );
        const camerastatus = await processSnapshotResponse(
          cameraData,
          response.data
        );
        // console.log(
        //   `dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd ${camerastatus}`
        // );
        return camerastatus;
      } else {
        // console.log(
        //   `dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd ${response.data}`
        // );
        return response.data;
      }
    }
    // console.log(
    //   `dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd ${results}`
    // );
    return results;
  } catch (er) {
    // console.log(`Error ${er}`);
    return [
      { code: "Failed", message: er.message, response: "ACTIVATE CAMERA" },
    ];
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
async function processSnapshotResponse(cameraData, snapshotResponse) {
  const cameraStatusArray = [];

  // Assuming each snapshotResponse corresponds to the cameraData directly by index
  for (let i = 0; i < cameraData.length; i++) {
    const camera = cameraData[i];
    const responseItem = snapshotResponse[i];

    const channel = capitalizeFirstLetter(camera.camera_name);

    if (responseItem[channel]) {
      cameraStatusArray.push({
        code: responseItem[channel],
        channel: channel,
        camera_id: camera.camera_id,
      });
    } else {
      cameraStatusArray.push({
        code: "Failed",
        channel: channel,
        camera_id: camera.camera_id,
      });
    }
  }

  return cameraStatusArray;
}

//########################################################################################################################################################################################
//########################################################################################################################################################################################
//########################################################################################################################################################################################

async function UpdateDeviceStart(admin) {
  if (admin.hasOwnProperty("deviceid") == false) {
    return helper.getErrorResponse(
      false,
      "Device id missing. Please provide the device id",
      "UPDATE DEVICE STATUS",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Device status missing. Please provide the device status",
      "UPDATE DEVICE STATUS",
      ""
    );
  }
  if (admin.hasOwnProperty("startdate") == false) {
    return helper.getErrorResponse(
      false,
      "Device start date missing. Please provide the start date",
      "UPDATE DEVICE STATUS",
      ""
    );
  }
  try {
    const [sql] = await db.spcall(`CALL SP_START_DEVICE_SERVICE(?,?,?);`, [
      admin.deviceid,
      admin.status,
      admin.startdate,
    ]);
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Successfully updated",
        "UPDATE DEVICE STATUS",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error while updating. Please try again",
        "UPDATE DEVICE STATUS",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Addminstration",
      er,
      ""
    );
  }
}

//########################################################################################################################################################################################
//########################################################################################################################################################################################
//########################################################################################################################################################################################

async function UpdateDeviceStop(admin) {
  if (admin.hasOwnProperty("deviceid") == false) {
    return helper.getErrorResponse(
      false,
      "Device id missing. Please provide the device id",
      "UPDATE DEVICE STOP",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Device status missing. Please provide the device status",
      "UPDATE DEVICE STOP",
      ""
    );
  }
  if (admin.hasOwnProperty("logtext") == false) {
    return helper.getErrorResponse(false, "Device log text missing");
  }
  if (admin.hasOwnProperty("enddate") == false) {
    return helper.getErrorResponse(
      false,
      "Device end date missing. Please provide the enddate",
      "UPDATE DEVICE STOP",
      ""
    );
  }
  try {
    const [sql] = await db.spcall(`CALL SP_STOP_DEVICE_SERVICE(?,?,?,?);`, [
      admin.deviceid,
      admin.status,
      admin.logtext,
      admin.enddate,
    ]);
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Successfully updated.",
        "UPDATE DEVICE STOP",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error while updating the device stop",
        "UPDATE DEVICE STOP",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Addminstration",
      er,
      ""
    );
  }
}

//########################################################################################################################################################################################
//########################################################################################################################################################################################
//########################################################################################################################################################################################

async function UpdateSiteStart(admin) {
  if (admin.hasOwnProperty("siteid") == false) {
    return helper.getErrorResponse(
      false,
      "Site id missing. Please provide the site id",
      "SITE START UPDATE",
      ""
    );
  }
  if (admin.hasOwnProperty("sitestatus") == false) {
    return helper.getErrorResponse(
      false,
      "Site status missing. Please provide the site status",
      "SITE START UPDATE",
      ""
    );
  }
  if (admin.hasOwnProperty("siteupdate") == false) {
    return helper.getErrorResponse(
      false,
      "Site update missing. Please provide the uptime",
      "SITE START UPDATE",
      ""
    );
  }
  if (admin.hasOwnProperty("sitedowndate") == false) {
    return helper.getErrorResponse(
      false,
      "Site downtime missing. Please provide the downtime",
      "SITE END UPDATE",
      ""
    );
  }
  if (admin.hasOwnProperty("processid") == false) {
    return helper.getErrorResponse(
      false,
      "Process id missing> please provide the process id",
      "SITE START UPDATE"
    );
  }
  try {
    var sql;
    if (admin.siteupdate != "" && admin.siteupdate != null) {
      [sql] = await db.spcall(`CALL SP_SITE_CONTROLLER_STATUS_UP(?,?,?,?);`, [
        admin.siteid,
        admin.sitestatus,
        admin.siteupdate,
        admin.processid,
      ]);
    } else {
      [sql] = await db.spcall(`CALL SP_SITE_CONTROLLER_STATUS_DOWN(?,?,?);`, [
        admin.siteid,
        admin.sitestatus,
        admin.sitedowndate,
      ]);
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Successfully updated",
        "UPDATE SITE STATUS",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error while updating status",
        "UPDATE SITE STATUS",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//########################################################################################################################################################################################
//########################################################################################################################################################################################
//########################################################################################################################################################################################
async function RestartDevice(admin) {
  if (admin.hasOwnProperty("deviceid") == false) {
    return helper.getErrorResponse(
      false,
      "Device id missing. Please provide the site id",
      "SITE START UPDATE",
      ""
    );
  }
  try {
    const [sql] = await db.spcall(
      `CALL SP_RESTART_DEVICE(?,@Devicestatus); select @Devicestatus;`,
      [admin.deviceid]
    );
    const objectvalue = sql[1][0];
    const devicestatus = objectvalue["@Devicestatus"];
    if (devicestatus != null && devicestatus != 0) {
      return helper.getSuccessResponse(
        true,
        "Successfully updated",
        devicestatus,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error while updating the status",
        "UPDATE SITE STATUS",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###############################################################################################################################################################################################################################################################
//#######################################################################################################################################################################################################################################
//#######################################################################################################################################################################################################################################

//###############################################################################################################################################################################################################################################################
//#######################################################################################################################################################################################################################################
//#######################################################################################################################################################################################################################################

async function AddEventForAI(admin) {
  if (admin.hasOwnProperty("eventid") == false) {
    return helper.getErrorResponse(
      false,
      "Event id missing. Please provide the event id",
      "ADD EVENT FOR AI",
      ""
    );
  }
  if (admin.hasOwnProperty("cameraid") == false) {
    return helper.getErrorResponse(
      false,
      "Camera id missing. Please provide the camera id",
      "ADD EVENT FOR AI",
      ""
    );
  }
  if (admin.hasOwnProperty("filepath") == false) {
    return helper.getErrorResponse(
      false,
      "File path missing. Please provide the filepath",
      "ADD EVENT FOR AI",
      ""
    );
  }
  if (admin.hasOwnProperty("filename") == false) {
    return helper.getErrorResponse(
      false,
      "File name missing. Please provide the file name",
      "ADD EVENT FOR AI",
      ""
    );
  }
  try {
    const [sql] = await db.spcall(
      `CALL addeventforAI(?,?,?,?,@aifilter); select @aifilter`,
      [admin.eventid, admin.cameraid, admin.filepath, admin.filename]
    );
    const objectvalue = sql[1][0];
    const aifilter = objectvalue["@aifilter"];
    return { code: true, message: "Successfully fetched", aifilters: aifilter };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//##############################################################################################################################################################################################
//#########################################################################################################################################################################################
//##############################################################################################################################################################################################

async function addeventruntime(admin) {
  // console.log(JSON.stringify(admin));

  if (!admin.hasOwnProperty("deviceid")) {
    return helper.getErrorResponse(
      false,
      "Device id missing. Please provide the Device id",
      "ADD RUNTIME EVENT",
      ""
    );
  }
  if (!admin.hasOwnProperty("camerano")) {
    return helper.getErrorResponse(
      false,
      "Camera no missing. Please provide the camera no.",
      "ADD RUNTIME EVENT",
      ""
    );
  }
  if (!admin.hasOwnProperty("alerttext")) {
    return helper.getErrorResponse(
      false,
      "Alert text missing. Please provide the alert text",
      "ADD RUNTIME EVENT",
      ""
    );
  }

  try {
    const [results] = await db.spcall(
      `CALL addeventruntime3(?,?,?,@camID,@eid); SELECT @camID AS camID, @eid AS eid;`,
      [admin.deviceid, admin.camerano, admin.alerttext]
    );

    if (results && results.length > 1 && results[1].length > 0) {
      const objectvalue = results[1][0];
      const camid = objectvalue["camID"];
      const evntid = objectvalue["eid"];
      if (camid !== null && evntid !== null) {
        return {
          code: true,
          message: "Event ID fetched successfully",
          cameraid: camid,
          eventid: evntid,
        };
      } else if (camid !== null && evntid == null) {
        return helper.getErrorResponse(
          false,
          `Events ignored for this camera`,
          "ADD RUNTIME EVENT",
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error while fetching the event ID",
          "ADD RUNTIME EVENT",
          ""
        );
      }
    } else {
      return helper.getErrorResponse(
        false,
        "No results returned from the stored procedure",
        "ADD RUNTIME EVENT",
        ""
      );
    }
  } catch (er) {
    console.error(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function addCommunicationServer(admin) {
  try {
    if (admin.hasOwnProperty("servername") == false) {
      return helper.getErrorResponse(
        false,
        "Communication server name missing. Please provide the server name",
        "ADD COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("servertype") == false) {
      return helper.getErrorResponse(
        false,
        "Server type missing. Please provide the server type.",
        "ADD COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip missing. Please provide the server ip.",
        "ADD COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverport") == false) {
      return helper.getErrorResponse(
        false,
        "Server port missing. Please provide the server port.",
        "ADD COMMUNICATION SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("username") == false) {
      return helper.getErrorResponse(
        false,
        "Username missing. Please provide the username.",
        "ADD COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("password") == false) {
      return helper.getErrorResponse(
        false,
        "password missing. Please provide the password.",
        "ADD COMMUNICATION SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("serverurl") == false) {
      return helper.getErrorResponse(
        false,
        "Server url missing. Please provide the server url.",
        "ADD COMMUNICATION SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_ADD_COM_SERVER(?,?,?,?,?,?,?,@comid); select @comid;`,
        [
          admin.servername,
          admin.servertype,
          admin.serverip,
          admin.serverport,
          admin.username,
          admin.password,
          admin.serverurl,
        ]
      );
      const objectvalue = result[1][0];
      const comid = objectvalue["@comid"];
      console.log(`event ai id -> ${comid}`);
      if (comid != null && comid != 0) {
        return helper.getSuccessResponse(
          true,
          "Communication server added successfully",
          comid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error adding the Communication server. Please provide the Communication server.",
          "ADD AI SERVER",
          ""
        );
      }
    } catch (er) {
      return {
        code: false,
        message: "Internal error. Please contact Administration",
        error: er,
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FetchCommunicationServer(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("comserverid") == true) {
      sql = await db.query(
        `select DISTINCT comserver_id comserverid,server_name servername,server_type servertype,server_ip serverip,server_port serverport,server_status running_status,username,password,server_url serverurl,status from communicationserver where comserver_id in(${admin.comserverid}) and deleted_flag = 0;`
      );
    } else {
      sql = await db.query(
        `select DISTINCT comserver_id comserverid,server_name servername,server_type servertype,server_ip serverip,server_port serverport,server_status running_status,username,password,server_url serverurl,status from communicationserver where deleted_flag = 0;`
      );
    }
    return {
      code: true,
      message: "Available communication machine fetched successfully.",
      sql,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateCommunicationServer(admin) {
  try {
    if (admin.hasOwnProperty("servername") == false) {
      return helper.getErrorResponse(
        false,
        "Communication server name missing. Please provide the server name",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("servertype") == false) {
      return helper.getErrorResponse(
        false,
        "Server type missing. Please provide the server type.",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip missing. Please provide the server ip.",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverport") == false) {
      return helper.getErrorResponse(
        false,
        "Server port missing. Please provide the server port.",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("username") == false) {
      return helper.getErrorResponse(
        false,
        "Username missing. Please provide the username.",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("password") == false) {
      return helper.getErrorResponse(
        false,
        "password missing. Please provide the password.",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("serverurl") == false) {
      return helper.getErrorResponse(
        false,
        "Server url missing. Please provide the server url.",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("comserverid") == false) {
      return helper.getErrorResponse(
        false,
        "Communication server id missing. Please provide the server id",
        "UPDATE COMMUNICATION SERVER",
        ""
      );
    }
    try {
      const result =
        await db.query(`UPDATE communicationserver SET server_name = '${admin.servername}', 
     server_type = '${admin.servertype}' , server_ip = '${admin.serverip}', server_port = '${admin.serverport}' ,
      username = '${admin.username}' , password = '${admin.password}' ,
      server_url = '${admin.serverurl}' where comserver_id = '${admin.comserverid}';`);

      if (result.affectedRows) {
        return helper.getSuccessResponse(
          true,
          "Communication server updated successfully",
          admin.comserverid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error adding the communication server. Please provide the communication server.",
          "UPDATE COMMUNICATION SERVER",
          ""
        );
      }
    } catch (er) {
      return {
        code: false,
        message: "Internal error. Please contact Administration",
        error: er,
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function addloadbalancerserver(admin) {
  try {
    if (admin.hasOwnProperty("loadbalancername") == false) {
      return helper.getErrorResponse(
        false,
        "Load balancer server name missing. Please provide the load balancer name",
        "ADD LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("loadbalancertype") == false) {
      return helper.getErrorResponse(
        false,
        "Load balancer type missing. Please provide the load balancer type.",
        "ADD LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip missing. Please provide the server ip.",
        "ADD LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverport") == false) {
      return helper.getErrorResponse(
        false,
        "Server port missing. Please provide the server port.",
        "ADD LOAD BALANCER SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("username") == false) {
      return helper.getErrorResponse(
        false,
        "Username missing. Please provide the username.",
        "ADD LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("password") == false) {
      return helper.getErrorResponse(
        false,
        "password missing. Please provide the password.",
        "ADD LOAD BALANCER SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("serverids") == false) {
      return helper.getErrorResponse(
        false,
        "Server id missing. Please provide the server id.",
        "ADD LOAD BALANCER SERVER",
        ""
      );
    }
    try {
      const [result] = await db.spcall(
        `CALL SP_ADD_LB_SERVER(?,?,?,?,?,?,?,@lbid); select @lbid;`,
        [
          admin.loadbalancername,
          admin.loadbalancertype,
          admin.serverip,
          admin.serverport,
          admin.username,
          admin.password,
          admin.serverids,
        ]
      );
      const objectvalue = result[1][0];
      const lbid = objectvalue["@lbid"];
      console.log(`event lb id -> ${lbid}`);
      if (lbid != null && lbid != 0) {
        return helper.getSuccessResponse(
          true,
          "Load balancer server added successfully",
          lbid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error adding the Load balancer server. Please provide the load balancer server.",
          "ADD LOAD BALANCER SERVER",
          ""
        );
      }
    } catch (er) {
      return {
        code: false,
        message: "Internal error. Please contact Administration",
        error: er,
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Fetchloadbalancerserver(admin) {
  try {
    var sql;
    if (admin.hasOwnProperty("loadbalancerid") == true) {
      sql = await db.query(
        `select DISTINCT loadbalancer_id loadbalancerid,loadbalancer_name loadbalancername,loadbalancer_type loadbalancertype,server_ip serverip,serverport ,running_status runningstatus,username,password,serverids,status from loadbalancermaster where loadbalancer_id in(${admin.loadbalancerid}) and deleted_flag = 0;`
      );
    } else {
      sql = await db.query(
        `select DISTINCT loadbalancer_id loadbalancerid,loadbalancer_name loadbalancername,loadbalancer_type loadbalancertype,server_ip serverip,serverport ,running_status runningstatus,username,password,serverids,status from loadbalancermaster where deleted_flag = 0;`
      );
    }
    return {
      code: true,
      message: "Available load balancer fetched successfully.",
      sql,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Updateloadbalancerserver(admin) {
  try {
    if (admin.hasOwnProperty("loadbalancername") == false) {
      return helper.getErrorResponse(
        false,
        "Load balancer server name missing. Please provide the load balancer name",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("loadbalancertype") == false) {
      return helper.getErrorResponse(
        false,
        "Load balancer type missing. Please provide the load balancer type.",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverip") == false) {
      return helper.getErrorResponse(
        false,
        "Server ip missing. Please provide the server ip.",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("serverport") == false) {
      return helper.getErrorResponse(
        false,
        "Server port missing. Please provide the server port.",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("username") == false) {
      return helper.getErrorResponse(
        false,
        "Username missing. Please provide the username.",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("password") == false) {
      return helper.getErrorResponse(
        false,
        "password missing. Please provide the password.",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
      1;
    }
    if (admin.hasOwnProperty("serverids") == false) {
      return helper.getErrorResponse(
        false,
        "Server id missing. Please provide the server id.",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
    }
    if (admin.hasOwnProperty("loadbalancerid") == false) {
      return helper.getErrorResponse(
        false,
        "Load balancer server id missing. Please provide the server id",
        "UPDATE LOAD BALANCER SERVER",
        ""
      );
    }
    try {
      const result =
        await db.query(`UPDATE loadbalancermaster SET loadbalancer_name = '${admin.loadbalancername}', 
     loadbalancer_type = '${admin.loadbalancertype}' , server_ip = '${admin.serverip}', serverport = '${admin.serverport}' ,
      username = '${admin.username}' , password = '${admin.password}' ,
      serverids = '${admin.serverids}' where loadbalancer_id = '${admin.loadbalancerid}';`);

      if (result.affectedRows) {
        return helper.getSuccessResponse(
          true,
          "Load balancer server updated successfully",
          admin.loadbalancerid,
          ""
        );
      } else {
        return helper.getErrorResponse(
          false,
          "Error adding the Load balancer server. Please provide the load balancer server.",
          "UPDATE LOAD BALANCER SERVER",
          ""
        );
      }
    } catch (er) {
      return {
        code: false,
        message: "Internal error. Please contact Administration",
        error: er,
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FetchAllServer(admin) {
  try {
    var sql;

    sql =
      await db.query(`SELECT CONCAT('N', notification_id) AS serverid, notificationmachine_name AS servername FROM notificationmaster where status=1 and deleted_flag =0
      UNION ALL
      SELECT CONCAT('AI', machine_id) AS serverid, machine_name AS servername FROM aisysmaster where status=1 and deleted_flag =0
      UNION ALL
      SELECT CONCAT('COM', comserver_id) AS serverid, server_name AS servername FROM communicationserver where status=1 and deleted_flag =0
      UNION ALL
      SELECT CONCAT('WEB', webserver_id) AS serverid, webserver_name AS servername FROM webservermaster where status=1 and deleted_flag =0
      UNION ALL
      SELECT CONCAT('APP', applicationserver_id) AS serverid, applicationserver_name AS servername FROM applicationservermaster where status=1 and deleted_flag =0
      UNION ALL
      SELECT CONCAT('F', storagepath_id) AS serverid, storageservername AS servername FROM storagepathmaster where status=1 and deleted_flag = 0`);
    return {
      code: true,
      message: "Available server fetched successfully.",
      sql,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Modifynotificationserver(admin) {
  if (admin.hasOwnProperty("notificationid") == false) {
    return helper.getErrorResponse(
      false,
      "Notification id missing. Please provide the notification id",
      "MODIFY NOTIFICATION SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY NOTIFICATION SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE notificationmaster set status =1 , deleted_flag = 0 where notification_id IN(${admin.notificationid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE notificationmaster set status = 0 , deleted_flag = 0 where notification_id IN(${admin.notificationid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE notificationmaster set status =0 , deleted_flag = 1 where notification_id  IN(${admin.notificationid})`
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Unknown status type",
        "MODIFY NOTIFICATION SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Notification server modified successfully",
        "MODIFY NOTIFICATION SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the notification server.",
        "MODIFY NOTIFICATION SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ModifyDatabaseserver(admin) {
  if (admin.hasOwnProperty("databaseid") == false) {
    return helper.getErrorResponse(
      false,
      "Database id missing. Please provide the database id",
      "MODIFY DATABASE SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY DATABASE SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE databasemaster set status =1 , deleted_flag = 0 where database_id IN(${admin.databaseid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE databasemaster set status = 0 , deleted_flag = 0 where database_id IN(${admin.databaseid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE databasemaster set status =0 , deleted_flag = 1 where database_id IN(${admin.databaseid})`
      );
    } else {
      return helper.getErrorResponse(
        "ERROR",
        "Unknown status type",
        "MODIFY DATABASE SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Database server modified successfully",
        "MODIFY DATABASE SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the database server.",
        "MODIFY DATABASE SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ModifyWebserver(admin) {
  if (admin.hasOwnProperty("webserverid") == false) {
    return helper.getErrorResponse(
      false,
      "Web server id missing. Please provide the webserver id",
      "MODIFY WEB SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY WEB SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE webservermaster set status =1 , deleted_flag = 0 where webserver_id IN(${admin.webserverid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE webservermaster set status = 0 , deleted_flag = 0 where webserver_id IN(${admin.webserverid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE webservermaster set status =0 , deleted_flag = 1 where webserver_id IN(${admin.webserverid})`
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Unknown status type",
        "MODIFY WEB SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Web server modified successfully",
        "MODIFY WEB SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the Web server.",
        "MODIFY WEB SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ModifyApplicatiobserver(admin) {
  if (admin.hasOwnProperty("applicationid") == false) {
    return helper.getErrorResponse(
      false,
      "Application server id missing. Please provide the application server id",
      "MODIFY APPLICATION SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY APPLICATION SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE applicationservermaster set status =1 , deleted_flag = 0 where applicationserver_id IN(${admin.applicationid});`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE applicationservermaster set status = 0 , deleted_flag = 0 where applicationserver_id IN(${admin.applicationid});`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE applicationservermaster set status =0 , deleted_flag = 1 where applicationserver_id IN(${admin.applicationid});`
      );
    } else {
      return helper.getErrorResponse(
        "ERROR",
        "Unknown status type",
        "MODIFY APPLICATION SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Application server modified successfully",
        "MODIFY APPLICATION SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the application server.",
        "MODIFY APPLICATION SERVER",
        ""
      );
    }
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ModifyAIserver(admin) {
  if (admin.hasOwnProperty("machineid") == false) {
    return helper.getErrorResponse(
      false,
      "AI server id missing. Please provide the machineid",
      "MODIFY AI SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY AI SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE aisysmaster set status =1 , deleted_flag = 0 where machine_id IN(${admin.machineid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE aisysmaster set status = 0 , deleted_flag = 0 where machine_id IN(${admin.machineid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE aisysmaster set status =0 ,deleted_flag = 1 where machine_id IN(${admin.machineid})`
      );
    } else {
      return helper.getErrorResponse(
        "ERROR",
        "Unknown status type",
        "MODIFY WEB SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "AI server modified successfully",
        "MODIFY AI SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the AI server.",
        "MODIFY AI SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function Modifylbserver(admin) {
  if (admin.hasOwnProperty("loadbalancerid") == false) {
    return helper.getErrorResponse(
      false,
      "Load balancer server id missing. Please provide the Load balancer server id",
      "MODIFY LOADBALANCER SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY APPLICATION SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE loadbalancermaster set status =1 , deleted_flag = 0 where loadbalancer_id IN(${admin.loadbalancerid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE loadbalancermaster set status = 0 , deleted_flag = 0 where loadbalancer_id IN(${admin.loadbalancerid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE loadbalancermaster set status =0 , deleted_flag = 1 where loadbalancer_id IN(${admin.loadbalancerid})`
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Unknown status type",
        "MODIFY APPLICATION SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Load balancer server modified successfully",
        "MODIFY LOADBALANCER SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the Load balancer server.",
        "MODIFY LOADBALANCER SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ModifyCommunicationserver(admin) {
  if (admin.hasOwnProperty("comserverid") == false) {
    return helper.getErrorResponse(
      false,
      "Communication server id missing. Please provide the Communication server id",
      "MODIFY COMMUNICATION SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY COMMUNICATION SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE communicationserver set status =1 , deleted_flag = 0 where comserver_id IN(${admin.comserverid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE communicationserver set status = 0 , deleted_flag = 0 where comserver_id IN(${admin.comserverid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE communicationserver set status =0 , deleted_flag = 1 where comserver_id IN(${admin.comserverid})`
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Unknown status type",
        "MODIFY WEB SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Communication server modified successfully",
        "MODIFY COMMUNICATION SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the Communication server.",
        "MODIFY COMMUNICATION SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ModifyStorageserver(admin) {
  if (admin.hasOwnProperty("storagepathid") == false) {
    return helper.getErrorResponse(
      false,
      "Storage server id missing. Please provide the storage id",
      "MODIFY STORAGE SERVER",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Active/deactivate/delete status missing.",
      "MODIFY STORAGE SERVER",
      ""
    );
  }
  var sql;
  try {
    if (admin.status == "activate") {
      sql = await db.query(
        `UPDATE storagepathmaster set status =1 , deleted_flag = 0 where storagepath_id IN(${admin.storagepathid})`
      );
    } else if (admin.status == "deactivate") {
      sql = await db.query(
        `UPDATE storagepathmaster set status = 0 , deleted_flag = 0 where storagepath_id IN(${admin.storagepathid})`
      );
    } else if (admin.status == "delete") {
      sql = await db.query(
        `UPDATE storagepathmaster set status =0 , deleted_flag = 1 where storagepath_id IN(${admin.storagepathid})`
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Unknown status type",
        "MODIFY APPLICATION SERVER",
        ""
      );
    }
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Storage server modified successfully",
        "MODIFY STORAGE SERVER",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error modifying the Storage server.",
        "MODIFY STORAGE SERVER",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DashBoardCount(admin) {
  try {
    const sql = await db.query(`
      SELECT 'activedb' AS type, COUNT(*) AS count FROM databasemaster WHERE runningstatus = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactivedb' AS type, COUNT(*) AS count FROM databasemaster WHERE runningstatus = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activeweb' AS type, COUNT(webserver_id) AS count FROM webservermaster WHERE runningstatus = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactiveweb' AS type, COUNT(webserver_id) AS count FROM webservermaster WHERE runningstatus = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activelb' AS type, COUNT(*) AS count FROM loadbalancermaster WHERE running_status = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactivelb' AS type, COUNT(*) AS count FROM loadbalancermaster WHERE running_status = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activeai' AS type, COUNT(*) AS count FROM aisysmaster WHERE runningstatus = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactiveai' AS type, COUNT(*) AS count FROM aisysmaster WHERE runningstatus = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activecom' AS type, COUNT(*) AS count FROM communicationserver WHERE server_status = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactivecom' AS type, COUNT(*) AS count FROM communicationserver WHERE server_status = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activeappserver' AS type, COUNT(*) AS count FROM applicationservermaster WHERE runningstatus = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactiveappserver' AS type, COUNT(*) AS count FROM applicationservermaster WHERE runningstatus = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activesitecon' AS type, COUNT(branch_id) AS count FROM branchmaster WHERE status = 1 AND deleted_flag = 0 AND sitecontroller_status = 1
      UNION ALL
      SELECT 'inactivesitecon' AS type, COUNT(branch_id) AS count FROM branchmaster WHERE status = 1 AND deleted_flag = 0 AND sitecontroller_status = 0
      UNION ALL
      SELECT 'activenotification' AS type, COUNT(notification_id) AS count FROM notificationmaster WHERE server_status = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactivenotification' AS type, COUNT(notification_id) AS count FROM notificationmaster WHERE server_status = 0 AND deleted_flag = 0
      UNION ALL
      SELECT 'activefile' AS type, COUNT(storagepath_id) AS count FROM storagepathmaster WHERE running_status = 1 AND deleted_flag = 0
      UNION ALL
      SELECT 'inactivefile' AS type, COUNT(storagepath_id) AS count FROM storagepathmaster WHERE running_status = 0 AND deleted_flag = 0;
    `);

    const counts = sql.reduce((acc, row) => {
      acc[row.type] = row.count;
      return acc;
    }, {});

    return {
      code: true,
      message: "Path fetched successfully",
      activedb: counts.activedb || 0,
      inactivedb: counts.inactivedb || 0,
      activeweb: counts.activeweb || 0,
      inactiveweb: counts.inactiveweb || 0,
      activelb: counts.activelb || 0,
      inactivelb: counts.inactivelb || 0,
      activeai: counts.activeai || 0,
      inactiveai: counts.inactiveai || 0,
      activecom: counts.activecom || 0,
      inactivecom: counts.inactivecom || 0,
      activeappserver: counts.activeappserver || 0,
      inactiveappserver: counts.inactiveappserver || 0,
      activesitecon: counts.activesitecon || 0,
      inactivesitecon: counts.inactivesitecon || 0,
      activenotification: counts.activenotification || 0,
      inactivenotification: counts.inactivenotification || 0,
      activefile: counts.activefile || 0,
      inactivefile: counts.inactivefile || 0,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetRegion(admin) {
  try {
    if (admin.hasOwnProperty("cameraid") == false) {
      return {
        code: false,
        message: "Camera id missing",
        module: "FETCH ANALYTIC FILTER",
      };
    }
    try {
      const sql = await db.query(
        `select rect_poly,line_poly,arrow_poly,poly_poly,rect_nonpoly rect_colors,line_nonpoly line_colors,arrow_nonpoly arrow_colors,poly_nonpoly poly_colors,
        rectangle_check_ROI,poly_check_ROI,line_check_ROI,arrow_check_ROI,Annotation_type objectnames from analyticcoordinates where camera_id = ${admin.cameraid} `
      );
      if (sql[0]) {
        return {
          code: true,
          message: "Analytic filter fetched successfully",
          region: sql[0],
        };
      } else {
        return {
          code: true,
          message: "Analytic filter fetched successfully",
          region: "",
        };
      }
    } catch (er) {
      return {
        code: false,
        message: "Error fetching analytic filter",
        error: er,
      };
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
async function AddEcs(admin) {
  try {
    if (!admin.hasOwnProperty("deviceip")) {
      return {
        code: false,
        message: "Device ip address missing. Please provide the deviceip",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("httpport")) {
      return {
        code: false,
        message: "Device http port missing. Please provide the http port",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("macaddress")) {
      return {
        code: false,
        message: "Mac address missing. Please provide the macaddress",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("extension")) {
      return {
        code: false,
        message: "Device extension missing. Please provide the extension",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("serialnumber")) {
      return {
        code: false,
        message: "Serial number missing. Please provide the serial number",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("playsoundurl")) {
      return {
        code: false,
        message:
          "Start play sound url missing. Please provide the play sound url",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("stopplayurl")) {
      return {
        code: false,
        message:
          "Stop play sound url missing. Please provide the play stop url",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("ecstype")) {
      return {
        code: false,
        message: "Ecs type missing. Please provide the ecs type",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("camera_id")) {
      return {
        code: false,
        message: "Camera id missing. Please provide the camera ids",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("siteid")) {
      return {
        code: false,
        message: "Site id missing. Please provide the site id",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("username")) {
      return {
        code: false,
        message: "Username missing. Please provide the username.",
        module: "ADD ECS SYSTEM",
      };
    }
    if (!admin.hasOwnProperty("password")) {
      return {
        code: false,
        message: "Password missing. Please provide the password.",
        module: "ADD ECS SYSTEM",
      };
    }

    // Handle camera_id list
    // if (Array.isArray(admin.camera_id)) {
    //   admin.camera_id = admin.camera_id.join(',');
    // }
    console.log(`admin camera id -> ${admin.camera_id}`);
    try {
      const [sql] = await db.spcall(
        `CALL SP_ADD_ECS(?,?,?,?,?,?,?,?,?,?,?,?,@ecsid); select @ecsid`,
        [
          admin.deviceip,
          admin.httpport,
          admin.macaddress,
          admin.extension,
          admin.serialnumber,
          admin.playsoundurl,
          admin.stopplayurl,
          admin.ecstype,
          JSON.stringify(admin.camera_id),
          admin.siteid,
          admin.username,
          admin.password,
        ]
      );

      const objectvalue = sql[1][0];
      const ecsid = objectvalue["@ecsid"];
      if (ecsid == null || ecsid == "" || ecsid == 0) {
        return {
          code: false,
          message: "Error while adding the ecs system",
          module: "ADD ECS SYSTEM",
        };
      } else {
        return {
          code: true,
          message: "Emergency communication system added successfully.",
          ecsid: ecsid,
        };
      }
    } catch (er) {
      return {
        code: false,
        message: "Internal error. Please contact Administration",
        error: er.message,
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er.message,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetEcs(admin) {
  if (admin.hasOwnProperty("siteid") == false) {
    return helper.getErrorResponse(
      false,
      "Site id missing. Please provide the site id.",
      "FETCH ECS SYSTEM",
      ""
    );
  }
  var sql, sql1;
  try {
    if (admin.siteid != "") {
      sql = await db.query(
        `select Device_ip,http_port,mac_address,extension,serialnumber,startplayurl,stopplayurl,ecstype,camera_id,Ecs_username username, Ecs_password passowrd from ecsmaster where site_id IN (${admin.siteid});`
      );
      sql1 = await db.query(
        `select cm.camera_id ,cm.camera_name,dm.device_name from cameramaster cm,devicemaster dm,deptmaster dt where cm.device_id = dm.device_id and dm.dept_id = dt.dept_id and dt.branch_id in(${admin.siteid})`
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Please select the site.",
        "FETCH ECS SYSTEM"
      );
    }
    return {
      code: true,
      message: "Emergency communication system list fetched successfully",
      ecs: sql,
      cameralist: sql1,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er.message,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateHideStatus(admin) {
  if (admin.hasOwnProperty("siteid") == false) {
    return helper.getErrorResponse(
      false,
      "Site id missing. Please provide the site id.",
      "UPDATE SHOW/HIDE STATUS",
      ""
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Site controller hide show status missing. Please provide the status.",
      "UPDATE SHOW/HIDE STATUS",
      ""
    );
  }
  try {
    const sql = await db.query(
      `Update branchmaster set hidestatus = ${admin.status} where Branch_id = ${admin.siteid}`
    );
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Show/Hide status updated successfully.",
        "UPDATE SHOW/HIDE STATUS",
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error updating the site controller status.",
        "UPDATE SHOW/HIDE STATUS"
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateSiteController(admin) {
  if (!admin.hasOwnProperty("siteid")) {
    return helper.getErrorResponse(
      false,
      "Site id missing. Please provide the site id",
      "UPDATE SITE CONTROLLER MISSING",
      ""
    );
  }

  const siteIds = Array.isArray(admin.siteid) ? admin.siteid : [admin.siteid]; // Ensure siteIds is an array
  const responses = [];

  for (let siteId of siteIds) {
    try {
      const query = `SELECT sitecontroller_path FROM branchmaster WHERE branch_id = ?`;
      const results = await db.query(query, [siteId]);

      if (results.length === 0) {
        responses.push({
          code: false,
          message: `Site id ${siteId} not found in branchmaster`,
          module: "UPDATE SITE CONTROLLER NOT FOUND",
        });
        continue; // Move to the next siteId
      }

      const sitecontrollerPath = results[0].sitecontroller_path;
      try {
        await fs.mkdir(sitecontrollerPath);
        console.log("Folder created successfully.");
      } catch (error) {
        if (error.code === "EEXIST") {
          console.log("Folder already exists.");
        } else {
          console.error("Error creating folder:", error.message);
          responses.push({
            code: false,
            message: `Error while creating the folder path for site id ${siteId}`,
            error: error,
          });
        }
      }
      try {
        const sourceFolder = config.sitecontrollerpath;
        cpy
          .copy(sourceFolder, sitecontrollerPath)
          .then(async () => {
            await addsiteconfig(siteId);
            console.log("Files copied successfully!");
          })
          .catch((err) => {
            console.error("Error copying files:", err);
          });
        responses.push({
          siteid: siteId,
          code: true,
          message: `Site controller updated successfully for site id -> ${siteId}.`,
          folderpath: sitecontrollerPath,
        });
      } catch (er) {
        responses.push({
          code: false,
          message: `Error while creating the folder path for site id ${siteId}`,
          error: er.message,
        });
      }
    } catch (err) {
      responses.push({
        code: false,
        message: `Error processing site id ${siteId}`,
        error: err,
      });
    }
  }

  return responses;
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DeleteSite(admin) {
  try {
    const sql = await db.spcall(`CALL SP_SITE_DELETE(?);`, [1]);
    return "success";
  } catch (er) {
    return er;
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateAIProcess(admin) {
  if (admin.hasOwnProperty("processid") == false) {
    return helper.getErrorResponse(
      false,
      "Process id missing. Please provide the process id",
      "UPDATE AI PROCESS ID"
    );
  }
  if (admin.hasOwnProperty("status") == false) {
    return helper.getErrorResponse(
      false,
      "Running status missing. Please provide the running status",
      "UPDATE AI PROCESS ID"
    );
  }
  if (admin.hasOwnProperty("machineid") == false) {
    return helper.getErrorResponse(
      false,
      "Machine id missing. Please provide the machine id",
      "UPDATE AI PROCESS ID"
    );
  }
  if (admin.hasOwnProperty("newenginepath") == false) {
    admin.newenginepath = "";
  }
  try {
    const [sql] = await db.spcall(`CALL SP_AI_START_UPDATE(?,?,?,?);`, [
      admin.status,
      admin.machineid,
      admin.processid,
      admin.newenginepath,
    ]);
    return helper.getSuccessResponse(
      true,
      "Process id updated Successfully",
      admin.machineid,
      ""
    );
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AIStopUpdate(admin) {
  try {
    if (admin.hasOwnProperty("machineid") == false) {
      return helper.getErrorResponse(
        false,
        "AI Machine missing. Please provide the AI machine id",
        "AI STOP UPDATE"
      );
    }
    if (admin.hasOwnProperty("status") == false) {
      return helper.getErrorResponse(
        false,
        "AI status missing. Please provide the AI status",
        "AI STOP UPDATE"
      );
    }
    if (admin.hasOwnProperty("errorlog") == false) {
      return helper.getErrorResponse(
        false,
        "Errorlog missing. Please provide the AI status",
        "AI STOP UPDATE"
      );
    }
    const [sql] = await db.spcall(`CALL SP_AI_STOP_UPDATE(?,?,?)`, [
      admin.status,
      admin.machineid,
      admin.errorlog,
    ]);
    return helper.getSuccessResponse(
      true,
      "AI machine stop updated successfully",
      admin.machineid,
      ""
    );
  } catch (er) {
    return {
      code: false,
      message: "Error updating the device stop",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function UpdateNewEnginePath(admin) {
  try {
    if (admin.hasOwnProperty("machineid") == false) {
      return helper.getErrorResponse(
        false,
        "AI Machine id missing. Please provide AI machine id",
        "UPDATE NEW ENGINE PATH",
        ""
      );
    }
    if (admin.hasOwnProperty("oldenginepath") == false) {
      return helper.getErrorResponse(
        false,
        "New Engine path missing. Please provide the Engine path",
        "UPDATE NEW ENGINE PATH",
        ""
      );
    }

    const result = await db.query(
      `UPDATE aisysmaster set old_enginepath = '${admin.oldenginepath}' where machine_id = ${admin.machineid}`
    );
    if (result.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "AI new engine path Updated successfully",
        admin.machineid,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error updating the engine new path",
        "UPDATE NEW ENGINE PATH",
        ""
      );
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetAIMachineProcess(admin) {
  try {
    if (admin.hasOwnProperty("machineid") == false) {
      return helper.getErrorResponse(
        false,
        "AI Machine id missing. Please provide AI machine id",
        "GET AI MACHINE PROCESS ID",
        ""
      );
    }

    const sql = await db.query(
      `select Process_id from aisysmaster where machine_id =${admin.machineid} and status = 1`
    );
    if (sql[0]) {
      const processid = sql[0].Process_id;
      return {
        code: true,
        message: "Process id fetched Successfully",
        processid: processid,
      };
    } else {
      return helper.getErrorResponse(
        false,
        "AI machine not available",
        "GET AI MACHINE PROCESS ID"
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AIRollback(admin) {
  try {
    if (admin.hasOwnProperty("machineid") == false) {
      return helper.getErrorResponse(
        false,
        "AI Machine id missing. Please provide AI machine id",
        "",
        ""
      );
    }
    const sql = await db.query(
      `select old_enginepath,error_log,new_enginepath from aisysmaster where machine_id = ${admin.machineid} and status =1 `
    );
    if (sql[0]) {
      const oldenginepath = sql[0].old_enginepath;
      const errorlog = sql[0].error_log;
      const newenginepath = sql[0].new_enginepath;
      return {
        code: true,
        message: "Old engine fetched Successfully",
        oldenginepath: oldenginepath,
        errorlog: errorlog,
        newenginepath: newenginepath,
      };
    } else {
      return helper.getErrorResponse(
        false,
        "AI machine not available",
        "GET AI MACHINE PROCESS ID"
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetSiteControllerProcess(admin) {
  try {
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide Site id",
        "GET SITE PROCESS ID",
        ""
      );
    }

    const sql = await db.query(
      `select Site_Process_id from branchmaster where Branch_id =${admin.siteid} and status = 1`
    );
    if (sql[0]) {
      const processid = sql[0].Site_Process_id;
      return {
        code: true,
        message: "Process id fetched Successfully",
        processid: processid,
      };
    } else {
      return helper.getErrorResponse(
        false,
        "Site not available",
        "GET SITE PROCESS ID"
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddEventPath(admin) {
  try {
    if (admin.hasOwnProperty("eventid") == false) {
      return helper.getErrorResponse(
        false,
        "Event id missing. Please provide the event id",
        "ADD EVENT PATH",
        ""
      );
    }
    if (admin.hasOwnProperty("eventpath") == false) {
      return helper.getErrorResponse(
        false,
        "Event path missing. Please provide the event path",
        "ADD EVENT PATH",
        ""
      );
    }

    const [result] = await db.spcall(
      `CALL SP_EVENT_PATH_UPDATE(?,?,@pathid); select @pathid`,
      [admin.eventid, admin.eventpath]
    );
    const objectvalue = result[1][0];
    const pathid = objectvalue["@pathid"];
    if (pathid != null) {
      return helper.getSuccessResponse(
        true,
        "Path added Successfully",
        pathid,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error adding the event path",
        "ADD EVENT PATH",
        ""
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetObjectNames(admin) {
  try {
    const sql = await db.query(
      `select object_id,object_name,objecttype_id from aiobjectnames where status = 1`
    );

    return helper.getSuccessResponse(
      true,
      "Object names fetched successfully",
      sql,
      ""
    );
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function SiteStatusUpdate(admin) {
  try {
    if (admin.hasOwnProperty("sdkid") == false) {
      return helper.getErrorResponse(
        false,
        "SDK ID missing. Please provide the sdkid",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("alertmessage") == false) {
      return helper.getErrorResponse(
        false,
        "Alert message missing. Please provide the alert message",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("deviceid") == false) {
      return helper.getErrorResponse(
        false,
        "Device id missing. Please provide the device id",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("devicename") == false) {
      return helper.getErrorResponse(
        false,
        "Device name missing. Please provide the device id",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("ipaddress") == false) {
      return helper.getErrorResponse(
        false,
        "IP address missing. Please provide the IP address.",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("ipport") == false) {
      return helper.getErrorResponse(
        false,
        "IP Port missing. Please provide the IP Port.",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("username") == false) {
      return helper.getErrorResponse(
        false,
        "Username missing. Please provide the username",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("password") == false) {
      return helper.getErrorResponse(
        false,
        "Password missing. Please provide the password",
        "SITE STATUS UPDATE",
        ""
      );
    }
    if (admin.hasOwnProperty("imagepath") == false) {
      return helper.getErrorResponse(
        false,
        "Image path missing. Please provide the imagepath",
        "SITE STATUS UPDATE",
        ""
      );
    }

    const [sql] = await db.spcall(`CALL SP_SITE_STATUS(?,?,?,?,?,?,?,?,?,?);`, [
      admin.sdkid,
      admin.siteid,
      admin.alertmessage,
      admin.deviceid,
      admin.devicename,
      admin.ipaddress,
      admin.ipport,
      admin.username,
      admin.password,
      admin.imagepath,
    ]);
    if (sql.affectedRows) {
      return helper.getSuccessResponse(
        true,
        "Site status Updated successfully",
        sql,
        ""
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Error updating the site status",
        sql
      );
    }
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. please contact Administration",
      er,
      ""
    );
  }
}
module.exports = {
  genCustomerSiteInvoice,
  addcompany,
  addcompanysite,
  newsubscription,
  addsubscriptionbilling,
  createcustomerpayment,
  getTotalSite,
  getTotalDevice,
  getNoofCamera,
  getTotalEvents,
  getCritEvent,
  getNoofDevice,
  getNoofSpeakers,
  ApikeyGeneration,
  getWhatsappEvent,
  addsiteconfig,
  getDeviceinfo,
  getsitelist,
  getdevicelist,
  SiteStatus,
  DeviceStatus,
  Dblist,
  Fetchconfigpath,
  StoragePath,
  SiteModify,
  DeviceModify,
  UpdateSite,
  OrganizationList,
  Companylist,
  Individuallist,
  DemoList,
  AddUpdatecompany,
  AddOrganization,
  AddIndividual,
  Sdklist,
  cameralist,
  CameraSeverity,
  CameraActivate,
  CameraDeactivate,
  addCustomerSubscription,
  GetSiteSub,
  GetSubscriptionlist,
  Addcontact,
  Emergencyservice,
  SiteGraph,
  FetchCustomerlist,
  Sitelist,
  AddRegion,
  GetNotificationServer,
  addnotificationserver,
  UpdateNotificationserver,
  getDeviceDetails,
  AddAIMachine,
  GetAImachine,
  UpdateAImachine,
  AddStorageServer,
  Fetchstoragepath,
  AddDatabaseserver,
  FetchDatabaseServer,
  UpdateDatabaseserver,
  AddApplicationserver,
  FetchApplicationserver,
  Updatestorageserver,
  UpdateApplicationserver,
  Addwebserver,
  Fetchwebserver,
  ExportSite,
  Takecamerasnapshot,
  UpdateDeviceStart,
  UpdateDeviceStop,
  UpdateSiteStart,
  RestartDevice,
  Updatewebserver,
  AddEventForAI,
  addeventruntime,
  addCommunicationServer,
  FetchCommunicationServer,
  UpdateCommunicationServer,
  addloadbalancerserver,
  Fetchloadbalancerserver,
  Updateloadbalancerserver,
  Modifynotificationserver,
  ModifyDatabaseserver,
  ModifyWebserver,
  ModifyApplicatiobserver,
  ModifyAIserver,
  Modifylbserver,
  ModifyCommunicationserver,
  ModifyStorageserver,
  FetchAllServer,
  DashBoardCount,
  GetRegion,
  AddEcs,
  GetEcs,
  UpdateHideStatus,
  UpdateSiteController,
  DeleteSite,
  UpdateAIProcess,
  AIStopUpdate,
  UpdateNewEnginePath,
  GetAIMachineProcess,
  AIRollback,
  GetSiteControllerProcess,
  AddEventPath,
  UpdateDevice,
  GetObjectNames,
  SiteStatusUpdate,
};
