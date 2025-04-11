const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function createSiteReport(report){
  let message = 'Error in fetching report list';
  let responsecode = "1101"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+report.userid+' and token="'+report.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1101"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL getsitereport(?,?,@cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@site_name,@site_addr,@scity,@sstate,@rno,@totsites,@cpincode,@spincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@cust_id,@custcode,@emailid,@phone);select @cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@site_name,@site_addr,@scity,@sstate,@rno,@totsites,@cpincode,@spincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@cust_id,@custcode,@emailid,@phone;',[report.branchid,report.reportdate]);
  data = result[1];
  responsecode = "902"
  message = 'Site report created successfully';
  return {responsecode,message,data};
}

async function createSummartReport(report){
  let message = 'Error in fetching report list';
  let responsecode = "1102"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+report.userid+' and token="'+report.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1102"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL getsitesummary(?,?,@cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@rno,@totsites,@cpincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@emailid,@phone,@custcode);select @cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@rno,@totsites,@cpincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@emailid,@phone,@custcode;',[report.customerid,report.reportdate]);
  data = result[1];
  responsecode = "112"
  message = 'Summary report created successfully';
  return {responsecode,message,data};
}



async function SetSiteReportTiming(report){
  let message = 'Error in setting site report timing';
  let responsecode = "1103"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+report.userid+' and token="'+report.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1103"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL AddReportSMSEmail(1,?,?,?)',[report.branchid,report.reporttiming,report.userid]);
  data = result[1];
  responsecode = "113"
  message = 'Site report timing created successfully';
  return {responsecode,message,data};
}

async function SetSummaryReportTiming(report){
  let message = 'Error in setting site report timing';
  let responsecode = "1104"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+report.userid+' and token="'+report.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1104"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL AddReportSMSEmail(0,?,?,?)',[report.customerid,report.reporttiming,report.userid]);
  responsecode = "114"
  message = 'Summary report timing created successfully';
  return {responsecode,message,data};
}

//#########################################################################################################################################################################################################
//##########################################################################################################################################################################################
//######################################################################################################################################################################################

