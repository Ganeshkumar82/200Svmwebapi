const db = require('./db');
const helper = require('../helper');
const config = require('../config');
const Net = require('net');
const res = require('express/lib/response');
const { he } = require('date-fns/locale');
// The port number and hostname of the server.
const hikport = 11111;
const dahuaport = 22222;
const host = 'localhost';
const axios = require('axios');
var data={
  devicename:"",
  devicetype:"",
  analogchannel:"",
  ipchannel:"",
  zerochannel:"",
  netports:"",
  alarminnum:"",
  alarmoutnum:"",
  serialnumber:"",
  ipaddress:"",
  alarmserveraddress:"",
  gatewayaddress:"",
  alarmserverport:"",
  subnetmask:"",
  httpport:"",
  preferreddns:"",
  communicationport:"",
  devicetime:"",
  videochannels:"",
  videowallwarning:"",     
  audioalarm:"",
  notifysurveillancecenter:""
}
var session;
async function create(devicedata){
    let message = 'Error in creating new devicedata';
    let responsecode = "8001"
    const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+devicedata.userid+' and token="'+devicedata.TOKEN+'" and valid_status=1;');  
    console.error(`Result data==>`, resultAPI);
    if (resultAPI.length == 0)
    {
        responsecode = "8001"
        message = "Invalid TOKEN";
        return{responsecode,message}
    }
    const result = await db.query('CALL adddevicedata('+devicedata.branchid+',"'+devicedata.devicedataname+'","'+devicedata.address+'",'+devicedata.userid+')');

    if (result.affectedRows) {
      responsecode = "801"
      message = 'devicedata created successfully';
    }
  
    return {responsecode,message};
}


async function update(devicedata){
  let message = 'Error in updating devicedata data';
  let responsecode = "8002"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+devicedata.userid+' and token="'+devicedata.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8002"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `update devicedatamaster set branch_id=${devicedata.branchid},devicedata_name="${devicedata.devicedataname}",devicedata_Location="${devicedata.address}" WHERE devicedata_id=${devicedata.devicedataid}`);

  if (result.affectedRows) {
      responsecode = "802"
      message = 'devicedata updated successfully';
  }

  return {message};
}

async function deletedata(devicedata){
  let message = 'Error in deleting devicedata data';
  let responsecode = "8003"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+devicedata.userid+' and token="'+devicedata.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8003"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }

  const result = await db.query(
    `DELETE from devicedatamaster WHERE devicedata_id=${devicedata.devicedataid}` 
  );

  if (result.affectedRows) {
      responsecode = "803"
      message = 'devicedata deleted successfully';
  }

  return {message};
}

