const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function create(branch){
    let message = 'Error in creating new site';
    let responsecode = "7001"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+branch.userid+' and token="'+branch.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "7001"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL addbranch('+branch.customerid+',"'+branch.branchname+'","'+branch.address+'", "'+branch.location+'","'+branch.location+'","'+branch.email+'","'+branch.phone+'","'+branch.city+'",' +branch.pincode+',"'+branch.state+'",'+branch.userid+','+branch.motp+','+branch.eotp+',"'+branch.contactperson+'")');

    if (result.affectedRows) {
      responsecode = "701"
      message = 'Site created successfully';
    }
  
    return {responsecode,message};
}
//############################################################################################################################################################################################################################
//####################### ADD CUSTOMER ORGANIZATION BRANCH #####################################################################################################################################################################################################
//#####################################################################################################################################################################################################################
async function addbranch(branch){
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length>50 || branch.STOKEN.length<30){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","CUSTOMER ORGANIZATION ADD BRANCH","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  console.log("add branch objectvalue->"+objectvalue["@result"]);
  const userid = objectvalue["@result"];
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CUSTOMER ORGANIZATION ADD BRANCH","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS INPUT OR NOT
  if(branch.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","CUSTOMER ORGANIZATION ADD BRANCH","");
  }
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret-->"+secret);
  //decrypt  the querystring
  console.log("querystring=>"+customer.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(customer.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("_BRANCH_PACKAGE_QUERY_ERROR","CUSTOMER ADD BRANCH",secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("BRANCH_JSON_ERROR","CUSTOMER ADD BRANCH",secret);
  }
  //CHECK IF THE COMPANY ID IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('companyid')==false){
    return helper.getErrorResponse("COMPANY_ID_MISSING","CUSTOMER ADD BRANCH",secret);
  }
  //CHECK IF THE BRANCH NAME IS GIVEN AS AN INPUT OR NOT
  if(queryData.hasOwnProperty('branchname')==false){
    return helper.getErrorResponse("BRANCH_NAME_MISSING","CUSTOMER ADD BRANCH",secret);
  }
  //check if the address is given as an input or not
  if(queryData.hasOwnProperty('address')==false){
    return helper.getErrorResponse("BRANCH_ADDRESS_MISSING","CUSTOMER ADD BRANCH",secret);
  }
  //CHECK IF THE CITY IS GIVEN AS AN INPUT OR NOT
  if(queryData.hasOwnProperty('city')==false){
    return helper.getErrorResponse("BRANCH_CITY_MISSING","CUSTOMER ADD BRANCH",secret);
  }
  //CHECK IF THE STATE IS GIVEN AS AN INPUT OR NOT
  if(queryData.hasOwnProperty('state')==false){
    return helper.getErrorResponse("BRANCH_STATE_MISSING","CUSTOMER ADD BRANCH",secret);
  }
  //CHECK IF THE PINCODE IS GIVEN AS AN INPUT OR NOT
  if(queryData.hasOwnProperty('pincode')==false){
    return helper.getErrorResponse("BRANCH_PINCODE_MISSING","CUSTOMER ADD BRANCH",secret);
  }

  const [custid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[customer.STOKEN]);
  const objectvalue3 = custid[1][0];
  console.log("customerid-->"+objectvalue3["@result"]);
  const customer_id = objectvalue3["@result"];
// ADD THE VALUE TO THE BRANCH STORED PROCEDURE
  const [result1] = await db.spcall('CALL SP_INDIVIDUAL_SITE_ADD(?,?,?,?,?,?,?,@result); select @result',[customer_id,queryData.branchname,queryData.address,queryData.city,
    queryData.state,queryData.pincode,userid]);
    const objectvalue1 = result1["@result"];
    console.log(objectvalue1["@result"]);
    var branch_id = objectvalue1["@result"];
    if(branch_id != null){
      try{
        const [result1] = await db.spcall('CALL SP_SITE_DEPT_ADD(?,?,?,?,@result); select @result',[branch_id,queryData.sitename,queryData.city,userid]);
        const objectvalue2 =result1[1][0];
        console.log("deptid ->"+ objectvalue2["@result"]);
        deptid = objectvalue2["@result"];
      }
      catch(er){
         return helper.getErrorResponse("CUSTOMER_ADD_BRANCH_DEPARTMENT_FAILED","CUSTOMER ADD BRANCH",secret);
      }
    }
    if(branch_id !=null){
      return helper.getSuccessResponse("ADD_BRANCH_SUCCESS","CUSTOMER ADD BRANCH",branch_id,secret);
    } 
    else{
      return helper.getErrorResponse("ADD_BRANCH_FAILED","CUSTOMER ADD BRANCH",branch_id,secret);
    }
}
//##################################################################################################################################################################################################################
//##################################################################################################################################################################################################################

async function update(branch){
  let message = 'Error in updating site data';
  let responsecode = "7002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+branch.userid+' and token="'+branch.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "7002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `update branchmaster set Customer_ID=${branch.customerid},Branch_name="${branch.branchname}",Address="${branch.address}",Latitude="${branch.location}",Longitude="${branch.location}",Email_ID="${branch.email}",Contact_no="${branch.phone}",city="${branch.city}",pincode=${branch.pincode},state="${branch.state}",created_by=${branch.userid},mobileotp=${branch.motp},emailotp=${branch.eotp},contact_person="${branch.contactperson}" WHERE branch_id=${branch.branchid}`);

  if (result.affectedRows) {
      responsecode = "702"
      message = 'Site updated successfully';
  }

  return {message};
}

async function deletedata(branch){
  let message = 'Error in deleting site data';
  let responsecode = "7003"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+branch.userid+' and token="'+branch.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "7003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from branchmaster WHERE branch_id=${branch.branchid}` 
  );

  if (result.affectedRows) {
      responsecode = "703"
      message = 'Site deleted successfully';
  }

  return {message};
}

