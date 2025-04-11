const db = require('./db');
const helper = require('../helper');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Session } = require('inspector');
const moment = require('moment-timezone');
const { serialize } = require('v8');
const { he } = require('date-fns/locale');

async function create(event){
    let message = 'Error in creating new device event';
    let responsecode = "9001"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
    // console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "9001"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    //const result = await db.spcall('CALL addeventruntime("'+event.ipaddress+'",'+event.camerano+',"'+event.alerttext+'", @camID,@eid,'+event.ipport+')');
    const [result] = await db.spcall('CALL addeventruntime(?,?,?, @camID,@eid,?);select @camID,@eid;',[event.ipaddress,event.camerano,event.alerttext,event.ipport]);
    data = result[1];
    if (result.affectedRows) {
      responsecode = "901"
      message = 'Device event created successfully';
    }
    return {responsecode,message,data};
}


async function createSnapshot(event){
  let message = 'Error in creating new event snapshot';
  let responsecode = "9002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  // console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "9002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL addeventlog(?,?,?,?,?,@eaid);select @eaid;',[event.eventid,event.message,event.alerttext,1,event.userid]);
  data = result[1];
  if (result.affectedRows) {
    responsecode = "902"
    message = 'Event snapshot created successfully';
  }
  return {responsecode,message,data};
}


async function createSnapshotSingle(event){
  let message = 'Error in creating new event snapshot';
  let responsecode = "9002"
  // const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  // // console.error(`Result data==>`, resultAPI);
  // if (resultAPI.length == 0) 
  // {
  //     responsecode = "9002"
  //     message = "Invalid TOKEN";
  //     return{responsecode,message}
  // }
//  const [result] = await db.spcall('CALL addeventlog(?,?,?,?,?,@eaid);select @eaid;',[event.eventid,event.message,event.alerttext,1,event.userid]);
//  data = result[1];
var digestRequest = require('request-digest')(event.username, event.password);
var fs = require('fs');

// let date_ob = new Date();

// // current date
// // adjust 0 before single digit date
// let date = ("0" + date_ob.getDate()).slice(-2);

// // current month
// let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// // current year
// let year = date_ob.getFullYear();

// // current hours
// let hours = date_ob.getHours();

// // current minutes
// let minutes = date_ob.getMinutes();

// // current seconds
// let seconds = date_ob.getSeconds();

// // prints date in YYYY-MM-DD format
// console.log(year + "-" + month + "-" + date);

// // prints date & time in YYYY-MM-DD HH:MM:SS format
// console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
// var ctime = year + "_" + month + "_" + date + "_" + hours + "" + minutes + "" + seconds
  if (event.sdktype=="1")
  {
    digestRequest.request({
      host: 'http://'+event.ipdomain,
      path: '/ISAPI/Streaming/channels/'+event.camerano+'00/picture?videoResolutionWidth=1920&videoResolutionHeight=1080',
      port: event.httpport,
      method: 'GET',
      encoding:'binary'
    }, function (error, response, body) {
      if (error) {
        throw error;
      } 
      fs.writeFileSync(event.netpath, body, 'binary')
    })
    responsecode = "902"
    message = 'Event snapshot created successfully';
    data = event.netpath;
    return {responsecode,message,data};
  }
  else
  {
    digestRequest.request({
      host: 'http://'+event.ipdomain,
      path: '/cgi-bin/snapshot.cgi?channel='+event.camerano,
      port: event.httpport,
      method: 'GET',
      encoding:'binary'
    }, function (error, response, body) {
      if (error) {
        throw error;
      } 
      fs.writeFileSync(event.netpath, body, 'binary')
    })
    responsecode = "902"
    message = 'Event snapshot created successfully';
    data = event.netpath;
    return {responsecode,message,data};
  }
}

async function createAction(event){
  let message = 'Error in creating new event action';
  let responsecode = "9003"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  // console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "9003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL addactiontaken(?);',[event.eventid]);
  const [result1] = await db.spcall('CALL updateevent(?,?,?,?);',[event.eventid,event.flag,event.feedback,event.userid]);
  responsecode = "903"
  message = 'Event action created successfully';
  return {responsecode,message};
}


async function update(event){
  let message = 'Error in updating device event data';
  let responsecode = "8002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+device.userid+' and token="'+device.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from devicemaster WHERE Device_ID=${device.deviceid}` 
  );

  if (result.affectedRows) {
    const result = await db.query('CALL adddevice1('+device.deviceid+','+device.deptid+',"'+device.devicename+'",'+device.devicetype+', '+device.userid+',"'+device.brand+'","'+device.ipdomain+'",'+device.port+',"'+device.username+'","' +device.password+'",'+device.noach+','+device.noipch+','+device.noastream+','+device.motiondetection+','+device.sdkid+','+device.serialno+','+device.http+','+device.rtsp+')');

    if (result.affectedRows) {
      responsecode = "802"
      message = 'Device event created successfully';
    }
  }

  return {message};
}

async function deletedata(event){
  let message = 'Error in deleting device event data';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8004"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const [result] = await db.spcall(
    `DELETE from eventactiontaken WHERE event_id=${event.eventid};DELETE from eventactionlog WHERE event_id=${event.eventid};DELETE from eventlog WHERE event_id=${event.eventid};DELETE from eventmaster WHERE event_id=${event.eventid};` 
  );

  // if (result.affectedRows) {
      responsecode = "804"
      message = 'Device event data deleted successfully';
  // }

  return {message};
}

async function getMultiple(page = 1,event){
  let message = 'Error in fetching device event list';
  let responsecode = "8005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  // if (event.cameraid!=0)
  //   sql=`SELECT em.Event_ID,em.Row_updated_date,dt.dept_Location,dm.Device_name,cm.Camera_name,em.Event_name,em.Alertmessage,min(el.event_status) as event_status,cm.camera_id FROM eventmaster em,eventstatus el,devicemaster dm,cameramaster cm,deptmaster dt where dm.device_id=cm.device_id and dt.dept_id=cm.place and cm.camera_id=AnalyticSource_ID and el.event_id=em.event_id and em.event_id not in (select event_id from eventsmarked where Row_updated_date between "${event.startdate}" and "${event.enddate}") and em.analyticsource_id=${event.cameraid} LIMIT ${offset},${config.listPerPage}`;
  // if (event.deviceid!=0)
  //   sql=`SELECT em.Event_ID,em.Row_updated_date,dt.dept_Location,dm.Device_name,cm.Camera_name,em.Event_name,em.Alertmessage,min(el.event_status) as event_status,cm.camera_id FROM eventmaster em,eventstatus el,devicemaster dm,cameramaster cm,deptmaster dt where dm.device_id=cm.device_id and dt.dept_id=cm.place and cm.camera_id=AnalyticSource_ID and el.event_id=em.event_id and em.event_id not in (select event_id from eventsmarked where Row_updated_date between "${event.startdate}" and "${event.enddate}") and analyticsource_id in (select camera_id from cameramaster where device_id=${event.deviceid}) LIMIT ${offset},${config.listPerPage}`;
  // if (event.branchid!=0)
  //   sql=`SELECT em.Event_ID,em.Row_updated_date,dt.dept_Location,dm.Device_name,cm.Camera_name,em.Event_name,em.Alertmessage,min(el.event_status) as event_status,cm.camera_id FROM eventmaster em,eventstatus el,devicemaster dm,cameramaster cm,deptmaster dt where dm.device_id=cm.device_id and dt.dept_id=cm.place and cm.camera_id=AnalyticSource_ID and el.event_id=em.event_id and em.event_id not in (select event_id from eventsmarked where Row_updated_date between "${event.startdate}" and "${event.enddate}") and analyticsource_id in (select camera_id from cameramaster where device_id in (select device_id from devicemaster where dept_id in (select dept_id from deptmaster where branch_id=${event.branchid}))) LIMIT ${offset},${config.listPerPage}`;
  // if (event.customerid!=0)
  //   sql=`SELECT em.Event_ID,em.Row_updated_date,dt.dept_Location,dm.Device_name,cm.Camera_name,em.Event_name,em.Alertmessage,min(el.event_status) as event_status,cm.camera_id FROM eventmaster em,eventstatus el,devicemaster dm,cameramaster cm,deptmaster dt where dm.device_id=cm.device_id and dt.dept_id=cm.place and cm.camera_id=AnalyticSource_ID and el.event_id=em.event_id and em.event_id not in (select event_id from eventsmarked where Row_updated_date between "${event.startdate}" and "${event.enddate}") and SELECT * FROM devicemaster where analyticsource_id in (select camera_id from cameramaster where device_id in (select device_id from devicemaster where dept_id in (select dept_id from deptmaster where branch_id in (select branch_id from branchmaster where customer_id=${event.customerid})))) LIMIT ${offset},${config.listPerPage}`;
    
    let clSQL=`SELECT em.Event_ID,em.Row_updated_date,dt.dept_Location,dm.Device_name,cm.Camera_name,em.Event_name,em.Alertmessage,min(el.event_status) as event_status,cm.camera_id 
    FROM eventmaster em,eventstatus el,devicemaster dm,cameramaster cm,deptmaster dt where dm.device_id=cm.device_id and dt.dept_id=cm.place and cm.camera_id=AnalyticSource_ID and
     el.event_id=em.event_id and em.event_id not in (select event_id from eventsmarked where Row_updated_date between "${event.startdate}" and "${event.enddate}")`;
		if (event.customerid!="")//Company ID
		{
			clSQL=clSQL+" and dt.branch_id in (select branch_id from branchmaster where customer_id="+event.customerid+")";
		}
		if (event.deviceid!="")//Device ID
			clSQL=clSQL+" and dm.device_id="+event.deviceid;
		if (event.cameraid!="")//Camera ID
			clSQL=clSQL+" and cm.Camera_id in ("+event.cameraid+")";
		if (event.validflag!="")//Event Flag
			clSQL=clSQL+" and el.event_status="+event.validflag;
		if (event.eventtype!="")//Event Type
			clSQL=clSQL+" and em.event_id in (select event_id from eventlog where feedback like '%"+event.eventtype+"%' and event_id=em.Event_ID)";
		if (event.startdate!="" && event.enddate!="")//Event date
			clSQL=clSQL+" and em.Row_updated_date between '"+event.startdate+"' and '"+event.enddate+"'";
		if (event.AI!="" && event.AI!="All" && event.AI!="None")
		{
			if (event.AI=="Not detected")
				clSQL=clSQL+" and em.IsHumanDetected=0";
			else
				clSQL=clSQL+" and em.IsHumanDetected=1";
		}
		clSQL=clSQL+' group by em.Event_ID,em.Row_updated_date,dt.dept_Location,dm.Device_name,cm.Camera_name,em.Event_name,em.Alertmessage,cm.camera_id';
		clSQL=clSQL+' order by em.Row_updated_date desc,el.event_status asc';
    sql = clSQL;
		    
  // var ts = Date.now();console.log(ts+"SQL Data=>",sql);
  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'device event list Fetching successfully';
    responsecode = "805"

    return {
      responsecode,
      message,
      data,
      meta
    }
  }
  else
  {
    message = 'Branch/Customer/device/Camera ID is missing. Please give any one of the input of Branch/Customer/device/Camera ID';
    responsecode = "8005"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}


async function getEventSnapshot(page = 1,event){
  let message = 'Error in fetching  event snapshot list';
  let responsecode = "8005"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  
  if (resultAPI.length == 0) 
  {
      responsecode = "8005"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql=`select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and event_id=${event.eventid}`;		    
  const rows = await db.query(sql);

  //Custom feedback messages
  sql=`select message_id,message from custommessages`;
  console.error(`SQL==>`, sql);
  const feedbacktemplates = await db.query(sql);
  console.error(`feedbacktemplates==>`, feedbacktemplates);
  
  var str = rows[0].enddate;
  var evDate = new Date(str);
  var yyyy = evDate.getFullYear().toString();                                    
  var mm = (evDate.getMonth()+1).toString(); // getMonth() is zero-based         
  var dd  = evDate.getDate().toString();             

  var strDate = yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]);
  var strSitenane = rows[0].Branch_name;
  strSitenane = strSitenane.replace('-','');
  strSitenane = strSitenane.replace(' ','');
  strSitenane = strSitenane.replace("  ","")
  strSitenane = strSitenane.replace('\n','');
  var strCamID = rows[0].camera_id;
  var strEventID = rows[0].Event_ID;
  var FullPath = "http://my.sporada.in/volumes/"+strDate+"/"+strSitenane+"/cam"+strCamID+"/ivs/Event"+strEventID+"/thumb"
  var FullPaththumb = "\\\\192.168.0.165\\volumes\\"+strDate+"\\"+strSitenane+"\\cam"+strCamID+"\\ivs\\Event"+strEventID+"\\thumb"
  console.error(`Result enddate==>`, strDate);
  console.error(`Result Site==>`, strSitenane);
  console.error(`Result Camera ID==>`, strCamID);
  console.error(`Result Event ID==>`, strEventID);
  console.error(`Event folder structure path==> `,FullPath);
  const testFolder = FullPaththumb;
  const fs = require('fs');
  const images = [FullPath];
  fs.readdirSync(testFolder).forEach(file => {
    images.push(file);
    // console.log(file);
  });
  const data = helper.emptyOrRows(rows);
  message = 'Event details Fetched successfully';
  responsecode = "805"

  return {
    responsecode,
    message,
    data,
    images,
    feedbacktemplates
  }
}


async function getRecentEvent(event,page = 1){
  let message = 'Error in fetching recent event list';
  let responsecode = "8006"
  console.error(`Data==>`, event);
  console.error(`page==>`, page);
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8006"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql=`select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and em.Row_updated_date BETWEEN '${event.startdate}' and '${event.enddate}' and Event_ID in (select Event_ID from eventuser where user_id='${event.userid}') and Event_ID not in (select Event_ID from eventlog) ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Recent event list Fetching successfully';
  responsecode = "806"

  return {
    responsecode,
    message,
    data,
    meta
  }
}


async function getUnAckEvent(event,page = 1){
  let message = 'Error in fetching unacknowledged event list';
  let responsecode = "8007"
  console.error(`Data==>`, event);
  console.error(`page==>`, page);
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8007"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql=`select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and em.Row_updated_date BETWEEN '${event.startdate}' and '${event.enddate}' and Event_ID not in (select Event_ID from eventlog) ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Unacknowledged event list Fetching successfully';
  responsecode = "807"

  return {
    responsecode,
    message,
    data,
    meta
  }
}


