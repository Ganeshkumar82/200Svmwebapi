const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function create(device){
    let message = 'Error in creating new device';
    let responsecode = "6001"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "6001"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL adddevice('+device.deptid+',"'+device.devicename+'",'+device.devicetype+', '+device.userid+',"'+device.brand+'","'+device.ipdomain+'",'+device.port+',"'+device.username+'","' +device.password+'",'+device.noach+','+device.noipch+','+device.noastream+','+device.motiondetection+','+device.sdkid+','+device.serialno+','+device.http+','+device.rtsp+')');

    if (result.affectedRows) {
      responsecode = "601"
      message = 'Device created successfully';
    }
  
    return {responsecode,message};
}


async function update(device){
  let message = 'Error in updating device data';
  let responsecode = "6002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "6002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from devicemaster WHERE Device_ID=${device.deviceid}` 
  );

  if (result.affectedRows) {
    const result = await db.query('CALL adddevice1('+device.deviceid+','+device.deptid+',"'+device.devicename+'",'+device.devicetype+', '+device.userid+',"'+device.brand+'","'+device.ipdomain+'",'+device.port+',"'+device.username+'","' +device.password+'",'+device.noach+','+device.noipch+','+device.noastream+','+device.motiondetection+','+device.sdkid+','+device.serialno+','+device.http+','+device.rtsp+')');

    if (result.affectedRows) {
      responsecode = "602"
      message = 'Device updated successfully';
    }
  }

  return {message};
}

async function deletedata(device){
  let message = 'Error in deleting device data';
  let responsecode = "6003"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "6003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from devicemaster WHERE Device_ID=${device.deviceid}` 
  );

  if (result.affectedRows) {
      responsecode = "603"
      message = 'Device deleted successfully';
  }

  return {message};
}

async function getMultiple(page = 1,device){
  let message = 'Error in fetching device list';
  let responsecode = "6004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "6003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (device.deptid!=0)
    sql=`SELECT * FROM devicemaster where dept_id=${device.deptid} LIMIT ${offset},${config.listPerPage}`;
  if (device.branchid!=0)
    sql=`SELECT * FROM devicemaster where dept_id in (select dept_id from deptmaster where branch_id=${device.branchid}) LIMIT ${offset},${config.listPerPage}`;
  if (device.customerid!=0)
    sql=`SELECT * FROM devicemaster where dept_id in (select dept_id from deptmaster where branch_id in (select branch_id from branchmaster where customer_id=${device.customerid})) LIMIT ${offset},${config.listPerPage}`;
  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'device list Fetching successfully';
    responsecode = "604"

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
    responsecode = "6004"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}

//Create Device Router
async function createRouter(device){
  let message = 'Error in creating new device router';
  let responsecode = "6005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "6005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL AddRouterInfo('+device.branchid+',"'+device.routerip+'","'+device.routeruser+'","'+device.routerpassword+'",'+device.routerport+',"'+device.registermobile+'","'+device.registeremail+'","'+device.accountno+'","' +device.customercare+'",'+device.userid+','+device.internetscope+')');

  if (result.affectedRows) {
    responsecode = "605"
    message = 'Device router created successfully';
  }

  return {responsecode,message};
}