async function getMultiple(page = 1,branch){
  let message = 'Error in fetching branch list';
  let responsecode = "7004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+branch.userid+' and token="'+branch.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "7003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (branch.branchid!=0)
    sql=`SELECT * FROM branchmaster where branch_id=${branch.branchid} LIMIT ${offset},${config.listPerPage}`;
  if (branch.customerid!=0)
    sql=`SELECT * FROM branchmaster where customer_id=${branch.customerid} LIMIT ${offset},${config.listPerPage}`;

  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Site list Fetching successfully';
    responsecode = "704"

    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'Branch/Customer ID is missing. Please give any one of the input of Branch/Customer ID';
    responsecode = "7004"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}


//Create Site Timing
async function createSiteTiming(sitetiming){
  let message = 'Error in creating new Site Timing';
  let responsecode = "7005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+sitetiming.userid+' and token="'+sitetiming.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "7005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL addsiteschedule('+sitetiming.branchid+',"'+sitetiming.starttime+'","'+sitetiming.endtime+'", '+sitetiming.scheduletype+',"'+sitetiming.scheduledays+'","'+sitetiming.holidays+'",'+sitetiming.userid+','+sitetiming.shifttype+')');

  if (result.affectedRows) {
    responsecode = "705"
    message = 'Site Timing created successfully';
  }

  return {responsecode,message};
}


