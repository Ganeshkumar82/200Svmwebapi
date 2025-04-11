const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function getMultiple(page = 1){
  const offset = helper.getOffset(page, config.listPerPage);
  const rows = await db.query(
    `SELECT Subscription_ID,Subscription_type, package_Name,	No_of_Devices, No_of_Cameras, Addl_cameras,Addl_patrol,Patrol_hours,Valid_Months,Valid_Years,Valid_Days,No_of_Analytics,Cloud_Storage,Amount,product_desc,Created_by
    FROM subscriptionmaster LIMIT ${offset},${config.listPerPage}`
  );
  const data = helper.emptyOrRows(rows);
  const meta = {page};

  return {
    data,
    meta
  }
}
//####################################################################################################################################################################################################
//###################################   NEW SUBSCRIPTION   #########################################################################################################################################################
//####################################################################################################################################################################################################
//This function is used to customer to login with password
//Input data
//   {
//    "Subscription_type":1,
//    "Subscription_Name":"TestSubscription",
//    "features":[{"name":"No of Site","type":0,"total":2,"amount":1000},{"name":"No of Devices","type":1,"total":4,"amount":1000},{"name":"No of Channels","type":2,"total":16,"amount":1000},{"name":"Cloud Storage","type":6,"total":1024,"amount":1000},{"name":"Patrol","type":8,"total":1,"amount":500},{"name":"No of Analytic","type":11,"total":2,"amount":1000}],
//    "Amount":12500,
//    "product_desc":"Checking the product",
//    "Created_by":2
//    }
//Validation rule
//      1. API Key checking for REST API Security
//      2. Decrypt querystring data
//      3. Validate the input data
//      4. Subscription type should be numeric and within 2 digits only
//      5. Package name should not exceed 250 charactors
//      6. Features data field should be validated
//      7. Amount should not exceed more than 100000, amount should be number
//      8. Created by should be numeric digit, and ID value of 11 charactors
//      9. Bill type should be numeric
//     10. call subscription master add stored procedure
//     11. call each features subscription trans add stored procedure
//     12. create encrypted response
//####################################################################################################################################################################################################
async function create(subscription){
  //Begin Validation 1. API Key checking
  const ApiCheck = helper.checkAPIKey(subscription.APIKey,subscription.Secret);
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
    return helper.getErrorResponse("API_KEY_ERROR","SUBSCRIPTION",subscription.Secret);
  }
  //End of Validation 1
  //Begin Validation 2. decrypt querystring data
  console.log("querystring=>"+subscription.querystring);
  var queryData;
  try
  {
    queryData = JSON.parse(await helper.decrypt(subscription.querystring,subscription.Secret));
    console.log("decrypted queryData=>"+JSON.stringify(queryData));
  }
  catch(ex)
  {
    return helper.getErrorResponse("REG_QUERY_ERROR","SUBSCRIPTION",subscription.Secret);
  }
  //End of Validation 2

  //Begin Validation 3. Validate the input data
  //    4. Subscription type should be numeric and within 2 digits only
  if (queryData.Subscription_type.length>2)
  { 
    return helper.getErrorResponse("SUBS_DATA_SIZE_ERROR","Subscription_type",subscription.Secret);
  }
  if (Number.isInteger(queryData.Subscription_type)==false)
  {
    return helper.getErrorResponse("SUBS_DATA_TYPE_ERROR","Subscription_type",subscription.Secret);
  }
  //End of Validation 4
  //Begin Validation 5. Package name should not exceed 250 charactors
  if (queryData.Subscription_type.length>250)
  {
    return helper.getErrorResponse("SUBS_DATA_SIZE_ERROR","Subscription_type",subscription.Secret);
  }
  //End of Validation 5
  //Begin Validation 6. Features data field should be validated
  if(queryData.hasOwnProperty('features')==false){
    return helper.getErrorResponse("SUBS_DATA_MISSING_ERROR","features",subscription.Secret);
  }
  if (queryData.features.length==0)
  {
    return helper.getErrorResponse("SUBS_DATA_SIZE_ERROR","features",subscription.Secret);
  }
  if (Number.isInteger(queryData.features[0].type)==false)
  {
    return helper.getErrorResponse("SUBS_DATA_TYPE_ERROR","features",subscription.Secret);
  }
  //End of Validation 6
  //Begin Validation 7. Amount should not exceed more than 100000, amount should be number
  if (Number.isInteger(queryData.Amount)==false)
  {
    return helper.getErrorResponse("SUBS_DATA_TYPE_ERROR","Amount",subscription.Secret);
  }
  if (queryData.Amount<100 || queryData.Amount>100000)
  {
    return helper.getErrorResponse("SUBS_DATA_AMOUNT_ERROR","Amount",subscription.Secret);
  }
  //End of Validation 7
  //Begin Validation 8.Created by should be numeric digit, and ID value of 11 charactors
  if (Number.isInteger(queryData.Created_by)==false)
  {
    return helper.getErrorResponse("SUBS_DATA_TYPE_ERROR","Created_by",subscription.Secret);
  }
  //End of Validation 8
  //Begin Validation 9. Bill type should be numeric
  if (Number.isInteger(queryData.billtype)==false)
  {
    return helper.getErrorResponse("SUBS_DATA_TYPE_ERROR","Created_by",subscription.Secret);
  }
  console.log("\nSubscription was successfully added");
  //End of Validation 9
  //Calling Subscription master add stored procedure
  const [result] = await db.spcall('CALL SP_SUB_ADD(?,?,?,?,?,?,@result);select @result;',[queryData.Subscription_type,queryData.Subscription_Name,queryData.Amount,queryData.billtype,queryData.product_desc,queryData.Created_by]);
  const objectValue = result[1][0];
  console.log("Subscription, objectValue->"+objectValue["@result"]);
  if (objectValue["@result"]==null) {    
    return helper.getErrorResponse("SUBS_DATA_TYPE_ERROR","Created_by",subscription.Secret);
  }
  else
  {
    for await (const element of queryData.features) {
      const [result1] = await db.spcall('CALL SP_SUB_TRANS_ADD(?,?,?,?,?,?,@result);select @result;',[objectValue["@result"],element.name,element.type,element.amount,element.total,queryData.Created_by]);
      const objectValue1 = result1[1][0];
      console.log("Subscription, objectValue1->"+objectValue1["@result"]);
      if (objectValue1["@result"]==null) {    

      }
    }   
    return  helper.getSuccessResponse("SUBSCRIPTION_SUCCESS","Subscription was successfully added",subscription.Secret);
  }
}

