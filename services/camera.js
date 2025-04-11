const db = require('./db');
const helper = require('../helper');
const config = require('../config');
const rtspStream = require('node-rtsp-stream');



//#######################################################################################################################################################################################################
//############################## CAMERA ACTIVATE #########################################################################################################################################################################
//#######################################################################################################################################################################################################

async function CameraActivate(camera){
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(camera.STOKEN.length >50 || camera.STOKEN.length<30){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","ACTIVATE CAMERA","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall(`CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail`,[camera.STOKEN]);
  const objectvalue = result[1][0];
  console.log("activate camera objectvalue->"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
      return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","ACTIVATE CAMERA","");
  } 
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(camera.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","ACTIVATE CAMERA","");
  }

  //CHECK IF THE CAMERA ID IS GIVEN AS INPUT OR NOT
  if(camera.hasOwnProperty('cameraid')==false){
    return helper.getErrorResponse("CHANNEL_CAMERA_ID_MISSING","ACTIVATE CAMERA","");
  }

  var secret= camera.STOKEN.substring(0,16);
  console.log("Secret-->"+secret);
  let camera_id = camera.cameraid;
  const [result1] = await db.spcall('CALL SP_CAMERA_ACTIVATE(?)',[camera.cameraid]);
  
  let sql="";
  if(camera_id!=''){
    sql= `select camera_status from cameramaster where camera_id =${camera_id}`; 
  }
  const rows = await db.query(sql);
  const data = JSON.stringify(helper.emptyOrRows(rows));
  console.log("data"+data);

  if(data == '[{"camera_status":"Active"}]'){
    return helper.getSuccessResponse("CHANNEL_CAMERA_ACTIVATED_SUCCESS","THE CUSTOMER CAMERA WAS ACTIVATED SUCCESSFULLUY","ACTIVATE CAMERA",secret);
  }
  else{
    return helper.getErrorResponse("CHANNEL_CAMERA_ACTIVATE_FAILED","The channel camera was not activate or camera is not found",secret);
  }
}
//#######################################################################################################################################################################################################
//############################## CAMERA INACTIVATE #########################################################################################################################################################################
//#######################################################################################################################################################################################################

async function CameraInactivate(camera){
  //BEGIN VALIDATION 1
  //CHECK IF THE GIVEN SESSIONTOKEN SIZE IS CORRECT OR NOT
  if(camera.STOKEN.length>50 || camera.STOKEN.length<30){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","INACTIVATE CAMERA","");
  }
  //CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOR
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[camera.STOKEN]);
  const objectvalue = result[1][0];
  console.log("camera Inactive"+objectvalue["@result"]);
  if(objectvalue["@result"]==null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","INACTIVATE CAMERA","");
  }
  //CHECK IF THE SESSIONTOKEN WAS GIVEN AS AN INPUT OR NOT
  if(camera.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","INACTIVATE CAMERA","");
  }
  //END OF VALIDATION 1
  
   var secret= camera.STOKEN.substring(0,16);
   console.log("secret->"+secret);
  //CHECK IF THE CAMERAID IS GIVEN AS AN INPUT OR NOT
  if(camera.hasOwnProperty('cameraid')==false){
    return helper.getErrorResponse("CHANNEL_CAMERA_ID_MISSING","INACTIVATE CAMERA","");
  }
  let camera_id = camera.cameraid;
  const [result1] = await db.spcall('CALL SP_CAMERA_INACTIVATE(?)',[camera.cameraid]);
  
  let sql="";
  if(camera_id!=''){
    sql= `select camera_status from cameramaster where camera_id =${camera_id}`; 
  }
  const rows = await db.query(sql);
  const data = JSON.stringify(helper.emptyOrRows(rows));
  console.log("data"+data);

  if(data == '[{"camera_status":"Inactive"}]'){
    return helper.getSuccessResponse("CHANNEL_CAMERA_INACTIVATED_SUCCESS","THE CUSTOMER CAMERA WAS INACTIVATED SUCCESSFULLUY","ACTIVATE CAMERA",secret);
  }
  else{
    return helper.getErrorResponse("CHANNEL_CAMERA_INACTIVATE_FAILED","The channel camera was not Inactivate or camera is not found",secret);
  }
}

async function create(camera){
    let message = 'Error in creating new Camera SOP';
    let responsecode = "8001"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "8001"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL addsop('+camera.cameraid+',"'+camera.sopname+'","'+camera.sopvalue+'",'+camera.userid+')');

    if (result.affectedRows) {
      responsecode = "801"
      message = 'Camera SOP created successfully';
    }
  
    return {responsecode,message};
}


async function update(camera){ 
  let message = 'Error in updating SOP data';
  let responsecode = "8002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `update camerasop set camera_ID =${camera.cameraid},sop_name="${camera.sopname}",sop_value="${camera.sopvalue}" WHERE sop_id=${camera.sopid}`);

  if (result.affectedRows) {
      responsecode = "802"
      message = 'Camera SOP updated successfully';
  }

  return {message};
}

async function deletedata(camera){
  let message = 'Error in deleting Camera SOP';
  let responsecode = "8003"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from camerasop WHERE sop_id=${camera.sopid}` 
  );

  if (result.affectedRows) {
      responsecode = "803"
      message = 'Camera SOP deleted successfully';
  }

  return {message};
}

async function getMultiple(page = 1,camera){
  let message = 'Error in fetching Camera SOP list';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (camera.cameraid!=0)
    sql=`SELECT * FROM camerasop where camera_id=${camera.cameraid} LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Camera SOP list fetched successfully';
    responsecode = "804"

    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'camera ID is missing. Please give any one of the input of camera ID';
    responsecode = "8004"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}

async function createAi(camera){
  let message = 'Error in creating new Camera AI';
  let responsecode = "8005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL createcoordinates('+camera.userid+','+camera.cameraid+',"'+camera.coord+'","'+camera.Analyticname+'",'+camera.filterid+',"'+camera.resolution+'","'+camera.actresolution+'","'+camera.findobjects+'",'+camera.threshold+','+camera.confidence+')');

  if (result.affectedRows) {
    responsecode = "805"
    message = 'Camera AI created successfully';
  }

  return {responsecode,message};
}


async function updateAi(camera){
let message = 'Error in updating SOP data';
let responsecode = "8006"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8006"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update analyticcoordinates set Analytic_name="${camera.Analyticname}",camera_ID =${camera.cameraid},Filter_id="${camera.filterid}",coordinates="${camera.coord}",findingobjects="${camera.findobjects}",threshold="${camera.threshold}",confidence="${camera.confidence}",resolution="${camera.resolution}",actual_resolution="${camera.actresolution}",created_by="${camera.userid}" WHERE coordinate_id =${camera.ai_id}`);

if (result.affectedRows) {
    responsecode = "806"
    message = 'Camera AI updated successfully';
}

return {message};
}