async function updateSiteTiming(sitetiming){
let message = 'Error in updating site timing data';
let responsecode = "7006"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+sitetiming.userid+' and token="'+sitetiming.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "7006"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update sitetimings set branch_id=${sitetiming.branchid},starttime=CONCAT(DATE(starttime)," ","${sitetiming.starttime}"),endtime=CONCAT(DATE(starttime)," ","${sitetiming.endtime}"), schedule_type=${sitetiming.scheduletype},schedule_days="${sitetiming.scheduledays}",holidays="${sitetiming.holidays}",created_by=${sitetiming.userid},shifttype=${sitetiming.shifttype} WHERE schedule_id=${sitetiming.scheduleid}`);

if (result.affectedRows) {
    responsecode = "706"
    message = 'Site timing updated successfully';
}

return {message};
}

async function deletedataSiteTiming(sitetiming){
let message = 'Error in deleting site timing data';
let responsecode = "7007"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+sitetiming.userid+' and token="'+sitetiming.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "7007"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `DELETE from sitetimings WHERE schedule_id=${sitetiming.scheduleid}` 
);

if (result.affectedRows) {
    responsecode = "707"
    message = 'Site timing deleted successfully';
}

return {message};
}

async function getSiteTimingMultiple(page = 1,sitetiming){
let message = 'Error in fetching Site timing list';
let responsecode = "7008"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+sitetiming.userid+' and token="'+sitetiming.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "7008"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (sitetiming.branchid!=0)
  sql=`SELECT * FROM sitetimings where branch_id=${sitetiming.branchid} LIMIT ${offset},${config.listPerPage}`;
if (sitetiming.customerid!=0)
  sql=`SELECT * FROM sitetimings where branch_id in (select branch_id from branchmaster where customer_id=${sitetiming.customerid}) LIMIT ${offset},${config.listPerPage}`;

if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Site timing list Fetching successfully';
  responsecode = "708"

  return {
    responsecode,
    message,
    data,
    meta
  }
}
else
{
  message = 'Branch/Customer ID is missing. Please give any one of the input of Branch/Customer ID';
  responsecode = "7008"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}

//#####################################################################################################################################################################################################################
//########################### ADD CUSTOMER BRANCH EMERGENCY CONTACT ########################################################################################################################################################################
//####################################################################################################################################################################################################
async function addemergencycontact(branch) {
  try {
    if (!branch.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "Sessiontoken is missing. Please provide a valid sessiontoken.", "ADD BRANCH EMERGENCY CONTACT", "");
    }
    var secret = branch.STOKEN.substring(0, 16);
    console.log("secret -> " + secret)

    if (branch.STOKEN.length < 30 || branch.STOKEN.length > 50) {
      return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "The size of the sessiontoken is invalid. Please provide a valid sessiontoken.", "ADD BRANCH EMERGENCY CONTACT", secret);
    }

    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [branch.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    if (userid == null) {
      return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "Invalid or expired sessiontoken. Please login again to obtain a new sessiontoken.", "ADD BRANCH EMERGENCY CONTACT", secret);
    }

    if (!branch.hasOwnProperty('querystring')) {
      return helper.getErrorResponse("EMERGENCY_QUERYSTRING_MISSING_ERROR", "The querystring is missing. Please provide a valid querystring.", "ADD BRANCH EMERGENCY CONTACT", secret);
    }

    var querydata;
    let emergencycontact = [];
    try {
      querydata = await helper.decrypt(branch.querystring, secret);
      console.log("decrypted querydata->", querydata);
    } catch (er) {
      return helper.getErrorResponse("QUERYSTRING_ERROR", "There is an error with the querystring format. Please provide a valid querystring.", er, secret);
    }

    try {
      const parsedData = JSON.parse(querydata);
      if (Array.isArray(parsedData)) {
        emergencycontact = parsedData;
      } else {
        emergencycontact.push(parsedData);
      }
    } catch (er) {
      return helper.getErrorResponse("QUERYSTRING_JSON_ERROR", "There is an error with the querystring format. Please provide a valid querystring.", er, secret);
    }

    try {
      for (const contact of emergencycontact) {
        const { deptid, name, phoneno, emailid } = contact;

        if (!deptid) {
          return helper.getErrorResponse("EMERGENCY_CONTACT_DEPT_ID_MISSING", "The branch emergency contact department id is missing", "error", secret);
        }
        if (!name) {
          return helper.getErrorResponse("EMERGENCY_CONTACT_NAME_MISSING", "The branch emergency contact name is missing", "error", secret);
        }
        if (!phoneno) {
          return helper.getErrorResponse("EMERGENCY_CONTACT_PHONENO_MISSING", "The branch emergency contact phone number is missing", "error", secret);
        }
        if (!emailid) {
          return helper.getErrorResponse("EMERGENCY_CONTACT_EMAILID_MISSING", "The branch emergency contact emailid is missing", "error", secret);
        }

        const [result1] = await db.spcall('CALL SP_EMERGENCY_CONTACT_ADD(?,?,?,?,@emergencyid); select @emergencyid', [deptid, phoneno, emailid, userid]);
        const objectvalue2 = result1[1][0];
        let emergencyid = objectvalue2["@emergencyid"];
        console.log("Emergency id value ->" + emergencyid);

        if (emergencyid == null) {
          return helper.getErrorResponse("BRANCH_EMERGENCY_CONTACT_ADDED_FAILED", "Error while adding the Customer branch emergency contact", "error", secret);
        }
      }

      // Return success response after the loop if all contacts are added successfully
      return helper.getSuccessResponse("EMERGENCY_CONTACTS_ADDED_SUCCESSFULLY", "All emergency contacts were added successfully","success", secret);

    } catch (error) {
      console.error("Error adding emergency contacts:", error);
      return helper.getErrorResponse("INTERNAL_SERVER_ERROR", "Internal Server error. Please contact administration", error, secret);
    }
  } catch (error) {
    return helper.getErrorResponse("INTERNAL_SERVER_ERROR", "Internal Server error. Please contact administration", error, secret);
  }
}





//##########################################################################################################################################################################################
//##########################################################################################################################################################################################
//Create Site Timing
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################


async function createsiteTiming(branch){
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length < 30 || branch.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","CREATE SITE TIMING","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CREATE SITE TIMING","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(branch.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","CREATE SITE TIMING","");
  }
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(branch.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("SITE_TIMING_QUERYSTRING_MISSING_ERROR","CREATE SITE TIMING","");
  }
  
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // DECRYPT THE QUERYSTRING USING SECRET KEY
  var querydata;
  try{ 
     querydata = await helper.decrypt(branch.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_PACKAGE_QUERY_ERROR","CREATE SITE TIMING",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_JSON_ERROR","CREATE SITE TIMING",secret);
  }
  if(querydata.hasOwnProperty('branchid')== false || querydata.branchid ==''){
    return helper.getErrorResponse("SITE_TIMING_BRANCH_ID_MISSING","CREATE SITE TIMING",secret)
  }
   // CHECK IF THE START TIME IS GIVEN AS AN INPUT OR NOT
   if(querydata.hasOwnProperty('starttime')==false || querydata.starttime ==''){
    return helper.getErrorResponse("SITE_START_TIME_MISSING","CREATE SITE TIMING",secret);
  }
  // CHECK IF THE END TIME IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('endtime')==false || querydata.endtime ==''){
    return helper.getErrorResponse("SITE_END_TIME_MISSING","CREATE SITE TIMING",secret);
  }
  //CHECK IF THE SCHEDULE TYPE IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('scheduletype')==false|| querydata.scheduletype ==''){
    return helper.getErrorResponse('TIMING_SCHEDULE_TYPE_MISSING',"CREATE SITE TIMING",secret);
  }
  //CHECK IF THE SCHEDULE DAYS IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('scheduledays')==false || querydata.scheduledays ==''){
    return helper.getErrorResponse("TIMING_SCHEDULE_DAYS_MISSING","CREATE SITE TIMING",secret);
  }
  //CHECK IF THE HOLIDAYS IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('holidays')==false || querydata.holidays ==''){
    return helper.getErrorResponse("SITE_HOLIDAYS_MISSING","CREATE SITE TIMING",secret);
  }
  //CHECK IF THE SHIFT TYPE  IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty("shifttype")==false || querydata.shifttype ==''){
    return helper.getErrorResponse("SITE_SHIFT_TYPE_MISSING","CREATE SITE TIMING",secret);
  }
  try {
  const [result1] = await db.spcall(`CALL SP_ADD_SITE_TIMINGS(?,?,?,?,?,?,?,?,@scheduleid); select @scheduleid;`,[querydata.branchid,querydata.starttime,querydata.endtime,querydata.scheduletype,querydata.scheduledays,querydata.holidays,userid,querydata.shifttype]);
  const objectValue = result1[1][0];
  const scheduleid = objectValue["@scheduleid"];
  if(scheduleid != null){
    return helper.getSuccessResponse("SITE_TIMING_CREATED_SUCCESSFULLY","Site timing Created successfully",scheduleid,secret);
  }
  else {
    return helper.getErrorResponse("ERROR_CREATING_SITE_TIMING","Error while creating the site timings",secret);
  }} catch (error) {
    return helper.getErrorResponse("INTERNAL_SERVER_ERROR","Internal Server error. Please contact administration",error,secret);
  }

}


//##########################################################################################################################################################################################
//##########################################################################################################################################################################################
//############################### UPDATE THE SITE TIMING ###################################################################################################################################
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################


async function updatesiteTiming(branch){
  let message = 'Error in updating site timing data';
  let responsecode = "7006"
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length < 30 || branch.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","UPDATE SITE TIMING","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","UPDATE SITE TIMING","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(branch.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","UPDATE SITE TIMING","");
  }
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(branch.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("SITE_TIMING_QUERYSTRING_MISSING_ERROR","UPDATE SITE TIMING","");
  }
  
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // DECRYPT THE QUERYSTRING USING SECRET KEY
  var querydata;
  try{ 
     querydata = await helper.decrypt(branch.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_PACKAGE_QUERY_ERROR","UPDATE SITE TIMING",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_JSON_ERROR","UPDATE SITE TIMING",secret);
  }
  if(querydata.hasOwnProperty('branchid')== false || querydata.branchid ==''){
    return helper.getErrorResponse("SITE_TIMING_BRANCH_ID_MISSING","UPDATE SITE TIMING",secret)
  }
   // CHECK IF THE START TIME IS GIVEN AS AN INPUT OR NOT
   if(querydata.hasOwnProperty('starttime')==false || querydata.starttime ==''){
    return helper.getErrorResponse("SITE_START_TIME_MISSING","UPDATE SITE TIMING",secret);
  }
  // CHECK IF THE END TIME IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('endtime')==false || querydata.endtime ==''){
    return helper.getErrorResponse("SITE_END_TIME_MISSING","UPDATE SITE TIMING",secret);
  }
  //CHECK IF THE SCHEDULE TYPE IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('scheduletype')==false|| querydata.scheduletype ==''){
    return helper.getErrorResponse('TIMING_SCHEDULE_TYPE_MISSING',"UPDATE SITE TIMING",secret);
  }
  //CHECK IF THE SCHEDULE DAYS IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('scheduledays')==false || querydata.scheduledays ==''){
    return helper.getErrorResponse("TIMING_SCHEDULE_DAYS_MISSING","UPDATE SITE TIMING",secret);
  }
  //CHECK IF THE HOLIDAYS IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty('holidays')==false || querydata.holidays ==''){
    return helper.getErrorResponse("SITE_HOLIDAYS_MISSING","UPDATE SITE TIMING",secret);
  }
  //CHECK IF THE SHIFT TYPE  IS GIVEN AS AN INPUT OR NOT
  if(querydata.hasOwnProperty("shifttype")==false || querydata.shifttype ==''){
    return helper.getErrorResponse("SITE_SHIFT_TYPE_MISSING","UPDATE SITE TIMING",secret);
  }
  if(querydata.hasOwnProperty('scheduleid')== false || querydata.scheduleid ==''){
    return helper.getErrorResponse("SITE_SCHEDULE_ID_MISSING","UPDATE SITE TIMING",secret);
  }
try{
  const result1 = await db.query(
    `update sitetimings set branch_id=${querydata.branchid},starttime=CONCAT(DATE(starttime)," ","${querydata.starttime}"),endtime=CONCAT(DATE(starttime)," ","${querydata.endtime}"), schedule_type=${querydata.scheduletype},schedule_days="${querydata.scheduledays}",holidays="${querydata.holidays}",created_by=${userid},shifttype=${querydata.shifttype} WHERE schedule_id=${querydata.scheduleid}`);
    if (result1.affectedRows) {
       return helper.getSuccessResponse("SITE_TIMING_UPDATED_SUCCESSFULLY","Site Timings Updated successfully","success",secret);
      }
      else{
       return helper.getErrorResponse("ERROR_UPDATING_SITE_TIME","Error in updating the Site Timing","error",secret);
     }
  }catch(error){
    return helper.getErrorResponse("INTERNAL_SERVER_ERROR","Internal Server error. Please contact administration",error,secret);
}
  
      
  }


  //##########################################################################################################################################################################################
//##########################################################################################################################################################################################
//############################### UPDATE THE SITE TIMING ###########################################################################################################################
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################


async function deletesiteTiming(branch){
  let message = 'Error in deleting site timing data';
  let responsecode = "7006"
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length < 30 || branch.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","DELETE SITE TIMING DATA","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","DELETE SITE TIMING DATA","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(branch.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","DELETE SITE TIMING DATA","");
  }
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(branch.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("SITE_TIMING_QUERYSTRING_MISSING_ERROR","DELETE SITE TIMING DATA","");
  }
  
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // DECRYPT THE QUERYSTRING USING SECRET KEY
  var querydata;
  try{ 
     querydata = await helper.decrypt(branch.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_PACKAGE_QUERY_ERROR","DELETE SITE TIMING DATA",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_JSON_ERROR","DELETE SITE TIMING DATA",secret);
  }

  if(querydata.hasOwnProperty('scheduleid')== false || querydata.scheduleid ==''){
    return helper.getErrorResponse("SITE_SCHEDULE_ID_MISSING","DELETE SITE TIMING DATA",secret);
  }

  const result1 = await db.query(
    `DELETE from sitetimings WHERE schedule_id=${querydata.scheduleid}`);
  
  if (result1.affectedRows) {
      responsecode = "706"
      message = 'Site timing deleted successfully';
      const encrypt = helper.encrypt(JSON.stringify({
        responsecode,
        message
        }), secret);
        return encrypt;
      }
      else{
         message = 'Error in deleting site timing data';
         responsecode = "7006"
      const encrypt = helper.encrypt(JSON.stringify({
        responsecode,
        message
        }), secret);
        return encrypt;
      }
      const encrypt = helper.encrypt(JSON.stringify({
        responsecode,
        message
        }), secret);
        return encrypt; 
  }


  //##########################################################################################################################################################################################
//##########################################################################################################################################################################################
//############################### Get the site location ###########################################################################################################################
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################


async function GetSiteLocation(branch){
  let message = 'Error in fetching the site location';
  let responsecode = "7006"
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length < 30 || branch.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","GET SITE LOCATION","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET SITE LOCATION","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(branch.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","GET SITE LOCATION","");
  }
  // //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  // if(branch.hasOwnProperty('querystring')== false){
  //   return helper.getErrorResponse("SITE_TIMING_QUERYSTRING_MISSING_ERROR","GET SITE LOCATION","");
  // }
  
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // // DECRYPT THE QUERYSTRING USING SECRET KEY
  // var querydata;
  // try{ 
  //    querydata = await helper.decrypt(branch.querystring,secret);
  //    console.log("decrypted querydata->"+querydata);
  // }
  // catch(ex){
  //   return helper.getErrorResponse("SITE_TIMING_PACKAGE_QUERY_ERROR","GET SITE LOCATION",secret);
  // }
  // try{
  //   querydata= JSON.parse(querydata);
  // }
  // catch(ex){
  //   return helper.getErrorResponse("SITE_TIMING_JSON_ERROR","DELETE SITE TIMING DATA",secret);
  // }

  // if(querydata.hasOwnProperty('scheduleid')== false || querydata.scheduleid ==''){
  //   return helper.getErrorResponse("SITE_SCHEDULE_ID_MISSING","DELETE SITE TIMING DATA",secret);
  // }
  const [custid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[branch.STOKEN]);
  const objectvalue3 = custid[1][0];
  console.log("customerid-->"+objectvalue3["@result"]);
  const customerregid = objectvalue3["@result"];
  let sql1=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql1= `select Branch_ID,TRIM(Branch_name) AS Branch_name,Address,city,pincode,state,Latitude,Longitude from branchmaster`; 
  // where Customer_ID IN (select Customer_ID from customermaster where customerreg_id = ${customerregid})`;
  // console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  // console.error(`rows==>`, rows1);
  const location = helper.emptyOrRows(rows1);

    message = 'Site location Fetching successfully';
    responsecode = "807"
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message,
  location
  }), secret);
  return encrypt;
  }



