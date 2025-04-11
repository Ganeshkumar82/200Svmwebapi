const express = require('express');
const router = express.Router();
const graph = require('../services/graph');


//FETCH THE DATA FOR THE SITE CONTROLLER SECOND GRAPH
router.post('/sitesecond', async function(req,res,next){
    try{
      res.json(await graph.Sitesecondgraph(req.body));
    }catch(er){
       console.error(`Error while fetching the site controller second graph ${er.message}`);
       next(er);
    }
})

//FETCH THE DATA FOR THE SITE CONTROLLER THIRD GRAPH
router.post('/sitebargraph', async function(req,res,next){
    try{
      res.json(await graph.Sitethirdgraph(req.body));
    }catch(er){
       console.error(`Error while fetching the site controller thrd graph ${er.message}`);
       next(er);
    }
});

//FETCH THE DATA FOR THE SITE CONTROLLER THIRD GRAPH
router.post('/deviceevent', async function(req,res,next){
  try{
    res.json(await graph.DeviceEventGraph(req.body));
  }catch(er){
     console.error(`Error while fetching details of device events graph -> ${er.message}`);
     next(er);
  }
});

//FETCH THE DATABASE FOR THE DATABASE 
router.post('/dbrungraph',async function(req,res,next){
  try{
    res.json(await graph.DatabaseFirst(req.body));
  }catch(er){
    console.error(`Error while fetching the database first graph ->  ${er.message}`);
    next(er);
  }
});


//FETCH THE APPLICATION SERVER GRAPH
router.post('/appserverstatus', async function(req,res,next){
  try{
    res.json(await graph.AppServerStatus(req.body));
  }catch(er){
    console.error(`Error while fetching the Application server downtime percentage -> ${er.message}`);
    next(er);
  }
});

//FETCH THE WEBSERVER STATUS 
router.post('/webserverstatus', async function(req,res,next){
  try{
    res.json(await graph.WebserverStatus(req.body));
  }catch(er){
    console.error(`Error while fetch the running percentage of the web server -> ${er.message}`);
    next(er);
  }
});

//FETCH THE AI SYSTEM STATUS
router.post('/aiserverstatus', async function(req,res,next){
  try{
    res.json(await graph.AIserverStatus(req.body));
  }catch(er){
    console.error(`Error while fetch the running percentage of the AI server -> ${er.message}`);
    next(er);
  }
});

//FETCH THE COMMUNICATION SERVER STATUS
router.post('/comserverstatus', async function(req,res,next){
  try{
    res.json(await graph.ComServerStatus(req.body));
  }catch(er){
    console.error(`Error while fetch the running percentage of the communication server -> ${er.message}`);
    next(er);
  }
});

//FETCH THE LOAD BALANCER SERVER STATUS
router.post('/loadbalancerstatus', async function(req,res,next){
   try{
      res.json(await graph.LoadBalancerServer(req.body));
   }catch(er){
      console.error(`Error while fetching the running percentage of the communication server -> ${er.message}`);
      next(er);
   }
});

//FETCH THE NOTIFICATION SERVER STATUS
router.post('/notifyserverstatus' , async function(req,res,next){
  try{
     res.json(await graph.NotifyServerStatus(req.body));
  }catch(er){
     console.error(`Error while fetching the running status of the Notification server -> ${er.message}`);
     next(er);
  }
});

//FETCH THE FILE SERVER STATUS 
router.post('/fileserverstatus', async function(req,res,next){
  try{
    res.json(await graph.FileServerStatus(req.body));
  }catch(er){
    console.error(`Error while fetching the running status of the File server status -> ${er.message}`);
    next(er);
  }
});


//FETCH THE DEVICE CONTROLLER STATUS
router.post('/devicecontrollerstatus', async function(req,res,next){
  try{
    res.json(await graph.DeviceControllerStatus(req.body));
  }catch(er){
    console.error(`Error while fetching the running status of the File server status -> ${er.message}`);
    next(er);
  }
}); 