async function deletedataAi(camera){
let message = 'Error in deleting Camera AI';
let responsecode = "8007"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8007"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `DELETE from analyticcoordinates WHERE coordinate_id =${camera.ai_id}` 
);

if (result.affectedRows) {
    responsecode = "807"
    message = 'Camera AI deleted successfully';
}

return {message};
}

async function getMultipleAi(page = 1,camera){
let message = 'Error in fetching Camera SOP list';
let responsecode = "8008"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8008"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (camera.cameraid!=0)
  sql=`SELECT * FROM analyticcoordinates where camera_id=${camera.cameraid} LIMIT ${offset},${config.listPerPage}`;
console.error(`SQL data==>`, sql);
if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Camera AI list fetched successfully';
  responsecode = "808"

  return {
    responsecode,
    message,
    data,
    meta
  }
}
else
{
  message = 'camera ID is missing. Please give any one of the input of camera ID';
  responsecode = "8008"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}


async function createNearby(camera){
  let message = 'Error in creating new Camera Nearby';
  let responsecode = "8009"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8009"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL AddCameraNearby('+camera.cameraid+','+camera.nearbytype+',"'+camera.nearbyname+'","'+camera.ipdomainmobile+'",'+camera.nport+',"'+camera.username+'","'+camera.password+'",'+camera.userid+')');

  if (result.affectedRows) {
    responsecode = "809"
    message = 'Camera Nearby hardware created successfully';
  }

  return {responsecode,message};
}


async function updateNearby(camera){
let message = 'Error in updating Camera Nearby data';
let responsecode = "8010"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8010"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update cameranearyby set camera_id="${camera.cameraid}",nearbytype =${camera.nearbytype},nearby_name="${camera.nearbyname}",ipdomainmobile="${camera.ipdomainmobile}",port="${camera.nport}",username="${camera.username}",password="${camera.password}",created_by="${camera.userid}"  WHERE cameranearyby_id =${camera.nearbyid}`);

if (result.affectedRows) {
    responsecode = "810"
    message = 'Camera Nearby hardware updated successfully';
}

return {message};
}

async function deletedataNearby(camera){
let message = 'Error in deleting Camera Nearby';
let responsecode = "8011"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8011"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `DELETE from cameranearyby WHERE cameranearyby_id =${camera.nearbyid}` 
);

if (result.affectedRows) {
    responsecode = "811"
    message = 'Camera Nearby hardware deleted successfully';
}

return {message};
}

async function getMultipleNearby(page = 1,camera){
let message = 'Error in fetching Camera Nearby list';
let responsecode = "8012"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8012"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (camera.cameraid!=0)
  sql=`SELECT * FROM cameranearyby where camera_id=${camera.cameraid} LIMIT ${offset},${config.listPerPage}`;
console.error(`SQL data==>`, sql);
if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Camera Nearby list fetched successfully';
  responsecode = "812"

  return {
    responsecode,
    message,
    data,
    meta
  }
}
else
{
  message = 'camera ID is missing. Please give any one of the input of camera ID';
  responsecode = "8012"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}



async function createStorage(camera){
  let message = 'Error in creating new Camera Storage';
  let responsecode = "8013"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8013"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL AddCamStorage('+camera.cameraid+','+camera.recordtype+',"'+camera.starttime+'","'+camera.endtime+'","'+camera.weekdays+'","'+camera.monthdays+'",'+camera.recordevery+',"'+camera.recordingpath+'",'+camera.moveafter+',"'+camera.archivepath+'",'+camera.userid+')');

  if (result.affectedRows) {
    responsecode = "813"
    message = 'Camera Storage created successfully';
  }

  return {responsecode,message};
}


async function updateStorage(camera){
let message = 'Error in updating Camera Storage data';
let responsecode = "8014"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8014"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update camstorage set camera_id="${camera.cameraid}",Recording_Type =${camera.recordtype},Start_time="${camera.starttime}",End_time="${camera.endtime}",Weekly_days="${camera.weekdays}",Monthly_days="${camera.monthdays}",Recording_every=${camera.recordevery},Recording_Path="${camera.recordingpath}",Move_data_after=${camera.moveafter},Archive_Path="${camera.archivepath}",created_by=${camera.userid} WHERE StorageID=${camera.storageid}`);

if (result.affectedRows) {
    responsecode = "814"
    message = 'Camera Storage updated successfully';
}

return {message};
}

async function deletedataStorage(camera){
let message = 'Error in deleting Camera Storage';
let responsecode = "8015"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8015"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `DELETE from camstorage WHERE StorageID=${camera.storageid}` 
);

if (result.affectedRows) {
    responsecode = "815"
    message = 'Camera Storage deleted successfully';
}

return {message};
}

async function getMultipleStorage(page = 1,camera){
let message = 'Error in fetching Camera Storage list';
let responsecode = "8016"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8016"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (camera.cameraid!=0)
  sql=`SELECT * FROM camstorage where camera_id=${camera.cameraid} LIMIT ${offset},${config.listPerPage}`;
console.error(`SQL data==>`, sql);
if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Camera Storage list fetched successfully';
  responsecode = "816"

  return {
    responsecode,
    message,
    data,
    meta
  }
}
else
{
  message = 'camera ID is missing. Please give any one of the input of camera ID';
  responsecode = "8016"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}

async function createActivate(camera){
  let message = 'Error in creating new Camera Activation';
  let responsecode = "8017"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8017"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const result = await db.query('CALL addsubcamera('+camera.customerid+','+camera.cameraid+','+camera.userid+')');

  if (result.affectedRows) {
    responsecode = "817"
    message = 'Camera Activation created successfully';
  }

  return {responsecode,message};
}


async function updateActivate(camera){
let message = 'Error in updating Camera Activation data';
let responsecode = "8018"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8018"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const result = await db.query(
  `update subscriptioncameras set camera_id="${camera.cameraid}",status=${camera.activestatus} WHERE scamera_id=${camera.scameraid}`);

if (result.affectedRows) {
    responsecode = "818"
    message = 'Camera Activation updated successfully';
}

return {message};
}

async function getMultipleActivate(page = 1,camera){
let message = 'Error in fetching Camera Activation list';
let responsecode = "8020"
const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
console.error(`Result data==>`, resultAPI);
if (resultAPI.length == 0) 
{
    responsecode = "8020"
    message = "Invalid TOKEN";
    return{responsecode,message}
}

const offset = helper.getOffset(page, config.listPerPage);
let sql=""
if (camera.deviceid!=0)
  sql=`SELECT camera_id,status FROM subscriptioncameras where camera_id in (select camera_id from cameramaster where device_id=${camera.deviceid}) LIMIT ${offset},${config.listPerPage}`;
if (camera.deptid!=0)
  sql=`SELECT camera_id,status FROM subscriptioncameras where camera_id in (select camera_id from cameramaster where device_id in (select device_id from devicemaster where dept_id=${camera.deptid})) LIMIT ${offset},${config.listPerPage}`;
if (camera.branchid!=0)
  sql=`SELECT camera_id,status FROM subscriptioncameras where camera_id in (select camera_id from cameramaster where device_id in (select device_id from devicemaster where branch_id=${camera.branchid})) LIMIT ${offset},${config.listPerPage}`;
console.error(`SQL data==>`, sql);
if (sql!="")
{
  const rows = await db.query(sql);

  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Camera Activation list fetched successfully';
  responsecode = "820"

  return {
    responsecode,
    message,
    data,
    meta
  }
}
else
{
  message = 'Device/Department/Branch ID is missing. Please give any one of the input of Device/Department/Branch ID';
  responsecode = "8020"
  return {
    responsecode,
    message,
    data,
    meta
  }
}
}