async function getDeviceEvent(event,page = 1){
  let message = 'Error in fetching device event list';
  let responsecode = "8007"
  console.error(`Data==>`, event);
  console.error(`page==>`, page);
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+event.userid+' and token="'+event.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8007"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
  sql=`select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and em.Row_updated_date BETWEEN '${event.startdate}' and '${event.enddate}' and Event_ID not in (select Event_ID from eventlog) and (Event_Name like 'Tampering%' or Event_Name like 'HDD%' or Event_Name like 'Video%' or Event_Name like '%FULL%' or Event_Name like '%Device%') ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL==>`, sql);
  const rows = await db.query(sql);
  console.error(`rows==>`, rows);
  const data = helper.emptyOrRows(rows);
  const meta = {page};
  message = 'Device event list Fetching successfully';
  responsecode = "807"

  return {
    responsecode,
    message,
    data,
    meta
  }
}

//add the custom message for event
// ###############################################################################################################################################################################################
// ###############################################################################################################################################################################################
// ###############################################################################################################################################################################################

async function addCustomMessage(event){
  try{
      //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse(false,"Login sessiontoken missing.","EVENT ADD CUSTOM MESSAGE","");
  }
   //check if the sessiontoken size is valid or nor
   if(event.STOKEN.length < 30 || event.STOKEN.length > 50){
    return helper.getErrorResponse(false,"Login sessiontoken size Invalid","EVENT ADD CUSTOM MESSAGE","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("add custom  message userid-> "+userid);
  if(userid == null ){
    return helper.getErrorResponse(false,"Login sessiontoken Invalid","EVENT ADD CUSTOM MESSAGE","");
  }

  var secret = event.STOKEN.substring(0,16);
  console.log("secret ->"+secret);

  if(event.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse(false,"Querystring missing.","EVENT ADD CUSTOM MESSAGE","");
  }

  console.log("event querystring ->"+event.querystring);
  var querydata;
  try{ 
     querydata = await helper.decrypt(event.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse(false,"Querystring Invalid. Please provide the valid querystring","EVENT ADD CUSTOM MESSAGE",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse(false,"Querystring JSON error.","EVENT ADD CUSTOM MESSAGE",secret);
  }

  if(querydata.hasOwnProperty('message')==false){
    return helper.getErrorResponse(false,"Message missing","The customer event custom message is missing",secret);
  }

  const [result1] = await db.spcall('CALL SP_ADD_EVENT_MESSAGE(?,?,?);',[querydata.message,querydata.messagetype,userid]);
  if(result1.affectedRows){
    return helper.getSuccessResponse(true,"The custom message was added successfully",querydata.message,secret);
  }
  else{
    return helper.getErrorResponse(false,"Error while adding event custom message",secret);
  }
}catch(er){
  return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
}
} 
// ###############################################################################################################################################################################################
// ###############################################################################################################################################################################################
// ###############################################################################################################################################################################################

// GET THE EVENT PAGE CUSTOM MESSAGE
async function getCustomMessage(event){
  try{
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse(false,"Login sessiontoken missing","EVENT GET CUSTOM MESSAGE","");
  }
  //check if the sessiontoken size is valid or nor
  console.log("Session ->"+event.STOKEN);
  if(event.STOKEN.length < 30 || event.STOKEN.length > 50){
    return helper.getErrorResponse(false,"Login sessiontoken size errro.","EVENT GET CUSTOM MESSAGE","");
  }
  //CHECK IF THE SESSIONTOKEN IS VALID OR NOT
  const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail;',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("get custom  message userid-> "+userid);
  if(userid == null ){
    return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","EVENT GET CUSTOM MESSAGE","");
  }
   
  var secret = event.STOKEN.substring(0,16);
  console.log("secret ->"+secret);
  
  let sql="";
  let rows ="";
  
  sql=`SELECT message_id,message from custommessages`;
  rows = await db.query(sql);

  
  if (rows!="")
  { 
    const data = JSON.stringify(helper.emptyOrRows(rows));
    console.log(data);
    return helper.getSuccessResponse(true,"The Event Custom Message list Fetched Successfully",data,secret);
  }
  else
  {
    return helper.getErrorResponse(true,"The Event Custom Message list Fetched Successfully",data,secret);
  }
}catch(er){
  return helper.getErrorResponse(false,"Internal error. Please contact Adminstration",er,secret);
}
}
// ###############################################################################################################################################################################################
//################################# GET EVENT LIST #############################################################################################################################################

async function getEventAction(page, event){
   try {
    if (!event.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login sessiontoken missing", "GET EVENT INFO", "");
    }

    if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login sessiontoken size Invalid", "GET EVENT INFO", "");
    }

    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];

    if (userid == null) {
      return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken", "GET EVENT INFO", "");
    }

    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "GET EVENT INFO", "");
    }

    const secret = event.STOKEN.substring(0, 16);
    let querydata;

    try {
      querydata = await helper.decrypt(event.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error", "GET EVENT INFO", secret);
    }

    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid. Please provide the valid Querystring", "GET EVENT INFO", secret);
    }

    const offset = helper.getOffset(page, config.listPerPage);

    if (!querydata.hasOwnProperty('eventid')) {
      return helper.getErrorResponse(false, "Event id missing. Please provide the userid", "Please enter the user id for the device event", secret);
    }

    let sql = `SELECT 
    em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected,
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, 
    dt.Dept_Location, dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name,bm.contact_person, cm.Camera_Status, es.detected_file eventpath FROM eventmaster em LEFT JOIN 
    eventaistatus es ON es.Event_id = em.Event_ID JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN 
    deptmaster dt ON dt.dept_id = dm.dept_id LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id WHERE em.Event_ID = ${querydata.eventid} LIMIT 1;`;

    const rows = await db.query(sql);
    const data = helper.emptyOrRows(rows);
    const eventLinks = data.map(event => ({
      Event_ID: event.Event_ID,
      Event_Name: event.Event_Name,
      whatsappgroupname: event.whatsappgroupname,
      eventtime: event.eventtime,
      Alertmessage: event.Alertmessage,
      cameraid: event.camera_id,
      cameraname: event.camera_name,
      IpDomain: event.IP_Domain,
      IpPort: event.IP_port,
      username: event.IP_Uname,
      password: event.IP_Pwd,
      devicename: event.device_name,
      SDK_ID: event.SDK_ID,
      deviceid: event.device_id,
      deptname: event.Dept_name,
      Dept_Location: event.Dept_Location,
      Name1: event.Name1,
      Contact_mobile1: event.Contact_mobile1,
      Contact_Email1: event.Contact_Email1,
      Branch_name: event.Branch_name,
      device_name: event.device_name,
      Camera_Status: event.Camera_Status,
      Imageurl: event.eventpath
    }));

    const meta = { page };
    return helper.getSuccessResponse(true, "Event info fetched successfully", eventLinks, secret);

  } catch (er) {
    return helper.getErrorResponse(false, 'Internal error. Please contact Administration', er, "");
  }
}



//####################################################################################################################################################################################################################
//########################## GET EVENT PROPERTIES ####################################################################################################################################################################
//###################################################################################################################################################################################################################.

async function getEventProperty( event){
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","CUSTOMER GET EVENT PROPERTY","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("event PROPERTY userid ->"+ userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CUSTOMER GET EVENT PROPERTY","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","CUSTOMER GET EVENT PROPERTY","");
  }
  //BEGIN VALIDATION 2
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(event.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("EVENT_PACKAGE_QUERY_MISSING","CUSTOMER GET EVENT PROPERTY","");
  }
  var secret=event.STOKEN.substring(0,16);
  console.log("secret-->"+secret);
  console.log("event querystring ->"+ event.querystring);
  var querydata;
  
  try{ 
     querydata = await helper.decrypt(event.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse("EVENT_PACKAGE_QUERY_ERROR","CUSTOMER GET EVENT PROPERTY",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse("CUST_CONTACT_JSON_ERROR","CUSTOMER GET EVENT PROPERTY",secret);
  }

  if(querydata.hasOwnProperty('eventid')==false){
    return helper.getErrorResponse("DEVICE_EVENT_ID_MISSING","The customer Event id is missing . Please the Event ID.",secret);
  }
  let sql ='';
  let rows='';
 sql=`SELECT cm.Camera_name,cm.Camera_ID,dm.Device_name,bm.city,em.Event_ID,em.Event_Name,
      em.Event_Name,em.Row_updated_date,cm.Status,em.Alertmessage FROM eventmaster em, cameramaster cm,devicemaster dm,deptmaster dt,branchmaster bm WHERE cm.Camera_ID = em.AnalyticSource_ID
       AND dm.Device_ID = cm.Device_ID AND dt.dept_id = dm.Dept_ID AND bm.branch_id = dt.branch_id AND em.Event_ID= ${querydata.eventid};`;
 rows = await db.query(sql);
 const data = JSON.stringify(helper.emptyOrRows(rows));
 console.log(data);
 if(data == null){
  return helper.getErrorResponse("EVENT_LIST_FETCHING_ERROR","Error while fetching the event list. ",secret);
 }

 const cameraid = rows[0].Camera_ID;
 console.log("camera_id ->" + cameraid);
 console.log("dateformat ->"+ rows[0].Row_updated_date);
 
console.log("start time -> " + starttime.toISOString());
  console.log("end time -> " + endtime.toISOString());

  // Format start time and end time as required
  const formattedStartTimeDahua = formatDateDahua(starttime);
  const formattedEndTimeDahua = formatDateDahua(endtime);

  const formattedStartTimeHikvision = formatDateHikvision(starttime);
  const formattedEndTimeHikvision = formatDateHikvision(endtime);

  console.log("formatted start time (Dahua) -> " + formattedStartTimeDahua);
  console.log("formatted end time (Dahua) -> " + formattedEndTimeDahua);

  console.log("formatted start time (Hikvision) -> " + formattedStartTimeHikvision);
  console.log("formatted end time (Hikvision) -> " + formattedEndTimeHikvision);

  function formatDateDahua(date) {
    return (
      date.getUTCFullYear() +
      "_" +
      padZero(date.getUTCMonth() + 1) +
      "_" +
      padZero(date.getUTCDate()) +
      "_" +
      padZero(date.getUTCHours()) +
      "_" +
      padZero(date.getUTCMinutes()) +
      "_" +
      padZero(date.getUTCSeconds()) + "i"
    );
  }

  function formatDateHikvision(date) {
    return (
      date.getUTCFullYear() +
      padZero(date.getUTCMonth() + 1) +
      padZero(date.getUTCDate()) +
      "T" +
      padZero(date.getUTCHours()) +
      padZero(date.getUTCMinutes()) +
      padZero(date.getUTCSeconds()) +
      "z"
    );
  }

  function padZero(num) {
    return num.toString().padStart(2, "0");
  }

 let sql1 ='';
 let rows1 = '';
 let data1 = '';
 var MainRTSPUrl="";
 var SubRTSPUrl="";
 var playbackurl = "";
if(cameraid != null){
 sql1=`SELECT cm.camera_id,cm.camera_name,cm.Camera_Streaming_URL,dm.Device_name,dm.SDK_ID,dm.IP_Domain,dm.IP_Port,dm.RTSP_Port,dm.IP_Uname,dm.IP_Pwd,dm.Device_Type FROM cameramaster cm,
 devicemaster dm where dm.device_id=cm.device_id and cm.camera_id=${cameraid}`;
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
           MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"01"; 
           SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"02"; 
           playbackurl  ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/Streaming/tracks/"+camera_no+"01?starttime=" +formattedStartTimeHikvision+ "z&endtime=" +formattedEndTimeHikvision+ "z";
      }
      else if(data1[0].SDK_ID =='2'){
            MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=0";
            SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=1";
            playbackurl ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/playback?channel="+camera_no+"&starttime=" +formattedStartTimeDahua+ "&endtime=" +formattedEndTimeDahua;
          }
        
      console.log("MAIN RTSP URL-> "+MainRTSPUrl);
      console.log("SUB RTSP URL -> "+ SubRTSPUrl);
      console.log("Playback url ->"+playbackurl);
      if(MainRTSPUrl == null){
        return helper.getErrorResponse("ERROR_FETCHING_RTSPURL","Error while fetching the RTSP url for the camera", secret);
      }
      if(playbackurl == null){
        return helper.getErrorResponse("ERROR_FETCHING_PLAYBACK_URL","Error while fetching the video playback url",secret);
      }
}
}
if(MainRTSPUrl != null && playbackurl != null && data != null){
   let successmessage = "The Event list Properties Fetched Successfully.";
   let successcode = "EVENT_PROPERTY_FETCHED_SUCCESSFULLY";
      const encrypt = helper.encrypt(JSON.stringify({
        successcode,
        successmessage,
        MainRTSPUrl,
        SubRTSPUrl,
        playbackurl,
        data }), secret);
    return encrypt;
//  return {
//   successmessage,
//   successcode,
//   RTSPUrl,
//   playbackurl,
//   data
//  }
}
else{
  let errormessage = "Error while fetching the Event list properties.";
  let errorcode = 7004;
  return helper.getErrorResponse(errorcode,errormessage,secret);
}

 }

//###################################################################################################################################################################################################
//######################## ADD EVENT FEEDBACK TO THE EVENT LOG ###########################################################################################################################################################################
//###################################################################################################################################################################################################
// async function addEventFeedback(event) {
//   try {
//     //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
//     if (!event.hasOwnProperty('STOKEN')) {
//       return helper.getErrorResponse(false, "Login sessiontoken missing.", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
//     if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
//       return helper.getErrorResponse(false, "Login sessiontoken Size Error.", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
//     const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
//     const objectvalue = result[1][0];
//     const userid = objectvalue["@result"];
//     console.log("event feedback userid ->" + userid);

//     if (userid == null) {
//       return helper.getErrorResponse(false, "Login sessiontoken Invalid", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     //BEGIN VALIDATION 2
//     // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
//     if (!event.hasOwnProperty("querystring")) {
//       return helper.getErrorResponse(false, "Querystring missing.", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     let secret = event.STOKEN.substring(0, 16);
//     console.log("secret-->" + secret);
//     console.log("event querystring ->" + event.querystring);

//     let querydata;
//     try {
//       querydata = await helper.decrypt(event.querystring, secret);
//       console.log("decrypted querydata->" + querydata);
//     } catch (ex) {
//       return helper.getErrorResponse(false, "Querystring error", "CUSTOMER ADD EVENT FEEDBACK", secret);
//     }

//     let events;
//     try {
//       events = JSON.parse(querydata);
//     } catch (ex) {
//       return helper.getErrorResponse(false, "Querystring JSON error", "CUSTOMER ADD EVENT FEEDBACK", secret);
//     }

//     // Ensure events is an array for consistency
//     if (!Array.isArray(events)) {
//       events = [events];
//     }

//     let allResults = [];

//     for (let evt of events) { // use evt to avoid name collision
//       if (!evt.hasOwnProperty('eventid')) {
//         allResults.push({ code: false, message: "The customer Event ID is missing. Please provide the Event ID.", module: "CUSTOMER ADD EVENT FEEDBACK"});
//         continue;
//       }