//##########################################################################################################################################################################################
//##########################################################################################################################################################################################
//############################### delete the site location ###########################################################################################################################
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################


async function DeleteSiteLocation(branch){
  let message = 'Error while deleting the site location';
  let responsecode = "7006"
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length < 30 || branch.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","DELETE SITE LOCATION","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","DELETE SITE LOCATION","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(branch.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","DELETE SITE LOCATION","");
  }
  // //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(branch.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("SITE_TIMING_QUERYSTRING_MISSING_ERROR","DELETE SITE LOCATION","");
  }
  
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // // DECRYPT THE QUERYSTRING USING SECRET KEY
  var querydata;
  try{ 
     querydata = await helper.decrypt(branch.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_PACKAGE_QUERY_ERROR","DELETE SITE LOCATION",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_JSON_ERROR","DELETE SITE LOCATION",secret);
  }

  if(querydata.hasOwnProperty('branchid')== false || querydata.branchid ==''){
    return helper.getErrorResponse("SITE_LOCATION_BRANCH_ID_MISSING","DELETE SITE LOCATION",secret);
  }
  // const [custid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[branch.STOKEN]);
  // const objectvalue3 = custid[1][0];
  // console.log("customerid-->"+objectvalue3["@result"]);
  // const customerregid = objectvalue3["@result"];
  let sql1=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql1= `UPDATE branchmaster  
  SET Latitude = '0.0', Longitude = '0.0'
  WHERE branch_id = ${querydata.branchid};`;
  // console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  // console.error(`rows==>`, rows1);
  