async function updateRouter(device){
let message = 'Error in updating device router data';
let responsecode = "6006"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "6006"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update branchroutermaster set branch_id=${device.branchid},router_ip="${device.routerip}",router_uname="${device.routeruser}",router_pwd="${device.routerpassword}",router_port=${device.routerport},registered_mobileno="${device.registermobile}",registered_emailid="${device.registeremail}",account_no="${device.accountno}",customercare="${device.customercare}",created_by=${device.userid},internet_scope_to=${device.internetscope} WHERE br_router_id =${device.routerid}` 
);

if (result.affectedRows) {
    responsecode = "606"
    message = 'Device router updated successfully';
}

return {message};
}

async function deletedataRouter(device){
let message = 'Error in deleting device data';
let responsecode = "6007"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "6007"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `delete from branchroutermaster WHERE br_router_id =${device.routerid}` 
);

if (result.affectedRows) {
    responsecode = "607"
    message = 'Device router deleted successfully';
}

return {message};
}

async function getRouterMultiple(page = 1,device){
let message = 'Error in fetching device router list';
let responsecode = "6008"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "6008"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (device.routerid!=0)
  sql=`select * from branchroutermaster WHERE br_router_id =${device.routerid}  LIMIT ${offset},${config.listPerPage}` 
if (device.branchid!=0)
  sql=`select * from branchroutermaster WHERE branch_id =${device.branchid}  LIMIT ${offset},${config.listPerPage}` 
if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'device router list Fetching successfully';
  responsecode = "608"

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
  responsecode = "6008"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}
//Create Device Audio

async function createAudio(device){
  let message = 'Error in creating new device audio';
  let responsecode = "6005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "6005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL AddAudioDevice("'+device.audioname+'","'+device.simno+'","'+device.callerid+'",'+device.operatorid+','+device.scope+',"'+device.customercare+'","'+device.registermobile+'","'+device.registeremail+'",' +device.plantype+','+device.validity+','+device.billamount+','+device.created_by+','+device.branchid+')');

  if (result.affectedRows) {
    responsecode = "605"
    message = 'Device audio created successfully';
  }

  return {responsecode,message};
}

async function updateAudio(device){
let message = 'Error in updating device audio data';
let responsecode = "6006"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "6006"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update branchroutermaster set branch_id=${device.branchid},router_ip="${device.routerip}",router_uname="${device.routeruser}",router_pwd="${device.routerpassword}",router_port=${device.routerport},registered_mobileno="${device.registermobile}",registered_emailid="${device.registeremail}",account_no="${device.accountno}",customercare="${device.customercare}",created_by=${device.userid},internet_scope_to=${device.internetscope} WHERE br_router_id =${device.routerid}` 
);

if (result.affectedRows) {
    responsecode = "606"
    message = 'Device audio updated successfully';
}

return {message};
}

async function deletedataAudio(device){
let message = 'Error in deleting device audio data';
let responsecode = "6007"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "6007"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `delete from branchroutermaster WHERE br_router_id =${device.routerid}` 
);

if (result.affectedRows) {
    responsecode = "607"
    message = 'Device audio deleted successfully';
}

return {message};
}

async function getAudioMultiple(page = 1,device){
let message = 'Error in fetching device audio list';
let responsecode = "6008"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "6008"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (device.routerid!=0)
  sql=`select * from branchroutermaster WHERE br_router_id =${device.routerid}  LIMIT ${offset},${config.listPerPage}` 
if (device.branchid!=0)
  sql=`select * from branchroutermaster WHERE branch_id =${device.branchid}  LIMIT ${offset},${config.listPerPage}` 
if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'device audio list Fetching successfully';
  responsecode = "608"

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
  responsecode = "6008"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}