//       if (!evt.hasOwnProperty('feedback')) {
//         allResults.push({ code: false, message: "The customer event feedback is missing", module: "CUSTOMER ADD EVENT FEEDBACK" });
//         continue;
//       }

//       if (!evt.hasOwnProperty('flag')) {
//         allResults.push({ code: 'EVENT_FLAG_MISSING', message: "The Customer event flag is missing. Please enter the flag", module: "CUSTOMER ADD EVENT FEEDBACK" });
//         continue;
//       }

//       const [result1] = await db.spcall('CALL SP_UPDATE_EVENT_LOG(?,?,?,?);', [evt.eventid, evt.flag, evt.feedback, userid]);

//       if (result1.affectedRows) {
//         allResults.push({ code: true, message: "The customer event log added successfully", feedback: evt.feedback, module: "CUSTOMER ADD EVENT FEEDBACK" });
//       } else {
//         allResults.push({ code: "EVENT_LOG_ADD_FAILED", message: "Error while adding the event log. Please check the details and re-enter it correctly", module: "CUSTOMER ADD EVENT FEEDBACK" });
//       }
//     }
//      var allResults1 =  helper.encrypt(JSON.stringify(allResults),secret);
//      return allResults1;
//     let returnstr = JSON.stringify(allResults);

//     try {
//       if (secret != "") {
//         const encryptedResponse = helper.encrypt(returnstr, secret);
//         console.log("returnstr=>" + JSON.stringify(encryptedResponse));
//         return { encryptedResponse };
//       } else {
//         return allResults;
//       }
//     } catch (ex) {
//       return allResults;
//     }
//   } catch (er) {
//     return helper.getErrorResponse(false, "Internal error. Please contact Administration", er.message);
//   }
// }
// async function addEventFeedback(event) {
//   try {
//     //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
//     if (!event.hasOwnProperty('STOKEN')) {
//       return helper.getErrorResponse(false, "Login sessiontoken missing.", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
//     if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
//       return helper.getErrorResponse(false, "Login sessiontoken Size Error.", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
//     const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
//     const objectvalue = result[1][0];
//     const userid = objectvalue["@result"];
//     console.log("event feedback userid ->" + userid);

//     if (userid == null) {
//       return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     //BEGIN VALIDATION 2
//     // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
//     if (!event.hasOwnProperty("querystring")) {
//       return helper.getErrorResponse(false, "Querystring missing.", "CUSTOMER ADD EVENT FEEDBACK", "");
//     }

//     let secret = event.STOKEN.substring(0, 16);
//     console.log("secret-->" + secret);
//     console.log("event querystring ->" + event.querystring);

//     let querydata;
//     try {
//       querydata = await helper.decrypt(event.querystring, secret);
//       console.log("decrypted querydata->" + querydata);
//     } catch (ex) {
//       return helper.getErrorResponse(false, "Querystring error", "CUSTOMER ADD EVENT FEEDBACK", secret);
//     }

//     let events;
//     try {
//       events = JSON.parse(querydata);
//     } catch (ex) {
//       return helper.getErrorResponse(false, "Querystring JSON error", "CUSTOMER ADD EVENT FEEDBACK", secret);
//     }

//     // Ensure events is an array for consistency
//     if (!Array.isArray(events)) {
//       events = [events];
//     }

//     let allResults = [];

//     for (let evt of events) { // use evt to avoid name collision
//       if (!evt.hasOwnProperty('eventid')) {
//         allResults.push({ code: false, message: "The customer Event ID is missing. Please provide the Event ID.", module: "CUSTOMER ADD EVENT FEEDBACK"});
//         continue;
//       }

//       if (!evt.hasOwnProperty('feedback')) {
//         allResults.push({ code: false, message: "The customer event feedback is missing", module: "CUSTOMER ADD EVENT FEEDBACK",eventid:evt.eventid});
//         continue;
//       }

//       if (!evt.hasOwnProperty('flag')) {
//         allResults.push({ code: 'EVENT_FLAG_MISSING', message: "The Customer event flag is missing. Please enter the flag", module: "CUSTOMER ADD EVENT FEEDBACK" ,eventid:evt.eventid});
//         continue;
//       }
//       let sql;
//       if (evt.eventid.startsWith('S1_')) {
//         const numericId = evt.eventid.replace(/^S1_/, '');
//         [sql] = await db.spcall1(`CALL SP_UPDATE_EVENT_LOG(?,?,?,?);`, [numericId, evt.flag, evt.feedback, userid]);
//       } else if (evt.eventid.startsWith('S2_')) {
//         const numericId = evt.eventid.replace(/^S2_/, '');
//         [sql] = await db.spcall(`CALL SP_UPDATE_EVENT_LOG(?,?,?,?);`, [numericId, evt.flag, evt.feedback, userid]);
//       } else {    // Determine which SQL procedure to call based on the eventid prefix
//         [sql] = await db.spcall(`CALL SP_UPDATE_EVENT_LOG(?,?,?,?);`, [evt.eventid, evt.flag, evt.feedback, userid]);
//        }
//       // const [result1] = await db.spcall('CALL SP_UPDATE_EVENT_LOG(?,?,?,?);', [evt.eventid, evt.flag, evt.feedback, userid]);

//       if (sql.affectedRows) {
//         allResults.push({ code: true, message: "The customer event log added successfully", feedback: evt.feedback, module: "CUSTOMER ADD EVENT FEEDBACK",eventid:evt.eventid });
//       } else {
//         allResults.push({ code: "EVENT_LOG_ADD_FAILED", message: "Error while adding the event log. Please check the details and re-enter it correctly", module: "CUSTOMER ADD EVENT FEEDBACK",eventid:evt.eventid });
//       }
//     }

//     // Prepare the final object to be encrypted
//     const responseObject = { allResults };

//     // Encrypt the entire response object
//     const encryptedResponse = helper.encrypt(JSON.stringify(responseObject), secret);

//     // Return the encrypted response
//     return { encryptedResponse };

//   } catch (er) {
//     return helper.getErrorResponse(false, "Internal error. Please contact Administration", er.message);
//   }
// }

//###################################################################################################################################################################################################
//#####################  ADD EVENT WHATSAPP LOG ############################################################################################################################################################################
//####################################################################################################################################################################################################

