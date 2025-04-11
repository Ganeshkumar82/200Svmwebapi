const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function create(serversetting){
    let message = 'Error in creating new server settings';
    let responsecode = "1201"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+serversetting.userid+' and token="'+serversetting.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0) 
    {
        responsecode = "1201"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const [result] = await db.spcall('CALL addsettings(?,?);',[serversetting.settingname,serversetting.settingvalue]);
    responsecode = "1201"
    message = 'Server settings created successfully';
    return {responsecode,message};
}


async function update(serversetting){
  let message = 'Error in updating server settings data';
  let responsecode = "1202"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+serversetting.userid+' and token="'+serversetting.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1202"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL setserversettings(?,?);',[serversetting.settingname,serversetting.settingvalue]);
  responsecode = "1202"
  message = 'Server settings updated successfully';
  return {responsecode,message};
}

async function deletedata(serversetting){
  let message = 'Error in deleting server settings data';
  let responsecode = "1203"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+serversetting.userid+' and token="'+serversetting.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1203"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from serversettings WHERE setting_name=${serversetting.settingname}` 
  );

  if (result.affectedRows) {
      responsecode = "123"
      message = 'Server settings deleted successfully';
  }

  return {message};
}

async function getMultiple(page = 1,serversetting){
  let message = 'Error in fetching server settings list';
  let responsecode = "1204"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+serversetting.userid+' and token="'+serversetting.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1204"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (serversetting.settingname!=0)
    sql=`SELECT * from serversettings WHERE setting_name="${serversetting.settingname}" LIMIT ${offset},${config.listPerPage}`;
  else
    sql=`SELECT * from serversettings LIMIT ${offset},${config.listPerPage}`;
  

  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Server settings list Fetching successfully';
    responsecode = "124"

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
    responsecode = "1204"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}

async function createAISystem(aisystem){
  let message = 'Error in creating new AI System';
  let responsecode = "1205"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+aisystem.userid+' and token="'+aisystem.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1205"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL AddAISystem(?,?,?,?);',[aisystem.machinename,aisystem.machineip,aisystem.imagepath,aisystem.notificationpath]);
  responsecode = "125"
  message = 'AI System created successfully';
  return {responsecode,message};
}

async function deleteAISystem(aisystem){
  let message = 'Error in deleting new AI System';
  let responsecode = "1206"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+aisystem.userid+' and token="'+aisystem.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1206"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('delete from aisysmaster where machine_id=?;',[aisystem.machineid]);
  responsecode = "126"
  message = 'AI System deleted successfully';
  return {responsecode,message};
}



async function createMOperator(operator){
  let message = 'Error in creating new mobile operator';
  let responsecode = "1207"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+operator.userid+' and token="'+operator.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1207"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('CALL AddMobileOperator(?,?);',[operator.name,operator.userid]);
  responsecode = "127"
  message = 'Mobile operator created successfully';
  return {responsecode,message};
}


async function deleteMOperator(operator){
  let message = 'Error in creating new mobile operator';
  let responsecode = "1208"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+operator.userid+' and token="'+operator.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "1208"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  const [result] = await db.spcall('delete from mobileoperatormaster where operator_id=?;',[operator.id]);
  responsecode = "128"
  message = 'Mobile operator created successfully';
  return {responsecode,message};
}

module.exports = {
  create,
  update,
  deletedata,
  createAISystem,
  deleteAISystem,
  createMOperator,
  deleteMOperator,
  getMultiple
}