//FETCH THE DEVICE CONTROLLER STATUS
router.post('/sitecontrollerstatus', async function(req,res,next){
  try{
    res.json(await graph.SiteControllerStatus(req.body));
  }catch(er){
    console.error(`Error while fetching the running status of the File server status -> ${er.message}`);
    next(er);
  }
}); 

//FETCH THE SITE OVERALL REPORT
router.post('/siteoverallstatus', async function(req,res,next){
  try{
     res.json(await graph.SiteDailyStatus(req.body));
  }catch(er){
    console.error(`Error while fetching the overall status of the site -> ${er.message}`);
    next(er);
  }
 });

//FETCH THE DEVICE OVERALL REPORT
router.post('/deviceoverallstatus', async function(req,res,next){
  try{
    res.json(await graph.DeviceOverallReport(req.body));
  }catch(er){
     console.error(`Error while fetching the overall downtime status of the device -> ${er.message}`);
     next(er);
  }
});

//FETCH THE AI MACHINE OVERALL REPORT
router.post('/aioveralldowntime', async function(req,res,next){
  try{
     res.json(await graph.AIOverallDowntime(req.body));
  }catch(er){
     console.error(`Error while fetching the overall downtime status of the AI machine -> ${er.message}`);
     next(er);
  }
});

//FETCH THE NOTIFICATION OVERALL DOWNTIME STATUS
router.post('/notifydowntime', async function(req,res,next){
  try{
     res.json(await graph.NotifyDowntime(req.body));
  }catch(er){
     console.error(`Error while fetching the overall downtime status of the Notification server -> ${er.message}`);
     next(er);
  }
});

//FETCH THE DATABASE SERVER OVERALL DOWNTIME STATUS
router.post('/dbdowntime', async function(req,res,next){
  try{
    res.json(await graph.DbDowntime(req.body));
  }catch(er){
    console.error(`Error while ffetching the overall Database downtime status of the Notification server -> ${er.message}`);
    next(er);
  }
});

//FETCH THE LOAD BALANCER SERVER OVERALL DOWNTIME STATUS
router.post('/lbdowntime', async function(req,res,next){
  try{
    res.json(await graph.LoadbalanceDowntime(req.body));
  }catch(er){
    console.error(`Error while fetching the overall Load balancer downtime status of the load balancer server -> ${er.message}`);
    next(er);
  }
});


//FETCH THE COMMUNICATION SERVER SERVER OVERALL DOWNTIME STATUS
router.post('/comserverdowntime', async function(req,res,next){
  try{
    res.json(await graph.ComServerDowntime(req.body));
  }catch(er){
    console.error(`Error while fetching the overall communication server downtime status of the communication server -> ${er.message}`);
    next(er);
  }
});

//FETCH THE WEBSERVER OVERALL DOWNTIME STATUS
router.post('/webserverdowntime', async function(req,res,next){
  try{
    res.json(await graph.WebServerDowntime(req.body));
  }catch(er){
    console.error(`Error while fetching the overall Web server downtime status of the web server -> ${er.message}`);
    next(er);
  }
});

// FETCH THE FILE SERVER OVERALL DOWNTIME STATUS
router.post('/fileserverdowntime', async function(req,res,next){
  try{
    res.json(await graph.FileServerDowntime(req.body));
  }catch(er){
    console.error(`Error while fetching the overall File server downtime status of the file server -> ${er.message}`);
    next(er);
  }
});


// FETCH THE APP SERVER OVERALL DOWNTIME STATUS
router.post('/appserverdowntime', async function(req,res,next){
  try{
    res.json(await graph.AppServerDowntime(req.body));
  }catch(er){
    console.error(`Error while fetching the overall App server downtime status of the applicatiob server -> ${er.message}`);
    next(er);
  }
});

//FETCH THE DATA FOR THE DEVICE CONTROLLER THIRD GRAPH
router.post('/devicebargraph', async function(req,res,next){
  try{
    res.json(await graph.DeviceBargraph(req.body));
  }catch(er){
     console.error(`Error while fetching the device controller bar graph ${er.message}`);
     next(er);
  }
});