async function addEventFeedback(event) {
  try {
    //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
    if (!event.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login sessiontoken missing.", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login sessiontoken Size Error.", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    // console.log("event feedback userid ->" + userid);

    if (userid == null) {
      return helper.getErrorResponse(false, "Login sessiontoken Invalid", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    //BEGIN VALIDATION 2
    // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing.", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    let secret = event.STOKEN.substring(0, 16);
    console.log("secret-->" + secret);
    // console.log("event querystring ->" + event.querystring);

    let querydata;
    try {
      querydata = await helper.decrypt(event.querystring, secret);
      console.log("decrypted querydata->" + querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring error", "CUSTOMER ADD EVENT FEEDBACK", secret);
    }

    let evtData;
    try {
      evtData = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring JSON error", "CUSTOMER ADD EVENT FEEDBACK", secret);
    }

    // Check if eventid, feedback, and flag are present
    if (!evtData.hasOwnProperty('eventid')) {
      return helper.getErrorResponse(false, "Event ID missing. Please provide a valid Event ID.", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    if (!evtData.hasOwnProperty('feedback')) {
      return helper.getErrorResponse(false, "Feedback missing. Please provide feedback.", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    if (!evtData.hasOwnProperty('flag')) {
      return helper.getErrorResponse(false, "Flag missing. Please provide the flag.", "CUSTOMER ADD EVENT FEEDBACK", "");
    }

    // Ensure eventid is an array, if not, make it an array
    let eventIds = Array.isArray(evtData.eventid) ? evtData.eventid : [evtData.eventid];
    let allResults = [];

    // Process each eventid
    for (let eventid of eventIds) {
      const [result1] = await db.spcall('CALL SP_UPDATE_EVENT_LOG(?,?,?,?);', [eventid, evtData.flag, evtData.feedback, userid]);

      if (result1.affectedRows) {
        allResults.push({ code: true, message: "The customer event log added successfully", eventid: eventid, module: "CUSTOMER ADD EVENT FEEDBACK" });
      } else {
        allResults.push({ code: false, message: `Event ID ${eventid}: Error while adding the event log. Please check the details and re-enter correctly.`, module: "CUSTOMER ADD EVENT FEEDBACK" });
      }
    }

    // Encrypt the results and return
    const encryptedResponse = helper.encrypt(JSON.stringify(allResults), secret);
    return {encryptedResponse}
  } catch (er) {
    return helper.getErrorResponse(false, "Internal error. Please contact Administration", er.message);
  }
}



//###################################################################################################################################################################################################
//######################## ADD EVENT FEEDBACK TO THE EVENT LOG ###########################################################################################################################################################################
//###################################################################################################################################################################################################

async function addWhatsappLog(event){
  try{
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse(false,"Login sessiontoken missing. Please provide the Login sessiontoken","CUSTOMER ADD EVENT WHATSAPP LOG","");
  }
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse(false,"Login sessiontoken Size Invalid.","CUSTOMER ADD EVENT WHATSAPP LOG","");
  }
// CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
const objectvalue = result[1][0];
const userid = objectvalue["@result"];
console.log("event feedback userid ->"+ userid);
if(userid == null){
  return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","CUSTOMER ADD EVENT WHATSAPP LOG","");
}

//BEGIN VALIDATION 2
// CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
if(event.hasOwnProperty("querystring")==false){
  return helper.getErrorResponse(false,"Querystring missing. Please provide the querystring","CUSTOMER ADD EVENT WHATSAPP LOG","");
}
var secret=event.STOKEN.substring(0,16);
console.log("secret-->"+secret);
console.log("event querystring ->"+ event.querystring);
var querydata;

try{ 
   querydata = await helper.decrypt(event.querystring,secret);
   console.log("decrypted querydata->"+querydata);
}
catch(ex){
  return helper.getErrorResponse(false,"Querystring Invalid error.","CUSTOMER ADD EVENT WHATSAPP LOG",secret);
}
try{
  querydata= JSON.parse(querydata);
}
catch(ex){
  return helper.getErrorResponse(false,"Querystring JSON error.","CUSTOMER ADD EVENT WHATSAPP LOG",secret);
}
if(querydata.hasOwnProperty("eventid")==false){
  return helper.getErrorResponse(false,"Event id missing. Please provide the event id","CUSTOMER ADD EVENT WHATSAPP LOG",secret);
}
if(querydata.hasOwnProperty("groupname")==false){
  return helper.getErrorResponse(false,"Group name missing. Please provide the group name","CUSTOMER ADD EVENT WHATSAPP LOG",secret);
}

if(querydata.hasOwnProperty("messagetext")==false){
  return helper.getErrorResponse(false,"Message text missing. Please provide the message text","CUSTOMER ADD EVENT WHATSAPP LOG",secret); 
}

if(querydata.hasOwnProperty("imagepath")==false){
  return helper.getErrorResponse(false,"Image path missing. Please provide the imagepath","CUSTOMER ADD EVENT WHATSAPP LOG",secret);
}

const [result1] = await db.spcall('CALL SP_ADD_WHATSAPP_LOG(?,?,?,?,?);',[querydata.groupname,querydata.eventid,userid,querydata.messagetext,querydata.imagepath]);
if(result1.affectedRows){
  return helper.getSuccessResponse(true,"The Event Whatsapp log was added Successfully.",querydata.eventid,secret);
}
else{
  return helper.getErrorResponse(false,"Error while adding the event whatsapp log",querydata.eventid,secret);
}
  }catch(er){
    return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
  }
}
//###################################################################################################################################################################################################
//################################# GET AI EVENT HUMAN DETECTION ##################################################################################################################################################################
//###################################################################################################################################################################################################
async function GetAIEvent(event){
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","CUSTOMER GET AI EVENT","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  console.log("AI event userid ->"+ userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CUSTOMER GET AI EVENT","");
  }
  //CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","CUSTOMER GET AI EVENT","");
  }
  //BEGIN VALIDATION 2
// CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
if(event.hasOwnProperty("querystring")==false){
  return helper.getErrorResponse("AI_EVENT_QUERY_MISSING","CUSTOMER GET AI EVENT","");
}
var secret=event.STOKEN.substring(0,16);
console.log("secret-->"+secret);
console.log("AI event querystring ->"+ event.querystring);
var querydata;

try{ 
   querydata = await helper.decrypt(event.querystring,secret);
   console.log("decrypted querydata->"+querydata);
}
catch(ex){
  return helper.getErrorResponse("AI_EVENT_QUERY_ERROR","CUSTOMER GET AI EVENT",secret);
}
try{
  querydata= JSON.parse(querydata);
}
catch(ex){
  return helper.getErrorResponse("AI_EVENT_JSON_ERROR","CUSTOMER GET AI EVENT",secret);
}
if(querydata.hasOwnProperty("eventid")==false){
  return helper.getErrorResponse("CUSTOMER_EVENT_ID_MISSING","CUSTOMER GET AI EVENT",secret);
}
   let sql ='';
   let rows='';

  sql=`SELECT em.Event_id,em.IsHumanDetected, el.status FROM eventmaster em JOIN eventlog el ON em.Event_ID = el.Event_ID WHERE em.Event_ID = ${querydata.eventid}`;
  rows = await db.query(sql);

  if (rows!="")
  { 
    const data = JSON.stringify(helper.emptyOrRows(rows));
    console.log(data);
    return helper.getSuccessResponse("EVENT_LIST_FETCHED_SUCCESSFULLY","The Event list Fetched Successfully",data,secret);
  }
  else
  {
    return helper.getErrorResponse("EVENT_LIST_FETCHING_ERROR","Error while fetching the Event list",secret);
 }  
}

//#########################################################################################################################################################################################################
//##################### EVENT LIST FILTER #################################################################################################################################################################################
//#####################################################################################################################################################################################################

// async function Eventlistfilter(page,event){
//   try{
//   if(event.hasOwnProperty('STOKEN')==false){
//     return helper.getErrorResponse(false,"Login sessiontoken missing. Please provide the Login sessiontoken","CUSTOMER FILTER EVENT LIST","");
//   }
//   //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
//   if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
//     return helper.getErrorResponse(false,"Login sessiontoken size invalid. Please provide the valid Sessiontoken","CUSTOMER FILTER EVENT LIST","");
//   }
//   // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
//   const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
//   const objectvalue = result[1][0];
//   const userid = objectvalue["@result"];
//   // console.log("event list userid ->"+ userid);
//   if(userid == null){
//     return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","CUSTOMER FILTER EVENT LIST","");
//   }

//    //BEGIN VALIDATION 2
// // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
// if(event.hasOwnProperty("querystring")==false){
//   return helper.getErrorResponse(false,"Querystring missing. Please provide the querystring","CUSTOMER FILTER AI EVENT","");
// }
// var secret=event.STOKEN.substring(0,16);
// // console.log("secret-->"+secret);
// // console.log("filter event querystring ->"+ event.querystring);
// var querydata;

// try{ 
//    querydata = await helper.decrypt(event.querystring,secret);
//   //  console.log("decrypted querydata->"+querydata);
// }
// catch(ex){
//   return helper.getErrorResponse(false,"Querystring Invalid error. Please provide the valid querystring.","CUSTOMER FILTER EVENT LIST",secret);
// }
// try{
//   querydata= JSON.parse(querydata);
// }
// catch(ex){
//   return helper.getErrorResponse(false,"Querystring JSON error. Please provide the valid JSON","CUSTOMER FILTER EVENT LIST",secret);
// } 
// // Check if 'starttime' is missing or empty
// if(!querydata.hasOwnProperty('starttime') || querydata.starttime == ''){
//   return helper.getErrorResponse(false,"Start time missing. Please provide the start time","Please enter the start time for the event",secret);
// }

// // Check if 'endtime' is missing or empty
// if(!querydata.hasOwnProperty('endtime') || querydata.endtime == ''){
//   return helper.getErrorResponse(false,"End time missing. Please provide the end time","Please enter the end time for the event",secret);
// }


// const offset = helper.getOffset(page, config.eventlistpage);

// const sqlParams = [];
// let clSQL = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected,
// cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port,dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, dc.Name1,
// dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person,cm.Camera_Status,MIN(es.detected_file) AS imagepath,CASE WHEN el.Event_ID IS NOT NULL OR 
// wl.Event_ID IS NOT NULL THEN 'Acknowledged' ELSE 'Unacknowledged' END AS eventstatus, el.feedback, dt.branch_id FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON 
// dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT
// JOIN eventaistatus es ON es.event_id = em.Event_ID LEFT JOIN eventlog el ON el.event_id = em.Event_ID LEFT JOIN whatsapplog wl ON wl.Event_id = em.Event_ID WHERE em.enddate BETWEEN ? AND ?`;

// sqlParams.push(querydata.starttime, querydata.endtime);

// // Handle customer ID filtering
// if (querydata.customerid) {
//   if (querydata.customerid.startsWith('O')) {
//     let organizationId = querydata.customerid.replace('O_', '');
//     clSQL += ` AND dt.Branch_id IN (SELECT Branch_ID FROM branchmaster WHERE Customer_ID IN (SELECT Customer_id FROM customermaster WHERE Organization_id = ?))`;
//     sqlParams.push(organizationId);
//   } else {
//     clSQL += ` AND dt.Branch_ID IN (SELECT Branch_ID FROM branchmaster WHERE Customer_ID = ?)`;
//     sqlParams.push(querydata.customerid);
//   }
// }

// // Handle branch ID filtering
// if (querydata.branchid) {
//   clSQL += ` AND dt.Branch_ID = ?`;
//   sqlParams.push(querydata.branchid);
// }

// // Handle device ID filtering
// if (querydata.deviceid) {
//   clSQL += ` AND dm.Device_ID = ?`;
//   sqlParams.push(querydata.deviceid);
// }

// // Handle camera ID filtering
// if (querydata.cameraid) {
//   clSQL += ` AND cm.Camera_ID = ?`;
//   sqlParams.push(querydata.cameraid);
// }

// // Handle feedback filtering
// if (querydata.feedback) {
//   clSQL += ` AND em.Event_ID IN (SELECT Event_ID FROM eventlog WHERE feedback LIKE ?)`;
//   sqlParams.push(`%${querydata.feedback}%`);
// }

// // Handle event validation filtering
// if (querydata.eventvalidation) {
//   if (querydata.eventvalidation === 'whatsapp') {
//     clSQL += ` AND em.Event_id IN (SELECT Event_id FROM whatsapplog WHERE Row_updated_date BETWEEN ? AND ?)`;
//     sqlParams.push(querydata.starttime, querydata.endtime);
//   }
// }

// // Group by and order by clauses
// clSQL += ` GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ? ,? ;`;
// // Add pagination parameters
// sqlParams.push(offset || 0, config.eventlistpage || 20);
// console.log(clSQL);
// console.log(sqlParams);
// const rows = await db.query(clSQL, sqlParams);

// if (rows.length) {
//   const data = helper.emptyOrRows(rows);
//   const meta = { page };
//   return helper.getSuccessResponse(true, "Event filter list Fetched Successfully", data, secret);
// } else {
//   return helper.getErrorResponse(false, "No events Found", rows, secret);
// }
//   }catch(er){
//     return helper.getErrorResponse(false,"Internal error. Please contact Administrator.",er,secret);
//   }
//   }
async function Eventlistfilter(page, event) {
  try {
    // Check if the session token exists
    if (!event.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login session token missing. Please provide the Login session token", "CUSTOMER FILTER EVENT LIST", "");
    }
    
    // Validate session token length
    if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login session token size invalid. Please provide the valid Session token", "CUSTOMER FILTER EVENT LIST", "");
    }
    
    // Validate session token
    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?, @result, @custid, @custname, @custemail); SELECT @result, @custid, @custname, @custemail', [event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    
    if (userid == null) {
      return helper.getErrorResponse(false, "Login session token Invalid. Please provide the valid session token", "CUSTOMER FILTER EVENT LIST", "");
    }
    
    // Check if querystring is provided
    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "CUSTOMER FILTER AI EVENT", "");
    }

    var secret = event.STOKEN.substring(0, 16);
    var querydata;

    // Decrypt querystring
    try {
      querydata = await helper.decrypt(event.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error. Please provide the valid querystring.", "CUSTOMER FILTER EVENT LIST", secret);
    }
    
    // Parse the decrypted querystring
    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring JSON error. Please provide valid JSON", "CUSTOMER FILTER EVENT LIST", secret);
    }

    // Validate required fields
    if (!querydata.hasOwnProperty('starttime') || querydata.starttime == '') {
      return helper.getErrorResponse(false, "Start time missing. Please provide the start time", "Please enter the start time for the event", secret);
    }
    if (!querydata.hasOwnProperty('endtime') || querydata.endtime == '') {
      return helper.getErrorResponse(false, "End time missing. Please provide the end time", "Please enter the end time for the event", secret);
    }

    // Calculate pagination offset
    const offset = helper.getOffset(page, config.eventlistpage);

    // Prepare the SQL query
    const sqlParams = [];
    let clSQL = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, 
      DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected,
      cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port,
      dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
      dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, 
      cm.Camera_Status, MIN(es.detected_file) AS imagepath, 
      CASE WHEN el.Event_ID IS NOT NULL OR wl.Event_ID IS NOT NULL THEN 'Acknowledged' 
      ELSE 'Unacknowledged' END AS eventstatus, el.feedback, dt.branch_id 
      FROM eventmaster em 
      JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id 
      JOIN devicemaster dm ON dm.device_id = cm.device_id 
      JOIN deptmaster dt ON dt.dept_id = dm.dept_id 
      LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id 
      JOIN branchmaster bm ON bm.branch_id = dt.branch_id 
      LEFT JOIN eventaistatus es ON es.event_id = em.Event_ID 
      LEFT JOIN eventlog el ON el.event_id = em.Event_ID 
      LEFT JOIN whatsapplog wl ON wl.Event_id = em.Event_ID 
      WHERE em.enddate BETWEEN ? AND ?`;

    sqlParams.push(querydata.starttime, querydata.endtime);

    // Handle customer ID filtering
    if (querydata.customerid) {
      if (querydata.customerid.startsWith('O')) {
        let organizationId = parseInt(querydata.customerid.replace('O_', ''));
        clSQL += ` AND dt.Branch_id IN (SELECT Branch_ID FROM branchmaster WHERE Customer_ID IN (SELECT Customer_id FROM customermaster WHERE Organization_id IN(?)))`;
        sqlParams.push(organizationId);
      } else {
        clSQL += ` AND dt.Branch_ID IN (SELECT Branch_ID FROM branchmaster WHERE Customer_ID in (?))`;
        sqlParams.push(querydata.customerid);
      }
    }

    // Handle branch ID filtering
    if (querydata.branchid) {
      clSQL += ` AND dt.Branch_ID = ?`;
      sqlParams.push(querydata.branchid);
    }

    // Handle device ID filtering
    if (querydata.deviceid) {
      clSQL += ` AND dm.Device_ID = ?`;
      sqlParams.push(querydata.deviceid);
    }

    // Handle camera ID filtering
    if (querydata.cameraid) {
      clSQL += ` AND cm.Camera_ID = ?`;
      sqlParams.push(querydata.cameraid);
    }

    // Handle feedback filtering
    if (querydata.feedback) {
      clSQL += ` AND em.Event_ID IN (SELECT Event_ID FROM eventlog WHERE feedback LIKE ?)`;
      sqlParams.push(`%${querydata.feedback}%`);
    }

    // Handle event validation filtering
    if (querydata.eventvalidation) {
      if (querydata.eventvalidation === 'whatsapp') {
        clSQL += ` AND em.Event_ID IN (SELECT Event_ID FROM whatsapplog WHERE Row_updated_date BETWEEN ? AND ?)`;
        sqlParams.push(querydata.starttime, querydata.endtime);
      }
    }
    // const offsetValue = !Number.isNaN(parseInt(offset)) ? parseInt(offset) : 0;
    // const limitValue = !Number.isNaN(parseInt(config.eventlistpage)) ? parseInt(config.eventlistpage) : 20;
    
    clSQL += ` GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ${offset},${config.eventlistpage}`;
    // sqlParams.push(offsetValue, limitValue);
    
    // Add group by and order by clauses
    // clSQL += ` GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ?,?`;
    // sqlParams.push(parseInt(offset) || 0, parseInt(config.eventlistpage) || 20);

    // Debugging SQL query and parameters
    console.log(clSQL);
    console.log(sqlParams);

    // Execute the query
    const rows = await db.query(clSQL, sqlParams);

    if (rows.length) {
      const data = helper.emptyOrRows(rows);
      const meta = { page };
      return helper.getSuccessResponse(true, "Event filter list Fetched Successfully", data, secret);
    } else {
      return helper.getErrorResponse(false, "No events Found", rows, secret);
    }
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(false, "Internal error. Please contact Administrator.", er, secret);
  }
}

  
//#########################################################################################################################################################################################################
//##################### UnACKONLEGED EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

// async function getUnAcknoEvent(page,event){
//  try{
//   if(event.hasOwnProperty('STOKEN')==false){n
//     return helper.getErrorResponse(false,"Login sessiontoken missing ","CUSTOMER UNACKNOELEGED EVENT LIST","");
//   }
//   //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
//   if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
//     return helper.getErrorResponse(false,"Login sessiontoken size Invalid","CUSTOMER UNACKNOELEGED EVENT LIST","");
//   }
//   // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
//   const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
//   const objectvalue = result[1][0];
//   const userid = objectvalue["@result"];
//   console.log("event list userid ->"+ userid);
//   if(userid == null){
//     return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the Sessiontoken","CUSTOMER UNACKNOELEGED EVENT LIST","");
//   }
//    //BEGIN VALIDATION 2
// // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
// if(event.hasOwnProperty("querystring")==false){
//   return helper.getErrorResponse(false,"Querystring missing. Please provide the querystring","CUSTOMER UNACKNOELEGED  EVENT","");
// }
// var secret=event.STOKEN.substring(0,16);
// console.log("secret-->"+secret);
// var querydata;

// try{  
//    querydata = await helper.decrypt(event.querystring,secret);
//    console.log("decrypted querydata->"+querydata);
// }
// catch(ex){
//   return helper.getErrorResponse(false,"Querystring Invalid error","CUSTOMER UNACKNOELEGED EVENT LIST",secret);
// }
// try{
//   querydata= JSON.parse(querydata);
// }
// catch(ex){
//   return helper.getErrorResponse(false,"Querystring Invalid. Please provide the valid Querystring","CUSTOMER UNACKNOELEGED EVENT LIST",secret);
// }                 
// const offset = helper.getOffset(page, config.listPerPage);

// if(querydata.hasOwnProperty('currentdate')== false){
//   return helper.getErrorResponse(false,"Current Date missing. Please provide the currentdate","Please enter the current date for the Unacknowledged event",secret);
// }
// try{
// let sql=""
// //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
// sql=`SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, em.enddate, em.Alertmessage, em.IsHumanDetected, cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain,
//  dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dt.Dept_name, dt.Dept_Location, dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person,
//  cm.Camera_Status FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON
//  dt.dept_id = dm.dept_id JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id WHERE em.IsHumanDetected = 1 AND em.Event_ID NOT IN 
//  (SELECT Event_ID FROM eventlog) AND em.Event_ID NOT IN (SELECT Event_ID FROM whatsapplog) AND em.Event_ID IN (SELECT Event_ID FROM eventuser WHERE user_id = ${userid}) AND em.Event_Name NOT
//  LIKE 'Tampering%' AND em.Event_Name NOT LIKE 'HDD%' AND em.Event_Name NOT LIKE 'Video%' AND em.Event_Name NOT LIKE '%FULL%' AND em.Event_Name NOT LIKE '%Device%' ORDER BY 
//   em.Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
// const rows = await db.query(sql);
// const data = helper.emptyOrRows(rows);
// var imageLinks1 = [];


// for (const event of data) {
//   const str = event.enddate;
//   var sdkid = event.SDK_ID;
//   const evDate = new Date(str);
//   const yyyy = evDate.getFullYear().toString();
//   const mm = (evDate.getMonth() + 1).toString();
//   const dd = evDate.getDate().toString();
//   var MainRTSPUrl;
//   var SubRTSPUrl;
//   var playbackurl;
//   const strDate = yyyy + (mm[1] ? mm : '0' + mm[0]) + (dd[1] ? dd : '0' + dd[0]);
//   var strSitenane = event.Branch_name.replace(/\s/g, '');
//    strSitenane = strSitenane.replace(/[^\w\s]/gi, '');
//   const strCamID = event.camera_id;
//   const strEventID = event.Event_ID;



// const startTimeStr = str;
// const startTime = new Date(startTimeStr);
// const endTime = new Date(startTime.getTime() + 10 * 1000);
// const endTimeStr = endTime.toISOString();

// const inputTimeZone = 'Asia/Kolkata';

// // Parse the input date strings with the input time zone
// const inputStartTime = moment.tz(startTimeStr, inputTimeZone);
// const inputEndTime = moment.tz(endTimeStr, inputTimeZone);


//   var ip_address = event.IP_Domain;
//   var username = event.IP_Uname;
//   var password=event.IP_Pwd;
//   var rport= event.RTSP_Port;
//   var camera_no = event.camera_name;
//   camera_no=camera_no.replace("Channel","");
//   const meta = { page };
//    return helper.getSuccessResponse(true,"Unacknowleged event list fetched successfully",eventLinks,secret);
//   }}catch(er){
//   return helper.getErrorResponse(false,'Internal error. Please contact Administration',er,secret);
// }
// }catch(er){
//   return helper.getErrorResponse(false,'Internal error. Please contact Administration',er,secret);
// }
// }
async function getUnAcknoEvent(page, event) {
  try {
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

    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "CUSTOMER UNACKNOELEGED EVENT", "");
    }

    const secret = event.STOKEN.substring(0, 16);
    let querydata;

    try {
      querydata = await helper.decrypt(event.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error", "CUSTOMER UNACKNOELEGED EVENT LIST", secret);
    }

    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid. Please provide the valid Querystring", "CUSTOMER UNACKNOELEGED EVENT LIST", secret);
    }

    const offset = helper.getOffset(page, config.listPerPage);
    // const offset1 = helper.getOffset1(page, config.listPerPage);

    if (!querydata.hasOwnProperty('userid')) {
      return helper.getErrorResponse(false, "User id missing. Please provide the userid", "Please enter the user id for the device event", secret);
    }

    let sql = `SELECT DISTINCT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status, es.eventpath FROM eventmaster em JOIN eventstatus es ON es.Event_id = em.Event_ID 
    JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id 
    LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id JOIN eventuser eu ON em.Event_ID = eu.Event_id AND eu.user_id = ${userid} LEFT JOIN eventlog el ON el.Event_ID = em.Event_ID LEFT JOIN whatsapplog wl ON wl.Event_id = em.Event_ID
    WHERE el.Event_ID IS NULL AND wl.Event_id IS NULL AND em.Event_Name NOT LIKE 'Tampering%' AND em.Event_Name NOT LIKE 'HDD%' AND em.Event_Name NOT LIKE 'Video%' 
    AND em.Event_Name NOT LIKE 'FULL%' AND em.Event_Name NOT LIKE 'Device%'ORDER BY em.Row_updated_date DESC LIMIT ${offset}, ${config.listPerPage}`;

    const rows = await db.query(sql);
    const data = helper.emptyOrRows(rows);
    const eventLinks = data.map(event => ({
      Event_ID: event.Event_ID,
      Event_Name: event.Event_Name,
      whatsappgroupname: event.whatsappgroupname,
      eventtime: event.eventtime,
      Alertmessage: event.Alertmessage,
      cameraid: event.camera_id,
      cameraname: event.camera_name,
      IpDomain: event.IP_Domain,
      IpPort: event.IP_port,
      username: event.IP_Uname,
      password: event.IP_Pwd,
      devicename: event.device_name,
      SDK_ID: event.SDK_ID,
      deviceid: event.device_id,
      deptname: event.Dept_name,
      Dept_Location: event.Dept_Location,
      Name1: event.Name1,
      Contact_mobile1: event.Contact_mobile1,
      Contact_Email1: event.Contact_Email1,
      Branch_name: event.Branch_name,
      device_name: event.device_name,
      Camera_Status: event.Camera_Status,
      imagepath: event.eventpath
    }));

    const meta = { page };
    return helper.getSuccessResponse(true, "Unacknowleged event list fetched successfully", eventLinks, secret);

  } catch (er) {
    return helper.getErrorResponse(false, 'Internal error. Please contact Administration', er, "");
  }
}


//#########################################################################################################################################################################################################
//##################### RECENT EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getRecEvent(page = 1,event){
  try{
  if(event.hasOwnProperty('STOKEN')==false){ 
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","Please provide the valid login sessiontoken","CUSTOMER RECENT EVENT LIST","");
  }
  var secret=event.STOKEN.substring(0,16);
  // console.log("secret-->"+secret);
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","Invalid size for the sessiontoken. Please provide a sessiontoken of valid size.","CUSTOMER RECENT EVENT LIST",secret);
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  // console.log(`spcallllllllllllllllllllllllllllllllllllllllllllllllllllllll ${JSON.stringify([result])}`)
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  // console.log("event list userid ->"+ userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","Login sessiontoken Invalid. Please provide the valid sessiontoken","CUSTOMER RECENT EVENT LIST",secret);
  }
 
   //BEGIN VALIDATION 2
// CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUTs
if(event.hasOwnProperty("querystring")==false){
  return helper.getErrorResponse("QUERYSTRING_MISSING","Querystring is missing. Please provide a valid querystring.","CUSTOMER RECENT EVENT",secret);
}

// console.log("filter event querystring ->"+ event.querystring);
var querydata;

try{ 
   querydata = await helper.decrypt(event.querystring,secret);
  //  console.log("decrypted querydata->"+querydata);
}
catch(ex){
  return helper.getErrorResponse("RECENT_EVENT_QUERY_ERROR","CUSTOMER RECENT EVENT LIST",secret);
}
try{
  querydata= JSON.parse(querydata);
}
catch(ex){
  return helper.getErrorResponse("RECENT_EVENT_JSON_ERROR","CUSTOMER RECENT EVENT LIST",secret);
} 
const offset = helper.getOffset(page, config.listPerPage);

if(querydata.hasOwnProperty('eventid')== false){
  return helper.getErrorResponse("EVENT_ID_MISSING","Please enter the event id for the event",secret);
}
if(querydata.hasOwnProperty('cameraid')==false){
  return helper.getErrorResponse("CAMERA_ID_MISSING","Please enter the camera id for the event",secret);
}

try{
let sql=""
//sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
sql=`select em.Event_ID,em.Event_Name,bm.whatsappgroupname,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.IP_Domain,dm.IP_port,dm.IP_Uname,dm.IP_Pwd,dm.RTSP_port,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person,cm.Camera_Status from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and em.analyticsource_id = ${querydata.cameraid} and em.Event_ID = ${querydata.eventid} LIMIT ${offset},${config.listPerPage}`;
console.error(`SQL==>`, sql);
const rows = await db.query(sql);
const data = helper.emptyOrRows(rows);
var imageLinks1 = [];
var eventsWithImages1 = [];
var imageLinks =[];
var images=[];
var formattedDateTime;

for (const event of data) {
  const str = event.enddate;
  var sdkid = event.SDK_ID;
  const evDate = new Date(str);
  const yyyy = evDate.getFullYear().toString();
  const mm = (evDate.getMonth() + 1).toString();
  const dd = evDate.getDate().toString();
  
  var MainRTSPUrl;
  var SubRTSPUrl;
  var playbackurl;
  const ip_address = event.IP_Domain;
  const username = event.IP_Uname;
  const password= event.IP_Pwd;
  const rport= event.RTSP_port;
  const strDate = yyyy + (mm[1] ? mm : '0' + mm[0]) + (dd[1] ? dd : '0' + dd[0]);
  var strSitenane = event.Branch_name.replace(/\s/g, '');
   strSitenane = strSitenane.replace(/[^\w\s]/gi, '');
  const strCamID = event.camera_id;
  const strEventID = event.Event_ID;
  var FullPaththumb = "\\\\192.168.0.198\\volumes\\"+strDate+"\\"+strSitenane+"\\cam"+strCamID+"\\ivs\\Event"+strEventID
  const FullPaththumb1 = `\\\\192.168.0.198\\volumes\\${strDate}\\${strSitenane}\\cam${strCamID}\\ivs\\Event${strEventID}\\thumb`;
  console.log(FullPaththumb);
  console.log(FullPaththumb1);
  const testFolder = FullPaththumb;
  const testFolder1 = FullPaththumb1;
  images = [FullPaththumb];


const startTimeStr = str;
const startTime = new Date(startTimeStr);
const endTime = new Date(startTime.getTime() + 10 * 1000);
const endTimeStr = endTime.toISOString();

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
formattedDateTime = inputStartTime.format("YYYY-MM-DD HH:mm:ss");
 
  var camera_no = event.camera_name;
  camera_no=camera_no.replace("Channel","");
  if(sdkid =='1'){
      MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"01"; 
      SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"02"; 
      playbackurl  ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/Streaming/tracks/"+camera_no+"01?starttime=" +formattedStartTimeHikvision+ "z&endtime=" +formattedEndTimeHikvision+ "z";
  }
  else if(sdkid =='2'){
      MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=0";
      SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=1";
      playbackurl ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/playback?channel="+camera_no+"&starttime=" +formattedStartTimeDahua+ "&endtime=" +formattedEndTimeDahua;
  }
  try {
    const folderImages1 = fs
      .readdirSync(testFolder1)
      .map(file => {
        return FullPaththumb1 + '\\' + file;
      });

    if (folderImages1.length > 0) {
      imageLinks1.push(folderImages1);
      eventsWithImages1.push(event);
    } else {
      console.error('Image files not found for Event', strEventID);
      continue;
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Image files not found for Event', strEventID);
      continue;
    } else {
      console.error('Error while processing Event', strEventID, error);
    }
  }

try {
  const folderImages = fs
    .readdirSync(testFolder)
    .filter(file => {
      return file.toLowerCase().endsWith('.jpg');
    })
    .map(file => {
      return FullPaththumb + '/' + file;
    });

  if (folderImages.length > 0) {
    images.push(...folderImages);
  } else {
    console.error('Image files not found for Event', strEventID);
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Image files not found for Event', strEventID);
  } else {
    console.error('Error while processing Event', strEventID, error);
  }
}
imageLinks = images
  .filter(imageFile => {
    return imageFile.toLowerCase().endsWith('.jpg');
  })
  .map(imageFile => {
    const imageLink = `http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(imageFile)}`;
    return imageLink;
  });
}
const eventLinks = eventsWithImages1.map((event, index) => {
  const firstImageFile = imageLinks1[index][0]; // Select the first image file
 console.log("playback url ->"+playbackurl);
  return {
    Event_ID: event.Event_ID,
    Event_Name: event.Event_Name,
    Row_updated_date: formattedDateTime,
    device_name: event.device_name,
    enddate: event.enddate,
    Alertmessage: event.Alertmessage,
    IsHumanDetected: event.IsHumanDetected,
    camera_id: event.camera_id,
    camera_name: event.camera_name,
    Branch_name: event.Branch_name,
    Dept_Location: event.Dept_Location,
    imagepath:imageLinks1,
    whatsappgroupname : event.whatsappgroupname,
    Camera_Status : event.Camera_Status,
    imageUrls: firstImageFile
      ? [`http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(firstImageFile)}`]
      : [], // Create an array with a single image URL or an empty array if there's no image
    FullPaththumb :FullPaththumb,
    imageLinks:imageLinks,
    images:images,
    MainRTSPUrl:MainRTSPUrl,
    SubRTSPUrl:SubRTSPUrl,
    playbackurl : playbackurl, 
  };
});

  const meta = { page };
  return helper.getSuccessResponse("RECENT_EVENT_FETCHED_SUCCESSFULLY","Recent Event list fetched successfully",eventLinks,secret);

}catch(er){
  return helper.getErrorResponse("UNEXPECTED_ERROR",er.message,er,secret);
}
}catch(er){
  return helper.getErrorResponse("UNEXPECTED_ERROR",er.message,er,secret);
}
}