if(rows1.affectedRows){
    message = 'Site location deleted successfully';
    responsecode = "807"
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message
  }), secret);
  return encrypt;
}else{
  const encrypt = helper.encrypt(JSON.stringify({
    responsecode,
    message
    }), secret);
    return encrypt;
}
  }


//##########################################################################################################################################################################################
//##########################################################################################################################################################################################
//############################### update the site location ###########################################################################################################################
//##########################################################################################################################################################################################
//##########################################################################################################################################################################################


async function UpdateSiteLocation(branch){
  let message = 'Error while updating the site location';
  let responsecode = "7006"
  // CHECK IF THE GIVEN SESSIONTOKEN SIZE IS VALID OR NOT
  if(branch.STOKEN.length < 30 || branch.STOKEN.length > 50){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","UPDATE SITE LOCATION","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[branch.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","UPDATE SITE LOCATION","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT NOT
  if(branch.hasOwnProperty('STOKEN')== false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","UPDATE SITE LOCATION","");
  }
  // //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(branch.hasOwnProperty('querystring')== false){
    return helper.getErrorResponse("SITE_TIMING_QUERYSTRING_MISSING_ERROR","UPDATE SITE LOCATION","");
  }
  
  var secret = branch.STOKEN.substring(0,16);
  console.log("secret -> "+secret);

  // // DECRYPT THE QUERYSTRING USING SECRET KEY
  var querydata;
  try{ 
     querydata = await helper.decrypt(branch.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_PACKAGE_QUERY_ERROR","UPDATE SITE LOCATION",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("SITE_TIMING_JSON_ERROR","UPDATE SITE LOCATION",secret);
  }

  if(querydata.hasOwnProperty('branchid')== false || querydata.branchid ==''){
    return helper.getErrorResponse("SITE_LOCATION_BRANCH_ID_MISSING","UPDATE SITE LOCATION",secret);
  }
  
  if(querydata.hasOwnProperty('latitude')== false || querydata.latitude ==''){
    return helper.getErrorResponse("SITE_LOCATION_BRANCH_ID_MISSING","UPDATE SITE LOCATION",secret);
  }
  
  if(querydata.hasOwnProperty('longitude')== false || querydata.longitude ==''){
    return helper.getErrorResponse("SITE_LOCATION_BRANCH_ID_MISSING","UPDATE SITE LOCATION",secret);
  }
  // const [custid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[branch.STOKEN]);
  // const objectvalue3 = custid[1][0];
  // console.log("customerid-->"+objectvalue3["@result"]);
  // const customerregid = objectvalue3["@result"];
  let sql1=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql1= `UPDATE branchmaster  
  SET Latitude = ${querydata.latitude}, Longitude = ${querydata.longitude}
  WHERE branch_id = ${querydata.branchid};`;
  console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  // console.error(`rows==>`, rows1);
  
if(rows1.affectedRows){
    message = 'Site location Updated successfully';
    responsecode = "807"
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message
  }), secret);
  return encrypt;
}else{
  const encrypt = helper.encrypt(JSON.stringify({
    responsecode,
    message
    }), secret);
    return encrypt;
}
  }


module.exports = {
  addbranch,
  create,
  update,
  deletedata,
  getMultiple,
  createSiteTiming,
  updateSiteTiming,
  deletedataSiteTiming,
  getSiteTimingMultiple,
  addemergencycontact,
  createsiteTiming,
  updatesiteTiming,
  deletesiteTiming,
  GetSiteLocation,
  DeleteSiteLocation,
  UpdateSiteLocation,
}