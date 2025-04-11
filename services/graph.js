const db = require("./db");
const helper = require("../helper");
const config = require("../config");
const { sq } = require("date-fns/locale");
const { addMilliseconds } = require("date-fns");
const { exec } = require("child_process");

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//THIS API IS USED TO FETCH THE GRAPH DATA FOR THE SITE CONTROLLER SECOND GRAPH
async function Sitesecondgraph(graph) {
  try {
    const sql =
      await db.query(`SELECT bm.branch_id, bm.branch_name, CASE WHEN bm.sitecontroller_status = 1 THEN DATE_FORMAT(bm.site_uptime, '%Y-%m-%d %H:%i:%s')
        ELSE DATE_FORMAT(bm.site_downtime, '%Y-%m-%d %H:%i:%s') END AS time, bm.sitecontroller_status, COUNT(dm.device_id) AS no_of_device FROM branchmaster bm LEFT JOIN deptmaster dt 
        ON bm.branch_id = dt.branch_id LEFT JOIN devicemaster dm ON dt.dept_id = dm.dept_id WHERE bm.status = 1 AND (dm.device_id IS NULL OR dm.status = 1) GROUP BY bm.branch_id;`);
    return { code: true, message: "Graph data fetched successfully.", sql };
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact administration",
      er
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//FETCH THE DATA FOR THE SITRE CONTROLLER THIRD GRAPH
async function Sitethirdgraph(graph) {
  try {
    // Fetching data for 1-hour intervals
    const motionDetectionCounts = await db.query(`
      SELECT
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(EventCounts.motion_count, 0) AS motion_detection_count
      FROM
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN
        (SELECT
          HOUR(Row_updated_date) AS hour,
          COUNT(event_id) AS motion_count
         FROM eventmaster
         WHERE event_name LIKE 'Motion%' OR event_name LIKE 'Intr%'
         GROUP BY HOUR(Row_updated_date)) AS EventCounts
      ON Hours.hour = EventCounts.hour
      ORDER BY Hours.hour;
    `);

    const deviceEventsCounts = await db.query(`
      SELECT
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(EventCounts.device_event_count, 0) AS device_event_count
      FROM
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN
        (SELECT
          HOUR(Row_updated_date) AS hour,
          COUNT(event_id) AS device_event_count
         FROM eventmaster
         WHERE Event_Name LIKE 'Tampering%' 
           OR Event_Name LIKE 'HDD%' 
           OR Event_Name LIKE '%FULL%' 
           OR Event_Name LIKE '%Device%'
         GROUP BY HOUR(Row_updated_date)) AS EventCounts
      ON Hours.hour = EventCounts.hour
      ORDER BY Hours.hour;
    `);

    const videolossEventCounts = await db.query(`
      SELECT
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(EventCounts.videoloss_event_count, 0) AS videoloss_event_count
      FROM
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN
        (SELECT
          HOUR(Row_updated_date) AS hour,
          COUNT(event_id) AS videoloss_event_count
         FROM eventmaster
         WHERE Event_Name LIKE 'Video%' 
         GROUP BY HOUR(Row_updated_date)) AS EventCounts
      ON Hours.hour = EventCounts.hour
      ORDER BY Hours.hour;
    `);

    // Fetching data for 4-hour intervals
    const motionDetectionCounts1 = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        COUNT(event_id) AS motion_detection_count
      FROM eventmaster
      WHERE event_name LIKE 'Motion%' OR event_name LIKE 'Intr%'
      GROUP BY time_range
      ORDER BY time_range;
    `);

    const deviceEventsCounts1 = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        COUNT(event_id) AS device_event_count
      FROM eventmaster
      WHERE Event_Name LIKE 'Tampering%' 
         OR Event_Name LIKE 'HDD%' 
         OR Event_Name LIKE '%FULL%' 
         OR Event_Name LIKE '%Device%'
      GROUP BY time_range
      ORDER BY time_range;
    `);

    const videolossEventCounts1 = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        COUNT(event_id) AS videoloss_event_count
      FROM eventmaster
      WHERE Event_Name LIKE 'Video%' 
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        motion_detection_count: 0,
        device_event_count: 0,
        videoloss_event_count: 0,
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data
    motionDetectionCounts1.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.motion_detection_count = item.motion_detection_count;
      }
    });

    deviceEventsCounts1.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.device_event_count = item.device_event_count;
      }
    });

    videolossEventCounts1.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.videoloss_event_count = item.videoloss_event_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = motionDetectionCounts.map((motionEvent, index) => ({
      time_range: motionEvent.time_range,
      motion_detection_count: motionEvent.motion_detection_count,
      device_event_count: deviceEventsCounts[index]
        ? deviceEventsCounts[index].device_event_count
        : 0,
      videoloss_event_count: videolossEventCounts[index]
        ? videolossEventCounts[index].videoloss_event_count
        : 0,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DeviceEventGraph(graph) {
  try {
    if (!graph.hasOwnProperty("siteid")) {
      return {
        errorcode: false,
        errormessage: "Site id missing. Please provide the site id.",
        error: "FETCH GRAPH DEVICE EVENTS",
      };
    }

    const deviceid = graph.siteid;

    const eventCounts = await db.query(
      `
      SELECT
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(EventCounts.motion_count, 0) AS motion_detection_count,
        IFNULL(EventCounts.device_event_count, 0) AS device_event_count,
        IFNULL(EventCounts.videoloss_event_count, 0) AS videoloss_event_count
      FROM
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN
        (SELECT
          HOUR(Row_updated_date) AS hour,
          COUNT(CASE WHEN event_name LIKE 'Motion%' OR event_name LIKE 'Intr%' THEN event_id END) AS motion_count,
          COUNT(CASE WHEN event_name LIKE 'Tampering%' 
                     OR event_name LIKE 'HDD%' 
                     OR event_name LIKE '%FULL%' 
                     OR event_name LIKE '%Device%' THEN event_id END) AS device_event_count,
          COUNT(CASE WHEN event_name LIKE 'Video%' THEN event_id END) AS videoloss_event_count
         FROM eventmaster
         WHERE Analyticsource_id IN (SELECT camera_id FROM cameramaster WHERE place In (select dept_id from deptmaster where branch_id in(?)))
         GROUP BY HOUR(Row_updated_date)) AS EventCounts
      ON Hours.hour = EventCounts.hour
      ORDER BY Hours.hour;
    `,
      [deviceid]
    );

    return {
      code: true,
      message: "Graph data fetched successfully.",
      data: eventCounts,
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DatabaseFirst(graph) {
  try {
    const runstatus = await db.query(
      `select database_id from databasemaster where runningstatus = 1 and deleted_flag = 0 and status = 1;`
    );
    const stopstatus = await db.query(
      `select database_id from databasemaster where runningstatus = 0 and deleted_flag = 0 and status = 1;`
    );
    const totalsite = await db.query(
      `select database_id from databasemaster where status =1 and deleted_flag =0 `
    );

    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalsite.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;

    return {
      code: true,
      message: "DB percentage FEtched successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AppServerStatus(graph) {
  try {
    const runstatus = await db.query(
      `select applicationserver_id from applicationservermaster where runningstatus = 1 and status = 1 and Deleted_flag = 0`
    );
    const stopstatus = await db.query(
      `select applicationserver_id from applicationservermaster where runningstatus =0 and status = 1 and deleted_flag =0`
    );
    const totalcount = await db.query(
      `select applicationserver_id from applicationservermaster where status=1 and deleted_flag =0`
    );

    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;

    return {
      code: true,
      message: "Application server percentage Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function WebserverStatus(graph) {
  try {
    const runstatus = await db.query(
      `select webserver_id from webservermaster where runningstatus = 1 and deleted_flag = 0 and status =1`
    );
    const stopstatus = await db.query(
      `select webserver_id from webservermaster where runningstatus = 0 and deleted_flag = 0 and status =1`
    );
    const totalcount = await db.query(
      `select webserver_id from webservermaster where status = 1 and deleted_flag =0 `
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;
    console.log(`webserver master ${runningPercentage}  ${stoppedPercentage}`)
    return {
      code: true,
      message: "Webserver percentage Fetched Successfully.",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AIserverStatus(graph) {
  try {
    const runstatus = await db.query(
      `select machine_id from aisysmaster where runningstatus = 1 and status =1 and deleted_flag = 0`
    );
    const stopstatus = await db.query(
      `select machine_id from aisysmaster where runningstatus = 0 and status =1 and deleted_flag =0`
    );
    const totalcount = await db.query(
      `select machine_id from aisysmaster where status =1 and deleted_flag =0`
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;
    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;

    return {
      code: true,
      message: "AI server percentage Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ComServerStatus(graph) {
  try {
    const runstatus = await db.query(
      `select comserver_id from communicationserver where runningstatus = 1 and status = 1 and deleted_flag = 0`
    );
    const stopstatus = await db.query(
      `select comserver_id from communicationserver where runningstatus = 0 and status = 1 and deleted_flag = 0`
    );
    const totalcount = await db.query(
      `select comserver_id from communicationserver where status = 1 and deleted_flag = 0`
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;
    return {
      code: true,
      message: "Communication server percentage Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function LoadBalancerServer(graph) {
  try {
    const runstatus = await db.query(
      `select loadbalancer_id from loadbalancermaster where running_status = 1 and status = 1 and deleted_flag = 0`
    );
    const stopstatus = await db.query(
      `select loadbalancer_id from loadbalancermaster where running_status = 0 and status = 1 and deleted_flag = 0`
    );
    const totalcount = await db.query(
      `select loadbalancer_id from loadbalancermaster where status = 1 and deleted_flag = 0`
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;
    return {
      code: true,
      message: "Load Balancer server running percentage Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function NotifyServerStatus(graph) {
  try {
    const runstatus = await db.query(
      `select notification_id from notificationmaster where server_status = 1 and status = 1 and deleted_flag = 0`
    );
    const stopstatus = await db.query(
      `select notification_id from notificationmaster where server_status = 0 and status = 1 and deleted_flag = 0`
    );
    const totalcount = await db.query(
      `select notification_id from notificationmaster where status = 1 and deleted_flag = 0`
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;
    return {
      code: true,
      message:
        "Notification server running percentage status Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FileServerStatus(graph) {
  try {
    const runstatus = await db.query(
      `select storagepath_id from storagepathmaster where running_status = 1 and status =1 and deleted_flag = 0 and Storage_type in(1,2)`
    );
    const stopstatus = await db.query(
      `select storagepath_id from storagepathmaster where running_status = 0 and status = 1 and deleted_flag = 0 and Storage_type in(1,2)`
    );
    const totalcount = await db.query(
      `select storagepath_id from storagepathmaster where status = 1 and deleted_flag = 0 and Storage_type IN(1,2)`
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;
    return {
      code: true,
      message: "File server running percentage status Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

// async function DeviceControllerStatus(graph){
//   try{
//     if(graph.hasOwnProperty('siteid') == false){
//       return helper.getErrorResponse(false,"Site id missing. Please provide the site id.","FETCH DEVICE CONTROLLER STATUS","");
//     }
//     const runstatus = await db.query(`SELECT devicelog_id FROM devicerunningstatuslog WHERE status = 1 AND device_id IN
//        ( SELECT device_id FROM devicemaster WHERE dept_id IN ( SELECT dept_id FROM deptmaster WHERE branch_id IN (${graph.siteid}) ) ) ORDER BY devicelog_id DESC LIMIT 1;`);
//     const stopstatus = await db.query(`SELECT devicelog_id FROM devicerunningstatuslog WHERE status in(0,5) AND device_id IN
//     ( SELECT device_id FROM devicemaster WHERE dept_id IN ( SELECT dept_id FROM deptmaster WHERE branch_id IN (${graph.siteid}) ) ) ORDER BY devicelog_id DESC LIMIT 1;`);
//     const totalcount = await db.query(`SELECT device_id from devicemaster where dept_id IN ( SELECT dept_id FROM deptmaster WHERE branch_id IN (${graph.siteid}) )  and status = 1`);
//     const runningCount = runstatus.length;
//     const stoppedCount = stopstatus.length;
//     const totalCount = totalcount.length;

//     const runningPercentage = (runningCount / totalCount) * 100;
//     const stoppedPercentage = (stoppedCount / totalCount) * 100;
//     return ({code: true, message:"Device controller running percentage status Fetched Successfully",runningPercentage:Math.round(runningPercentage),stoppedPercentage:Math.round(stoppedPercentage)})
//   }catch(er){
//       return ({code:false,message:"Internal error. Please contact Administration",error:er});
//   }
// }
async function DeviceControllerStatus(graph) {
  try {
    if (!graph.hasOwnProperty("siteid") || graph.siteid === "") {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id.",
        "FETCH DEVICE CONTROLLER STATUS",
        ""
      );
    }
    var latestStatus;
    // Fetch the latest status for each device
    try {
      const latestStatusQuery = `SELECT device_id, status 
      FROM (
          SELECT 
              device_id, 
              status, 
              ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY devicelog_id DESC) AS rn
          FROM devicerunningstatuslog 
          WHERE device_id IN (
              SELECT device_id 
              FROM devicemaster 
              WHERE dept_id IN (
                  SELECT dept_id 
                  FROM deptmaster 
                  WHERE branch_id = ${graph.siteid}
              )
          )
      ) AS sub 
      WHERE rn = 1;
      `;
      latestStatus = await db.query(latestStatusQuery);
    } catch (er) {
      const latestStatusQuery = `SELECT d.device_id, d.status FROM devicerunningstatuslog d
      INNER JOIN (SELECT device_id, MAX(devicelog_id) AS max_log_id FROM devicerunningstatuslog GROUP BY device_id) max_logs ON d.device_id = max_logs.device_id AND d.devicelog_id = max_logs.max_log_id
      WHERE d.device_id IN (SELECT device_id FROM devicemaster WHERE dept_id IN (SELECT dept_id FROM deptmaster  WHERE branch_id IN (${graph.siteid})));`;
      latestStatus = await db.query(latestStatusQuery);
    }
    // Count running and stopped devices
    let runningCount = 0;
    let stoppedCount = 0;

    latestStatus.forEach((row) => {
      if (row.status === 1) {
        runningCount++;
      } else if (row.status === 0 || row.status === 5) {
        stoppedCount++;
      }
    });

    // Fetch the total count of active devices
    const totalDevicesQuery = `SELECT COUNT(*) as total FROM devicemaster WHERE dept_id IN (SELECT dept_id FROM deptmaster WHERE branch_id IN (${graph.siteid})) AND status = 1;`;
    const totalDevicesResult = await db.query(totalDevicesQuery);
    const totalCount = totalDevicesResult[0].total;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;

    return {
      code: true,
      message:
        "Device controller running percentage status fetched successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function SiteControllerStatus(graph) {
  try {
    const runstatus = await db.query(
      `SELECT branch_id from branchmaster where Sitecontroller_status =1 and status =1 and deleted_flag =0;`
    );
    const stopstatus = await db.query(
      `SELECT branch_id from branchmaster where Sitecontroller_status =0 and status =1 and deleted_flag =0;`
    );
    const totalcount = await db.query(
      `SELECT branch_id from branchmaster where status =1 and deleted_flag =0;`
    );
    const runningCount = runstatus.length;
    const stoppedCount = stopstatus.length;
    const totalCount = totalcount.length;

    const runningPercentage = (runningCount / totalCount) * 100;
    const stoppedPercentage = (stoppedCount / totalCount) * 100;
    return {
      code: true,
      message: "Site controller running percentage status Fetched Successfully",
      runningPercentage: Math.round(runningPercentage),
      stoppedPercentage: Math.round(stoppedPercentage),
    };
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

// async function SiteDailyStatus(graph) {
//   try {
//     if (!graph.hasOwnProperty('fetchtype')) {
//       return helper.getErrorResponse(false, "Fetching type missing. Please provide the fetching type", "SITE OVERALL STATUS");
//     }

//     const currentDate = new Date();
//     const year = currentDate.getFullYear();
//     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//     const day = String(currentDate.getDate()).padStart(2, '0');
//     const formattedDate = `${year}-${month}-${day}`;

//     let startDate;
//     let startDateFormatted;
//     let sql;

//     if (graph.fetchtype === 'daily') {
//       sql = await db.query(`SELECT Action_time as downtime FROM sitecontrollerstatus WHERE siteaction = 1 AND DATE(Row_updated_date) = ?`, [formattedDate]);
//     } else if (graph.fetchtype === 'weekly') {
//       startDate = new Date(currentDate);
//       startDate.setDate(currentDate.getDate() - 7);
//       startDateFormatted = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
//       sql = await db.query(`SELECT Action_time as downtime FROM sitecontrollerstatus WHERE siteaction = 1 AND DATE(Row_updated_date) BETWEEN ? AND ?`, [startDateFormatted, formattedDate]);
//     } else if (graph.fetchtype === 'monthly') {
//       startDate = new Date(currentDate);
//       startDate.setDate(currentDate.getDate() - 30);
//       startDateFormatted = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
//       sql = await db.query(`SELECT Action_time as downtime FROM sitecontrollerstatus WHERE siteaction = 1 AND DATE(Row_updated_date) BETWEEN ? AND ?`, [startDateFormatted, formattedDate]);
//     } else {
//       return helper.getErrorResponse(false, "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).", "SITE OVERALL STATUS");
//     }
//     return sql;
//   } catch (er) {
//     console.error(er);
//     return helper.getErrorResponse(false, "Internal error. Please contact Administration", "SITE OVERALL STATUS", er);
//   }
// }
// async function SiteDailyStatus(graph) {
//   try {
//     if (!graph.hasOwnProperty('fetchtype')) {
//       return helper.getErrorResponse(false, "Fetching type missing. Please provide the fetching type", "SITE OVERALL STATUS");
//     }

//     const currentDate = new Date();
//     const year = currentDate.getFullYear();
//     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//     const day = String(currentDate.getDate()).padStart(2, '0');
//     const formattedDate = `${year}-${month}-${day}`;

//     let startDate;
//     let startDateFormatted;
//     let sql;

//     if (graph.fetchtype === 'daily') {
//       sql = await db.query(`SELECT sc.site_id,bm.Branch_name,sc.Action_time as downtime FROM sitecontrollerstatus sc,branchmaster bm WHERE sc.site_id = bm.Branch_id and sc.siteaction = 0 AND DATE(sc.Row_updated_date) = ?`, [formattedDate]);
//     } else if (graph.fetchtype === 'weekly') {
//       startDate = new Date(currentDate);
//       startDate.setDate(currentDate.getDate() - 7);
//       startDateFormatted = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
//       sql = await db.query(`SELECT sc.site_id,bm.Branch_name,sc.Action_time as downtime FROM sitecontrollerstatus sc,branchmaster bm WHERE sc.site_id = bm.Branch_id and sc.siteaction = 0 AND DATE(sc.Row_updated_date) BETWEEN ? AND ?`, [startDateFormatted, formattedDate]);
//     } else if (graph.fetchtype === 'monthly') {
//       startDate = new Date(currentDate);
//       startDate.setDate(currentDate.getDate() - 30);
//       startDateFormatted = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
//       sql = await db.query(`SELECT sc.site_id,bm.Branch_name,sc.Action_time as downtime FROM sitecontrollerstatus sc,branchmaster bm WHERE sc.site_id = bm.Branch_id and sc.siteaction = 0 AND DATE(sc.Row_updated_date) BETWEEN ? AND ?`, [startDateFormatted, formattedDate]);
//     } else {
//       return helper.getErrorResponse(false, "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).", "SITE OVERALL STATUS");
//     }

//     // Process the SQL result to format it as required
//     const days = [];
//     const downtime = [];

//     const processResult = (resultSet) => {
//       resultSet.forEach(result => {
//         const actionDate = new Date(result.downtime);
//         const dayFormatted = `${String(actionDate.getDate()).padStart(2, '0')}/${String(actionDate.getMonth() + 1).padStart(2, '0')}`;
//         if (!days.includes(dayFormatted)) {
//           days.push(dayFormatted);
//         }
//         const hours = actionDate.getHours();
//         const minutes = actionDate.getMinutes();
//         const dividedMinutes = Math.round(minutes / 6);
//         const siteid= result.site_id;
//         const sitename = result.Branch_name;
//         downtime.push({siteid:siteid,sitename:sitename,day:dayFormatted,hour: hours,originalmin:minutes,min: dividedMinutes });
//       });
//     };

//     if (Array.isArray(sql[0])) {
//       sql.forEach(resultSet => {
//         processResult(resultSet);
//       });
//     } else {
//       processResult(sql);
//     }

//     return {
//       code: true,
//       message: "Downtime data fetched successfully",
//       days: days,
//       downtime: downtime,
//       sql :sql,
//     };
//   } catch (er) {
//     console.error(er);
//     return helper.getErrorResponse(false, "Internal error. Please contact Administration", er,"");
//   }
// }
async function SiteDailyStatus(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the fetching type",
        "SITE OVERALL STATUS"
      );
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    console.log(formattedDate);
    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `
        SELECT sc.site_id, bm.Branch_name, sc.Action_time AS downtime 
        FROM sitecontrollerstatus sc 
        JOIN branchmaster bm ON sc.site_id = bm.Branch_id 
        WHERE sc.siteaction = 0 AND DATE(sc.Row_updated_date) = ?`,
        [formattedDate]
      );
      // console.log(JSON.stringify(sql));
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `
        SELECT sc.site_id, bm.Branch_name, sc.Action_time AS downtime 
        FROM sitecontrollerstatus sc 
        JOIN branchmaster bm ON sc.site_id = bm.Branch_id 
        WHERE sc.siteaction = 0 AND DATE(sc.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `
        SELECT sc.site_id, bm.Branch_name, sc.Action_time AS downtime 
        FROM sitecontrollerstatus sc 
        JOIN branchmaster bm ON sc.site_id = bm.Branch_id 
        WHERE sc.siteaction = 0 AND DATE(sc.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "SITE OVERALL STATUS"
      );
    }

    // Generate the date range
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const sites = {};

    // Process SQL results
    sql.forEach((row) => {
      const id = row.site_id;
      const branchName = row.Branch_name;
      const downtimeDate = new Date(row.downtime);
      const dayFormatted = `${String(downtimeDate.getDate()).padStart(
        2,
        "0"
      )}/${String(downtimeDate.getMonth() + 1).padStart(2, "0")}`;
      const hours = downtimeDate.getHours();
      const minutes = downtimeDate.getMinutes();
      const dividedMinutes = Math.round(minutes / 6);

      if (!sites[id]) {
        sites[id] = { branchName, downtimes: {} };
      }

      if (!sites[id].downtimes[dayFormatted]) {
        sites[id].downtimes[dayFormatted] = [];
      }

      sites[id].downtimes[dayFormatted].push({
        hour: hours,
        originalMin: minutes,
        min: dividedMinutes,
      });
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, siteData] of Object.entries(sites)) {
      dateRange.forEach((date) => {
        const downtimes = siteData.downtimes[date] || [];
        downtimes.forEach((downtime) => {
          downtimeReport.push({
            id,
            Name: siteData.branchName,
            day: date,
            ...downtime,
          });
        });
      });
    }

    // Sort downtimeReport by day
    downtimeReport.sort((a, b) => {
      const dateA = new Date(a.day.split("/").reverse().join("-"));
      const dateB = new Date(b.day.split("/").reverse().join("-"));
      return dateA - dateB;
    });

    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DeviceOverallReport(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetch type",
        "DEVICE OVERALL STATUS",
        ""
      );
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `
        SELECT dm.Device_id, dm.Device_name, ds.endtime as downtime
        FROM devicerunningstatuslog ds
        JOIN devicemaster dm ON ds.Device_id = dm.Device_id
        WHERE ds.status IN (1, 5) AND ds.endtime IS NOT NULL AND DATE(ds.Row_updated_date) = ?
      `,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `
        SELECT dm.Device_id, dm.Device_name, ds.endtime as downtime
        FROM devicerunningstatuslog ds
        JOIN devicemaster dm ON ds.Device_id = dm.Device_id
        WHERE ds.status IN (1, 5) AND ds.endtime IS NOT NULL AND DATE(ds.Row_updated_date) BETWEEN ? AND ?
      `,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `
        SELECT dm.Device_id, dm.Device_name, ds.endtime as downtime
        FROM devicerunningstatuslog ds
        JOIN devicemaster dm ON ds.Device_id = dm.Device_id
        WHERE ds.status IN (1, 5) AND ds.endtime IS NOT NULL AND DATE(ds.Row_updated_date) BETWEEN ? AND ?
      `,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "DEVICE OVERALL STATUS"
      );
    }

    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const devices = {};

    // Process SQL results
    sql.forEach((row) => {
      const id = row.Device_id;
      const Name = row.Device_name;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!devices[id]) {
        devices[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        devices[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, deviceData] of Object.entries(devices)) {
      dateRange.forEach((date) => {
        if (!deviceData.downtimes[date]) {
          deviceData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: deviceData.Name,
          day: date,
          ...deviceData.downtimes[date],
        });
      });
    }

    // Sort downtimeReport by day
    downtimeReport.sort((a, b) => {
      const dateA = new Date(a.day.split("/").reverse().join("-"));
      const dateB = new Date(b.day.split("/").reverse().join("-"));
      return dateA - dateB;
    });

    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

// Helper function to generate date range
// function generateDateRange(startDate, endDate) {
//   const start = new Date(startDate);
//   const end = new Date(endDate);
//   const range = [];

//   while (start <= end) {
//     const formattedDate = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
//     range.push(formattedDate);
//     start.setDate(start.getDate() + 1);
//   }

//   return range;
// }
function generateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateArray = [];

  // Ensure we include the start date if it's the same as the end date
  if (startDate === endDate) {
    const day = String(start.getDate()).padStart(2, "0");
    const month = String(start.getMonth() + 1).padStart(2, "0");
    dateArray.push(`${day}/${month}`);
    return dateArray;
  }

  let currentDate = start;

  while (currentDate <= end) {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    dateArray.push(`${day}/${month}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateArray;
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AIOverallDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "AI MACHINE OVERALL STATUS",
        ""
      );
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `
        SELECT ai.Machine_name, am.machine_id, am.Action_time AS downtime 
        FROM aimachinestatus am 
        JOIN aisysmaster ai ON ai.machine_id = am.machine_id 
        WHERE am.Action_type = 0 AND DATE(am.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `
        SELECT ai.Machine_name, am.machine_id, am.Action_time AS downtime 
        FROM aimachinestatus am 
        JOIN aisysmaster ai ON ai.machine_id = am.machine_id 
        WHERE am.Action_type = 0 AND DATE(am.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `
        SELECT ai.Machine_name, am.machine_id, am.Action_time AS downtime 
        FROM aimachinestatus am 
        JOIN aisysmaster ai ON ai.machine_id = am.machine_id 
        WHERE am.Action_type = 0 AND DATE(am.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "AI MACHINE OVERALL STATUS"
      );
    }

    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const machines = {};

    // Process SQL results
    sql.forEach((row) => {
      const id = row.machine_id;
      const machineName = row.Machine_name;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!machines[id]) {
        machines[id] = { machineName, downtimes: {} };
      }

      if (dayFormatted) {
        machines[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, machineData] of Object.entries(machines)) {
      dateRange.forEach((date) => {
        if (!machineData.downtimes[date]) {
          machineData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: machineData.machineName,
          day: date,
          ...machineData.downtimes[date],
        });
      });
    }

    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function NotifyDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH NOTIFICATION SERVER DOWNTIME",
        ""
      );
    }

    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT notification_id, server_name, action_datetime AS downtime 
                            FROM notificationserverstatus 
                            WHERE action_type = 0 AND DATE(Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT notification_id, server_name, action_datetime AS downtime 
                            FROM notificationserverstatus 
                            WHERE action_type = 0 AND DATE(Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT notification_id, server_name, action_datetime AS downtime 
                            FROM notificationserverstatus 
                            WHERE action_type = 0 AND DATE(Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "NOTIFICATION OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const notifications = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.notification_id;
      const serverName = row.servername;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!notifications[id]) {
        notifications[id] = { serverName, downtimes: {} };
      }

      if (dayFormatted) {
        notifications[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, notificationData] of Object.entries(notifications)) {
      dateRange.forEach((date) => {
        if (!notificationData.downtimes[date]) {
          notificationData.downtimes[date] = {
            hour: 0,
            originalMin: 0,
            min: 0,
          };
        }
        downtimeReport.push({
          id,
          Name: notificationData.serverName,
          day: date,
          ...notificationData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DbDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH DATABASE SERVER DOWNTIME",
        ""
      );
    }

    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT ds.dbserver_id,dm.databaseservername ,ds.Action_time AS downtime 
                            FROM dbmachinestatus ds JOIN databasemaster dm on ds.dbserver_id = dm.database_id
                            WHERE ds.action_type = 0 AND DATE(ds.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ds.dbserver_id,dm.databaseservername ,ds.Action_time AS downtime 
                            FROM dbmachinestatus ds JOIN databasemaster dm on ds.dbserver_id = dm.database_id
                            WHERE ds.action_type = 0 AND DATE(ds.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ds.dbserver_id,dm.databaseservername ,ds.Action_time AS downtime 
                            FROM dbmachinestatus ds JOIN databasemaster dm on ds.dbserver_id = dm.database_id
                            WHERE ds.action_type = 0 AND DATE(ds.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "DATABASE OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const databases = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.dbserver_id;
      const Name = row.databaseservername;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!databases[id]) {
        databases[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        databases[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, dbData] of Object.entries(databases)) {
      dateRange.forEach((date) => {
        if (!dbData.downtimes[date]) {
          dbData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: dbData.Name,
          day: date,
          ...dbData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function LoadbalanceDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH LOAD BALANCER SERVER DOWNTIME",
        ""
      );
    }

    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT ls.lbserver_id,lb.loadbalancer_name, ls.Action_time AS downtime 
                            FROM loadbalancerstatus ls JOIN loadbalancermaster lb ON lb.loadbalancer_id = ls.lbserver_id
                            WHERE ls.action_type = 0 AND DATE(ls.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ls.lbserver_id,lb.loadbalancer_name, ls.Action_time AS downtime 
      FROM loadbalancerstatus ls JOIN loadbalancermaster lb ON lb.loadbalancer_id = ls.lbserver_id
      WHERE ls.action_type = 0 AND DATE(ls.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ls.lbserver_id,lb.loadbalancer_name, ls.Action_time AS downtime 
      FROM loadbalancerstatus ls JOIN loadbalancermaster lb ON lb.loadbalancer_id = ls.lbserver_id
      WHERE ls.action_type = 0 AND DATE(ls.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "LOAD BALANCER SERVER OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const Loadbalancers = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.lbserver_id;
      const Name = row.loadbalancer_name;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!Loadbalancers[id]) {
        Loadbalancers[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        Loadbalancers[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, lbData] of Object.entries(Loadbalancers)) {
      dateRange.forEach((date) => {
        if (!lbData.downtimes[date]) {
          lbData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: lbData.Name,
          day: date,
          ...lbData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ComServerDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH COMMUNICATION SERVER DOWNTIME",
        ""
      );
    }

    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT cs.comserver_id,cm.Server_name,cs.Action_time AS downtime 
                            FROM comserverstatus cs JOIN communicationserver cm ON cs.comserver_id = cm.comserver_id
                            WHERE cs.action_type = 0 AND DATE(cs.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT cs.comserver_id,cm.Server_name,cs.Action_time AS downtime 
      FROM comserverstatus cs JOIN communicationserver cm ON cs.comserver_id = cm.comserver_id
      WHERE cs.action_type = 0 AND DATE(cs.Row_updated_date)  BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT cs.comserver_id,cm.Server_name,cs.Action_time AS downtime 
      FROM comserverstatus cs JOIN communicationserver cm ON cs.comserver_id = cm.comserver_id
      WHERE cs.action_type = 0 AND DATE(cs.Row_updated_date)  BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "COMMUNICATION SERVER OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const Loadbalancers = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.comserver_id;
      const Name = row.Server_name;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!Loadbalancers[id]) {
        Loadbalancers[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        Loadbalancers[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, lbData] of Object.entries(Loadbalancers)) {
      dateRange.forEach((date) => {
        if (!lbData.downtimes[date]) {
          lbData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: lbData.Name,
          day: date,
          ...lbData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function WebServerDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH WEB SERVER DOWNTIME",
        ""
      );
    }

    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT ws.webserver_id,wm.webserver_name, ws.Action_time AS downtime 
                            FROM webserverstatus ws JOIN webservermaster wm ON ws.webserver_id = wm.webserver_id
                            WHERE ws.action_type = 0 AND DATE(ws.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ws.webserver_id,wm.webserver_name, ws.Action_time AS downtime 
      FROM webserverstatus ws JOIN webservermaster wm ON ws.webserver_id = wm.webserver_id
      WHERE ws.action_type = 0 AND DATE(ws.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ws.webserver_id,wm.webserver_name, ws.Action_time AS downtime 
      FROM webserverstatus ws JOIN webservermaster wm ON ws.webserver_id = wm.webserver_id
      WHERE ws.action_type = 0 AND DATE(ws.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "WEB SERVER OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const Webservers = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.webserver_id;
      const Name = row.webserver_name;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!Webservers[id]) {
        Webservers[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        Webservers[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, webData] of Object.entries(Webservers)) {
      dateRange.forEach((date) => {
        if (!webData.downtimes[date]) {
          webData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: webData.Name,
          day: date,
          ...webData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FileServerDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH FILE SERVER DOWNTIME",
        ""
      );
    }
    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT fs.fileserver_id,fm.storageservername,fs.Action_time AS downtime 
                            FROM fileserverstatus fs JOIN storagepathmaster fm ON fm.storagepath_id = fs.fileserver_id
                            WHERE fs.action_type = 0 AND DATE(fs.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT fs.fileserver_id,fm.storageservername,fs.Action_time AS downtime 
      FROM fileserverstatus fs JOIN storagepathmaster fm ON fm.storagepath_id = fs.fileserver_id
      WHERE fs.action_type = 0 AND DATE(fs.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT fs.fileserver_id,fm.storageservername,fs.Action_time AS downtime 
      FROM fileserverstatus fs JOIN storagepathmaster fm ON fm.storagepath_id = fs.fileserver_id
      WHERE fs.action_type = 0 AND DATE(fs.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "FILE SERVER OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const Fileservers = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.fileserver_id;
      const Name = row.storageservername;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!Fileservers[id]) {
        Fileservers[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        Fileservers[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, fileData] of Object.entries(Fileservers)) {
      dateRange.forEach((date) => {
        if (!fileData.downtimes[date]) {
          fileData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: fileData.Name,
          day: date,
          ...fileData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AppServerDowntime(graph) {
  try {
    if (!graph.hasOwnProperty("fetchtype")) {
      return helper.getErrorResponse(
        false,
        "Fetching type missing. Please provide the Fetching type",
        "FETCH APPLICATION SERVER DOWNTIME",
        ""
      );
    }
    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    let startDate;
    let startDateFormatted = formattedDate;
    let sql;

    if (graph.fetchtype === "daily") {
      sql = await db.query(
        `SELECT ass.appserver_id, am.applicationserver_name, ass.Action_time AS downtime 
      FROM appserverstatus ass 
      JOIN applicationservermaster am ON ass.appserver_id = am.applicationserver_id
      WHERE ass.action_type = 0 AND DATE(ass.Row_updated_date) = ?`,
        [formattedDate]
      );
    } else if (graph.fetchtype === "weekly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 6);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ass.appserver_id, am.applicationserver_name, ass.Action_time AS downtime 
      FROM appserverstatus ass 
      JOIN applicationservermaster am ON ass.appserver_id = am.applicationserver_id
      WHERE ass.action_type = 0 AND DATE(ass.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else if (graph.fetchtype === "monthly") {
      startDate = new Date(currentdate);
      startDate.setDate(currentdate.getDate() - 29);
      startDateFormatted = `${startDate.getFullYear()}-${String(
        startDate.getMonth() + 1
      ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      sql = await db.query(
        `SELECT ass.appserver_id, am.applicationserver_name, ass.Action_time AS downtime 
      FROM appserverstatus ass 
      JOIN applicationservermaster am ON ass.appserver_id = am.applicationserver_id
      WHERE ass.action_type = 0 AND DATE(ass.Row_updated_date) BETWEEN ? AND ?`,
        [startDateFormatted, formattedDate]
      );
    } else {
      return helper.getErrorResponse(
        false,
        "Invalid fetching type. Please provide a valid fetching type (daily, weekly, monthly).",
        "APPLICATION SERVER OVERALL STATUS"
      );
    }

    // Process the SQL result to format it as required
    const dateRange = generateDateRange(startDateFormatted, formattedDate);
    const Fileservers = {};
    // Process SQL results
    sql.forEach((row) => {
      const id = row.appserver_id;
      const Name = row.applicationserver_name;
      const downtimeDate = row.downtime ? new Date(row.downtime) : null;
      const dayFormatted = downtimeDate
        ? `${String(downtimeDate.getDate()).padStart(2, "0")}/${String(
            downtimeDate.getMonth() + 1
          ).padStart(2, "0")}`
        : null;
      const hours = downtimeDate ? downtimeDate.getHours() : 0;
      const minutes = downtimeDate ? downtimeDate.getMinutes() : 0;
      const dividedMinutes = downtimeDate ? Math.round(minutes / 6) : 0;

      if (!Fileservers[id]) {
        Fileservers[id] = { Name, downtimes: {} };
      }

      if (dayFormatted) {
        Fileservers[id].downtimes[dayFormatted] = {
          hour: hours,
          originalMin: minutes,
          min: dividedMinutes,
        };
      }
    });

    const downtimeReport = [];

    // Generate the complete report
    for (const [id, fileData] of Object.entries(Fileservers)) {
      dateRange.forEach((date) => {
        if (!fileData.downtimes[date]) {
          fileData.downtimes[date] = { hour: 0, originalMin: 0, min: 0 };
        }
        downtimeReport.push({
          id,
          Name: fileData.Name,
          day: date,
          ...fileData.downtimes[date],
        });
      });
    }
    return {
      code: true,
      message: "Downtime data fetched successfully",
      days: dateRange,
      downtime: downtimeReport,
      sql: sql,
    };
  } catch (er) {
    console.error(er);
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er,
      ""
    );
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DeviceBargraph(graph) {
  try {
    if (graph.hasOwnProperty("siteid") == false) {
      return helper.getErrorResponse(
        false,
        "Site id missing. Please provide the site id.",
        "GET DEVICE BAR GRAPH",
        ""
      );
    }
    // Fetching data for 1-hour intervals
    const motionDetectionCounts = await db.query(
      `
    SELECT
      CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
      IFNULL(EventCounts.motion_count, 0) AS motion_detection_count
    FROM
      (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
    LEFT JOIN
      (SELECT
        HOUR(Row_updated_date) AS hour,
        COUNT(event_id) AS motion_count
       FROM eventmaster
       WHERE (event_name LIKE 'Motion%' OR event_name LIKE 'Intr%')
       AND AnalyticSource_id IN(select Camera_id from cameramaster where Place IN(select Dept_id from deptmaster where Branch_id in(?))) 
       GROUP BY HOUR(Row_updated_date)) AS EventCounts
    ON Hours.hour = EventCounts.hour
    ORDER BY Hours.hour;
  `,
      [graph.siteid]
    );

    const deviceEventsCounts = await db.query(
      `
      SELECT
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(EventCounts.device_event_count, 0) AS device_event_count
      FROM
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN
        (SELECT
          HOUR(Row_updated_date) AS hour,
          COUNT(event_id) AS device_event_count
         FROM eventmaster
         WHERE Event_Name LIKE 'Tampering%' 
           OR Event_Name LIKE 'HDD%' 
           OR Event_Name LIKE '%FULL%' 
           OR Event_Name LIKE '%Device%'
           AND AnalyticSource_id IN(select Camera_id from cameramaster where Place IN(select Dept_id from deptmaster where Branch_id in(?))) 
         GROUP BY HOUR(Row_updated_date)) AS EventCounts
      ON Hours.hour = EventCounts.hour
      ORDER BY Hours.hour;
    `,
      [graph.siteid]
    );

    const videolossEventCounts = await db.query(
      `
      SELECT
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(EventCounts.videoloss_event_count, 0) AS videoloss_event_count
      FROM
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN
        (SELECT
          HOUR(Row_updated_date) AS hour,
          COUNT(event_id) AS videoloss_event_count
         FROM eventmaster
         WHERE Event_Name LIKE 'Video%' 
         AND AnalyticSource_id IN(select Camera_id from cameramaster where Place IN(select Dept_id from deptmaster where Branch_id in(?))) 
         GROUP BY HOUR(Row_updated_date)) AS EventCounts
      ON Hours.hour = EventCounts.hour
      ORDER BY Hours.hour;
    `,
      [graph.siteid]
    );

    // Fetching data for 4-hour intervals
    const motionDetectionCounts1 = await db.query(
      `
    SELECT
      CASE
        WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
        WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
        WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
        WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
        WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
        WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
      END AS time_range,
      COUNT(event_id) AS motion_detection_count
    FROM eventmaster
    WHERE (event_name LIKE 'Motion%' OR event_name LIKE 'Intr%')
      AND AnalyticSource_id IN (
        SELECT Camera_id FROM cameramaster WHERE Place IN (SELECT Dept_id  FROM deptmaster WHERE Branch_id = ?))
    GROUP BY time_range
    ORDER BY time_range;
  `,
      [graph.siteid]
    );

    const deviceEventsCounts1 = await db.query(
      `
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        COUNT(event_id) AS device_event_count
      FROM eventmaster
      WHERE (Event_Name LIKE 'Tampering%' 
         OR Event_Name LIKE 'HDD%' 
         OR Event_Name LIKE '%FULL%' 
         OR Event_Name LIKE '%Device%')
         AND AnalyticSource_id IN(select Camera_id from cameramaster where Place IN(select Dept_id from deptmaster where Branch_id in(?))) 
      GROUP BY time_range
      ORDER BY time_range;
    `,
      [graph.siteid]
    );

    const videolossEventCounts1 = await db.query(
      `
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        COUNT(event_id) AS videoloss_event_count
      FROM eventmaster
      WHERE (Event_Name LIKE 'Video%')
      AND AnalyticSource_id IN(select Camera_id from cameramaster where Place IN(select Dept_id from deptmaster where Branch_id in(?)))  
      GROUP BY time_range
      ORDER BY time_range;
    `,
      [graph.siteid]
    );

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        motion_detection_count: 0,
        device_event_count: 0,
        videoloss_event_count: 0,
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data
    motionDetectionCounts1.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.motion_detection_count = item.motion_detection_count;
      }
    });

    deviceEventsCounts1.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.device_event_count = item.device_event_count;
      }
    });

    videolossEventCounts1.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.videoloss_event_count = item.videoloss_event_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = motionDetectionCounts.map((motionEvent, index) => ({
      time_range: motionEvent.time_range,
      motion_detection_count: motionEvent.motion_detection_count,
      device_event_count: deviceEventsCounts[index]
        ? deviceEventsCounts[index].device_event_count
        : 0,
      videoloss_event_count: videolossEventCounts[index]
        ? videolossEventCounts[index].videoloss_event_count
        : 0,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AIBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        aimachinestatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM aimachinestatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function NotifyBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        notificationserverstatus a 
      ON 
        HOUR(a.Action_datetime) = Hours.hour AND a.Action_datetime >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM notificationserverstatus a 
      WHERE a.Action_datetime >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FileBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        fileserverstatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM fileserverstatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DbBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        dbmachinestatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM dbmachinestatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function LbBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        loadbalancerstatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM loadbalancerstatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function ComBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        comserverstatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM comserverstatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function WebBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        webserverstatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM webserverstatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function AppserverBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        appserverstatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM appserverstatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function FileServerBarGraph(graph) {
  try {
    // Fetching machine status data for 1-hour intervals
    const machineStatusCounts = await db.query(`
      SELECT 
        CONCAT(LPAD(Hours.hour, 2, '0'), ':00 to ', LPAD(Hours.hour + 1, 2, '0'), ':00') AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM 
        (SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS Hours
      LEFT JOIN 
        fileserverstatus a 
      ON 
        HOUR(a.Action_time) = Hours.hour AND a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY 
        Hours.hour
      ORDER BY 
        Hours.hour;
    `);

    // Fetching machine status data for 4-hour intervals
    const machineStatusCounts4H = await db.query(`
      SELECT
        CASE
          WHEN HOUR(Row_updated_date) BETWEEN 0 AND 3 THEN '00:00 to 04:00'
          WHEN HOUR(Row_updated_date) BETWEEN 4 AND 7 THEN '04:00 to 08:00'
          WHEN HOUR(Row_updated_date) BETWEEN 8 AND 11 THEN '08:00 to 12:00'
          WHEN HOUR(Row_updated_date) BETWEEN 12 AND 15 THEN '12:00 to 16:00'
          WHEN HOUR(Row_updated_date) BETWEEN 16 AND 19 THEN '16:00 to 20:00'
          WHEN HOUR(Row_updated_date) BETWEEN 20 AND 23 THEN '20:00 to 00:00'
        END AS time_range,
        IFNULL(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS total_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 1 THEN 1 ELSE 0 END), 0) AS online_count,
        IFNULL(SUM(CASE WHEN a.Action_type = 0 THEN 1 ELSE 0 END), 0) AS offline_count
      FROM fileserverstatus a 
      WHERE a.Action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY time_range
      ORDER BY time_range;
    `);

    // Define the predefined set of 4-hour intervals
    const predefinedIntervals = [
      "00:00 to 04:00",
      "04:00 to 08:00",
      "08:00 to 12:00",
      "12:00 to 16:00",
      "16:00 to 20:00",
      "20:00 to 00:00",
    ];

    // Initialize results with zero values
    const initializeResults = () => {
      return predefinedIntervals.map((interval) => ({
        time_range: interval,
        online_count: "0",
        offline_count: "0",
        total_count: "0",
      }));
    };

    // Create results map
    const resultsMap = initializeResults();

    // Update results map with actual data for 4-hour intervals
    machineStatusCounts4H.forEach((item) => {
      const interval = item.time_range;
      const result = resultsMap.find((r) => r.time_range === interval);
      if (result) {
        result.total_count = item.total_count;
        result.online_count = item.online_count;
        result.offline_count = item.offline_count;
      }
    });

    // Combine 1-hour interval results into a single JSON object by time_range
    const hourlyResults = machineStatusCounts.map((machineStatus, index) => ({
      time_range: machineStatus.time_range,
      online_count: machineStatus.online_count,
      offline_count: machineStatus.offline_count,
      total_count: machineStatus.total_count,
    }));

    return {
      code: true,
      message: "Graph data fetched successfully.",
      hourlyResults: hourlyResults,
      fourHourlyResults: resultsMap,
    };
  } catch (er) {
    console.log(er);
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DashBoardPercentage(graph) {
  try {
    // Fetch the counts of online and offline servers from the graphmaster table
    const result = await db.query(
      `SELECT SUM(onlineservers) as onlineCount, SUM(offlineservers) as offlineCount FROM graphmaster`
    );
    console.log(JSON.stringify(result));

    if (result.length > 0) {
      // Parse the string values to integers
      const onlineCount = parseInt(result[0].onlineCount, 10);
      const offlineCount = parseInt(result[0].offlineCount, 10);
      const totalServers = onlineCount + offlineCount;

      console.log(`online count ${onlineCount} offline count ${offlineCount}`);

      // Calculate percentages
      const onlinePercentage = (onlineCount / totalServers) * 100;
      const offlinePercentage = (offlineCount / totalServers) * 100;

      return {
        code: true,
        message: "Server percentages fetched successfully",
        totalServers: totalServers,
        runningPercentage: Math.round(onlinePercentage),
        stoppedPercentage: Math.round(offlinePercentage),
      };
    } else {
      return {
        code: false,
        message: "No data found in graphmaster",
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DashBoardBarGraph(graph) {
  try {
    // Fetch the counts of online and offline servers per server from the graphmaster table
    const result = await db.query(
      `SELECT graph_id,server_name,totalservers, onlineservers, offlineservers FROM graphmaster`
    );

    if (result.length > 0) {
      // Process each server's data
      const serverPercentages = result.map((server) => {
        const onlineCount = parseInt(server.onlineservers, 10);
        const offlineCount = parseInt(server.offlineservers, 10);
        const totalServers = onlineCount + offlineCount;

        if (totalServers === 0) {
          return {
            server_id: server.graph_id,
            servername: server.server_name,
            total_count: server.totalservers,
            online_count: 0,
            offline_count: 0,
          };
        }

        // Calculate percentages
        const onlinePercentage = (onlineCount / totalServers) * 100;
        const offlinePercentage = (offlineCount / totalServers) * 100;

        return {
          server_id: server.graph_id,
          servername: server.server_name,
          total_count: server.totalservers,
          online_count: Math.round(onlinePercentage),
          offline_count: Math.round(offlinePercentage),
        };
      });

      return {
        code: true,
        message: "Server percentages fetched successfully",
        serverPercentages: serverPercentages,
      };
    } else {
      return {
        code: false,
        message: "No data found in graphmaster",
      };
    }
  } catch (er) {
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: er,
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function DashBoardOverall(graph) {
  try {
    const currentdate = new Date();
    const year = currentdate.getFullYear();
    const month = String(currentdate.getMonth() + 1).padStart(2, "0");
    const day = String(currentdate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // Query the database for records with the current date
    const result = await db.query(
      `
      SELECT server_name, totalservers, onlineservers, offlineservers, laststarttime, laststoptime 
      FROM graphmaster 
      WHERE status = 1 AND DATE(laststoptime) = ?`,
      [formattedDate]
    );

    if (result.length > 0) {
      const downtimeReport = result.map((row, index) => {
        const lastStopTime = row.laststoptime
          ? new Date(row.laststoptime)
          : null;
        const dayFormatted = lastStopTime
          ? `${String(lastStopTime.getDate()).padStart(2, "0")}/${String(
              lastStopTime.getMonth() + 1
            ).padStart(2, "0")}`
          : null;

        return {
          id: index + 1, // Assuming you want an incrementing ID
          Name: row.server_name,
          day: dayFormatted,
          hour: lastStopTime ? lastStopTime.getHours() : 0,
          originalMin: lastStopTime ? lastStopTime.getMinutes() : 0,
          min: lastStopTime ? Math.round(lastStopTime.getMinutes() / 6) : 0,
        };
      });

      const days = downtimeReport.map((item) => item.day);

      return {
        code: true,
        message: "Downtime data fetched successfully",
        days: [...new Set(days)], // Unique list of days
        downtime: downtimeReport,
      };
    } else {
      return {
        code: false,
        message: "No data found for the current date.",
        days: [],
        downtime: [],
      };
    }
  } catch (er) {
    console.error("Error fetching data:", er);
    return {
      code: false,
      message: "An error occurred while fetching the dashboard data.",
      days: [],
      downtime: [],
    };
  }
}

//###################################################################################################################################################################################################
//###################################################################################################################################################################################################
//###################################################################################################################################################################################################

async function SystemInfo(graph) {
  try {
    exec("powershell.exe -File E:\\systeminfo.ps1", (error, stdout, stderr) => {
      if (error) {
        console.log(error);
        res.status(500).send(error.message);
        return;
      }
      if (stderr) {
        console.log(stderr);
        res.status(500).send(stderr);
        return;
      }
      console.log(JSON.parse(stdout));
      res.json(JSON.parse(stdout));
    });
  } catch (er) {
    console.log(er);
    return er;
  }
}

module.exports = {
  Sitesecondgraph,
  Sitethirdgraph,
  DeviceEventGraph,
  DatabaseFirst,
  AppServerStatus,
  WebserverStatus,
  AIserverStatus,
  ComServerStatus,
  LoadBalancerServer,
  NotifyServerStatus,
  FileServerStatus,
  DeviceControllerStatus,
  SiteControllerStatus,
  SiteDailyStatus,
  DeviceOverallReport,
  AIOverallDowntime,
  NotifyDowntime,
  DbDowntime,
  LoadbalanceDowntime,
  ComServerDowntime,
  WebServerDowntime,
  FileServerDowntime,
  AppServerDowntime,
  DeviceBargraph,
  AIBarGraph,
  NotifyBarGraph,
  FileBarGraph,
  DbBarGraph,
  LbBarGraph,
  ComBarGraph,
  WebBarGraph,
  AppserverBarGraph,
  FileServerBarGraph,
  DashBoardPercentage,
  DashBoardBarGraph,
  DashBoardOverall,
  SystemInfo,
};