//#########################################################################################################################################################################################################
//##################### GET DEVICE EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

// async function getDevEvent(page = 1,event){
// try{
//   if(event.hasOwnProperty('STOKEN')==false){
//     return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","Login sessiontoken is missing. Please provide a valid sessiontoken.","CUSTOMER DEVICE EVENT LIST","");
//   }
//   var secret=event.STOKEN.substring(0,16);
//   console.log("secret-->"+secret);
//   //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
//   if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
//     return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","Invalid size for the session token. Please provide a session token of valid size.","CUSTOMER DEVICE EVENT LIST",secret);
//   }
//   // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
//   const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
//   const objectvalue = result[1][0];
//   const userid = objectvalue["@result"];
//   console.log("event list userid ->"+ userid);
//   if(userid == null){
//     return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","Invalid login sessiontoken. Please provide a valid sessiontoken.","CUSTOMER DEVICE EVENT LIST",secret);
//   }
 
//    //BEGIN VALIDATION 2
// // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
// if(event.hasOwnProperty("querystring")==false){
//   return helper.getErrorResponse("QUERYSTRING_MISSING","Querystring is missing. Please provide a valid querystring.","CUSTOMER DEVICE EVENT",secret);
// }

// // console.log("filter event querystring ->"+ event.querystring);
// var querydata;

// try{ 
//    querydata = await helper.decrypt(event.querystring,secret);
//   //  console.log("decrypted querydata->"+querydata);
// }
// catch(ex){
//   return helper.getErrorResponse("QUERYSTRING_ERROR","There is an error with the querystring. Please provide a valid querystring.","CUSTOMER DEVICE EVENT LIST",secret);
// }
// try{
//   querydata= JSON.parse(querydata);
// }
// catch(ex){
//   return helper.getErrorResponse("QUERYSTRING_JSON_ERROR","There's an error with parsing the querystring as JSON. Please provide a valid JSON querystring.","CUSTOMER DEVICE EVENT LIST",secret);
// } 
// const offset = helper.getOffset(page, config.listPerPage);

// if(querydata.hasOwnProperty('currentdate')== false){
//   return helper.getErrorResponse("EVENT_CURRENT_DATE_MISSING","Current date is missing. Please provide the current date.","Please enter the current date for the device event",secret);
// }

// try{
// let sql=""
// //sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
// sql=`select em.Event_ID,em.Event_Name,bm.whatsappgroupname,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.IP_Domain,dm.RTSP_port,dm.IP_port,dm.IP_Uname,dm.IP_Pwd,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person,cm.Camera_Status from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and Date(em.Row_updated_date) ='${querydata.currentdate}' and Event_ID not in (select Event_ID from eventlog) and (Event_Name like 'Tampering%' or Event_Name like 'HDD%' or Event_Name like 'Video%' or Event_Name like '%FULL%' or Event_Name like '%Device%') ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
// const rows = await db.query(sql);
// const data = helper.emptyOrRows(rows);
// var imageLinks1 = [];
// var eventsWithImages1 = [];
// var imageLinks =[];
// var images=[];
// var formattedDateTime;