//#####################################################################################################################################################################################################
//##################  GET DEPT DEVICE LIST ###################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getdevicelist(device){
  //LOGIN SESSIONTOKEN ERROR
  if(device.STOKEN.length < 30 || device.STOKEN.length > 50 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET CUSTOMER DEVICE LIST","");
  }
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
   const [result]= await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[device.STOKEN]);
   const objectvalue = result[1][0];
   console.log("Get device list -->"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET CUSTOMER DEVICE LIST","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(device.hasOwnProperty("STOKEN")==false){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET CUSTOMER DEVICE LIST","");
  }
  
  var secret= device.STOKEN.substring(0,16);
  console.log("secret->"+secret);

  let sql="";
  let rows ="";
  if(device.hasOwnProperty("deptid")!= false && device.deptid  != null && device.deptid != ''){
    if (device.deptid!=''){
      console.log("device deptid->"+device.deptid);
      sql=`SELECT Device_ID,device_name FROM devicemaster where Dept_ID IN (${device.deptid})`;
      rows = await db.query(sql);
    }
  }
  if(device.hasOwnProperty("branchid")!= false &&  device.branchid  != null && device.branchid != ''){
    if (device.branchid!=''){
      console.log("device branchid->"+device.branchid);
      sql=`SELECT Device_ID,Device_name FROM devicemaster where Dept_ID in (select Dept_ID from deptmaster where Branch_ID IN (${device.branchid}))`;
      rows = await db.query(sql);
    } 
  }
  if(device.hasOwnProperty("customerid")!= false && device.customerid  != null && device.customerid != ''){
    if (device.customerid!=''){
      console.log("device customerid->"+device.customerid);
      sql=`SELECT Device_ID,Device_Name FROM devicemaster where Dept_ID in (select Dept_ID from deptmaster where Branch_ID in (select Branch_ID from branchmaster where Customer_ID IN(${device.customerid})))`;
      rows = await db.query(sql);
    }
  }
   if (rows!="")
   { 
     const data = helper.emptyOrRows(rows);
     console.log(JSON.stringify(data));
     return helper.getSuccessResponse("DEVICE_LIST_FETCHED_SUCCESSFULLY","The Customer Department Device List Fetched Successfully",data,secret);
   }
   else
   {
     return helper.getErrorResponse("DEVICE_LIST_FETCHING_ERROR","Error the entered departmentid is invalid or it has no Device",secret);
  
  }
 }

 //#############################################################################################################################################################################################################
 //#######################################################################################################################################################################################
 //########################################################################################################################################################################################
 //get the brand name list
 async function getBrandname(device){
  //LOGIN SESSIONTOKEN ERROR
  if(device.STOKEN.length < 30 || device.STOKEN.length > 50 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET CUSTOMER DEVICE BRAND NAME","");
  }
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
   const [result]= await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[device.STOKEN]);
   const objectvalue = result[1][0];
   console.log("Get device BRAND NAME-->"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET CUSTOMER DEVICE BRAND NAME","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(device.hasOwnProperty("STOKEN")==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","GET CUSTOMER DEVICE BRAND NAME","");
  }
  var secret = device.STOKEN.substring(0,16);
  console.log("SECRET ->"+secret);
  
  let sql="";
  let rows ="";
  
  sql=`SELECT SDK_ID,Brand_name FROM sdkmaster`;
  rows = await db.query(sql);

  
  if (rows!="")
  { 
    const data = JSON.stringify(helper.emptyOrRows(rows));
    console.log(data);
    return helper.getSuccessResponse("DEVICE_NAME_FETCHED_SUCCESSFULLY","The Device Brand name Fetched Successfully",data,secret);
  }
  else
  {
    return helper.getErrorResponse("DEVICE_NAME_FETCHING_ERROR","Error while fetching the device brand name.",secret);
 }
}