async function createsummaryreport(report){
  let message = 'Error in fetching report list';
  let responsecode = "1102"

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (report.hasOwnProperty("STOKEN")== false) {
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "CREATE SUMMARY REPORT", "");
  }
  // Check if the given session token size is valid or not
  if (report.STOKEN.length > 50 || report.STOKEN.length < 30) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "CREATE SUMMARY REPORT", "");
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result1] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [report.STOKEN]);
  const objectvalue = result1[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  if (userid == null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "CREATE SUMMARY REPORT", "");
  }

  var secret = report.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(report.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("CREATE_REPORT_QUERY_MISSING","CREATE SUMMARY REPORT","");
  }
  console.log("customer querystring-->"+report.querystring);
  var queryData;

  try{
    queryData= await helper.decrypt(report.querystring,secret);
    console.log("decrypted data->"+queryData);
  }
  catch(ex){
      return helper.getErrorResponse("CREATE_REPORT_PACKAGE_QUERY_ERROR","CREATE SUMMARY REPORT",secret);
  }
  try{
    queryData=JSON.parse(queryData);
  }
  catch(ex){
    return helper.getErrorResponse("CREATE_REPORT_JSON_ERROR","CREATE SUMMARY REPORT",secret);
  }
  if(queryData.hasOwnProperty('currentdate')== false || queryData.currentdate == ''){
    return helper.getErrorResponse("REPORT_START_DATE_MISSING","CREATE SUMMARY REPORT",secret);
  }

  const [custid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[report.STOKEN]);
  const objectvalue3 = custid[1][0];
  console.log("customerid-->"+objectvalue3["@result"]);
  const customerregid = objectvalue3["@result"];

  const sql8 = `
  SELECT DATE_FORMAT(service_starttime, '%Y-%m-%d %H:%i:%s') as service_starttime,
  DATE_FORMAT(service_endtime, '%Y-%m-%d %H:%i:%s') as service_endtime FROM deviceservicelog where device_id in 
  (select device_id from devicemaster where dept_id in (select dept_id from deptmaster where branch_id 
    in(select branch_id from branchmaster where customer_id in(select customer_id from customermaster where customerreg_id = ${customerregid})))) and 
    DATE(service_endtime)='${queryData.currentdate}' LIMIT 1`;
  console.error(`SQL==>`, sql8);
  try {
    const rows8 = await db.query(sql8);
    console.error(`rows==>`, rows8);
  
    if (rows8.length > 0 && rows8[0].service_starttime != null && rows8[0].service_endtime != null) {
      const service_starttime = rows8[0].service_starttime;
      const service_endtime = rows8[0].service_endtime;
      console.log("starttime->" + service_starttime);
      console.log("endtime->" + service_endtime);
      let sql2="";  
sql2= `SELECT COUNT(*) as totalmrec FROM eventmaster WHERE analyticsource_id IN (SELECT Camera_ID FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca WHERE dm.Branch_ID = bm.Branch_ID AND cm.Place = dm.Dept_ID AND bm.Customer_ID = ca.Customer_ID AND ca.customerreg_id = ${customerregid}) AND Row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}' AND Event_ID NOT IN (SELECT event_id FROM eventsmarked WHERE row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}')`;
console.error(`SQL==>`, sql2);
const rows2 = await db.query(sql2);
// console.error(`rows==>`, rows2);
const Total_Events= helper.emptyOrRows(rows2);

let sql="";	    
sql= `SELECT COUNT(*) as totalmreal FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id =${customerregid}) AND Row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}' AND status = 2 AND event_id NOT IN (SELECT event_id FROM eventsmarked WHERE row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}') AND event_id NOT IN (SELECT event_id FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id = ${customerregid}) AND Row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}' AND (Event_Name LIKE 'Tampering%' OR Event_Name LIKE 'HDD%' OR Event_Name LIKE 'Video%' OR Event_Name LIKE '%FULL%' OR Event_Name LIKE '%Device%') AND event_id NOT IN (SELECT event_id FROM eventsmarked WHERE row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}'))`
console.error(`SQL==>`, sql);
const rows = await db.query(sql);
// console.error(`rows==>`, rows);
const Total_Real_Threads = helper.emptyOrRows(rows);

let sql1="";   
sql1= `SELECT COUNT(*) as totdevalmrec FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id = ${customerregid}) AND Row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}' AND (Event_Name LIKE 'Tampering%' OR Event_Name LIKE 'HDD%' OR Event_Name LIKE 'Video%' OR Event_Name LIKE '%FULL%' OR Event_Name LIKE '%Device%') AND event_id NOT IN (SELECT event_id FROM eventsmarked WHERE row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}')`
console.error(`SQL==>`, sql1);
const rows1 = await db.query(sql1);
// console.error(`rows==>`, rows1);
const Total_device_Alarm = helper.emptyOrRows(rows1);

let sql3="";    
sql3= `SELECT COUNT(*) as totdevhltiss FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id = ${customerregid}) AND Row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}'  AND (Event_Name LIKE 'Tampering%' OR Event_Name LIKE 'HDD%' OR Event_Name LIKE 'Video%' OR Event_Name LIKE '%FULL%' OR Event_Name LIKE '%Device%') AND event_id NOT IN (SELECT event_id FROM eventsmarked WHERE row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}')`;
console.error(`SQL==>`, sql3);
const rows3 = await db.query(sql3);
// console.error(`rows==>`, rows3);
const Device_Health_Issues= helper.emptyOrRows(rows3);

let sql4="";    
sql4= `SELECT COUNT(*) as totdevalmack FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id = ${customerregid}) AND Row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}' AND (Event_Name LIKE 'Tampering%' OR Event_Name LIKE 'HDD%' OR Event_Name LIKE 'Video%' OR Event_Name LIKE '%FULL%' OR Event_Name LIKE '%Device%') AND status = 1 AND event_id NOT IN (SELECT event_id FROM eventsmarked WHERE row_updated_date BETWEEN '${service_starttime}' AND '${service_endtime}')`
console.error(`SQL==>`, sql4);
const rows4 = await db.query(sql4);
// console.error(`rows==>`, rows4);
const Total_Active_Device_Events = helper.emptyOrRows(rows4);

let sql5="";		    
sql5= `SELECT COUNT(bm.branch_id) as totsites FROM branchmaster bm, customermaster cm where bm.Customer_ID = cm.Customer_ID AND cm.customerreg_id= ${customerregid} ;`
console.error(`SQL==>`, sql5);
const rows5 = await db.query(sql5);
// console.error(`rows==>`, rows5);
const Total_sites = helper.emptyOrRows(rows5);

let sql6="";    
sql6= `SELECT COUNT(bm.branch_id) as activesites FROM branchmaster bm, customermaster cm where bm.Customer_ID = cm.Customer_ID AND cm.customerreg_id= ${customerregid}  AND bm.Status = 1;`
console.error(`SQL==>`, sql6);
const rows6 = await db.query(sql6);
// console.error(`rows==>`, rows6);
const Active_sites = helper.emptyOrRows(rows6);


let sql7="";    
sql7 = `SELECT COUNT(bm.branch_id) as Inactivesites FROM branchmaster bm, customermaster cm where bm.Customer_ID = cm.Customer_ID AND cm.customerreg_id= ${customerregid}  AND bm.Status = 0;`
console.error(`SQL==>`, sql7);
const rows7 = await db.query(sql7);
// console.error(`rows==>`, rows7);
const Inactive_sites = helper.emptyOrRows(rows7);
message = 'Customer Summary report fetched successfully is Fetched successfully';
responsecode = "806"
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message,
  Total_Events,
  Total_Real_Threads,
  Total_device_Alarm,
  Device_Health_Issues,
  Total_Active_Device_Events,
  Total_sites,
  Active_sites,
  Inactive_sites
  }), secret);