// for (const event of data) {
//   const str = event.enddate;
//   var sdkid = event.SDK_ID;
//   const evDate = new Date(str);
//   const yyyy = evDate.getFullYear().toString();
//   const mm = (evDate.getMonth() + 1).toString();
//   const dd = evDate.getDate().toString();
//   var MainRTSPUrl;
//   var SubRTSPUrl;
//   var playbackurl;
//   const strDate = yyyy + (mm[1] ? mm : '0' + mm[0]) + (dd[1] ? dd : '0' + dd[0]);
//   var strSitenane = event.Branch_name.replace(/\s/g, '');
//    strSitenane = strSitenane.replace(/[^\w\s]/gi, '');
//   const strCamID = event.camera_id;
//   const strEventID = event.Event_ID;
//   var FullPaththumb = "\\\\192.168.0.198\\volumes\\"+strDate+"\\"+strSitenane+"\\cam"+strCamID+"\\ivs\\Event"+strEventID
//   const FullPaththumb1 = `\\\\192.168.0.198\\volumes\\${strDate}\\${strSitenane}\\cam${strCamID}\\ivs\\Event${strEventID}\\thumb`;
//   const testFolder = FullPaththumb;
//   const testFolder1 = FullPaththumb1;
//   images = [FullPaththumb];


// const startTimeStr = str;
// const startTime = new Date(startTimeStr);
// const endTime = new Date(startTime.getTime() + 10 * 1000);
// const endTimeStr = endTime.toISOString();

// const inputTimeZone = 'Asia/Kolkata';

// // Parse the input date strings with the input time zone
// const inputStartTime = moment.tz(startTimeStr, inputTimeZone);
// const inputEndTime = moment.tz(endTimeStr, inputTimeZone);


// // Format start time and end time as required
// const formattedStartTimeDahua = inputStartTime.format("YYYY_MM_DD_HH_mm_ss");
// const formattedEndTimeDahua = inputEndTime.format("YYYY_MM_DD_HH_mm_ss");
// const formattedStartTimeHikvision = inputStartTime.format("YYYYMMDDTHHmmss");
// const formattedEndTimeHikvision = inputEndTime.format("YYYYMMDDTHHmmss");
// formattedDateTime = inputStartTime.format("YYYY-MM-DD HH:mm:ss");

//   var ip_address = event.IP_Domain;
//   var username = event.IP_Uname;
//   var password=event.IP_Pwd;
//   var rport= event.RTSP_port;
//   var camera_no = event.camera_name;
//   camera_no=camera_no.replace("Channel","");
//   if(sdkid =='1'){
//       MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"01"; 
//       SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+ "/Streaming/Channels/"+camera_no+"02"; 
//       playbackurl  ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/Streaming/tracks/"+camera_no+"01?starttime=" +formattedStartTimeHikvision+ "z&endtime=" +formattedEndTimeHikvision+ "z";
//   }
//   else if(sdkid =='2'){
//       MainRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=0";
//       SubRTSPUrl = "rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/realmonitor?channel="+camera_no+"&subtype=1";
//       playbackurl ="rtsp://"+username+":"+password+"@"+ip_address+":"+rport+"/cam/playback?channel="+camera_no+"&starttime=" +formattedStartTimeDahua+ "&endtime=" +formattedEndTimeDahua;
//   }
//   try {
//     const folderImages1 = fs
//       .readdirSync(testFolder1)
//       .map(file => {
//         return FullPaththumb1 + '\\' + file;
//       });

//     if (folderImages1.length > 0) {
//       imageLinks1.push(folderImages1);
//       eventsWithImages1.push(event);
//     } else {
//       console.error('Image files not found for Event', strEventID);
//       continue;
//     }

//   } catch (error) {
//     if (error.code === 'ENOENT') {
//       console.error('Image files not found for Event', strEventID);
//       continue;
//     } else {
//       console.error('Error while processing Event', strEventID, error);
//     }
//   }

// try {
//   const folderImages = fs
//     .readdirSync(testFolder)
//     .filter(file => {
//       return file.toLowerCase().endsWith('.jpg');
//     })
//     .map(file => {
//       return FullPaththumb + '/' + file;
//     });

//   if (folderImages.length > 0) {
//     images.push(...folderImages);
//   } else {
//     console.error('Image files not found for Event', strEventID);
//   }
// } catch (error) {
//   if (error.code === 'ENOENT') {
//     console.error('Image files not found for Event', strEventID);
//   } else {
//     console.error('Error while processing Event', strEventID, error);
//   }
// }
// imageLinks = images
//   .filter(imageFile => {
//     return imageFile.toLowerCase().endsWith('.jpg');
//   })
//   .map(imageFile => {
//     const imageLink = `http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(imageFile)}`;
//     // console.log("url -> " + imageLink);
//     return imageLink;
//   });
// }
// const eventLinks = eventsWithImages1.map((event, index) => {
//   const firstImageFile = imageLinks1[index][0]; // Select the first image file

//   return {
//     Event_ID: event.Event_ID,
//     Event_Name: event.Event_Name,
//     Row_updated_date: formattedDateTime,
//     device_name: event.device_name,
//     enddate: event.enddate,
//     Alertmessage: event.Alertmessage,
//     IsHumanDetected: event.IsHumanDetected,
//     camera_id: event.camera_id,
//     camera_name: event.camera_name,
//     Branch_name: event.Branch_name,
//     Dept_Location: event.Dept_Location,
//     imagepath:imageLinks1,
//     whatsappgroupname : event.whatsappgroupname,
//     Camera_Status : event.Camera_Status,
//     imageUrls: firstImageFile
//       ? [`http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(firstImageFile)}`]
//       : [], // Create an array with a single image URL or an empty array if there's no image
//     FullPaththumb :FullPaththumb,
//     imageLinks:imageLinks,
//     images:images,
//     MainRTSPUrl:MainRTSPUrl,
//     SubRTSPUrl:SubRTSPUrl,
//     playbackurl : playbackurl, 
//   };
// });
//   const meta = { page };
//   return helper.getSuccessResponse("DEVICE_EVENT_FETCHED_SUCCESSFULLY","Device Event list fetched successfully",eventLinks,secret);
// // message = 'Device event list Fetching successfully';
// // responsecode = "807"
// // const encrypt = helper.encrypt(JSON.stringify({
// //   responsecode,
// //   message,
// //   eventLinks,
// //   meta }), secret);
// // return encrypt;
// }catch(er){
//   return helper.getErrorResponse("UNEXPECTED_ERROR","Unexpected error happened. Please try again",er,secret);
// }
//   }
//   catch(er){
//     return helper.getErrorResponse("UNEXPECTED_ERROR","Unexpected error happened. Please try again",er,secret);
//   }
// }
async function getDevEvent(page, event) {
  try {
    if (!event.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login sessiontoken missing", "CUSTOMER DEVICE EVENT LIST", "");
    }

    if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login sessiontoken size Invalid", "CUSTOMER DEVICE EVENT LIST", "");
    }

    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];

    if (userid == null) {
      return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken", "CUSTOMER DEVICE EVENT LIST", "");
    }

    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "CUSTOMER DEVICE EVENT", "");
    }

    const secret = event.STOKEN.substring(0, 16);
    let querydata;

    try {
      querydata = await helper.decrypt(event.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error", "CUSTOMER DEVICE EVENT LIST", secret);
    }

    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid. Please provide the valid Querystring", "CUSTOMER DEVICE EVENT LIST", secret);
    }

    const offset = helper.getOffset(page, config.listPerPage);
    // const offset1 = helper.getOffset1(page, config.listPerPage);

   if (!querydata.hasOwnProperty('currentdate')) {
      return helper.getErrorResponse(false, "Current date missing. Please provide the currentdate", "Please enter the current date for the device event", secret);
    }

    let sql = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status, ep.imagepath FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id 
    LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN (SELECT Event_ID, MIN(detected_file) AS imagepath FROM eventaistatus GROUP BY Event_ID
    ) ep ON ep.Event_ID = em.Event_ID WHERE em.Event_ID NOT IN (SELECT el.Event_ID FROM eventlog el) AND em.Event_ID NOT IN (SELECT wl.Event_id FROM whatsapplog wl) AND ( em.Event_Name LIKE 'Tampering%' OR em.Event_Name LIKE 'HDD%' OR em.Event_Name LIKE 'Video%' 
    OR em.Event_Name LIKE '%FULL%' OR em.Event_Name LIKE '%Device%' OR em.Event_Name LIKE 'illegalaccess%' OR em.Event_Name LIKE 'notconnected%' OR em.Event_Name LIKE 'ioalarm%' OR em.Event_Name LIKE 'cameramaskingalarmstart%') GROUP BY 
    em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, em.Alertmessage, em.IsHumanDetected, cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name,
    dt.Dept_Location, dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status ORDER BY em.Row_updated_date DESC LIMIT ${offset}, ${config.listPerPage};`;

    const rows = await db.query(sql);
    const data = helper.emptyOrRows(rows);
    const eventLinks = data.map(event => ({
      Event_ID: event.Event_ID,
      Event_Name: event.Event_Name,
      whatsappgroupname: event.whatsappgroupname,
      eventtime: event.eventtime,
      Alertmessage: event.Alertmessage,
      cameraid: event.camera_id,
      cameraname: event.camera_name,
      IpDomain: event.IP_Domain,
      IpPort: event.IP_port,
      username: event.IP_Uname,
      password: event.IP_Pwd,
      devicename: event.device_name,
      SDK_ID: event.SDK_ID,
      deviceid: event.device_id,
      deptname: event.Dept_name,
      Dept_Location: event.Dept_Location,
      Name1: event.Name1,
      Contact_mobile1: event.Contact_mobile1,
      Contact_Email1: event.Contact_Email1,
      Branch_name: event.Branch_name,
      device_name: event.device_name,
      Camera_Status: event.Camera_Status
    }));

    const meta = { page };
    return helper.getSuccessResponse(true, "Device events fetched successfully", eventLinks, secret);

  } catch (er) {
    return helper.getErrorResponse(false, 'Internal error. Please contact Administration', er, "");
  }
}



//#########################################################################################################################################################################################################
//##################### GET DEVICE EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getVideolossEvent(page = 1,event){
  try {
    if (!event.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login sessiontoken missing", "VIDEO LOSS EVENT LIST", "");
    }

    if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login sessiontoken size Invalid", "VIDEO LOSS EVENT LIST", "");
    }

    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];

    if (userid == null) {
      return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken", "VIDEO LOSS EVENT LIST", "");
    }

    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "VIDEO LOSS EVENT", "");
    }

    const secret = event.STOKEN.substring(0, 16);
    let querydata;

    try {
      querydata = await helper.decrypt(event.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error", "VIDEO LOSS EVENT LIST", secret);
    }

    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid. Please provide the valid Querystring", "VIDEO LOSS EVENT LIST", secret);
    }

    const offset = helper.getOffset(page, config.listPerPage);
    // const offset1 = helper.getOffset1(page, config.listPerPage);

   if (!querydata.hasOwnProperty('currentdate')) {
      return helper.getErrorResponse(false, "Current date missing. Please provide the currentdate", "Please enter the current date for the device event", secret);
    }

    let sql = `SELECT 
    em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, 
    DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected,bn cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port,dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status,MIN(ep.detected_file) AS imagepath
    FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id LEFT JOIN 
    deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN  eventaistatus ep ON ep.Event_ID = em.Event_ID WHERE 
    em.Event_ID NOT IN (SELECT el.Event_ID FROM eventlog el) AND em.Event_ID NOT IN (SELECT wl.Event_id FROM whatsapplog wl) 
    AND em.Event_Name LIKE 'Video%' GROUP BY em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port,dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status ORDER BY em.Row_updated_date DESC LIMIT ${offset}, ${config.listPerPage};`;

    const rows = await db.query(sql);
    const data = helper.emptyOrRows(rows);
    const eventLinks = data.map(event => ({
      Event_ID: event.Event_ID,
      Event_Name: event.Event_Name,
      whatsappgroupname: event.whatsappgroupname,
      eventtime: event.eventtime,
      Alertmessage: event.Alertmessage,
      cameraid: event.camera_id,
      cameraname: event.camera_name,
      IpDomain: event.IP_Domain,
      IpPort: event.IP_port,
      username: event.IP_Uname,
      password: event.IP_Pwd,
      devicename: event.device_name,
      SDK_ID: event.SDK_ID,
      deviceid: event.device_id,
      deptname: event.Dept_name,
      Dept_Location: event.Dept_Location,
      Name1: event.Name1,
      Contact_mobile1: event.Contact_mobile1,
      Contact_Email1: event.Contact_Email1,
      Branch_name: event.Branch_name,
      device_name: event.device_name,
      Camera_Status: event.Camera_Status
    }));

    const meta = { page };
    return helper.getSuccessResponse(true, "Video loss events fetched successfully", eventLinks, secret);

  } catch (er) {
    return helper.getErrorResponse(false, 'Internal error. Please contact Administration', er, "");
  }
}


//#########################################################################################################################################################################################################
//##################### GET DEVICE EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getNotConnect(page = 1,event){
  try {
    if (!event.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse(false, "Login sessiontoken missing", "NOT CONNECTED EVENTS LIST", "");
    }

    if (event.STOKEN.length > 50 || event.STOKEN.length < 30) {
      return helper.getErrorResponse(false, "Login sessiontoken size Invalid", "NOT CONNECTED EVENTS LIST", "");
    }

    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];

    if (userid == null) {
      return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken", "NOT CONNECTED EVENTS LIST", "");
    }

    if (!event.hasOwnProperty("querystring")) {
      return helper.getErrorResponse(false, "Querystring missing. Please provide the querystring", "NOT CONNECTED EVENTS LIST", "");
    }

    const secret = event.STOKEN.substring(0, 16);
    let querydata;

    try {
      querydata = await helper.decrypt(event.querystring, secret);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid error", "NOT CONNECTED EVENTS LIST", secret);
    }

    try {
      querydata = JSON.parse(querydata);
    } catch (ex) {
      return helper.getErrorResponse(false, "Querystring Invalid. Please provide the valid Querystring", "NOT CONNECTED EVENTS LIST", secret);
    }

    const offset = helper.getOffset(page, config.listPerPage);
    // const offset1 = helper.getOffset1(page, config.listPerPage);

   if (!querydata.hasOwnProperty('currentdate')) {
      return helper.getErrorResponse(false, "Current date missing. Please provide the currentdate", "Please enter the current date for the not connected event", secret);
    }

    let sql = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date, DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1, 
    dc.Contact_Email1,bm.Branch_name,bm.contact_person,cm.Camera_Status,(SELECT MIN(ep.detected_file) FROM eventaistatus ep WHERE ep.Event_ID = em.Event_ID) AS imagepath FROM 
    eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN 
    devicemaster dm ON dm.device_id = cm.device_id JOIN 
    deptmaster dt ON dt.dept_id = dm.dept_id LEFT JOIN 
    deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN 
    eventaistatus ep ON ep.Event_ID = em.Event_ID WHERE 
    em.Event_ID NOT IN (SELECT el.Event_ID FROM eventlog el) 
    AND em.Event_ID NOT IN (SELECT wl.Event_id FROM whatsapplog wl) AND (em.Event_Name LIKE 'notconnected%' OR em.Event_Name LIKE 'notconnected%') ORDER BY em.Row_updated_date DESC LIMIT ${offset}, ${config.listPerPage};`;

    const rows = await db.query(sql);
    const data = helper.emptyOrRows(rows);
    const eventLinks = data.map(event => ({
      Event_ID: event.Event_ID,
      Event_Name: event.Event_Name,
      whatsappgroupname: event.whatsappgroupname,
      eventtime: event.eventtime,
      Alertmessage: event.Alertmessage,
      cameraid: event.camera_id,
      cameraname: event.camera_name,
      IpDomain: event.IP_Domain,
      IpPort: event.IP_port,
      username: event.IP_Uname,
      password: event.IP_Pwd,
      devicename: event.device_name,
      SDK_ID: event.SDK_ID,
      deviceid: event.device_id,
      deptname: event.Dept_name,
      Dept_Location: event.Dept_Location,
      Name1: event.Name1,
      Contact_mobile1: event.Contact_mobile1,
      Contact_Email1: event.Contact_Email1,
      Branch_name: event.Branch_name,
      device_name: event.device_name,
      Camera_Status: event.Camera_Status
    }));

    const meta = { page };
    return helper.getSuccessResponse(true, "Not connected events fetched successfully", eventLinks, secret);

  } catch (er) {
    return helper.getErrorResponse(false, 'Internal error. Please contact Administration', er, "");
  }
}