async function update(id, subscription){
  const result = await db.query(
    `UPDATE subscriptionmaster SET Subscription_type="${subscription.Subscription_type}", Subscription_Name="${subscription.Subscription_Name}", No_of_Devices="${subscription.No_of_Devices}", 
    No_of_Cameras="${subscription.No_of_Cameras}", Addl_cameras="${subscription.Addl_cameras}" , Addl_patrol="${subscription.Addl_patrol}" , Patrol_hours="${subscription.Patrol_hours}" 
	, Valid_Months="${subscription.Valid_Months}", Valid_Years="${subscription.Valid_Years}" , Valid_Days="${subscription.Valid_Days}" , No_of_Analytics="${subscription.No_of_Analytics}" 
	, Cloud_Storage="${subscription.Cloud_Storage}" , Amount="${subscription.Amount}" , product_desc="${subscription.product_desc}" , Created_by="${subscription.Created_by}" 
    WHERE Subscription_ID =${id}` 
  );

  let message = 'Error in updating subscription package';
  if (result.affectedRows) {
    message = 'Subscription package updated successfully';
  }
  return {message};
}

async function remove(id){
  const result = await db.query(
    `DELETE FROM subscriptionmaster WHERE Subscription_ID=${id}`
  );

  let message = 'Error in deleting subscription package';

  if (result.affectedRows) {
    message = 'subscription package deleted successfully';
  }

  return {message};
}