async function getDeviceInfo(devicedata,req){
  session=req.session;
  let message = 'Error in fetching devicedata list';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+devicedata.userid+' and token="'+devicedata.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8004"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  if (devicedata.ipdomain!="" && devicedata.port!=0 && devicedata.username!="" && devicedata.password!="" && devicedata.sdkid!="" )
  {    
    console.error(`Inside connecting`);
    const client = new Net.Socket();
    const mHost = "192.168.0.198";
    var mPort = 11111;
    let mStep = 0;
    if (devicedata.sdkid=="2")
    {
      console.error(`Dahua errer`);
      mPort=22222;
    }
    client.connect({ port: mPort, host: mHost }, function() 
    {
      // If there is no error, the server has accepted the request and created a new 
      // socket dedicated to us.
      var ts = Date.now();console.log(ts+'TCP connection established with the server.');
      console.error(`Server connected`);
      // The client can now send data to the server by writing to its socket.
      client.write('<Login>'+devicedata.ipdomain+","+ devicedata.port+","+ devicedata.username+","+ devicedata.password+","+ devicedata.sdkid);
    });
    
    // The client can also receive data from the server by reading from its socket.
    client.on('data', function(chunk) {
      var ts = Date.now();console.log(ts+`Data received from the server: ${chunk.toString()}.`);      
      if (mStep==0)
      {
        mStep=1;
        client.write('<GetDeviceDetails>');
      }
      else
      {
        // Request an end to the connection after the data has been received.
        mStep=2;
        let mData = chunk.toString();
        mFldData = mData.split(',');
        message = 'Device info successfully fetched';
        responsecode = "804"
        if (devicedata.sdkid=="1")
        {
          data={
            devicename:mFldData[0].trim(),
            devicetype:mFldData[1].trim(),
            analogchannel:mFldData[2].trim(),
            ipchannel:mFldData[3].trim(),
            zerochannel:mFldData[4].trim(),
            netports:mFldData[5].trim(),
            alarminnum:mFldData[6].trim(),
            alarmoutnum:mFldData[7].trim(),
            serialnumber:mFldData[8].trim(),
            ipaddress:"",
            alarmserveraddress:"",
            gatewayaddress:"",
            alarmserverport:"",
            subnetmask:"",
            httpport:"",
            preferreddns:"",
            communicationport:"",
            devicetime:"",
            videochannels:""
          }
        }
        else
        {
          let mchdata = mFldData[3].split('/');
          data={
            serialnumber:mFldData[0],
            analogchannel:mFldData[1],
            ipchannel:mFldData[2],
            audiotalkchannel:mchdata[0],
            resolution:0,
            notificationserver:0,
            eventenabled:0,
            motiondetection:mchdata[1],
            ipaddress:"",
            alarmserveraddress:"",
            gatewayaddress:"",
            alarmserverport:"",
            subnetmask:"",
            httpport:"",
            preferreddns:"",
            communicationport:"",
            devicetime:"",
            videochannels:""
          }
        }
        // return {
        //   responsecode,
        //   message,
        //   data        
        // }  
        mStep=2;
        client.write('<GetDeviceDetails>');
      }
      elseif (devicedata.sdkid=="2")
      {
        let mData = chunk.toString();
        mFldData = mData.split(',');
        message = 'Device info successfully fetched';
        responsecode = "804"
        if (devicedata.sdkid=="1")
        {
          data={
            devicename:data.devicename,
            devicetype:data.devicetype,
            analogchannel:data.devicetype,
            ipchannel:data.devicetype,
            zerochannel:data.devicetype,
            netports:data.devicetype,
            alarminnum:data.devicetype,
            alarmoutnum:data.devicetype,
            serialnumber:data.devicetype,
            ipaddress:mFldData[0].trim(),
            alarmserveraddress:mFldData[1].trim(),
            gatewayaddress:mFldData[2].trim(),
            alarmserverport:mFldData[3].trim(),
            subnetmask:mFldData[4].trim(),
            httpport:mFldData[5].trim(),
            preferreddns:mFldData[6].trim(),
            communicationport:mFldData[7].trim(),
            devicetime:mFldData[8].trim(),
            videochannels:mFldData[8].trim(),
          }
        }
        else
        {
          let mchdata = mFldData[3].split('/');
          data={
            serialnumber:mFldData[0],
            analogchannel:mFldData[1],
            ipchannel:mFldData[2],
            audiotalkchannel:mchdata[0],
            resolution:0,
            notificationserver:0,
            eventenabled:0,
            motiondetection:mchdata[1],
            ipaddress:mFldData[0].trim(),
            alarmserveraddress:mFldData[1].trim(),
            gatewayaddress:mFldData[2].trim(),
            alarmserverport:mFldData[3].trim(),
            subnetmask:mFldData[4].trim(),
            httpport:mFldData[5].trim(),
            preferreddns:mFldData[6].trim(),
            communicationport:mFldData[7].trim(),
            devicetime:mFldData[8].trim(),
            videochannels:mFldData[8].trim(),
          }
        }
        // return {
        //   responsecode,
        //   message,
        //   data        
        // }  
        mStep=2;
        client.end();
      } 
    });
    await new Promise(r => setTimeout(r, 5000));
    message = 'Connected Esblishment success. Call readdata API to get the deviceinfo';
    responsecode = "8004"
    return {
      responsecode,
      message,
      data
    }
  }
  else
  {
    message = devicedata.ipdomain+","+ devicedata.port+","+ devicedata.username+","+ devicedata.password+","+ devicedata.sdkid+' is missing. Please give any one of the input of devicedata/Branch/Customer ID';
    responsecode = "8004"
    return {
      responsecode,
      message
    }
  }
}