//#####################################################################################################################################################################################################
//##################  GET DEPT DEVICE LIST ###################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getSipnumber(device){
  message = 'Error while fetching the Sip Number';
  responsecode = "8005"
  //LOGIN SESSIONTOKEN ERROR
  if(device.STOKEN.length < 30 || device.STOKEN.length > 50 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET SIP NUMBER LIST","");
  }
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
   const [result]= await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[device.STOKEN]);
   const objectvalue = result[1][0];
   console.log("Get device list -->"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET SIP NUMBER LIST","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(device.hasOwnProperty("STOKEN")==false){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET SIP NUMBER LIST","");
  }
  
  var secret= device.STOKEN.substring(0,16);
  console.log("secret->"+secret);
  
  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(device.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("SIP_NUMBER_QUERY_MISSING","GET SIP NUMBER LIST","");
  }
  console.log("customer querystring-->"+device.querystring);
  var queryData;

  try{
    queryData= await helper.decrypt(device.querystring,secret);
    console.log("decrypted data->"+queryData);
  }
  catch(ex){
      return helper.getErrorResponse("SIP_NUMBER_PACKAGE_QUERY_ERROR","GET SIP NUMBER LIST",secret);
  }
  try{
    queryData=JSON.parse(queryData);
  }
  catch(ex){
    return helper.getErrorResponse("SIP_NUMBER_JSON_ERROR","GET SIP NUMBER LIST",secret);
  }
  if(queryData.hasOwnProperty("sourceid")==false){
    return helper.getErrorResponse("SIP_NUMBER_SOURCE_ID_MISSING","GET SIP NUMBER",secret);
  }
 let sql ='';
 let rows ='';
 let sql1 ='';
 let rows1 ='';
 let sql2 ='';
 let rows2 ='';
 sql = `SELECT extension, macaddress, twoway,source_type,device_ip, device_port FROM pasystemmaster WHERE source_id IN (SELECT Camera_ID FROM cameramaster WHERE Camera_ID = ${queryData.sourceid}) and source_type = 0`;
 rows = await db.query(sql);
   const camerasipnumber = helper.emptyOrRows(rows);
   console.log(camerasipnumber);
 sql1 = `SELECT extension, macaddress, twoway,source_type, device_ip, device_port FROM pasystemmaster WHERE source_id IN (SELECT Device_ID FROM cameramaster WHERE Camera_ID = ${queryData.sourceid}) and source_type = 1`;
 rows1 = await db.query(sql1);
   const devicesipnumber = helper.emptyOrRows(rows1);
   console.log(devicesipnumber);
 sql2 = `SELECT extension, macaddress, twoway,source_type, device_ip, device_port FROM pasystemmaster WHERE source_id IN (SELECT Branch_ID from deptmaster where Dept_ID IN (SELECT Place from cameramaster where Camera_ID = ${queryData.sourceid})) and source_type = 2`;
 rows2 = await db.query(sql2);
   const branchsipnumber = helper.emptyOrRows(rows2);
   console.log(branchsipnumber);
   const categorizedData = {
    oneWayDevices: [],
    twoWayDevices: [],
  };

  camerasipnumber.forEach((row) => {
    if (row.twoway === 0) {
      categorizedData.twoWayDevices.push(row);
    } else {
      categorizedData.oneWayDevices.push(row);
    }
  });

  devicesipnumber.forEach((row) => {
    if (row.twoway === 0) {
      categorizedData.twoWayDevices.push(row);
    } else {
      categorizedData.oneWayDevices.push(row);
    }
  });

  branchsipnumber.forEach((row) => {
    if (row.twoway === 0) {
      categorizedData.twoWayDevices.push(row);
    } else {
      categorizedData.oneWayDevices.push(row);
    }
  });

  const response = {
    responsecode,
    message: 'Camera/Device/Site Sip Number Fetched successfully',
    oneWayDeviceCount: categorizedData.oneWayDevices.length,
    twoWayDeviceCount: categorizedData.twoWayDevices.length,
    categorizedData,
    
  };

  const encrypt = helper.encrypt(JSON.stringify(response), secret);
  return encrypt;
}