//#########################################################################################################################################################################################################
//##################### GET DEVICE EVENT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function getWhatsappEvent(page = 1,event){
  try{
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","Login sessiontoken is missing. Please provide a valid sessiontoken.","CUSTOMER WHATSAPP NOTIFIED EVENT LIST","");
  }
  var secret=event.STOKEN.substring(0,16);
// console.log("secret-->"+secret);
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","Invalid size for the sessiontoken. Please provide a sessiontoken of valid size.","CUSTOMER WHATSAPP NOTIFIED EVENT LIST",secret);
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  // console.log("Whatsapp notified event list userid ->"+ userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","Invalid login sessiontoken. Please provide a valid sessiontoken.","CUSTOMER WHATSAPP NOTIFIED EVENT LIST",secret);
  }

   //BEGIN VALIDATION 2
// CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
if(event.hasOwnProperty("querystring")==false){
  return helper.getErrorResponse("WHATSAPP_QUERYASTRING_MISSING","WhatsApp querystring is missing. Please provide a valid querystring.","CUSTOMER WHATSAPP NOTIFIED EVENT LIST",secret);
}

console.log("whatsapp notified event querystring ->"+ event.querystring);
var querydata;

try{ 
   querydata = await helper.decrypt(event.querystring,secret);
   console.log("decrypted querydata->"+querydata);
}
catch(ex){
  return helper.getErrorResponse("WHATSAPP_QUERYSTRING_ERROR","There is an error with the WhatsApp querystring format. Please provide a valid querystring.","CUSTOMER WHATSAPP NOTIFIED EVENT LIST",secret);
}
try{
  querydata= JSON.parse(querydata);
}
catch(ex){
  return helper.getErrorResponse("QUERYSTRING_JSON_ERROR","There's an error with parsing the querystring as JSON. Please provide a valid JSON querystring.","CUSTOMER WHATSAPP NOTIFIED EVENT LIST",secret);
} 
const offset = helper.getOffset(page, config.listPerPage);

if(querydata.hasOwnProperty('currentdate')== false){
  return helper.getErrorResponse("EVENT_CURRENT_DATE_MISSING","Current date is missing. Please provide the current date.","Please enter the current date for the whatsapp notified event",secret);
}

try{
let sql=""
//sql=`SELECT * from eventactionlog where event_id=${event.eventid} LIMIT ${offset},${config.listPerPage}`;		    
sql=`select em.Event_ID,em.Event_Name,em.Row_updated_date,em.enddate,em.Alertmessage,em.IsHumanDetected,cm.camera_id,cm.camera_name,dm.device_name,dm.short_name,dm.SDK_ID,dt.Dept_name,dt.Dept_Location,dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name,bm.contact_person,cm.Camera_Status from eventmaster em,cameramaster cm,devicemaster dm,deptmaster dt,deptcontacts dc,branchmaster bm where bm.branch_id=dt.branch_id and dc.dept_id=dt.dept_id and dt.dept_id=dm.dept_id and dm.device_id=cm.device_id and cm.camera_id=em.analyticsource_id and Date(em.Row_updated_date) ='${querydata.currentdate}' and Event_ID  in (select Event_ID from whatsapplog where DATE(row_updated_date) = '${querydata.currentdate}')  ORDER BY Row_updated_date DESC LIMIT ${offset},${config.listPerPage}`;
console.error(`SQL==>`, sql);
const rows = await db.query(sql);
const data = helper.emptyOrRows(rows);
const imageLinks = [];
const eventsWithImages = [];
var formattedDateTime;

for (const event of data) {
  const str = event.enddate;
  const evDate = new Date(str);
  const yyyy = evDate.getFullYear().toString();
  const mm = (evDate.getMonth() + 1).toString();
  const dd = evDate.getDate().toString();
  const hh = evDate.getHours().toString().padStart(2, '0'); // Adding zero padding if needed
  const min = evDate.getMinutes().toString().padStart(2, '0'); // Adding zero padding if needed
  const sec = evDate.getSeconds().toString().padStart(2, '0');
  formattedDateTime = `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;         
  console.log("11111111111111111111111111111111111111111111111111111111111111111111111111111111111"+formattedDateTime);


  const strDate = yyyy + (mm[1] ? mm : '0' + mm[0]) + (dd[1] ? dd : '0' + dd[0]);
  const strSitenane = event.Branch_name.replace(/\s/g, '');
  const strCamID = event.camera_id;
  const strEventID = event.Event_ID;

  const FullPaththumb = `\\\\192.168.0.198\\volumes\\${strDate}\\${strSitenane}\\cam${strCamID}\\ivs\\Event${strEventID}\\thumb`;

  const testFolder = FullPaththumb;

  try {
    const folderImages = fs
      .readdirSync(testFolder)
      .map(file => {
        return FullPaththumb + '/' + file;
      });

    if (folderImages.length > 0) {
      imageLinks.push(folderImages);
      eventsWithImages.push(event);
    } else {
      console.error('Image files not found for Event', strEventID);
      continue;
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Image files not found for Event', strEventID);
      continue;
    } else {
      console.error('Error while processing Event', strEventID, error);
    }
  }
}

const eventLinks = eventsWithImages.map((event, index) => {
  const firstImageFile = imageLinks[index][0]; 

  return {
    Event_ID: event.Event_ID,
    Event_Name: event.Event_Name,
    Row_updated_date: formattedDateTime,
    device_name: event.device_name,
    enddate: event.enddate,
    Alertmessage: event.Alertmessage,
    IsHumanDetected: event.IsHumanDetected,
    camera_id: event.camera_id,
    camera_name: event.camera_name,
    Branch_name: event.Branch_name,
    Dept_Location: event.Dept_Location,
    imagepath:imageLinks,
    imageUrls: firstImageFile
      ? [`http://192.168.0.198:8080/event/serve-image?path=${encodeURIComponent(firstImageFile)}`]
      : [],
  };
});

  const meta = { page };
  return helper.getSuccessResponse("WHATSAPP_EVENT_FETCHED_SUCCESSFULLY","Whatsapp Notified event list fetched successfully",eventLinks,secret);

}catch(er){
  return helper.getErrorResponse("UNEXPECTED_ERROR","Unexpected error happened. Please try again",er,secret);
}
  }catch(er){
    return helper.getErrorResponse("UNEXPECTED_ERROR","Unexpected error happened. Please try again",er,secret);
  }
}



//#########################################################################################################################################################################################################
//##################### CREATE AND STORE THE SNAPSHOT #################################################################################################################################################################################
//#####################################################################################################################################################################################################

async function CreateSnapshot(page = 1,event){
  try{
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse(false,"Login sessiontoken is missing. Please provide a valid sessiontoken.","EVENT CREATE NEW EVENT","");
  }
  var secret=event.STOKEN.substring(0,16);
  // console.log("secret-->"+secret);
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse(false,"Invalid size for the sessiontoken. Please provide a sessiontoken of valid size.","EVENT CREATE NEW EVENT",secret);
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"];
  // console.log("create new event list userid ->"+ userid);
  if(userid == null){
    return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","EVENT CREATE NEW EVENT",secret);
  }
 
  
   //BEGIN VALIDATION 2
// CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
if(event.hasOwnProperty("querystring")==false){
  return helper.getErrorResponse(false,"Event querystring is missing. Please provide a valid querystring for the event.","EVENT CREATE NEW EVENT",secret);
}

// console.log("Create new event querystring ->"+ event.querystring);
var querydata;

try{ 
   querydata = await helper.decrypt(event.querystring,secret);
  //  console.log("decrypted querydata->"+querydata);
}
catch(ex){
  return helper.getErrorResponse(false,"There is an error with the querystring for the event. Please provide a valid querystring.","EVENT CREATE NEW EVENT",secret);
}
try{
  querydata= JSON.parse(querydata);
}
catch(ex){
  return helper.getErrorResponse(false,"There's an error with parsing the querystring as JSON. Please provide a valid JSON querystring.","EVENT CREATE NEW EVENT",secret);
} 
const offset = helper.getOffset(page, config.listPerPage);

if(querydata.hasOwnProperty('cameraid')== false){
  return helper.getErrorResponse(false,'Camera id missing. Please provide the camera id',"EVENT CREATE NEW EVENT",secret);
} 
if(querydata.hasOwnProperty('eventname')==false){
  return helper.getErrorResponse(false,'Event name missing. Please provide the event name',"EVENT CREATE NEW EVENT",secret);
}
 

  let sql =''
  sql = `select dm.IP_Domain,dm.IP_Port,dm.IP_Uname,dm.IP_pwd,dm.SDK_ID,dm.device_name,dm.Device_id,cm.Camera_status,cm.camera_name,bm.Branch_name,bm.whatsappgroupname,dt.Dept_location from cameramaster cm ,devicemaster dm,branchmaster bm,deptmaster dt where bm.Branch_id = dt.Branch_id and
  dt.Dept_id = dm.Dept_id and dm.Device_ID = cm.Device_ID AND cm.Camera_ID = ${querydata.cameraid} LIMIT 1`;
  const rows = await db.query(sql);
  if(rows[0] != null){
  const ipaddress = rows[0].IP_Domain;
  const port = rows[0].IP_Port;
  const username = rows[0].IP_Uname;
  const password = rows[0].IP_pwd;
  const SDK_ID = rows[0].SDK_ID;
  const deviceid = rows[0].Device_id;
  const devicename = rows[0].device_name;
  const camerastatus = rows[0].Camera_Status;
  const Location = rows[0].Dept_location;
  const whatsappgroupname = rows[0].whatsappgroupname;
  var camera_no = rows[0].camera_name;
  var channelno=camera_no.replace("Channel","");
  channelno=camera_no.replace("channel","");
  // console.log("ipaddress ->"+ipaddress);
  // console.log("ipport ->"+port);
  const [result1] = await db.spcall(`CALL addeventruntime3(?,?,?,@camID,@eid); select @camID,@eid`,[deviceid,channelno,querydata.eventname]);
  const objectvalue1 =result1[1][0];
  var eventid =  objectvalue1["@eid"];
  var sitename = rows[0].Branch_name;
  var cameraid = objectvalue1["@camID"];
  const eventname = querydata.eventname
  // console.log("eventID ->"+eventid);
  // console.log("sitename ->"+sitename);
  try
    {
      const returnstr = JSON.stringify({code:true,message:'Event created Successfully',cameraid,eventid,eventname,sitename,ipaddress,port,username,password,SDK_ID,deviceid,devicename,channelno,camerastatus,whatsappgroupname,Location});
      if (secret!="")
      {

        const encryptedResponse = helper.encrypt(returnstr,secret);
        // console.log("returnstr=>"+JSON.stringify(encryptedResponse));
        return {encryptedResponse};
      }
      else
      {
        return ({code:true,message:'Event created Successfully',cameraid,eventid,eventname,sitename,ipaddress,port,username,password,SDK_ID,deviceid,devicename,channelno,camerastatus,whatsappgroupname,Location});
      }
    }
    catch(Ex)
    {
      return ({code:true,message:'Event created Successfully',cameraid,eventid,eventname,sitename,ipaddress,port,username,password,SDK_ID,deviceid,devicename,channelno,camerastatus,whatsappgroupname,Location});
    }
 }else{
    return helper.getErrorResponse(false,"Error creating the Event","CREATE NEW EVENT",secret);
 }
}catch(er){
  return helper.getErrorResponse(false,'Internal error. Please contact Administration',er,secret);
}
}



//#########################################################################################################################################################################################################
//##################### GET THE CUSTOMER FEEDBACK FOR SELF MONITORING #################################################################################################################################################################################
//############################################################################################################ws#########################################################################################

async function addCustomerSelfFeedback(page = 1,event){
  let message = 'Error in adding the customer self feedback';
  let responsecode = "8005";
  //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
  if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
    return helper.getErrorResponse("SESSIONTOKEN_SIZE_ERROR","CUSTOMER ADD SELF FEEDBACK","");
  }
  // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
  const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
  const objectvalue = result[1][0];
  const userid = objectvalue["@result"]; 
  // console.log("not conneceted event list userid ->"+ userid);
  if(userid == null){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CUSTOMER ADD SELF FEEDBACK","");
  }
  if(event.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_MISSING","CUSTOMER ADD SELF FEEDBACK","");
  }
   //BEGIN VALIDATION 2
// CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
if(event.hasOwnProperty("querystring")==false){
  return helper.getErrorResponse("SELF_FEEDBACK_QUERY_MISSING","CUSTOMER ADD SELF FEEDBACK","");
}
var secret=event.STOKEN.substring(0,16);
// console.log("secret-->"+secret);
// console.log("filter event querystring ->"+ event.querystring);
var querydata;

try{   
   querydata = await helper.decrypt(event.querystring,secret);
  //  console.log("decrypted querydata->"+querydata);
}
catch(ex){
  return helper.getErrorResponse("SELF_FEEDBACK_QUERY_ERROR","CUSTOMER ADD SELF FEEDBACK",secret);
}
try{
  querydata= JSON.parse(querydata);
}
catch(ex){
  return helper.getErrorResponse("SELF_FEEDBACK_JSON_ERROR","CUSTOMER ADD SELF FEEDBACK",secret);
} 
const offset = helper.getOffset(page, config.listPerPage);
if(querydata.hasOwnProperty('eventid')== false){
  return helper.getErrorResponse("SELF_FEEDBACK_EVENT_ID_MISSING","Please enter the event id for self feedback",secret);
}
if(querydata.hasOwnProperty('eventfeedback')==false){
  return helper.getErrorResponse("SELF_MONITORING_EVENT_FEEDBACK_MISSING","Please enter the self monitoring feedback of the customer",secret);
}
if(querydata.hasOwnProperty('customerid')==false){
  return helper.getErrorResponse("SELF_MONITIORING_CUSTOMER_ID_MISSING","Please enter the self monitoring customer id is missing.",secret);
}