async function getDeviceNetwork(devicedata,req){
  session=req.session;
  let message = 'Error in fetching devicedata list';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+devicedata.userid+' and token="'+devicedata.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8004"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  if (devicedata.ipdomain!="" && devicedata.port!=0 && devicedata.username!="" && devicedata.password!="" && devicedata.sdkid!="" )
  {    
    console.error(`Inside connecting`);
    const client = new Net.Socket();
    const mHost = "192.168.0.165";
    var mPort = 11111;
    let mStep = 0;
    if (devicedata.sdkid=="2")
    {
      console.error(`Dahua errer`);
      mPort=22222;
    }
    client.connect({ port: mPort, host: mHost }, function() 
    {
      // If there is no error, the server has accepted the request and created a new 
      // socket dedicated to us.
      var ts = Date.now();console.log(ts+'TCP connection established with the server.');
      console.error(`Server connected`);
      // The client can now send data to the server by writing to its socket.
      client.write('<Login>'+devicedata.ipdomain+","+ devicedata.port+","+ devicedata.username+","+ devicedata.password+","+ devicedata.sdkid);
    });
    
    // The client can also receive data from the server by reading from its socket.
    client.on('data', function(chunk) {
      var ts = Date.now();console.log(ts+`Data received from the server: ${chunk.toString()}.`);      
      if (mStep==0)
      {
        mStep=1;
        client.write('<GetDeviceNetwork>');
      }
      else
      {
        callback = typeof callback == "function" ? callback : () => {};
        // Request an end to the connection after the data has been received.
        mStep=2;
        let mData = chunk.toString();
        mFldData = mData.split(',');
        message = 'Device info successfully fetched';
        responsecode = "804"
        if (devicedata.sdkid=="1")
        {
          data={
            devicename:mFldData[0].trim(),
            devicetype:mFldData[1].trim(),
            analogchannel:mFldData[2].trim(),
            ipchannel:mFldData[3].trim(),
            zerochannel:mFldData[4].trim(),
            netports:mFldData[5].trim(),
            alarminnum:mFldData[6].trim(),
            alarmoutnum:mFldData[7].trim(),
            serialnumber:mFldData[8].trim()          
          }
        }
        else
        {
          let mchdata = mFldData[3].split('/');
          data={
            serialnumber:mFldData[0],
            analogchannel:mFldData[1],
            ipchannel:mFldData[2],
            audiotalkchannel:mchdata[0],
            resolution:0,
            notificationserver:0,
            eventenabled:0,
            motiondetection:mchdata[1]
          }
        }
        // return {
        //   responsecode,
        //   message,
        //   data        
        // }  
        client.end();
      } 
    });
    await new Promise(r => setTimeout(r, 5000));
    message = 'Connected Esblishment success. Call readdata API to get the deviceinfo';
    responsecode = "8004"
    return {
      responsecode,
      message,
      data
    }
  }
  else
  {
    message = devicedata.ipdomain+","+ devicedata.port+","+ devicedata.username+","+ devicedata.password+","+ devicedata.sdkid+' is missing. Please give any one of the input of devicedata/Branch/Customer ID';
    responsecode = "8004"
    return {
      responsecode,
      message
    }
  }
}



async function readDeviceInfo(devicedata,req){
  session=req.session;
  let message = 'fetching devicedata list successful';
  let responsecode = "8004"
  const resultAPI = await db.query('select user_id,token from apitokenmaster where user_id='+devicedata.userid+' and token="'+devicedata.TOKEN+'" and valid_status=1;');  
  console.error(`Result data==>`, resultAPI);
  if (resultAPI.length == 0) 
  {
      responsecode = "8004"
      message = "Invalid TOKEN";
      return{responsecode,message}
  }
  return{
          responsecode,
          message,
          data
        };
}