async function getMultipleactivatestatus(page = 1,camera){
  let message = 'Error in fetching Camera Activation list';
  let responsecode = "8020"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8020"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (camera.deviceid!=0)
    sql=`SELECT camera_id,status FROM subscriptioncameras where status=${camera.activestatus} and camera_id in (select camera_id from cameramaster where device_id=${camera.deviceid}) LIMIT ${offset},${config.listPerPage}`;
  if (camera.deptid!=0)
    sql=`SELECT camera_id,status FROM subscriptioncameras where status=${camera.activestatus} and camera_id in (select camera_id from cameramaster where device_id in (select device_id from devicemaster where dept_id=${camera.deptid})) LIMIT ${offset},${config.listPerPage}`;
  if (camera.branchid!=0)
    sql=`SELECT camera_id,status FROM subscriptioncameras where status=${camera.activestatus} and camera_id in (select camera_id from cameramaster where device_id in (select device_id from devicemaster where branch_id=${camera.branchid})) LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);
  
    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Camera Activation list fetched successfully';
    responsecode = "820"
  
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'Device/Department/Branch ID is missing. Please give any one of the input of Device/Department/Branch ID';
    responsecode = "8020"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  }


  async function createIgnore(camera){
    let message = 'Error in creating new Camera Ignore';
    let responsecode = "8021"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "8021"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL ignoreCoordinates('+camera.cameraid+',"'+camera.coord+'","'+camera.starttime+'","'+camera.endtime+'")');
  
    if (result.affectedRows) {
      responsecode = "821"
      message = 'Camera Ignore created successfully';
    }
    return {responsecode,message};
  }
  
  
  async function updateIgnore(camera){
  let message = 'Error in updating Camera Ignore data';
  let responsecode = "8022"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8022"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const result = await db.query(
    `update eventignorecoord set camera_id=${camera.cameraid},coordinates="${camera.coord}",starttime="${camera.starttime}",endtime="${camera.endtime}" WHERE eventignore_id =${camera.eventignoreid}`);
  
  if (result.affectedRows) {
      responsecode = "822"
      message = 'Camera Ignore updated successfully';
  }
  
  return {message};
  }
  
  async function deletedataIgnore(camera){
  let message = 'Error in deleting Camera Ignore';
  let responsecode = "8023"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8023"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const result = await db.query(
    `DELETE from eventignorecoord WHERE eventignore_id=${camera.eventignoreid}` 
  );
  
  if (result.affectedRows) {
      responsecode = "823"
      message = 'Camera Ignore deleted successfully';
  }
  
  return {message};
  }
  
  async function getMultipleIgnore(page = 1,camera){
  let message = 'Error in fetching Camera Ignore list';
  let responsecode = "8024"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8024"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (camera.cameraid!=0)
    sql=`SELECT * FROM eventignorecoord where camera_id=${camera.cameraid} LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);
  
    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Camera Ignore list fetched successfully';
    responsecode = "824"
  
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'camera ID is missing. Please give any one of the input of camera ID';
    responsecode = "8024"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  }
  

  async function createRecurrence(camera){
    let message = 'Error in creating new Camera Recurrence';
    let responsecode = "8025"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "8025"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL AddRecurrenceCamera('+camera.cameraid+',"'+camera.starttime+'","'+camera.endtime+'")');
  
    if (result.affectedRows) {
      responsecode = "825"
      message = 'Camera Recurrence created successfully';
    }
    return {responsecode,message};
  }
  
  
  async function updateRecurrence(camera){
  let message = 'Error in updating Camera Ignore Recurrence data';
  let responsecode = "8026"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8026"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const result = await db.query(
    `update ignorecamerarecurrence set camera_id="${camera.cameraid}",stime="${camera.starttime}",etime="${camera.endtime}" WHERE igcamera_id=${camera.ignoreid}`);
  
  if (result.affectedRows) {
      responsecode = "826"
      message = 'Camera Ignore Recurrence updated successfully';
  }
  
  return {message};
  }
  
  async function deletedataRecurrence(camera){
  let message = 'Error in deleting Camera Ignore Recurrence';
  let responsecode = "8027"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8027"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const result = await db.query(
    `DELETE from ignorecamerarecurrence WHERE igcamera_id =${camera.ignoreid}` 
  );
  
  if (result.affectedRows) {
      responsecode = "827"
      message = 'Camera Ignore Recurrence deleted successfully';
  }
  
  return {message};
  }
  
  async function getMultipleRecurrence(page = 1,camera){
  let message = 'Error in fetching Camera Ignore Recurrence list';
  let responsecode = "8028"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8028"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  
  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (camera.cameraid!=0)
    sql=`SELECT * FROM ignorecamerarecurrence where camera_id=${camera.cameraid} LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);
  
    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Camera Ignore Recurrence list fetched successfully';
    responsecode = "828"
  
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'camera ID is missing. Please give any one of the input of camera ID';
    responsecode = "8028"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  }
  

  async function getLive(camera){
    let message = 'Error in fetching Camera Ignore Recurrence list';
    let responsecode = "8028"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+camera.userid+' and token="'+camera.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "8028"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    let sql=""
    if (camera.cameraid!=0)
      sql=`SELECT cm.camera_id,cm.camera_name,cm.Camera_Streaming_URL,dm.Device_name,dm.SDK_ID,dm.IP_Domain,dm.IP_Port,dm.RTSP_Port,dm.IP_Uname,dm.IP_Pwd FROM cameramaster cm,devicemaster dm where dm.device_id=cm.device_id and cm.camera_id=${camera.cameraid}`;
    console.error(`SQL data==>`, sql);
    if (sql!="")
    {
      const rows = await db.query(sql);      
      const data = helper.emptyOrRows(rows);
      var ts = Date.now();console.log(ts+"Domain/IP=>",data[0].IP_Domain);
      var ip_address = data[0].IP_Domain 
      var username = data[0].IP_Uname;
      var password=data[0].IP_Pwd;
      var rport=data[0].RTSP_Port;
      var camera_no=data[0].camera_name;
      var camera_id=data[0].camera_id;
      camera_no=camera_no.replace("Channel","");
      var RTSPUrl="";
      if (data[0].SDK_ID=="1")
        RTSPUrl = 'rtsp://' + username + ':' + password + '@' + ip_address +':'+rport+'/Streaming/Channels/'+camera_no+'01';
      else
        RTSPUrl = 'rtsp://' + username + ':' + password + '@' + ip_address +':'+rport+'/cam/realmonitor?channel='+camera_no+'&subtype=0&unicast=true&proto=Onvif';
      //@desc     A channel of camera stream
      stream = new rtspStream({
          streamUrl: RTSPUrl,
          //streamUrl: 'rtsp://106.201.136.88:9556/user=admin&password=rbl2018c&channel=1&stream=0.sdp',
          //streamUrl: 'rtsp://admin:Admin123@103.154.202.19:554/Streaming/tracks/101?starttime=20220423T180636z&endtime=20220423T184548z',
          wsPort: camera_id
      });
      message = 'Camera Live Web URL fetched successfully';
      responsecode = "828"
      var weburl="ws://127.0.0.1:"+camera_id
      return {
        responsecode,
        message,
        data,
        weburl
      }
    }
    else
    {
      message = 'camera ID is missing. Please give any one of the input of camera ID';
      responsecode = "8028"
      return {
        responsecode,
        message,
        data
      }
    }
    }

//########################################################################################################################################################################################################
//##################### GET DEVICE CAMERA LIST #########################################################################################################################################################################
//#######################################################################################################################################################################################################
async function getcamera(camera){
  try{
  if(camera.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse(false,"Login sessiontoken missing. Please provide the sessiontoken.","GET CAMERA","");
  }
  //check if the sessiontoken size is vaild ot not 
  if( camera.STOKEN.length <30 || camera.STOKEN.length >50 ){
    return helper.getErrorResponse(false,"Login sessiontoken size error.","GET CAMERA","");
  }
  //check if the sessiontoken is valid or not
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[camera.STOKEN]);
  const objectvalue = result[1][0];
  // console.log("userid of camera ->"+objectvalue["@result"]);
  const userid = objectvalue["@result"];
  if(userid == null ){
    return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","GET CAMERA","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT

  var secret = camera.STOKEN.substring(0,16);
  console.log("secret-->"+secret);

  let sql="";
  let rows="";
  if(camera.hasOwnProperty('querystring')== false){
  if (camera.deviceid!=''){
    sql = `select cm.camera_id,cm.camera_name from cameramaster cm,subscriptioncameras sc  where device_id in (${camera.deviceid}) and sc.camera_id=cm.camera_id and sc.status=1 Order by cm.camera_id;`;
    rows= await db.query(sql);
  }
  if(rows!=""){
    
    const data = helper.emptyOrRows(rows);
    // console.log(JSON.stringify(data));
    return helper.getSuccessResponse(true,"Camera List Fetched Successfully",data,secret);
  }
  else{
    return helper.getErrorResponse(false,"Error entered device id has no cameras","",secret);
  }}
  else{
    var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    // console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse(false,"Querystring Invalid. Please provide the valid querystring","CAMERA LIST",secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse(false,"Querystring json error. Please provide the valid Json","CAMERA LIST",secret);
  }
  if(queryData.hasOwnProperty('deviceid') == false){
    return helper.getErrorResponse(false,"THe Device id is Missing","CAMERA LIST",secret);
  }
    sql = `select cm.camera_id,cm.camera_name,dm.SDK_ID,dm.IP_Domain,dm.IP_port,dm.IP_Uname,dm.IP_Pwd,dm.device_id from cameramaster cm,subscriptioncameras sc,devicemaster dm  where cm.device_id in (${queryData.deviceid}) and dm.device_id =cm.device_id and sc.camera_id=cm.camera_id and sc.status=1 order by cm.camera_id;`;
    rows= await db.query(sql);
    }
    if(rows!=""){
  
    const data = helper.emptyOrRows(rows);
    // console.log(JSON.stringify(data));
    return helper.getSuccessResponse(true,"Camera List Fetched Successfully",data,secret);
   }
   else{
    return helper.getErrorResponse(false,"Error entered device id has no cameras","",secret);
  }
 }catch(er){
   return helper.getErrorResponse(false,'Internal error. Please contact Administration',er,secret);
}
  }

//########################################################################################################################################################################################################
//##################### GET DEVICE CAMERA LIST #########################################################################################################################################################################
//#######################################################################################################################################################################################################
async function getcameralive(camera){
     try{
    //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
    if(camera.hasOwnProperty('STOKEN')==false){
      return helper.getErrorResponse(false,"Sessiontoken missing","GET DEVICE CAMERA LIVE","");
     }
   //check if the sessiontoken is given as input or not
   if(camera.STOKEN.length < 30 || camera.STOKEN.length > 50){
    return helper.getErrorResponse(false,"Login sessiontoken size Error.","GET DEVICE CAMERA LIVE","");
   }
   // check if the given sessiontoken is valid one or not
   const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[camera.STOKEN]);
   const objectvalue = result[1][0];
   const userid = objectvalue["@result"];
  //  console.log("objectvalue live ->"+userid);
   if(userid == null ){
    return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","GET DEVICE CAMERA LIVE","");
   }
  
   var secret = camera.STOKEN.substring(0,16);
  //  console.log("SECRET ->"+secret);  
    //END OF VALIDATION 1
   //CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT

   
 if(camera.hasOwnProperty('cameraid'==false)){
  return helper.getErrorResponse(false,"Camera id missing","GET CAMERA LIVE",secret);
 }

   let sql=""
    if (camera.cameraid!=0)
      sql=`SELECT cm.camera_id,cm.camera_name,cm.Camera_Streaming_URL,dm.Device_name,dm.SDK_ID,dm.Device_id,dm.IP_Domain,dm.IP_Port,dm.RTSP_Port,dm.IP_Uname,dm.IP_Pwd,dm.Device_Type,cm.Camera_status FROM cameramaster cm,devicemaster dm where dm.device_id=cm.device_id and cm.camera_id IN (${camera.cameraid})`;
    // console.error(`SQL data==>`, sql);
    if (sql!="")
    {
      const rows = await db.query(sql);      
      const data = helper.emptyOrRows(rows);
      var ts = Date.now();console.log(ts+"Domain/IP=>",data[0].IP_Domain);
      var ip_address = data[0].IP_Domain;
      var ipport = data[0].IP_Port;
      var username = data[0].IP_Uname;
      var deviceid = data[0].Device_id;
      var sdkid = data[0].SDK_ID;
      var devicename = data[0].Device_name;
      var password=data[0].IP_Pwd;
      var rport=data[0].RTSP_Port;
      var devicetype = data[0].Device_Type;
      var channel=data[0].camera_name;
      var camera_id=data[0].camera_id;
      var camera_no=channel.replace("Channel","");
      var MainRTSPUrl ="";
      var SubRTSPUrl ="";
      var HeatMapUrl ="";
      if(data[0].SDK_ID =='1'){
           MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"01"; 
           SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"02";
           HeatMapUrl = "http://192.168.0.155:8089/heatmap?id="+camera_id+"&msize=640&stype=1";
      }
      else if(data[0].SDK_ID =='2'){
            MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=0";
            SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=1";
            HeatMapUrl = "http://192.168.0.155:8089/heatmap?id="+camera_id+"&msize=640&stype=1";
      }
      // console.log("RTSP URL-> "+MainRTSPUrl);
      // console.log("heat map url ->"+HeatMapUrl);
    //   stream = new rtspStream({
    //     streamUrl: RTSPUrl,
    //     //streamUrl: 'rtsp://106.201.136.88:9556/user=admin&password=rbl2018c&channel=1&stream=0.sdp',
    //     //streamUrl: 'rtsp://admin:Admin123@103.154.202.19:554/Streaming/tracks/101?starttime=20220423T180636z&endtime=20220423T184548z',
    //     wsPort: camera_id
    // });
    message = 'Camera Live fetched successfully';
    code = true;
    var weburl="ws://127.0.0.1:"+camera_id

    // const encrypt =(JSON.stringify({code,message,MainRTSPUrl,SubRTSPUrl,HeatMapUrl,ip_address,ipport,username,password,sdkid,deviceid,channel,camera_id,weburl }));
    try
    {
      const returnstr = JSON.stringify({code,message,MainRTSPUrl,SubRTSPUrl,HeatMapUrl,username,password,sdkid,deviceid,channel,camera_id,devicename,weburl,ip_address,ipport});
      if (secret!="")
      {

        const encryptedResponse = helper.encrypt(returnstr,secret);
        // console.log("returnstr=>"+JSON.stringify(encryptedResponse));
        return {encryptedResponse};
      }
      else
      {
        return ({code,message,MainRTSPUrl,SubRTSPUrl,HeatMapUrl,ip_address,ipport,username,password,sdkid,deviceid,channel,camera_id,devicename,weburl,ip_address,ipport});
      }
    }
    catch(Ex)
    {
      return ({code,message,MainRTSPUrl,SubRTSPUrl,HeatMapUrl,ip_address,ipport,username,password,sdkid,deviceid,channel,camera_id,devicename,weburl,ip_address,ipport});
    }
    //   const encrypt = helper.encrypt(JSON.stringify({
    //     responsecode,
    //     message,
    //     RTSPUrl ,
    //     weburl}), secret);
    // return encrypt;
  } 
    
  else
  {
   return helper.getErrorResponse(false,'Error fetching the camera live',"GET CAMERA INFO",secret);
  }
}catch(er){
  return helper.getErrorResponse(false,'Internal error. Please contact Administration',er,secret);
}
}

//###################################################################################################################################################################################################
//######################## PLAYBACK URL FOR THE LIVE ###########################################################################################################################################################################
//###################################################################################################################################################################################################

async function videoplayback(camera){
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","DEVICE VIDEO PLAYBACK","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("playback userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","DEVICE VIDEO PLAYBACK","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","DEVICE VIDEO PLAYBACK","");
  }
  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","DEVICE VIDEO PLAYBACK",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","DEVICE VIDEO PLAYBACK",secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_COMPANY_JSON_ERROR","DEVICE VIDEO PLAYBACK",secret);
  }
  if(queryData.hasOwnProperty('starttime')==false){
    return helper.getErrorResponse("PLAYBACK_STARTTIME_MISSING","DEVICE VIDEO PLAYBACK",secret);
  }
  if(queryData.hasOwnProperty('endtime')==false){
    return helper.getErrorResponse("PLAYBACK_ENDTIME_MISSING","DEVICE VIDEO PLAYBACK",secret);
  }
  if(queryData.hasOwnProperty('cameraid')==false){
    return helper.getErrorResponse("PLAYBACK_CAMERAID_MISSING","DEVICE VIDEO PLAYBACK",secret);
  }
  
  const moment = require('moment-timezone');
  const startTimeStr = queryData.starttime;
  const endTimeStr = queryData.endtime;

  const inputTimeZone = 'Asia/Kolkata';

  // Parse the input date strings with the input time zone
  const inputStartTime = moment.tz(startTimeStr, inputTimeZone);
  const inputEndTime = moment.tz(endTimeStr, inputTimeZone);

  console.log("start time -> " + inputStartTime);
  console.log("end time -> " + inputEndTime);

  // Format start time and end time as required
  const formattedStartTimeDahua = inputStartTime.format("YYYY_MM_DD_HH_mm_ss");
  const formattedEndTimeDahua = inputEndTime.format("YYYY_MM_DD_HH_mm_ss");

  const formattedStartTimeHikvision = inputStartTime.format("YYYYMMDDTHHmmss");
  const formattedEndTimeHikvision = inputEndTime.format("YYYYMMDDTHHmmss");

  console.log("formatted start time (Dahua) -> " + formattedStartTimeDahua);
  console.log("formatted end time (Dahua) -> " + formattedEndTimeDahua);

  console.log("formatted start time (Hikvision) -> " + formattedStartTimeHikvision);
  console.log("formatted end time (Hikvision) -> " + formattedEndTimeHikvision);

  function padZero(num) {
    return num.toString().padStart(2, "0");
  }
let sql1 ='';
 let rows1 = '';
 let data1 = '';
 var playbackurl = "";
if(queryData.cameraid != null){
 sql1=`SELECT cm.camera_id,cm.camera_name,cm.Camera_Streaming_URL,dm.Device_name,dm.SDK_ID,dm.IP_Domain,dm.IP_Port,dm.RTSP_Port,dm.IP_Uname,dm.IP_Pwd,dm.Device_Type FROM cameramaster cm,
 devicemaster dm where dm.device_id=cm.device_id and cm.camera_id IN (${queryData.cameraid})`;
 console.error(`SQL data==>`, sql1);
if (sql1!="")
    {
       rows1 = await db.query(sql1);      
       data1 = helper.emptyOrRows(rows1);
      var ts = Date.now();console.log(ts+"Domain/IP=>",data1[0].IP_Domain);
      var ip_address = data1[0].IP_Domain;
      var username = data1[0].IP_Uname;
      var password=data1[0].IP_Pwd;
      var rport=data1[0].RTSP_Port;
      var devicetype = data1[0].Device_Type;
      var camera_no=data1[0].camera_name;
      var camera_id=data1[0].camera_id;
      camera_no=camera_no.replace("Channel","");
      if(data1[0].SDK_ID =='1'){
           playbackurl  ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/Streaming/tracks/"+camera_no+"01?starttime=" +formattedStartTimeHikvision+ "z&endtime=" +formattedEndTimeHikvision+ "z";
      }
      else if(data1[0].SDK_ID =='2'){
            playbackurl ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/playback?channel="+camera_no+"&starttime=" +formattedStartTimeDahua+ "&endtime=" +formattedEndTimeDahua;
          }
      console.log("Playback url ->"+playbackurl);
      if(playbackurl == null){
        return helper.getErrorResponse("ERROR_FETCHING_PLAYBACK_URL","Error while fetching the video playback url",secret);
      }
}
}
if(playbackurl != null && data1 != null){
  return helper.getSuccessResponse("PLAYBACK_URL_FETCHED_SUCCESSFULLY","The Playback url fetched successfully",playbackurl,secret);
   let successmessage = "The Playback url fetched successfully";
   let successcode = "PLAYBACK_URL_FETCHED_SUCCESSFULLY";
      const encrypt = helper.encrypt(JSON.stringify({
        successcode,
        successmessage,
        playbackurl, }), secret);
    return encrypt;
}
else{
  return helper.getErrorResponse("ERROR_FETCHING_PLAYBACK_URL","Error while fetching the video playback url",secret);
}
}



//###################################################################################################################################################################################################
//######################## ADD GROUP CAMERA INFO###########################################################################################################################################################################
//###################################################################################################################################################################################################

async function camerainfo(camera){
  try{
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse(false,"Login sessiontoken Missing. Please provide the valid sessiontoken","GROUP CAMERA INFO","");
  }
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse(false,"Login sessiontoken size Invalid","GROUP CAMERA INFO","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("CAMERA INFO userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse(false,"Login sessiontoken Invalid.","GROUP CAMERA INFO","");
  }

  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("Querystring missing. Please provide the valid querystring","GROUP CAMERA INFO",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse(false,"Querystring Invalid error.","GROUP CAMERA INFO",secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("Querystring JSON error. Please provide the querystring with valid JSON","GROUP CAMERA INFO",secret);
  }

  var sql ="";
   sql = `select cm.Camera_ID,dt.Dept_Location,dm.Device_name,dm.Device_id from cameramaster cm,deptmaster dt, devicemaster dm where cm.Place = dt.Dept_ID and cm.Device_ID= dm.Device_ID and cm.Camera_ID IN(${queryData.cameraid})`;
   console.error(`SQL data==>`, sql);
    if (sql!="")
    {
      const rows = await db.query(sql);      
      const data = helper.emptyOrRows(rows);
      return helper.getSuccessResponse(true,"The User group Camera Info Fetched SUccessfully",data,secret);
    }
    else{
      return helper.getErrorResponse(false,"Error while fetching the camera info","GROUP CAMERA INFO",secret);
    }
  }catch(er){
     return helper.getErrorResponse(false,'Internal error. Please contact Administration',er,secret);
  }
    }


    

//###################################################################################################################################################################################################
//######################## get the camera sop###########################################################################################################################################################################
//###################################################################################################################################################################################################

async function GetCameraSOP(camera){
  
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","EVENT CAMERA INFO","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("CAMERA INFO userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","EVENT CAMERA INFO","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","EVENT CAMERA INFO","");
  }
  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","EVENT CAMERA INFO",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_PACKAGE_QUERY_ERROR","EVENT CAMERA INFO",secret);
  }
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_INFO_JSON_ERROR","EVENT CAMERA INFO",secret);
  }

  var sql ="";
   sql = `select SOP_ID,SOP_Name,Camera_ID from camerasop Where Camera_ID IN(${queryData.cameraid})`;
   console.error(`SQL data==>`, sql);
    if (sql!="")
    {
      const rows = await db.query(sql);      
      const data = helper.emptyOrRows(rows);
      return helper.getSuccessResponse("EVENT_CAMERA_INFO_FETCHED_SUCCESSFULLY","The User Event Camera Info Fetched SUccessfully",data,secret);
    }
    else{
      return helper.getErrorResponse("EVENT_CAMERA_INFO_FETCHING_ERROR","Error while fetching the Event camera info",secret);
    }
    }

    

//###################################################################################################################################################################################################
//######################## ADD THE CAMERA LOCATION###########################################################################################################################################################################
//###################################################################################################################################################################################################

async function AddCamLatLon(camera){
  let message = 'Error while adding the camera location';
  let responsecode = "7006"
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","ADD CAMERA LATITUDE AND LONGITUDE","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("CAMERA INFO userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","ADD CAMERA LATITUDE AND LONGITUDE","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","ADD CAMERA LATITUDE AND LONGITUDE","");
  }
  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("SITE_LOCATION_QUERY_MISSING","ADD CAMERA LATITUDE AND LONGITUDE",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_PACKAGE_QUERY_ERROR","ADD CAMERA LATITUDE AND LONGITUDE",secret);
  }
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_INFO_JSON_ERROR","ADD CAMERA LATITUDE AND LONGITUDE",secret);
  }
  if(queryData.hasOwnProperty('cameraid')==false || queryData.cameraid == ''){
    return helper.getErrorResponse("ADD_LOCATION_CAMERA_ID_MISSING","ADD CAMERA LATITUDE AND LONGITUDE",secret);
  }
  if(queryData.hasOwnProperty('latitude')==false || queryData.latitude == ''){
    return helper.getErrorResponse("ADD_LOCATION_CAMERA_ID_MISSING","ADD CAMERA LATITUDE AND LONGITUDE",secret);
  }
  if(queryData.hasOwnProperty('longitude')==false || queryData.longitude == ''){
    return helper.getErrorResponse("ADD_LOCATION_CAMERA_ID_MISSING","ADD CAMERA LATITUDE AND LONGITUDE",secret);
  }
  let sql1=""  
  sql1= `UPDATE cameramaster
  SET cam_lat = ${queryData.latitude}, cam_long = ${queryData.longitude}
  WHERE camera_id = ${queryData.cameraid};`;
  // console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  // console.error(`rows==>`, rows1);
  
if(rows1.affectedRows){
    message = 'camera location Added successfully';
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



//###################################################################################################################################################################################################
//######################## DELETE THE CAMERA LOCATION###########################################################################################################################################################################
//###################################################################################################################################################################################################

async function DeleteCamLatLon(camera){
  let message = 'Error while delete the camera location';
  let responsecode = "7006"
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","DELETE CAMERA LATITUDE AND LONGITUDE","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("CAMERA location userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","DELETE CAMERA LATITUDE AND LONGITUDE","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","DELETE CAMERA LATITUDE AND LONGITUDE","");
  }
  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("SITE_LOCATION_QUERY_MISSING","DELETE CAMERA LATITUDE AND LONGITUDE",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_PACKAGE_QUERY_ERROR","DELETE CAMERA LATITUDE AND LONGITUDE",secret);
  }
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("DELETE_CAMERA_LOCATION_JSON_ERROR","DELETE CAMERA LATITUDE AND LONGITUDE",secret);
  }
  if(queryData.hasOwnProperty('cameraid')==false || queryData.cameraid == ''){
    return helper.getErrorResponse("ADD_LOCATION_CAMERA_ID_MISSING","DELETE CAMERA LATITUDE AND LONGITUDE",secret);
  }
  let sql1=""  
  sql1= `UPDATE cameramaster
  SET cam_lat = NULL, cam_long = NULL
  WHERE camera_id = ${queryData.cameraid};`;
  // console.error(`SQL==>`, sql1);
  const rows1 = await db.query(sql1);
  // console.error(`rows==>`, rows1);
  
if(rows1.affectedRows){
    message = 'camera location deleted successfully';
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



//###################################################################################################################################################################################################
//######################## GET PLAYBACK MONTH TIMING ###########################################################################################################################################################################
//###################################################################################################################################################################################################
const net = require("net");
async function GetPlaybackDaily(camera){
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET PLAYBACK DAILY","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("CAMERA INFO userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET PLAYBACK DAILY","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","GET PLAYBACK DAILY","");
  }
  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","GET PLAYBACK DAILY",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_PACKAGE_QUERY_ERROR","GET PLAYBACK DAILY",secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_INFO_JSON_ERROR","GET PLABACK DAILY",secret);
  }
  if(queryData.hasOwnProperty('cameraid')==false || queryData.cameraid == ''){
    return helper.getErrorResponse("PLAYBACK_CAMERA_ID_MISSING","GET PLAYBACK DAILY")
  }
  if(queryData.hasOwnProperty('starttime')==false || queryData.starttime == ''){
    return helper.getErrorResponse("PLAYBACK_START_TIME_MISSING","GET PLAYBACK DAILY")
  }
  if(queryData.hasOwnProperty('endtime')==false || queryData.endtime == ''){
    return helper.getErrorResponse("PLAYBACK_END_TIME_MISSING","GET PLAYBACK DAILY")
  }
  let sql=""
  if (queryData.cameraid!=0)
    sql=`SELECT cm.camera_id,cm.camera_name,dm.SDK_ID,dm.IP_Domain,dm.IP_Port,dm.IP_Uname,dm.IP_Pwd,dm.Device_Type FROM cameramaster cm,devicemaster dm where dm.device_id=cm.device_id and cm.camera_id IN (${queryData.cameraid})`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);      
    const data1 = helper.emptyOrRows(rows);
    var ts = Date.now();console.log(ts+"Domain/IP=>",data1[0].IP_Domain);
    var ip_address = data1[0].IP_Domain;
    var ipusername = data1[0].IP_Uname;
    var ippassword=data1[0].IP_Pwd;
    var ipport=data1[0].IP_Port;
    console.log("ip port"+ipport);
    var devicetype = data1[0].Device_Type;
    var camera_no=data1[0].camera_name;
    var camera_id=data1[0].camera_id;
    camera_no=camera_no.replace("Channel","");
    if(data1[0].SDK_ID =='1'){

      const host = "192.168.0.155";
      const port = 11111;

      const serverAddress = ip_address;
      const serverPort = ipport;
      const username = ipusername;
      const password = ippassword;
      const startTime = queryData.starttime;
      const endTime = queryData.endtime;
      const channelIndex = camera_no;
      console.log("channelno"+channelIndex);
      
      // Define the command you want to send
      const command = `<GetPlaybackCountMonth>${serverAddress},${serverPort},${username},${password},${startTime},${endTime},${channelIndex}`;
      try {
        const tcpResponse = await connectToTCPServer(host, port, command);
  
        var playback = tcpResponse;
  
        const encrypt = await helper.encrypt(JSON.stringify({
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      } catch (error) {
        var message = "NO_RECORD_FOUND";
         var responsecode = "879"
        const encrypt = await helper.encrypt(JSON.stringify({
          message,
          responsecode,
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      }
    }
    else if(data1[0].SDK_ID =='2'){
      const net = require("net");

      const host = "192.168.0.155";
      const port = 22222;
      
      const serverAddress = ip_address;
      const serverPort = ipport;
      const username = ipusername;
      const password = ippassword;
      const startTime = queryData.starttime;
      const endTime = queryData.endtime;
      const channelIndex = camera_no;
      console.log("channelno"+channelIndex);
      
      // Define the command you want to send
      const command = `<GetPlaybackCountMonth>${serverAddress},${serverPort},${username},${password},${startTime},${endTime},${channelIndex}`;
      
      try {
        const tcpResponse = await connectToTCPServer(host, port, command);
  
        var playback = tcpResponse;
  
        const encrypt = await helper.encrypt(JSON.stringify({
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      } catch (error) {
         var message = "NO_RECORD_FOUND";
         var responsecode = "879"
        const encrypt = await helper.encrypt(JSON.stringify({
          message,
          responsecode,
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      }
}
  }
}
function connectToTCPServer(host, port, command) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(port, host, () => {
      console.log("Connected");
      client.write(command);
    });

    client.on("data", (data) => {
      console.log(`Received: ${data}`);
      console.log('Received data from the server:', data.toString());

      const responseString = data.toString();

      // Find the position of the first ',' to separate the totalFiles and files
      const commaIndex = responseString.indexOf(',');
    
      // Check if a comma was found
      if (commaIndex !== -1) {
        const totalFilesWithSuccess = responseString.substring(0, commaIndex);
    
        // Remove '<Success>' from the totalFiles value
        const totalFiles = totalFilesWithSuccess.replace('<Success>', '');
    
        const filesString = responseString.substring(commaIndex + 1);
        const filesArray = filesString.split(',');
    
        const files = [];
    
        // Loop through the remaining fields and create objects for each file
        for (const fileStr of filesArray) {
          const [fileName, startTime, endTime] = fileStr.split('|');
          files.push({ fileName, startTime, endTime });
        }
    
        const jsonResponse = {
          responsecode: "828",
          message: "Playback Month details",
          totalFiles: totalFiles,
          files: files,
        };
    
        // Convert the JSON object to a JSON string
        const jsonString = JSON.stringify(jsonResponse);
    
        // Resolve the promise with the JSON string
        resolve(jsonString);
      } else {
        // Handle the case where the response format is not as expected
        reject('Invalid response format');
      }
    
      client.end();
    });

    client.on("error", (error) => {
      console.log(`Error: ${error.message}`);
      reject(error.message);
    });

    client.on("close", () => {
      console.log("Connection closed");
    });
  });
}
 



//###################################################################################################################################################################################################
//######################## GET PLAYBACK MONTH TIMING ###########################################################################################################################################################################
//###################################################################################################################################################################################################
async function GetPlaybackMonth(camera){
  //CHECK IF THE LOGIN SESSIONTOKEN IS VALID OR NOT
  if(camera.STOKEN.length > 50 || camera.STOKEN.length < 30 ){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","GET PLAYBACK MONTH","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[camera.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("CAMERA INFO userid ->"+userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","GET PLAYBACK MONTH","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OT NOT
  if(camera.hasOwnProperty("STOKEN")== false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","GET PLAYBACK MONTH","");
  }
  var secret = camera.STOKEN.substring(0,16);
   console.log("SECRET ->"+secret);  
  if(camera.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","GET PLAYBACK MONTH",secret);
  }
  console.log("querystring=>"+camera.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(camera.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_PACKAGE_QUERY_ERROR","GET PLAYBACK MONTH",secret);
  }
         
  try
  {
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CAMERA_INFO_JSON_ERROR","GET PLABACK MONTH",secret);
  }
  if(queryData.hasOwnProperty('cameraid')==false || queryData.cameraid == ''){
    return helper.getErrorResponse("PLAYBACK_CAMERA_ID_MISSING","GET PLAYBACK MONTH")
  }
  if(queryData.hasOwnProperty('starttime')==false || queryData.starttime == ''){
    return helper.getErrorResponse("PLAYBACK_START_TIME_MISSING","GET PLAYBACK MONTH")
  }
  let sql=""
  if (queryData.cameraid!=0)
    sql=`SELECT cm.camera_id,cm.camera_name,dm.SDK_ID,dm.IP_Domain,dm.IP_Port,dm.IP_Uname,dm.IP_Pwd,dm.Device_Type FROM cameramaster cm,devicemaster dm where dm.device_id=cm.device_id and cm.camera_id IN (${queryData.cameraid})`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);      
    const data1 = helper.emptyOrRows(rows);
    var ts = Date.now();console.log(ts+"Domain/IP=>",data1[0].IP_Domain);
    var ip_address = data1[0].IP_Domain;
    var ipusername = data1[0].IP_Uname;
    var ippassword=data1[0].IP_Pwd;
    var ipport=data1[0].IP_Port;
    console.log("ip port"+ipport);
    var devicetype = data1[0].Device_Type;
    var camera_no=data1[0].camera_name;
    var camera_id=data1[0].camera_id;
    camera_no=camera_no.replace("Channel","");
    if(data1[0].SDK_ID =='1'){

      const host = "192.168.0.155";
      const port = 11111;

      const serverAddress = ip_address;
      const serverPort = ipport;
      const username = ipusername;
      const password = ippassword;
      const startTime = queryData.starttime;
      const endTime = '';
      const channelIndex = camera_no;
      console.log("channelno"+channelIndex);
      
      // Define the command you want to send
      const command = `<GetPlaybackCountMonth>${serverAddress},${serverPort},${username},${password},${startTime},${endTime},${channelIndex}`;
      try {
        const tcpResponse = await connectToTCPServer(host, port, command);
  
        var playback = tcpResponse;
  
        const encrypt = await helper.encrypt(JSON.stringify({
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      } catch (error) {
        var message = "NO_RECORD_FOUND";
         var responsecode = "879"
        const encrypt = await helper.encrypt(JSON.stringify({
          message,
          responsecode,
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      }
    }
    else if(data1[0].SDK_ID =='2'){
      const net = require("net");

      const host = "192.168.0.155";
      const port = 22222;
      
      const serverAddress = ip_address;
      const serverPort = ipport;
      const username = ipusername;
      const password = ippassword;
      const startTime = queryData.starttime;
      const endTime = queryData.endtime;
      const channelIndex = camera_no;
      console.log("channelno"+channelIndex);
      
      // Define the command you want to send
      const command = `<GetPlaybackCountMonth>${serverAddress},${serverPort},${username},${password},${startTime},${endTime},${channelIndex}`;
      
      try {
        const tcpResponse = await connectToTCPServer(host, port, command);
  
        var playback = tcpResponse;
  
        const encrypt = await helper.encrypt(JSON.stringify({
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      } catch (error) {
         var message = "NO_RECORD_FOUND";
         var responsecode = "879"
        const encrypt = await helper.encrypt(JSON.stringify({
          message,
          responsecode,
          playback
        }), secret);
  
        console.log("Encrypt" + encrypt);
        return encrypt;
      }
}
  }
}
function connectToTCPServer(host, port, command) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(port, host, () => {
      console.log("Connected");
      client.write(command);
    });

    client.on("data", (data) => {
      console.log(`Received: ${data}`);
      console.log('Received data from the server:', data.toString());

      const responseString = data.toString();

      // Find the position of the first ',' to separate the totalFiles and files
      const commaIndex = responseString.indexOf(',');
    
      // Check if a comma was found
      if (commaIndex !== -1) {
        const totalFilesWithSuccess = responseString.substring(0, commaIndex);
    
        // Remove '<Success>' from the totalFiles value
        const totalFiles = totalFilesWithSuccess.replace('<Success>', '');
    
        const filesString = responseString.substring(commaIndex + 1);
        const filesArray = filesString.split(',');
    
        const files = [];
    
        // Loop through the remaining fields and create objects for each file
        for (const fileStr of filesArray) {
          const [fileName, startTime, endTime] = fileStr.split('|');
          files.push({ fileName, startTime, endTime });
        }
    
        const jsonResponse = {
          responsecode: "828",
          message: "Playback Month details",
          totalFiles: totalFiles,
          files: files,
        };
    
        // Convert the JSON object to a JSON string
        const jsonString = JSON.stringify(jsonResponse);
    
        // Resolve the promise with the JSON string
        resolve(jsonString);
      } else {
        // Handle the case where the response format is not as expected
        const totalFiles = responseString.replace('<Success>', '');
        const jsonResponse = {
          responsecode: "828",
          message: "Playback Month details",
          totalFiles: totalFiles,
        };
    
        // Convert the JSON object to a JSON string
        const jsonString = JSON.stringify(jsonResponse);
    
        // Resolve the promise with the JSON string
        resolve(jsonString);
      }
    
      client.end();
    });

    client.on("error", (error) => {
      console.log(`Error: ${error.message}`);
      reject(error.message);
    });

    client.on("close", () => {
      console.log("Connection closed");
    });
  });
}

    
module.exports = {
  CameraActivate,
  CameraInactivate,
  create,
  update,
  deletedata,
  getMultiple,
  createAi,
  updateAi,
  deletedataAi,
  getMultipleAi,
  createNearby,
  updateNearby,
  deletedataNearby,
  getMultipleNearby,
  createStorage,
  updateStorage,
  deletedataStorage,
  getMultipleStorage,
  createActivate,
  updateActivate,
  getMultipleActivate,
  getMultipleactivatestatus,
  createIgnore,
  updateIgnore,
  deletedataIgnore,
  getMultipleIgnore,
  createRecurrence,
  updateRecurrence,
  deletedataRecurrence,
  getMultipleRecurrence,
  getLive,
  getcamera,
  getcameralive,
  videoplayback,
  camerainfo,
  GetCameraSOP,
  AddCamLatLon,
  DeleteCamLatLon,
  GetPlaybackDaily,
  GetPlaybackMonth,
}