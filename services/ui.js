const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function getGridTemplate(page = 1,grid){
  let message = 'Error in fetching grid template list';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+grid.userid+' and token="'+grid.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const offset = helper.getOffset(page, config.listPerPage);
  let sql=""
  if (grid.gridid!=0)
    sql=`SELECT * FROM gridtemplatemaster where grid_id=${grid.gridid} LIMIT ${offset},${config.listPerPage}`;
  else
    sql=`SELECT * FROM gridtemplatemaster LIMIT ${offset},${config.listPerPage}`;

  console.error(`SQL data==>`, sql);
  if (sql!="")
  {
    const rows = await db.query(sql);

    const data = helper.emptyOrRows(rows);
    const meta = {page};
    message = 'Grid Templates list Fetching successfully';
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
    message = 'Error fetching Grid Templates. Please contact technical support';
    responsecode = "8004"
    return {
      responsecode,
      message,
      data,
      meta
    }
  }
}

module.exports = {
  getGridTemplate
}