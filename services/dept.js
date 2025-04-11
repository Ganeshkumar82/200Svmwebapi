const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function create(dept){
    let message = 'Error in creating new Department';
    let responsecode = "8001"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+dept.userid+' and token="'+dept.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "8001"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL adddept('+dept.branchid+',"'+dept.deptname+'","'+dept.address+'",'+dept.userid+')');

    if (result.affectedRows) {
      responsecode = "801"
      message = 'Department created successfully';
    }
  
    return {responsecode,message};
}


async function update(dept){
  let message = 'Error in updating Department data';
  let responsecode = "8002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+dept.userid+' and token="'+dept.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `update deptmaster set branch_id=${dept.branchid},dept_name="${dept.deptname}",Dept_Location="${dept.address}" WHERE dept_id=${dept.deptid}`);

  if (result.affectedRows) {
      responsecode = "802"
      message = 'Department updated successfully';
  }

  return {message};
}

async function deletedata(dept){
  let message = 'Error in deleting Department data';
  let responsecode = "8003"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+dept.userid+' and token="'+dept.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from deptmaster WHERE dept_id=${dept.deptid}` 
  );

  if (result.affectedRows) {
      responsecode = "803"
      message = 'Department deleted successfully';
  }

  return {message};
}

async function getMultiple(page = 1,dept){
  let message = 'Error in fetching Department list';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+dept.userid+' and token="'+dept.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (dept.deptid!=0)
    sql=`SELECT * FROM deptmaster where dept_id=${dept.deptid} LIMIT ${offset},${config.listPerPage}`;
  if (dept.branchid!=0)
    sql=`SELECT * FROM deptmaster where branch_id=${dept.branchid} LIMIT ${offset},${config.listPerPage}`;
  if (dept.customerid!=0)
    sql=`SELECT * FROM deptmaster where branch_id in (select branch_id from branchmaster where customer_id=${dept.customerid}) LIMIT ${offset},${config.listPerPage}`;
  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Department list Fetching successfully';
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
    message = 'Dept/Branch/Customer ID is missing. Please give any one of the input of Dept/Branch/Customer ID';
    responsecode = "8004"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}


//####################################################################################################################################################################################################
//####################   UPDATE site Department  #######################################################################################################################################################
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
async function updatedept(dept){
  //  a) If SESSION TOKEN Character sizes error
  if (dept.STOKEN.length>50 || dept.STOKEN.length<30)
  {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_SIZE_ERROR","CUSTOMER UPDATE DEPARTMENT","");
  }

  //  b) If SESSION TOKEN not available
  const [result1] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail);select @result,@custid,@custname,@custemail;',[dept.STOKEN]);
  const objectValue1 = result1[1][0];
  console.log("Add company, objectValue->"+objectValue1["@result"]);
  const user_id = objectValue1["@result"];
  const custID = objectValue1["@custid"]; 
  console.log("customer id->" + custID);
  if (user_id==null) {
    return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR","CUSTOMER UPDATE DEPARTMENT","");
  }
  var secret = dept.STOKEN.substring(0,16);
  console.log("secret->"+secret);
  //  c) If SESSION TOKEN not given as input
  if(dept.hasOwnProperty('STOKEN')==false){
    return helper.getErrorResponse("SESSIONTOKEN_MISSING_ERROR","CUSTOMER UPDATE DEPARTMENT","");
  }
//End of Validation 1
  
  //Begin Validation 2. decrypt querystring data
  //  a) If Querystring not given as input
  if(dept.hasOwnProperty('querystring')==false){
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_MISSING","CUSTOMER UPDATE DEPARTMENT","");
  }

  console.log("querystring=>"+dept.querystring);
  var queryData;
  try
  {
  //  b) If Querystring decryption fails
    queryData = await helper.decrypt(dept.querystring,secret);
    console.log("decrypted queryData=>"+queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_PACKAGE_QUERY_ERROR","CUSTOMER UPDATE DEPARTMENT",secret);
  }
  try
  { 
    queryData = JSON.parse(queryData);
  }
  catch(ex)
  {
    return helper.getErrorResponse("CUST_COMPANY_JSON_ERROR","CUSTOMER UPDATE DEPARTMENT",secret);
  }
//          c) Check the companyname is valid
  if(queryData.hasOwnProperty('deptname')==false){
    return helper.getErrorResponse("CUST_COMPANY_NAME_MISSING","CUSTOMER UPDATE DEPARTMENT",secret);
  }
  //check if the companyname is valid 
  if(queryData.hasOwnProperty('deptlocation')==false){
    return helper.getErrorResponse("COMPANY_LEGAL_NAME_MISSING","CUSTOMER UPDATE DEPARTMENT",secret);
  }
//          g) Check the billing address is valid
  if(queryData.hasOwnProperty('deptid')==false){
    return helper.getErrorResponse("CUST_COMPANY_BILLING_ADDRESS_MISSING","CUSTOMER UPDATE SITE DEPARTMENT",secret);
  }
//End of Validation 2
 
   const result = await db.query(`
   UPDATE deptmaster
   SET
   Dept_name = ?,
   Dept_Location = ?,
   Created_by = ?
   WHERE Dept_ID  = ?
 `, [
   queryData.deptname,
   queryData.deptlocation,
   userid,
   queryData.deptid
 ]);

 if(result.affectedRows){
  return helper.getSuccessResponse("SITE_DEPARTMENT_UPDATED_SUCCESSFULLY","The company site Department was updated successfully",queryData.branchid,secret);
 }
 else{
  return helper.getErrorResponse("ERROR_UPDATING_SITE_DEPARTMENT","Error while updating the company site Department",secret);
 }
}


module.exports = {
  create,
  update,
  deletedata,
  getMultiple,
  updatedept,

}