//############################################################################################################################################################################################################
//#############################################################################################################################################################################################################
//###############################################################################################################################################################################################################
async function getDeviceinfo(devicesdk) {
  try {
    
    // CHECK IF THE SESSIONTOKEN IS GIVEN AS AN INPUT
    if (!devicesdk.hasOwnProperty('STOKEN')) {
      return helper.getErrorResponse('LOGIN_SESSIONTOKEN_MISSING', 'PLEASE PROVIDE THE LOGIN SESSIONTOKEN', '');
    }

    // CHECK IF THE SESSIONTOKEN SIZE IS VALID
    if (devicesdk.STOKEN.length > 50 || devicesdk.STOKEN.length < 30) {
      return helper.getErrorResponse('SESSIONTOKEN_SIZE_ERROR', 'PLEASE PROVIDE THE SESSIONTOKEN WITH VALID SIZE', '');
    }

    // CHECK IF THE PROVIDED SESSIONTOKEN IS VALID
    const [result] = await db.spcall('CALL SP_STOKEN_CHECK(?,@result,@custid,@custname,@custemail); select @result,@custid,@custname,@custemail', [devicesdk.STOKEN]);
    const objectvalue = result[1][0];
    const userid = objectvalue["@result"];

    if (userid == null) {
      return helper.getErrorResponse("LOGIN_SESSIONTOKEN_ERROR", "CUSTOMER GET EVENT PROPERTY", "");
    }

    // CHECK IF THE QUERYSTRING IS PROVIDED
    if (!devicesdk.hasOwnProperty('querystring')) {
      return helper.getErrorResponse("DEVICE_QUERYSTRING_MISSING", "PLEASE PROVIDE THE DEVICE QUERYSTRING", "");
    }

    var secret = devicesdk.STOKEN.substring(0, 16);
    console.log("secret ->" + secret);
    console.log("querystring=>" + devicesdk.querystring);

    // DECRYPT THE QUERYSTRING
    var queryData;
    try {
      queryData = await helper.decrypt(devicesdk.querystring, secret);
      console.log("decrypted queryData=>" + queryData);
    } catch (ex) {
      return helper.getErrorResponse("QUERYSTRING_DECRYPTION_ERROR", "PLEASE PROVIDE A VALID QUERYSTRING WITH CORRECT ENCRYPTED QUERY", secret);
    }

    // PARSE THE QUERYSTRING TO AN ARRAY
    var deviceInfoArray;
    try {
      deviceInfoArray = JSON.parse(queryData);
    } catch (ex) {
      return helper.getErrorResponse("QUERYSTRING_JSON_ERROR", "PLEASE PROVIDE A QUERYSTRING WITH VALID JSON", secret);
    }

    const deviceDetailsArray = [];

    // PROCESS EACH DEVICE INFO
    for (const deviceInfo of deviceInfoArray) {
      try {
        if (deviceInfo.hasOwnProperty('locationid') == false) {
          return helper.getErrorResponse("DEVICE_LOCATIONID_MISSING", "PLEASE PROVIDE THE LOCATION ID", secret);
        }
        if (deviceInfo.hasOwnProperty('devicename') == false) {
          return helper.getErrorResponse("DEVICE_NAME_MISSING", "PLEASE PROVIDE THE DEVICE NAME", secret);
        }
        if (deviceInfo.hasOwnProperty('sdkid') == false) {
          return helper.getErrorResponse("DEVICE_SDKID_MISSING", "PLEASE PROVIDE THE DEVICE SDKID", secret);
        }
        if (deviceInfo.hasOwnProperty('ipdomain') == false) {
          return helper.getErrorResponse("DEVICE_IP_DOMAIN_MISSING", "PLEASE PROVIDE THE CUSTOMER IP DOMAIN", secret);
        }
        if (deviceInfo.hasOwnProperty('ipport') == false) {
          return helper.getErrorResponse('DEVICE_IP_PORT_MISSING', "PLEASE PROVIDE THE DEVICE IP PORT", secret);
        }
        if (deviceInfo.hasOwnProperty('httpport') == false) {
          return helper.getErrorResponse('DEVICE_HTTP_PORT_MISSING', "PLEASE PROVIDE THE DEVICE HTTP PORT", secret);
        }
        if (deviceInfo.hasOwnProperty('rtspport') == false) {
          return helper.getErrorResponse("DEVICE_RTSP_PORT_MISSING", "PLEASE PROVIDE THE DEVICE RTSP PORT", secret);
        }
        if (deviceInfo.hasOwnProperty('username') == false) {
          return helper.getErrorResponse("DEVICE_USER_NAME_MISSING", "PLEASE PROVIDE THE DEVICE USERNAME", secret);
        }
        if (deviceInfo.hasOwnProperty('password') == false) {
          return helper.getErrorResposne('DEVICE_PASSWORD_MISSING', "PLEASE PROVIDE THE DEVICE PASSWORD", secret);
        }

        // Execute stored procedure for each device
        const [result] = await db.spcall('CALL SP_DEVICE_ADD(?,?,?,?,?,?,?,?,?,?,@deviceid); select @deviceid', [deviceInfo.locationid, deviceInfo.devicename, deviceInfo.sdkid, deviceInfo.ipdomain, deviceInfo.ipport, deviceInfo.username, deviceInfo.password, deviceInfo.httpport, deviceInfo.rtspport, userid]);
        const objectvalue = result[1][0];
        const deviceId = objectvalue["@deviceid"];
        console.log("device id ->"+ deviceId);

        if (deviceId == null || deviceId === 0) {
          return helper.getErrorResponse("ERROR_ADDING_DEVICE", "ERROR WHILE ADDING THE DEVICE. PLEASE RETRY", secret);
        } else {
          var siteFolderPath;
          // const folderpath = `select imagefolderpath from branchmaster where branch_id IN(select branch_id from deptmaster where dept_id = ${deviceInfo.deptid})`;
          // const result1 = await db.query(folderpath);
          // if (result1 && result1.length !== 0 && result1[0] && result1[0].imagefolderpath) {
          //   siteFolderPath = result1[0].imagefolderpath;
            const deviceDetails = {
              device_id: deviceId,
              sdk_id: deviceInfo.sdkid,
              ip_domain: deviceInfo.ipdomain,
              ip_port: deviceInfo.ipport,
              username: deviceInfo.username,
              password: deviceInfo.password,
              sitefolderpath: '\\\\192.168.0.198\\volumes\\',
              pathusername : config.folderpath.username,
              pathpassword : config.folderpath.password
            };
            deviceDetailsArray.push(deviceDetails);
            console.log(`Device added successfully to the database. Device ID: ${deviceId}`);
          // } else {
          //   return helper.getErrorResponse("ERROR_FETCHING_FOLDER_PATH", "PLEASE PROVIDE THE FOLDER PATH", secret);
          // }
        }
      } catch (er) {
        return helper.getErrorResponse("ERROR_ADDING_DEVICE", er.message, secret);
      }
    }
    console.log("device details ->"+ JSON.stringify(deviceDetailsArray));
    // return {
    //   success: true,
    //   message: 'Devices added successfully.',
    //   device_details: deviceDetailsArray
    // };
    try {
      // Make a POST request to the second API with deviceDetailsArray
      const secondApiEndpoint = 'http://192.168.0.166:8002';
      const response = await axios.post(secondApiEndpoint, deviceDetailsArray);
      console.log('Second API Response:', JSON.stringify(response.data));
      
      const deviceInfoArray = response.data.data;

      try {
        if (Array.isArray(deviceInfoArray)) {
          // If it's an array, iterate over each item
          for (const item of deviceInfoArray) {
            await processDeviceInfo(item, secret);
          }
        } else if (deviceInfoArray && typeof deviceInfoArray === 'object') {
          // If it's a single object, process it directly
          await processDeviceInfo(deviceInfoArray, secret);
        } else {
          // Handle unexpected data structure
          console.error('Unexpected data structure in deviceInfoArray:', deviceInfoArray);
          return helper.getErrorResponse("UNEXPECTED_DATA_STRUCTURE", "Unexpected data structure in deviceInfoArray", secret);
        }
        return helper.encrypt(JSON.stringify({
          success: true,
          device_details: deviceDetailsArray,
          deviceinfo: response.data
        }),secret);
      } catch (er) {
        return helper.getErrorResponse("INTERNAL_SERVER_ERROR", er.message, "",secret);
      }
    } catch (ex) {
      console.error('Error:', ex.message);
      return helper.getErrorResponse("INTERNAL_SERVER_ERROR", ex.message, '',secret);
    }
  } catch (ex) {
    return helper.getErrorResponse("INTERNAL_SERVER_ERROR", ex.message, '',secret);
  }
}