return encrypt;
}else{
    message = 'No Events for the selected Date';
    responsecode = '806'
    const encrypt = helper.encrypt(JSON.stringify({
      responsecode,
      message
    }), secret);
    return encrypt;
  }
    }
   catch (error) {
    console.error("Error while executing the query:", error);
    // Handle the error gracefully
  }

}


//#########################################################################################################################################################################################################
//##########################################################################################################################################################################################
//######################################################################################################################################################################################

async function createdailyreport(report){
  let message = 'Error in fetching cumulative report list';
  let responsecode = "1102"

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (report.hasOwnProperty("STOKEN")== false) {
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "CREATE CUMULATIVE REPORT", "");
  }
  // Check if the given session token size is valid or not
  if (report.STOKEN.length > 50 || report.STOKEN.length < 30) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "CREATE CUMULATIVE REPORT", "");
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result1] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [report.STOKEN]);
  const objectvalue = result1[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  console.log("customerid-->"+objectvalue["@custid"]);
  const customerregid = objectvalue["@custid"];
  if (userid == null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "CREATE CUMULATIVE REPORT", "");
  }

  var secret = report.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(report.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("CREATE_REPORT_QUERY_MISSING","CREATE CUMULATIVE REPORT","");
  }
  console.log("customer querystring-->"+report.querystring);
  var queryData;

  try{
    queryData= await helper.decrypt(report.querystring,secret);
    console.log("decrypted data->"+queryData);
  }
  catch(ex){
      return helper.getErrorResponse("CREATE_REPORT_PACKAGE_QUERY_ERROR","CREATE CUMULATIVE REPORT",secret);
  }
  try{
    queryData=JSON.parse(queryData);
  }
  catch(ex){
    return helper.getErrorResponse("CREATE_REPORT_JSON_ERROR","CREATE CUMULATIVE REPORT",secret);
  }
  if(queryData.hasOwnProperty('currentdate')== false || queryData.currentdate == ''){
    return helper.getErrorResponse("REPORT_START_DATE_MISSING","CREATE SUMMARY REPORT",secret);
  }

  const sqlGetCustomerIDs = `SELECT Customer_ID FROM customermaster WHERE customerreg_id = ${customerregid} and Customer_type != 0`;
  // console.error(`SQL for getting Customer IDs:`, sqlGetCustomerIDs);
  const rowsCustomerIDs = await db.query(sqlGetCustomerIDs);
  const customerIDs = rowsCustomerIDs.map((row) => row.Customer_ID);

  const results = [];

  for (const customerID of customerIDs) {
    // Get branch IDs for each customer
    const sqlGetBranchIDs = `SELECT Branch_ID FROM branchmaster WHERE Customer_ID = ${customerID}`;
    // console.error(`SQL for getting Branch IDs:`, sqlGetBranchIDs);
    const rowsBranchIDs = await db.query(sqlGetBranchIDs);
    const branchIDs = rowsBranchIDs.map((row) => row.Branch_ID);

    for (const branchID of branchIDs) {
      try {
        const [spSql] = await db.spcall(
          `CALL getsitereport(?,?,@cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@site_name,@site_addr,@scity,@sstate,@rno,@totsites,@cpincode,@spincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@cust_id,@custcode,@emailid,@phone); select @cname,@caname,@stime,@etime,@addr,@ccity,@cstate,@site_name,@site_addr,@scity,@sstate,@rno,@totsites,@cpincode,@spincode,@totalmrec,@totalmack,@totalmreal,@totdevalmrec,@totdevalmack,@totdevhltiss,@devmsg,@almmsg,@cust_id,@custcode,@emailid,@phone`,
          [branchID, queryData.currentdate]
        );
        const objectsp = spSql[1][0];
        // spSql.forEach((objectsp, index) => {
        //   // Log the entire objectsp object
        //   console.log(`Object ${index + 1}:`, objectsp);
        // });
        // console.log(`Calling SP for Customer_ID ${customerID}, Branch_ID ${branchID}`);
        results.push(objectsp);
      } catch (error) {
        // console.error(`Error for Customer_ID ${customerID}, Branch_ID ${branchID}:`, error);
        // Handle errors if necessary
      }
    }
  }
  // Your existing code...