//FETCH THE DATA FOR THE AI MACHINE DOWNTIME/UPTIME STATUS
router.post('/aibargraph',async function(req,res,next){
 try{
  res.json(await graph.AIBarGraph(req.body));
 }catch(er){
  console.error(`Error while fetching the AI bar graph detail -> ${er.message}`);
  next(er);
 }
});



//FETCH THE DATA FOR THE AI MACHINE DOWNTIME/UPTIME STATUS
router.post('/notifybargraph',async function(req,res,next){
  try{
   res.json(await graph.NotifyBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Notification server bar graph detail -> ${er.message}`);
   next(er);
  }
 });

 
//FETCH THE DATA FOR THE AI MACHINE DOWNTIME/UPTIME STATUS
router.post('/filebargraph',async function(req,res,next){
  try{
   res.json(await graph.FileBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the File server bar graph detail -> ${er.message}`);
   next(er);
  }
 });


//FETCH THE DATA FOR THE DATABASE DOWNTIME/UPTIME STATUS
router.post('/dbbargraph',async function(req,res,next){
  try{
   res.json(await graph.DbBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Database server bar graph detail -> ${er.message}`);
   next(er);
  }
 });

//FETCH THE DATA FOR THE LOAD BALANCER SERVER DOWNTIME/UPTIME STATUS
router.post('/lbbargraph',async function(req,res,next){
  try{
   res.json(await graph.LbBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Load balancer server bar graph detail -> ${er.message}`);
   next(er);
  }
 });

 
//FETCH THE DATA FOR THE DATABASE DOWNTIME/UPTIME STATUS
router.post('/combargraph',async function(req,res,next){
  try{
   res.json(await graph.ComBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Communication server bar graph detail -> ${er.message}`);
   next(er);
  }
 });

//FETCH THE DATA FOR THE WEB SERVER DOWNTIME/UPTIME STATUS
router.post('/webbargraph',async function(req,res,next){
  try{
   res.json(await graph.WebBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Web server bar graph detail -> ${er.message}`);
   next(er);
  }
 });

//FETCH THE DATA FOR THE WEB SERVER DOWNTIME/UPTIME STATUS
router.post('/appbargraph',async function(req,res,next){
  try{
   res.json(await graph.AppserverBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Application server bar graph detail -> ${er.message}`);
   next(er);
  }
});

//FETCH THE DATA FOR THE WEB SERVER DOWNTIME/UPTIME STATUS
router.post('/filebargraph',async function(req,res,next){
  try{
   res.json(await graph.FileServerBarGraph(req.body));
  }catch(er){
   console.error(`Error while fetching the Application server bar graph detail -> ${er.message}`);
   next(er);
  }
});

//FETCH THE DATA FOR THE DASHBOARD DOWNTIME/UPTIME PERCENTAGE GRAPH
router.post('/dashboardpercentage',async function(req,res,next){
  try{
   res.json(await graph.DashBoardPercentage(req.body));
  }catch(er){
   console.error(`Error while fetching the Dashboard percentage graph detail -> ${er.message}`);
   next(er);
  }
});

//FETCH THE DASHBOARD UPTIME/DOWNTIME BAR GRAPH

router.post('/dashboardbargraph', async function(req,res,next){
 try{
   res.json(await graph.DashBoardBarGraph(req.body));
 }catch(er){
   console.error(`Error while fetching the Dashboard bar graph detail -> ${er.message}`);
   next(er);
 }
});

//FETCH THE DASHBOARD DOWNTIME GRAPH

router.post('/dashboardoverall', async function(req,res,next){
  try{
    res.json(await graph.DashBoardOverall(req.body));
  }catch(er){
    console.error(`Error while fetching the details for the dashboard overall status -> ${er.message}`);
    next(er);
  }
});

router.post('/systeminfo', async function(req,res,next){
  try{
    res.json(await graph.SystemInfo(req.body));
  }catch(er){
    console.error(`Error while fetching the System information -> ${er.message}`);
    next(er);
  }
});
module.exports = router;