// get the subscription package name
async function getSubscriptionname(subscription){
  //LOGIN SESSIONTOKEN ERROR
  if(subscription.STOKEN.length < 30 || subscription.STOKEN.length > 50 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET CUSTOMER SUBSCRPITION NAME","");
  }
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
   const [result]= await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[subscription.STOKEN]);
   const objectvalue = result[1][0];
   console.log("Get subscription package NAME-->"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET CUSTOMER SUBSCRPITION NAME","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(subscription.hasOwnProperty("STOKEN")==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","GET CUSTOMER SUBSCRPITION NAME","");
  }
  var secret = subscription.STOKEN.substring(0,16);
  console.log("SECRET ->"+secret);
  
  let sql="";
  let rows ="";
  
  sql=`SELECT subscription_id,package_name FROM subscriptionmaster`;
  rows = await db.query(sql);

  if (rows!="")
  { 
    const data = JSON.stringify(helper.emptyOrRows(rows));
    console.log(data);
    return helper.getSuccessResponse("PACKAGE_NAME_FETCHED_SUCCESSFULLY","The Subscription Package Name Fetched Successfully",data,secret);
  }
  else
  {
    return helper.getErrorResponse("PACKAGE_NAME_FETCHING_ERROR","Error while fetching the Subscription Package Name.",secret);
  }
}

// GEt CUSTOMER SUBSCRIPTION PACKAGE DETAILS

async function getSubscriptionPackageDetails(subscription){
//LOGIN SESSIONTOKEN ERROR
if(subscription.STOKEN.length < 30 || subscription.STOKEN.length > 50 ){
  return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET CUSTOMER SUBSCRPITION NAME","");
}
//CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
 const [result]= await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[subscription.STOKEN]);
 const objectvalue = result[1][0];
 console.log("Get subscription package NAME-->"+objectvalue["@result"]);
if(objectvalue["@result"]==null){
  return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET CUSTOMER SUBSCRPITION NAME","");
}
//CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
if(subscription.hasOwnProperty("STOKEN")==false){
  return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","GET CUSTOMER SUBSCRPITION NAME","");
}
var secret = subscription.STOKEN.substring(0,16);
console.log("SECRET ->"+secret);
if(subscription.subscriptionid  == null){
  return helper.getErrorResponse("CUSTOMER_SUBSCRIPTION_ID_MISSING","GET CUSTOMER SUBSCRIPTION DETAILS",secret);
}
let sql="";
let rows ="";
if (subscription.subscriptionid != "") {
  sql = `SELECT subscription_id, package_name, 
                IFNULL(No_of_Devices, 0) as No_of_Devices, 
                IFNULL(No_of_cameras, 0) as No_of_cameras, 
                IFNULL(Addl_cameras, 0) as Addl_cameras, 
                IFNULL(amount, 0) as amount, 
                IFNULL(product_desc, 'No package details available. Please contact administration') as product_desc 
         FROM subscriptionmaster 
         WHERE subscription_id = ${subscription.subscriptionid} AND status = 1`;
  rows = await db.query(sql);
} else {
  sql = `SELECT subscription_id, package_name, 
                IFNULL(No_of_Devices, 0) as No_of_Devices, 
                IFNULL(No_of_cameras, 0) as No_of_cameras, 
                IFNULL(Addl_cameras, 0) as Addl_cameras, 
                IFNULL(amount, 0) as amount, 
                IFNULL(product_desc, 'No package details available. Please contact administration') as product_desc 
         FROM subscriptionmaster 
         WHERE status = 1`;
  rows = await db.query(sql);
}
if (rows!="")
{ 
  const data = JSON.stringify(helper.emptyOrRows(rows));
  console.log(data);
  return helper.getSuccessResponse("PACKAGE_DETAILS_FETCHED_SUCCESSFULLY","The Subscription Package Details Fetched Successfully",data,secret);
}
else
 {
  return helper.getErrorResponse("PACKAGE_DETAILS_FETCHING_ERROR","Error while fetching the Subscription Package Details.",secret);
 }

}


module.exports = {
  getMultiple,
  create,
  update,
  remove,
  getSubscriptionname,
  getSubscriptionPackageDetails
}