// Sort results based on the @totalmrec field in descending order
results.sort((a, b) => b.totalmrec - a.totalmrec);
// Store all sorted results
// const sortedResults = results.slice();

// // Find the site with the highest totalmrec
// const highestTotalMrecSite = sortedResults[0];
// Limit the response to the first seven records
const topSevenResults = results.slice(0, 7);
message = 'Customer Daily report fetched successfully is Fetched successfully';
responsecode = "806";

const encrypt = helper.encrypt(
  JSON.stringify({
    responsecode,
    message,
    results: topSevenResults, 
  }),
  secret 
);

return encrypt;
}
//#########################################################################################################################################################################################################
//##########################################################################################################################################################################################
//#############################################################################################################################################  #########################################

async function createcumulativereport(report){
  let message = 'Error in fetching cumulative report list';
  let responsecode = "1102"

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (report.hasOwnProperty("STOKEN")== false) {
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "CREATE CUMULATIVE REPORT", "");
  }
  // Check if the given session token size is valid or not
  if (report.STOKEN.length > 50 || report.STOKEN.length < 30) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "CREATE CUMULATIVE REPORT", "");
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result1] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [report.STOKEN]);
  const objectvalue = result1[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  console.log("customerid-->"+objectvalue["@custid"]);
  const customerregid = objectvalue["@custid"];
  
  if (userid == null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "CREATE CUMULATIVE REPORT", "");
  }

  var secret = report.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(report.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("CREATE_REPORT_QUERY_MISSING","CREATE CUMULATIVE REPORT","");
  }
  console.log("customer querystring-->"+report.querystring);
  var queryData;

  try{
    queryData= await helper.decrypt(report.querystring,secret);
    console.log("decrypted data->"+queryData);
  }  
  catch(ex){
      return helper.getErrorResponse("CREATE_REPORT_PACKAGE_QUERY_ERROR","CREATE CUMULATIVE REPORT",secret);
  }
  try{
    queryData=JSON.parse(queryData);
  }
  catch(ex){
    return helper.getErrorResponse("CREATE_REPORT_JSON_ERROR","CREATE CUMULATIVE REPORT",secret);
  }
  if(queryData.hasOwnProperty('currentdate')== false || queryData.currentdate == ''){
    return helper.getErrorResponse("REPORT_START_DATE_MISSING","CREATE SUMMARY REPORT",secret);
  }

  // const [custid] = await db.spcall('CALL SP_GETCUSTIDBY_STOKEN(?,@result); select @result ',[report.STOKEN]);
  // const objectvalue3 = custid[1][0];
  // console.log("customerid-->"+objectvalue3["@result"]);
  // const customerregid = objectvalue3["@result"];

  const currentDate = new Date(queryData.currentdate); // Convert the current date to a Date object
  const results = [];


  for (let i = 0; i < 7; i++) {
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - i); // Subtract 'i' days
    let endDate = new Date(currentDate);
    // Format the dates as strings in the expected format (e.g., 'YYYY-MM-DD')
    const startDateStr = formatDate(startDate);

    const sql = `SELECT COUNT(*) as Totalrec FROM eventmaster WHERE analyticsource_id IN (SELECT Camera_ID FROM cameramaster cm, deptmaster dm, branchmaster bm, 
      customermaster ca WHERE dm.Branch_ID = bm.Branch_ID AND cm.Place = dm.Dept_ID AND bm.Customer_ID = ca.Customer_ID AND ca.customerreg_id = ${customerregid}) 
      AND DATE(Row_updated_date) = '${queryData.currentdate}'  AND Event_ID NOT IN (SELECT event_id FROM eventsmarked WHERE DATE(Row_updated_date) = '${queryData.currentdate}')`;
    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    // console.error(`rows==>`, rows);

    const sql1 = `SELECT COUNT(*) as Totalreal FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, 
      customermaster ca WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id =${customerregid}) AND
      DATE(Row_updated_date) = '${queryData.currentdate}'AND status = 1 AND (Event_Name LIKE 'Tampering%' OR Event_Name 
      LIKE 'HDD%' OR Event_Name LIKE 'Video%' OR Event_Name LIKE '%FULL%' OR Event_Name LIKE '%Device%')`;
    console.error(`SQL==>`, sql1);
    const rows1 = await db.query(sql1);
    // console.error(`rows==>`, rows1);
 
    const sql3 = `SELECT COUNT(*) as TrueEvents FROM eventmaster WHERE analyticsource_id IN (SELECT camera_id FROM cameramaster cm, deptmaster dm, branchmaster bm, customermaster ca
       WHERE dm.branch_id = bm.branch_id AND cm.place = dm.dept_id AND bm.customer_id = ca.customer_id AND ca.customerreg_id = ${customerregid}) AND DATE(Row_updated_date) = '${queryData.currentdate} '  AND event_id IN (SELECT event_id FROM eventlog WHERE flag= 1 AND DATE(Row_updated_date) = '${queryData.currentdate}')`;
    console.error(`SQL==>`, sql3);
    const rows3 = await db.query(sql3);
    // console.error(`rows==>`, rows3);
    // Push the results for this day to the results array
    results.push({ date: startDateStr, total_recent_events: rows[0].Totalrec ,total_real_events: rows1[0].Totalreal, total_True_events: rows3[0].TrueEvents});
    endDate.setDate(startDate.getDate() - 1);
   }