const [result1]=await db.spcall(`CALL SP_SELF_FEEDBACK_ADD(?,?,?,?,@custevent_id); select @custevent_id`,[querydata.eventid,querydata.eventfeedback,querydata.customerid,userid]);
  const objectvalue1= result1[1][0];
  let custevent_id = objectvalue1["@custevent_id"];
  // console.log("SELF MONITORING CUSOMER EVENT ID MISSING --->"+custevent_id);
  if(custevent_id!=''){
    return helper.getSuccessResponse("SELF_MONITORING_FEEDBACK_ADDED_SUCCESSFULLY","THE CUSTOMER SELF MONITORING FEEDBACK IS ADDED SUCCESSFULLY",custevent_id,secret);
  }
  else{
    return helper.getErrorResponse("SELF_MONITORING_FEEDBACK_ADDED_FAILED","THE CUSTOMER SELF MONITORING FEEDBACK ADDED FAILED.. CHECK THE DETAILS AND RE-ENTER IT",secret);
  }
}

//#####################################################################################################################################################################################################
//#####################################################################################################################################################################################################
//####################################################################################################################################################################################################

async function GetUserReport(page,event){
  try {
    if(event.hasOwnProperty('STOKEN')==false){
      return helper.getErrorResponse(false,"Login sessiontoken missing. Please provide the Login sessiontoken","USER EVENT REPORT","");
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
      return helper.getErrorResponse(false,"Login sessiontoken size invalid. Please provide the valid Sessiontoken","USER EVENT REPORT","");
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    console.log("event list userid ->"+ userid);
    if(userid == null){
      return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","USER EVENT REPORT","");
    }
  
     //BEGIN VALIDATION 2
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(event.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse(false,"Querystring missing. Please provide the querystring","USER EVENT REPORT","");
  }
  var secret=event.STOKEN.substring(0,16);
  console.log("secret-->"+secret);
  console.log("filter event querystring ->"+ event.querystring);
  var querydata;
  
  try{ 
     querydata = await helper.decrypt(event.querystring,secret);
     console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse(false,"Querystring Invalid error. Please provide the valid querystring.","USER EVENT REPORT",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse(false,"Querystring JSON error. Please provide the valid JSON","USER EVENT REPORT",secret);
  } 
  // Check if 'starttime' is missing or empty
  if(!querydata.hasOwnProperty('starttime') || querydata.starttime == ''){
    return helper.getErrorResponse(false,"Start time missing. Please provide the start time","Please enter the start time for the event",secret);
  }
  // Check if 'endtime' is missing or empty
  if(!querydata.hasOwnProperty('endtime') || querydata.endtime == ''){
    return helper.getErrorResponse(false,"End time missing. Please provide the end time","Please enter the end time for the event",secret);
  }
  if(!querydata.hasOwnProperty('filtertype') || querydata.filtertype == ''){
  return helper.getErrorResponse(false,"Filter type missing. Please provide the filter type","Please provide the filter type for the event",secret);
  }
  if(!querydata.hasOwnProperty('userid') || querydata.userid == ''){
    return helper.getErrorResponse(false,"User id missing. Please provide the User id","Please provide the user id for the event",secret);
    }
  
    const offset = helper.getOffset(page, config.listPerPage);
    // const offset1 = helper.getOffset1(page, config.listPerPage);
  var sql;
  if(querydata.filtertype == 'all'){
    sql = `SELECT em.Event_ID,em.Event_Name,bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime,em.Alertmessage,em.IsHumanDetected,
    cm.camera_id,cm.camera_name,dm.device_name,dm.IP_Domain,dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID,  dm.device_id, dt.Dept_name,dt.Dept_Location, 
    dc.Name1,dc.Contact_mobile1,dc.Contact_Email1,bm.Branch_name, bm.contact_person, cm.Camera_Status, MIN(es.detected_file) AS imagepath,CASE WHEN el.Event_ID IS NOT NULL OR wl.Event_ID IS NOT NULL THEN 'Acknowledged' 
    ELSE 'Unacknowledged' END AS eventstatus, MAX(el.feedback) AS feedback FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id
    JOIN deptmaster dt ON dt.dept_id = dm.dept_id LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id
    LEFT JOIN eventaistatus es ON es.event_id = em.Event_ID LEFT JOIN eventlog el ON el.event_id = em.Event_ID LEFT JOIN whatsapplog wl ON wl.Event_id = em.Event_ID
    JOIN eventuser eu ON eu.Event_ID = em.Event_ID WHERE em.enddate BETWEEN '${querydata.starttime}' and '${querydata.endtime}' AND eu.user_id = ${querydata.userid} GROUP BY em.Event_ID LIMIT ${offset}, ${config.listPerPage}`;
  }else if(querydata.filtertype == 'unacknowledged'){
    sql = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status, ep.imagepath FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id 
    LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN (SELECT Event_ID, MIN(detected_file) AS imagepath FROM eventaistatus GROUP BY Event_ID
    ) ep ON ep.Event_ID = em.Event_ID WHERE em.Event_ID NOT IN (SELECT el.Event_ID FROM eventlog el) AND em.Event_ID NOT IN (SELECT wl.Event_id FROM whatsapplog wl) AND em.Event_ID IN (SELECT eu.Event_id FROM eventuser eu 
    WHERE eu.user_id = ${querydata.userid}) AND (em.Row_updated_date between '${querydata.starttime}' and '${querydata.endtime}') AND (em.Event_Name NOT LIKE 'Tampering%' OR em.Event_Name NOT LIKE 'HDD%' OR em.Event_Name NOT LIKE 'Video%' OR em.Event_Name NOT LIKE '%FULL%' OR em.Event_Name 
    NOT LIKE '%Device%') GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ${offset}, ${config.listPerPage}`;
  }else if(querydata.filtertype == 'acknowledged'){
    sql = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected,
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location,
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status, ep.imagepath, el.feedback FROM eventmaster em JOIN cameramaster cm ON
    cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id LEFT JOIN deptcontacts dc ON dc.dept_id
    = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN (SELECT Event_ID, MIN(detected_file) AS imagepath FROM eventaistatus GROUP BY Event_ID) ep ON ep.Event_ID
    = em.Event_ID JOIN eventlog el ON el.event_id = em.Event_ID WHERE em.Event_ID IN (SELECT eu.Event_id FROM eventuser eu WHERE eu.user_id = ${querydata.userid}) and 
    (em.Row_updated_date between '${querydata.starttime}' and '${querydata.endtime}') AND (em.Event_Name NOT LIKE 'Tampering%' OR em.Event_Name NOT LIKE 'HDD%' OR em.Event_Name NOT LIKE
   'Video%' OR em.Event_Name NOT LIKE '%FULL%' OR em.Event_Name NOT LIKE '%Device%') GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ${offset}, ${config.listPerPage}`;
  }else if(querydata.filtertype == 'whatsapp'){
    sql = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status, ep.imagepath FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id 
    LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN (SELECT Event_ID, MIN(detected_file) AS imagepath FROM eventaistatus GROUP BY Event_ID
    ) ep ON ep.Event_ID = em.Event_ID WHERE em.Event_ID IN (SELECT wl.Event_id FROM whatsapplog wl) AND em.Event_ID IN (SELECT eu.Event_id FROM eventuser eu 
    WHERE eu.user_id = ${querydata.userid}) and (em.Row_updated_date between '${querydata.starttime}' and '${querydata.endtime}') AND (em.Event_Name NOT LIKE 'Tampering%' OR em.Event_Name NOT LIKE 'HDD%' OR em.Event_Name NOT LIKE 'Video%' OR em.Event_Name NOT LIKE '%FULL%' OR em.Event_Name 
    NOT LIKE '%Device%') GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ${offset}, ${config.listPerPage}`;
  }else if(querydata.filtertype == 'ai'){
    sql = `SELECT em.Event_ID, em.Event_Name, bm.whatsappgroupname, em.Row_updated_date,DATE_FORMAT(em.enddate, '%Y-%m-%d %H:%i:%s') AS eventtime, em.Alertmessage, em.IsHumanDetected, 
    cm.camera_id, cm.camera_name, dm.device_name, dm.IP_Domain, dm.RTSP_port, dm.IP_port, dm.IP_Uname, dm.IP_Pwd, dm.short_name, dm.SDK_ID, dm.device_id, dt.Dept_name, dt.Dept_Location, 
    dc.Name1, dc.Contact_mobile1, dc.Contact_Email1, bm.Branch_name, bm.contact_person, cm.Camera_Status, ep.imagepath FROM eventmaster em JOIN cameramaster cm ON cm.camera_id = em.analyticsource_id JOIN devicemaster dm ON dm.device_id = cm.device_id JOIN deptmaster dt ON dt.dept_id = dm.dept_id 
    LEFT JOIN deptcontacts dc ON dc.dept_id = dt.dept_id JOIN branchmaster bm ON bm.branch_id = dt.branch_id LEFT JOIN (SELECT Event_ID, MIN(detected_file) AS imagepath FROM eventaistatus GROUP BY Event_ID
    ) ep ON ep.Event_ID = em.Event_ID WHERE em.Event_ID IN (SELECT Event_ID FROM eventlog where feedback like '%AI%') AND em.Event_ID IN (SELECT eu.Event_id FROM eventuser eu 
    WHERE eu.user_id = ${querydata.userid}) and (em.Row_updated_date between '${querydata.starttime}' and '${querydata.endtime}') GROUP BY em.Event_ID ORDER BY em.Row_updated_date LIMIT ${offset}, ${config.listPerPage}`;
  }else{
    return helper.getErrorResponse(false,"Unknown filter type.","Please choose the valid filter type",secret);
  }
  console.log(sql);
  const result1 = await db.query(sql);
  if(result1[0]){
    return helper.getSuccessResponse(true,'User reports fetched successfully',result1,secret)
  } else{
    return helper.getErrorResponse(false,"Events not available.","USER REPORTS",secret);
  }
  } catch (er) {
    return helper.getErrorResponse(false,"Internal error. Please contact Administration",er,secret);
  }
}

//#####################################################################################################################################################################################################
//#####################################################################################################################################################################################################
//####################################################################################################################################################################################################

async function IgnoreCameras(event){
   try{
    if(event.hasOwnProperty('STOKEN')==false){
      return helper.getErrorResponse(false,"Login sessiontoken missing. Please provide the Login sessiontoken","USER EVENT REPORT","");
    }
    //CHECK IF THE SESSIONTOKEN SIZE IS VALID OR NOT
    if(event.STOKEN.length > 50 || event.STOKEN.length  < 30){
      return helper.getErrorResponse(false,"Login sessiontoken size invalid. Please provide the valid Sessiontoken","USER EVENT REPORT","");
    }
    // CHECK IF THE GIVEN SESSIONTOKEN IS VALID OR NOT
    const [result] =await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail',[event.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];
    // console.log("event list userid ->"+ userid);
    if(userid == null){
      return helper.getErrorResponse(false,"Login sessiontoken Invalid. Please provide the valid sessiontoken","USER EVENT REPORT","");
    }
  
     //BEGIN VALIDATION 2
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(event.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse(false,"Querystring missing. Please provide the querystring","USER EVENT REPORT","");
  }
  var secret=event.STOKEN.substring(0,16);
  // console.log("secret-->"+secret);
  // console.log("filter event querystring ->"+ event.querystring);
  var querydata;
  
  try{ 
     querydata = await helper.decrypt(event.querystring,secret);
    //  console.log("decrypted querydata->"+querydata);
  }
  catch(ex){
    return helper.getErrorResponse(false,"Querystring Invalid error. Please provide the valid querystring.","USER EVENT REPORT",secret);
  }
  try{
    querydata= JSON.parse(querydata);
  }
  catch(ex){
    return helper.getErrorResponse(false,"Querystring JSON error. Please provide the valid JSON","USER EVENT REPORT",secret);
  } 
  if(querydata.hasOwnProperty('cameras') == false){
     return helper.getErrorResponse(false,"Camera id missing.","IGNORE CAMERA RECORDS",secret);
  }
  if(querydata.hasOwnProperty('ignoretype') == false){
    return helper.getErrorResponse(false,"Ignore type missing","IGNORE CAMERA RECORDS",secret);
  }
  if(querydata.hasOwnProperty('starttime') == false){
    return helper.getErrorResponse(false,"Start time missing","IGNORE CAMERA RECORDS",secret);
  }
  if(querydata.hasOwnProperty('endtime') == false){
    return helper.getErrorResponse(false,"End time missing","IGNORE CAMERA RECORDS",secret);
  }
  try{
      let cameraIds = querydata.cameras;
      if (typeof cameraIds === 'string') {
        // Replace various delimiters with commas and split by comma
        cameraIds = cameraIds.replace(/[\s;]+/g, ',').split(',').map(id => id.trim()).filter(id => id.length > 0);
      } else if (!Array.isArray(cameraIds)) {
        return helper.getErrorResponse(false, "Invalid camera id format.", "IGNORE CAMERA RECORDS", secret);
      }
    for (const cameraId of cameraIds) {
      try{
     const [result] = await db.spcall(`CALL AddEventIgnoreCamera(?,?,?,?);`,[cameraId,querydata.ignoretype,querydata.starttime,querydata.endtime]);
      }catch(er){
        console.error(`Error calling stored procedure for camera ID ${cameraId}:`, error);
      }
    }
    return helper.getSuccessResponse(true,"Camera's added successfully","",secret);
  }catch(er){
    return helper.getErrorResponse(false,"Internal error. Please contact Administration",er);
  }
   }catch(er){
      return helper.getErrorResponse(false,"Internal error. Please contact Administration",er);
   }
}
module.exports = {
  create,
  createSnapshot,
  createAction,
  update,
  deletedata,
  getEventSnapshot,          
  createSnapshotSingle,
  getRecentEvent,
  getUnAckEvent,
  getDeviceEvent,
  getMultiple,
  getCustomMessage,
  getEventAction,
  getEventProperty,
  addCustomMessage,
  addEventFeedback,
  addWhatsappLog,    
  GetAIEvent, 
  Eventlistfilter,
  getUnAcknoEvent,
  getRecEvent,
  getDevEvent,
  getVideolossEvent,
  getNotConnect,
  CreateSnapshot,
  addCustomerSelfFeedback,
  getWhatsappEvent,
  GetUserReport,
  IgnoreCameras,

}