//####################################################################################################################################################################################################
//####################   UPDATE DEPARTMENT DEVICE   #######################################################################################################################################################
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
async function updatedevice(device){
  //  a) If SESSION TOKEN Character sizes error
  if (device.STOKEN.length>50 || device.STOKEN.length<30)
  {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","CUSTOMER UPDATE DEVICE","");
  }

  //  b) If SESSION TOKEN not available
  const [result1] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;',[device.STOKEN]);
  const objectValue1 = result1[1][0];
  console.log("Add company, objectValue->"+objectValue1["@result"]);
  const user_id = objectValue1["@result"];
  const custID = objectValue1["@custid"]; 
  console.log("customer id->" + custID);
  if (user_id==null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CUSTOMER UPDATE DEVICE","");
  }
  var secret = device.STOKEN.substring(0,16);
  console.log("secret->"+secret);
  //  c) If SESSION TOKEN not given as input
  if(device.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","CUSTOMER UPDATE DEVICE","");
  }
//End of Validation 1
  
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if(device.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","CUSTOMER UPDATE DEVICE","");
  }

  console.log("querystring=>"+device.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(device.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","CUSTOMER UPDATE DEVICE",secret);
  }
  try
  { 
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_COMPANY_JSON_ERROR","CUSTOMER UPDATE DEVICE",secret);
  }
//          c) Check the companyname is valid
  if(queryData.hasOwnProperty('devicename')==false){
    return helper.getErrorResponse("CUST_DEVICE_NAME_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //Check if the companycode is given as an input or not
  if(queryData.hasOwnProperty('serialno')==false){
    return helper.getErrorResponse("DEVICE_SERIAL_NO_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//          d) Check the contactemail is valid
  if(queryData.hasOwnProperty('devicetype')==false){
    return helper.getErrorResponse("CUST_DEVICE_TYPE_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //)check if the contact person number is given as an input or not
  if(queryData.hasOwnProperty('brand')==false){
    return helper.getErrorResponse("DEVICE_BRAND_NAME_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//          g) Check the billing address is valid
  if(queryData.hasOwnProperty('deviceid')==false){
    return helper.getErrorResponse("CUST_DEVICE_ID_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //          d) Check the contactemail is valid
  if(queryData.hasOwnProperty('ipdomain')==false){
    return helper.getErrorResponse("CUST_DEVICE_IP_DOMAIN_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //)check if the contact person number is given as an input or not
  if(queryData.hasOwnProperty('ipport')==false){
    return helper.getErrorResponse("CUST_DEVICE_IP_PORT_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//          e) Check the contactphone is valid
  if(queryData.hasOwnProperty('username')==false){
    return helper.getErrorResponse("CUST_DEVICE_USERNAME_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//          g) Check the billing address is valid
  if(queryData.hasOwnProperty('password')==false){
    return helper.getErrorResponse("CUST_DEVICE_PASSWORD_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //          d) Check the contactemail is valid
  if(queryData.hasOwnProperty('analogch')==false){
    return helper.getErrorResponse("DEVICE_ANALOG_CH_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //)check if the contact person number is given as an input or not
  if(queryData.hasOwnProperty('ipchannel')==false){
    return helper.getErrorResponse("DEVICE_NO_OF_IPCHANNEL_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//          e) Check the contactphone is valid
  if(queryData.hasOwnProperty('noofstream')==false){
    return helper.getErrorResponse("NO_OF_STREAM_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//          g) Check the billing address is valid
  if(queryData.hasOwnProperty('httpport')==false){
    return helper.getErrorResponse("DEVICE_HTTP_PORT_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //          g) Check the billing address is valid
  if(queryData.hasOwnProperty('rtspport')==false){
    return helper.getErrorResponse("DEVICE_RTSP_PORT_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
  //          g) Check the billing address is valid
  if(queryData.hasOwnProperty('modelno')==false){
    return helper.getErrorResponse("DEVICE_RTSP_PORT_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }

   //          g) Check the billing address is valid
   if(queryData.hasOwnProperty('motiondetection')==false){
    return helper.getErrorResponse("DEVICE_MOTION_DETECTION_MISSING","CUSTOMER UPDATE DEVICE",secret);
  }
//End of Validation 2

 if(queryData.brand == 'Dahua'){
      sdkid = 2;
 }else if(queryData.brand == 'Hikivision'){
    sdkid = 1;
 }
   const result = await db.query(`
   UPDATE devicemaster
   SET
   Device_name = ?,
   SerialNo = ?,
   Device_Type = ?,
   SDK_ID = ?,
   Product_name = ?,
   IP_Domain = ?,
   IP_Port =?,
   IP_Uname = ?,
   IP_Pwd = ?,
   No_AnalogCH = ?,
   No_IpCH = ?,
   No_AStream =?,
   MotionDetection = ?,
   httpport = ?,
   RTSP_Port = ?,
   Model_no = ?,
   modified_by =?
   WHERE Device_ID  = ?
 `, [
   queryData.devicename,
   queryData.serialno,
   queryData.devicetype,
   sdkid,
   queryData.brand,
   queryData.ipdomain,
   queryData.ipport,
   queryData.username,
   queryData.password,
   queryData.analogch,
   queryData.ipchannel,
   queryData.noofstream,
   queryData.motiondetection,
   queryData.httpport,
   queryData.rtspport,
   queryData.modelno,
   user_id,
   queryData.deviceid
 ]);

 if(result.affectedRows){
  return helper.getSuccessResponse("DEPARTMENT_DEVICE_UPDATED_SUCCESSFULLY","The company Department device was updated successfully",queryData.branchid,secret);
 }
 else{
  return helper.getErrorResponse("ERROR_UPDATING_DEPARTMENT_DEVICE","Error while updating the company Department device",secret);
 }
}

//###################################################################################################################################################################################################################################
//###################################################################################################################################################################################################################################
//#############################################################################################################################################################################################################################################

async function DeviceStatus(device){
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(device.hasOwnProperty('STOKEN') == false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","PLEASE PROVIDE THE SESSIONTOKEN","");
  }
  //CHECK IF THE SIZE OF THE SESSIONTOKEN IS VALID ONE OR NOT
  if(device.STOKEN.length < 30 || device.STOKEN.length > 50){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","PLEASE PROVIDE THE SESSIONTOKEN WITH VALID SIZE","");
  }
  //CHECK IF THE PROVIDE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[device.STOKEN]);
  const objectvalue =result[1][0];
  console.log("Add Device status, objectValue->"+objectvalue["@result"]);
  const userid = objectvalue["@result"];
  if(userid == null){
    return helper.getErrorResponse("SESSIONTOKEN_VALID_ERROR","PLEASE PROVIDE THE VALID SESSIONTOKEN","");
  }
  var secret = device.STOKEN.substring(0,16);
  console.log("SECRET - >"+secret);

  //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT OR NOT
  if(device.hasOwnProperty('querystring') == false){
    return helper.getErrorResponse("DEVICE_QUERYSTRING_MISSING","PLEASE PROVIDE THE VALID QUERYSTRING","");
  }
  console.log("CUSTOMER QUERYSTRING ->"+device.querystring);
  var queryData;

  try{
    queryData = await helper.decrypt(device.querystring,secret);
    console.log("DECRYPTED DATA ->"+queryData);
  }
  catch(ex){
    return helper.getErrorResponse("QUERYSTRING_DECRYPTION_ERROR","ERROR WHILE DECRYPTING THE QUERYSTRING",secret);
  }
  try{
    queryData = JSON.parse(queryData);
  }
  catch(ex){
    return helper.getErrorResponse("QUERYSTRING_JSON_ERROR","ADD THE DEVICE STATUS",secret);
  }
  if(queryData.hasOwnProperty('deviceid') == false){
    return helper.getErrorResponse("DEVICE_ID_MISSING","PLEASE ENTER THE DEVICE ID",secret);
  }
  if(queryData.hasOwnProperty('shift') == false){
    return helper.getErrorResponse("CHECKING_SHIFT_MISSING","PLEASE ENTER THE CHECKING SHIFT",secret);
  }
  if(queryData.hasOwnProperty('devicestatus') == false){
    return helper.getErrorResponse("DEVICE_STATUS_MISSING","PLEASE PROVIDE THE STATUS OF THE DEVICE",secret);
  }
  if(queryData.hasOwnProperty('devicesettime') == false){
    return helper.getErrorResponse("DEVICE_NEW_SET_TIME_MISSING","PLEASE PROVIDE THE NEW SET TIME OF THE DEVICE",secret);
  }
  if(queryData.hasOwnProperty('deviceprevioustime') == false){
    return helper.getErrorResponse('DEVICE_PREVIOUS_SET_TIME_MISSING',"PLEASE ENTER THE DEVICES PREVIOUS SET TIME",secret);
  }

  //USING THE STORED PROCEDURE WE ARE ADDING DATA'S TO THE DEVICESTATUS
  const [result1] = await db.spcall('CALL SP_DEVICE_STATUS_ADD(?,?,?,?,?,@devicestatusid); select @devicestatusid',[queryData.deviceid,queryData.shift,queryData.devicestatus,
   queryData.deviceprevioustime,userid]);
  const objectvalue1 = result1[1][0];
  const devicestatus_id = objectvalue1["@devicestatusid"];
  console.log("DEVICESTATUS ID ->"+devicestatus_id);
  if(devicestatus_id != null && devicestatus_id != 0){
    return helper.getSuccessResponse("CUSTOMER_DEVICE_STATUS_ADD_SUCCESSFULLY","THE CUSTOMER DEVICE STATUS WAS UPDATED SUCCESSFULLY",devicestatus_id,secret);
  }
  else{
    return helper.getErrorResponse("ERROR_ADDING_DEVICE_STATUS","ERROR WHILE ADDING THE CUSTOMER DEVICE STATUS",secret);
  }
}


//##############################################################################################################################################################################################################################
//####################################################################################################################################################################################################################################
//#########################################################################################################################################################################################################################


async function addsipStatus(device){
  //CHECK IF THE LOGIN SESSIONTOKEN IS GIVEN AS A INPUT OR NOT
   if(device.hasOwnProperty('STOKEN')== false){
     return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","PLEASE PROVIDE THE LOGIN SESSIONTOKEN","");
   }
   //CHECK IF THE SESSIONTOKEN SIZE IS VALID ONE OR NOT
   if(device.STOKEN.length > 50 || device.STOKEN.length < 30 ){
      return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","PLEASE PROVIDE THE SESSIONTOKEN WITH VALID SIZE","");
   }
   //CHECK IF THE GIVEN SESSIONTOKEN IS A VALID ONE OR NOT
   const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[device.STOKEN]);
   const objectvalue = result[1][0];
   const userid = objectvalue["@result"];
   console.log("SIP DEVICE USER ID ->"+userid);
   if(userid == null ){
     return helper.getErrorResponse("SESSIONTOKEN_VALID_ERROR","PLEASE PROVIDE THE VALID SESSIONTOKEN","");
   }

   if(device.hasOwnProperty('querystring') == false){
    return helper.getErrorResponse("SIP_QUERYSTRING_MISSING","PLEASE PROVIDE THE VALID QUERYSTRING HERE","");
   }

   //SPLIT THE FIRST 16 CHARACTERS OF THE STOKEN AND STORE IT AS SECRET KEY
   var secret = device.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);
   
   console.log("SIPSTATUS QUERYSTRING ->"+device.querystring);
   var queryData;

   try{
    queryData = await helper.decrypt(device.querystring,secret);
    console.log("decrypted Data ->"+queryData);
   }
   catch(ex){
        return helper.getErrorResponse("QUERYSTRING_DECRPYTION_ERROR","PLEASE PROVIDE THE VALID QUERYSTRING",secret);
   }
   try{
    queryData = JSON.parse(queryData);
   }
   catch(ex){
    return helper.getErrorResponse("QUERYSTIRNG_JSON_ERROR","PLEASE PROVIDE THE QUERYSTRING WITH VALID JSON",secret);
   }
   if(queryData.hasOwnProperty('clientname') == false ){
    return helper.getErrorResponse("SIP_CLIENT_NAME_MISSING","PLEASE PROVIDE THE DEVICE TYPE FOR THE SIP CLIENT",secret);
   }
   if(queryData.hasOwnProperty('sitename') == false){
    return helper.getErrorResponse("SIP_SITE_NAME_MISSING","PLEASE PROVIDE THE MAPPED CAMERA FOR THE SIP",secret);
   }
   if(queryData.hasOwnProperty('location') == false){
    return helper.getErrorResponse("SIP_LOCATION_MISSING","PLEASE PROVIDE THE SIP EXTENSION",secret);
   }
   if(queryData.hasOwnProperty('devicetype') == false ){
    return helper.getErrorResponse("SIP_DEVICE_TYPE_MISSING","PLEASE PROVIDE THE DEVICE TYPE FOR THE SIP CLIENT",secret);
   }
   if(queryData.hasOwnProperty('mappedcamera') == false){
    return helper.getErrorResponse("SIP_MAPPED_CAMERAS_MISSING","PLEASE PROVIDE THE MAPPED CAMERA FOR THE SIP",secret);
   }
   if(queryData.hasOwnProperty('sipext') == false){
    return helper.getErrorResponse("SIP_EXTENSION_MISSING","PLEASE PROVIDE THE SIP EXTENSION",secret);
   }
   if(queryData.hasOwnProperty('macaddress') == false){
    return helper.getErrorResponse("SIP_MAC_ADDRESS_MISSING","PLEASE ENTER THE SIP MAC ADDRESS",secret);
   }
   if(queryData.hasOwnProperty('ipaddress') == false){
    return helper.getErrorResponse("SIP_IP_ADDRESS_MISSING","PLEASE PROVIDE THE IP ADDRESS",secret);
   }
   if(queryData.hasOwnProperty('dnl') == false){
     return helper.getErrorResponse("SIP_DNL_MISSING","PLEASE PROVIDE THE DEVICE DNL DETAILS",secret);
   }
   if(queryData.hasOwnProperty('checkingshift') == false){
     return helper.getErrorResponse("SIP_CHECKING_SHIFT_MISSING","PLEASE PROVIDED THE SIP CHECKING STATUS",secret);
   }
   if(queryData.hasOwnProperty('sipstatus') == false){
    return helper.getErrorResponse("SIP_STATUS_MISSING","PLEASE PROVIDE THE SIP STATUS",secret);
   }
   if(queryData.hasOwnProperty('progress') == false){
    return helper.getErrorResponse("SIP_PROGRESS_MISSING","PLEASE PROVIDE THE SIP PROGRESS",secret);
   }

   const [result1] =await db.spcall('CALL SP_SIP_STATUS_CHECK(?,?,?,?,?,?,?,?,?,?,?,?,?,@sipstatus_id); select @sipstatus_id',[queryData.clientname,queryData.sitename,queryData.location,
  queryData.devicetype,queryData.mappedcamera,queryData.sipext,queryData.macaddress,queryData.ipaddress,queryData.dnl,queryData.checkingshift,queryData.sipstatus,queryData.progress,userid]);
  const objectvalue1 = result1[1][0];
  const sipstatus_id = objectvalue1["@sipstatus_id"];
  console.log("SIP STATUS ID -> "+sipstatus_id);
  if(sipstatus_id != null && sipstatus_id != 0){
    return helper.getSuccessResponse("CLIENT_SIP_STATUS_ADDED_SUCCESSFULLY","THE SIP STATUS WAS ADDED SUCCESSFULLY",sipstatus_id,secret);
  }
  else{
    return helper.getErrorResponse("ERROR_ADDING_SIP_STATUS","ERROR WHILE ADDING THE SIP STATUS . PLEASE TRY AGAIN" ,secret);
  }
  }

module.exports = { 
  create,
  update,
  deletedata,
  getMultiple,
  createRouter,
  updateRouter,
  deletedataRouter,
  getRouterMultiple,
  createAudio,
  updateAudio,
  deletedataAudio,
  getAudioMultiple,
  getdevicelist,
  getBrandname,
  getSipnumber,
  updatedevice,
  DeviceStatus,
  addsipStatus,
} 