message = 'Customer Summary report fetched successfully is Fetched successfully';
responsecode = "806"
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message,
  results
  }), secret);
return encrypt;
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zeros if needed
  const day = String(date.getDate()).padStart(2, '0'); // Add leading zeros if needed
  return `${year}-${month}-${day}`;
}



//#########################################################################################################################################################################################################
//##########################################################################################################################################################################################
//#############################################################################################################################################  #########################################

async function DeviceInfo(report){
  let message = 'Error in fetching Device health status';
  let responsecode = "1102"

  // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT OR NOT
  if (report.hasOwnProperty("STOKEN")== false) {
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR", "DEVICE HEALTH STATUS", "");
  }
  // Check if the given session token size is valid or not
  if (report.STOKEN.length > 50 || report.STOKEN.length < 30) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR", "DEVICE HEALTH STATUS", "");
  }

  // CHECK IF THE GIVEN SESSSIONTOKEN IS VALID OR NOT
  const [result1] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [report.STOKEN]);
  const objectvalue = result1[1][0];
  console.log("objectvalue->" + objectvalue["@result"]);
  var userid = objectvalue["@result"];
  console.log("customerid-->"+objectvalue["@custid"]);
  const customerregid = objectvalue["@custid"];
  
  if (userid == null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "DEVICE HEALTH STATUS", "");
  }

  var secret = report.STOKEN.substring(0, 16);
  console.log("secret->" + secret);
  //  END OF VALIDATION 1
  // CHECK IF THE QUERYSTRING IS GIVEN AS AN INPUT
  if(report.hasOwnProperty("querystring")==false){
    return helper.getErrorResponse("DEVICE_HEALTH_QUERY_MISSING","DEVICE HEALTH STATUS","");
  }
  console.log("customer querystring-->"+report.querystring);
  var queryData;

  try{
    queryData= await helper.decrypt(report.querystring,secret);
    console.log("decrypted data->"+queryData);
  }  
  catch(ex){
      return helper.getErrorResponse("DEVICE_HEALTH_PACKAGE_QUERY_ERROR","DEVICE HEALTH STATUS",secret);
  }
  try{
    queryData=JSON.parse(queryData);
  }
  catch(ex){
    return helper.getErrorResponse("CREATE_REPORT_JSON_ERROR","DEVICE HEALTH STATUS",secret);
  }
  var sql ='';
     if(queryData.customerid != null && queryData.customerid != ''){
     sql = `SELECT bm.Branch_name AS Site_Name, CASE dm.SDK_ID WHEN 1 THEN 'Hikvision' WHEN 2 THEN 'Dahua' ELSE 'Unknown' END AS Make, CASE dm.Device_Type WHEN 0 THEN 'DVR' WHEN 1 
     THEN 'NVR' ELSE 'Unknown' END AS Device_type, dm.Dept_ID, dm.SDK_ID, dm.Model_no, bm.Status AS Site_Activate, dm.harddiskcap, dm.Status AS Device_Status, dm.MotionDetection, 
     COUNT(dm.Device_ID) AS Total_Devices, CASE WHEN ds.Status IS NOT NULL THEN 1 ELSE 0 END AS Survilence_status FROM branchmaster bm LEFT JOIN deptmaster dt ON
      dt.Branch_id = bm.Branch_ID LEFT JOIN devicemaster dm ON dm.Dept_ID = dt.Dept_id LEFT JOIN deviceservicelog ds ON dm.Device_ID = ds.device_id WHERE bm.Customer_id = ${queryData.customerid}
       GROUP BY bm.Branch_name, dm.SDK_ID, dm.Device_Type, dm.Dept_ID, dm.Model_no, bm.Status,dm.MotionDetection`;
     }
    else if(queryData.branchid!= null && queryData.branchid != ''){
      sql = `SELECT bm.Branch_name AS Site_Name, CASE dm.SDK_ID WHEN 1 THEN 'Hikvision' WHEN 2 THEN 'Dahua' ELSE 'Unknown' END AS Make, CASE dm.Device_Type WHEN 0 THEN 'DVR' WHEN 1 
      THEN 'NVR' ELSE 'Unknown' END AS Device_type, dm.Dept_ID, dm.SDK_ID, dm.Model_no, bm.Status AS Site_Activate, dm.harddiskcap, dm.Status AS Device_Status, dm.MotionDetection, 
      COUNT(dm.Device_ID) AS Total_Devices, CASE WHEN ds.Status IS NOT NULL THEN 1 ELSE 0 END AS Survilence_status FROM branchmaster bm LEFT JOIN deptmaster dt ON
       dt.Branch_id = bm.Branch_ID LEFT JOIN devicemaster dm ON dm.Dept_ID = dt.Dept_id LEFT JOIN deviceservicelog ds ON dm.Device_ID = ds.device_id WHERE dt.Branch_id = ${queryData.branchid}
        GROUP BY bm.Branch_name, dm.SDK_ID, dm.Device_Type, dm.Dept_ID, dm.Model_no, bm.Status,dm.MotionDetection`;
    }else {
      sql = `SELECT bm.Branch_name AS Site_Name, CASE dm.SDK_ID WHEN 1 THEN 'Hikvision' WHEN 2 THEN 'Dahua' ELSE 'Unknown' END AS Make, CASE dm.Device_Type WHEN 0 THEN 'DVR' WHEN 1 
      THEN 'NVR' ELSE 'Unknown' END AS Device_type, dm.Dept_ID, dm.SDK_ID, dm.Model_no, bm.Status AS Site_Activate, dm.harddiskcap, dm.Status AS Device_Status, dm.MotionDetection,
       COUNT(dm.Device_ID) AS Total_Devices, CASE WHEN ds.Status IS NOT NULL THEN 1 ELSE 0 END AS Survilence_status FROM branchmaster bm LEFT JOIN deptmaster dt ON
        dt.Branch_id = bm.Branch_ID LEFT JOIN devicemaster dm ON dm.Dept_ID = dt.Dept_id LEFT JOIN deviceservicelog ds ON dm.Device_ID = ds.device_id LEFT JOIN customermaster cm 
        ON bm.Customer_id = cm.customer_id WHERE cm.customerreg_id = ${customerregid} GROUP BY bm.Branch_name, dm.SDK_ID, dm.Device_Type, 
        dm.Dept_ID, dm.Model_no, bm.Status, dm.MotionDetection`;
    }
    console.error(`SQL==>`, sql);
    const rows = await db.query(sql);
    // console.error(`rows==>`, rows);
    const Device = helper.emptyOrRows(rows);

message = 'Customer Device health is Fetched successfully';
responsecode = "806"
const encrypt = helper.encrypt(JSON.stringify({
  responsecode,
  message,
  Device
  }), secret);
return encrypt;
}


module.exports = {
  createSiteReport,
  createSummartReport,
  SetSiteReportTiming,
  SetSummaryReportTiming,
  createsummaryreport,
  createdailyreport,
  createcumulativereport,
  DeviceInfo,
}