async function processDeviceInfo(item, secret) {
  try {
    let deviceId, serialNumber, ipchannel, ipchannellist,analogchannellist,analogchannel, harddisk, harddiskcap, freespace, alarminport, alarmoutport, softwareversion, devicemodel, devicetime, NTPtime, AdjustedTime;

    // Loop through available information (DahuaInfo or HikInfo)
    for (const key in item) {
      const info = item[key];
      if (info) {
        deviceId = info.DeviceID ?? null;
        serialNumber = info.SerialNumber ?? null;
        ipchannel = info.IPCameraCount ?? 0;
        analogchannel = info.AnalogCameraCount ?? info.CameraCount;
        harddisk = info.DiskNumber ?? 0;
        let iplist;
        let analoglist;
        let diskInfo;
        if (key === "DahuaInfo") {
          diskInfo = info.DiskInfoList?.[0] ?? {};
          freespace = diskInfo.FreeSpace ?? "0";
          harddiskcap = diskInfo.TotalSpace ?? "0";
        } else if (key === "HikInfo") {
          diskInfo = info.DiskInfoHIKList?.[0] ?? {};
          freespace = diskInfo.FreeSpace ?? "0";
          harddiskcap = diskInfo.TotalSpace ?? "0";
          iplist = info.IPChannels?.[0] ?? {};
          
        }

        alarminport = info.AlarmInPortNum ?? 0;
        alarmoutport = info.AlarmOutPortNum ?? 0;
        softwareversion = info.Software_version ?? null;
        devicemodel = info.DeviceType ?? null;
        devicetime = info.DeviceTime ?? null;
        NTPtime = info.NTPTime ?? null;
        AdjustedTime = info.AdjustedDeviceTime ?? null;

        break; 
      }
    }
      console.log("freespace ->" + freespace);
      console.log("totalspace ->" + harddiskcap);
      console.log("deviceId ->" + deviceId);
      if (deviceId === null || deviceId === '' || deviceId === undefined) {
        return helper.getErrorResponse("DEVICE_INFO_FETCHING_ERROR", "ERROR WHILE FETCHING THE DEVICE INFO", secret);
      }
  
      // Update database with fetched information
      const sql = `UPDATE devicemaster SET SerialNo = ?, Model_no = ?, Product_name = ?, No_AnalogCH = ?, No_IpCH = ?, Harddisk = ?, harddiskcap = ?, harddiskfreespace = ?, Alarminportnumber = ?, 
        Alarmoutportnumber = ?, software_version = ?, Devicetime = ?, Ntptime = ?, AdjustedTime = ? WHERE Device_id = ?`;
      await db.query(sql, [
        serialNumber,
        devicemodel,
        serialNumber,
        analogchannel,
        ipchannel,
        harddisk,
        harddiskcap,
        freespace,
        alarminport,
        alarmoutport,
        softwareversion,
        devicetime,
        NTPtime,
        AdjustedTime,
        deviceId
      ]);
  
      console.log("Updated device information for device ID:", deviceId);
    } catch (error) {
      console.error('Error in DeviceInfo:', error.message);
      return error.message;
    }
  }



module.exports = {
  create,
  update,
  deletedata,
  getDeviceInfo, 
  getDeviceNetwork,
  readDeviceInfo,
  getDeviceinfo
}