const express = require("express");
const router = express.Router();
const admin = require("../services/admin");

/* 1. POST generate customer invoice for SITE/COMPANY/CONSOLIDATED */
router.post("/customerinvoice", async function (req, res, next) {
  try {
    res.json(await admin.genCustomerSiteInvoice(req.body));
  } catch (err) {
    console.error(`Error while generating customer invoice`, err.message);
    next(err);
  }
});

// /* 2. POST customer add company data */
// router.post('/addcompany', async function(req, res, next) {
//   try {
//     res.json(await admin.addcompany(req.body));
//   } catch (err) {
//     console.error(`Error while creating company`, err.message);
//     next(err);
//   }
// });

/* 3. POST customer add company site data */
router.post("/addsite", async function (req, res, next) {
  try {
    res.json(await admin.addcompanysite(req.body));
  } catch (err) {
    console.error(`Error while creating site`, err.message);
    next(err);
  }
});

/* 4. POST customer add company site data */
router.post("/addsubscription", async function (req, res, next) {
  try {
    res.json(await admin.newsubscription(req.body));
  } catch (err) {
    console.error(
      `Error while creating customer new subscription`,
      err.message
    );
    next(err);
  }
});

/* 5. POST customer invoice payment data */
router.post("/customerpayments", async function (req, res, next) {
  try {
    res.json(await admin.createcustomerpayment(req.body));
  } catch (err) {
    console.error(`Error while creating customer new payments`, err.message);
    next(err);
  }
});

/* 5. POST customer add site data to new packages */
router.post("/addcssubs", async function (req, res, next) {
  try {
    res.json(await admin.addsubscriptionbilling(req.body));
  } catch (err) {
    console.error(
      `Error while creating customer new subscription`,
      err.message
    );
    next(err);
  }
});

/* PUT dept data */
router.put("/", async function (req, res, next) {
  try {
    //res.json(await dept.update(req.body));
  } catch (err) {
    console.error(`Error while updating department`, err.message);
    next(err);
  }
});

/* Delete department data */
router.delete("/", async function (req, res, next) {
  try {
    // res.json(await dept.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting department data`, err.message);
    next(err);
  }
});

/* Get department data */
router.get("/", async function (req, res, next) {
  try {
    //res.json(await dept.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching department list`, err.message);
    next(err);
  }
});

//Get the number of site list
router.post("/totalsite", async function (req, res, next) {
  try {
    res.json(await admin.getTotalSite(req.body));
  } catch (err) {
    console.error(
      "Error while fetching the total number of sites",
      err.message
    );
    next(err);
  }
});

//Get the name and number of camera for the site list
router.post("/noofcamera", async function (req, res, next) {
  try {
    res.json(await admin.getNoofCamera(req.query.page, req.body));
  } catch (err) {
    console.error(
      "Error while fetching the No of cameras for each site",
      err.message
    );
    next(err);
  }
});

//Get the name and number of camera for the site list
router.post("/totalevents", async function (req, res, next) {
  try {
    res.json(await admin.getTotalEvents(req.query.page, req.body));
  } catch (err) {
    console.error(
      "Error while fetching the Total Number of Events",
      err.message
    );
    next(err);
  }
});

//FILTER THE DEVICE EVENT LIST
router.post("/criticalevent", async function (req, res, next) {
  try {
    res.json(await admin.getCritEvent(req.query.page, req.body));
  } catch (err) {
    console.error("Error while filtering the device event", err.message);
    next(err);
  }
});

//Get the number of site list
router.post("/totaldevice", async function (req, res, next) {
  try {
    res.json(await admin.getTotalDevice(req.body));
  } catch (err) {
    console.error(
      "Error while fetching the total number of device",
      err.message
    );
    next(err);
  }
});

//Get the name and number of device for the site list
router.post("/noofdevice", async function (req, res, next) {
  try {
    res.json(await admin.getNoofDevice(req.query.page, req.body));
  } catch (err) {
    console.error(
      "Error while fetching the No of device for each site",
      err.message
    );
    next(err);
  }
});

//Get the name and number of speakers for the site list
router.post("/noofspeakers", async function (req, res, next) {
  try {
    res.json(await admin.getNoofSpeakers(req.query.page, req.body));
  } catch (err) {
    console.error(
      "Error while fetching the No of speakers for each site",
      err.message
    );
    next(err);
  }
});

//Genrate the api key
router.post("/apikey", async function (req, res, next) {
  try {
    res.json(await admin.ApikeyGeneration(req.body));
  } catch (err) {
    console.error("Error while generating the api key", err.message);
    next(err);
  }
});

//FILTER THE RECENT WHATASAPP LOG EVENT LIST
router.post("/realevent", async function (req, res, next) {
  try {
    res.json(await admin.getRealEvent(req.query.page, req.body));
  } catch (err) {
    console.error("Error while filtering the real event", err.message);
    next(err);
  }
});

//7. Add a new company site to the customer
router.post("/addsite", async function (req, res, next) {
  try {
    res.json(await admin.addcompanysite(req.body));
  } catch (err) {
    console.error(`Error while adding the new site`, err.message);
    next(err);
  }
});

//7. Add a new company site to the customer
router.post("/addconfig", async function (req, res, next) {
  try {
    res.json(await admin.addsiteconfig(req.body));
  } catch (err) {
    console.error(
      `Error while adding the config file to the site controller`,
      err.message
    );
    next(err);
  }
});

//Using the server connect to the device and fetch the device details
router.post("/deviceinfo", async function (req, res, next) {
  try {
    res.json(await admin.getDeviceinfo(req.body));
  } catch (err) {
    console.error(`Error while fetching the device information`, err.message);
    next(err);
  }
});

//Using the server connect to the device and fetch the device details
router.post("/updatedevice", async function (req, res, next) {
  try {
    res.json(await admin.UpdateDevice(req.body));
  } catch (err) {
    console.error(`Error while Updating the device information`, err.message);
    next(err);
  }
});

//Using the server connect to the device and fetch the device details
router.post("/sitelist", async function (req, res, next) {
  try {
    res.json(await admin.getsitelist(req.body));
  } catch (err) {
    console.error(`Error while fetching the site list`, err.message);
    next(err);
  }
});

//Using the server connect to the device and fetch the device details
router.post("/sitepath", async function (req, res, next) {
  try {
    res.json(await admin.getsitepath(req.body));
  } catch (err) {
    console.error(`Error while fetching the site path`, err.message);
    next(err);
  }
});

//Fetch the device list of the each site.
router.post("/devicelist", async function (req, res, next) {
  try {
    res.json(await admin.getdevicelist(req.body));
  } catch (err) {
    console.error(`Error while fetching the device list`, err.message);
    next(err);
  }
});

//Fetch the site controller status
router.post("/sitestatus", async function (req, res, next) {
  try {
    res.json(await admin.SiteStatus(req.body));
  } catch (er) {
    console.error(`Error while fetching the site status`, er.message);
    next(er);
  }
});

//Fetch the device status of the site controller
router.post("/devicestatus", async function (req, res, next) {
  try {
    res.json(await admin.DeviceStatus(req.body));
  } catch (er) {
    console.error(`Error while Fetching the Device Status ${er.message}`);
    next(er);
  }
});

//Fetch the device status of the site controller
router.post("/dblist", async function (req, res, next) {
  try {
    res.json(await admin.Dblist(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the Available database list ${er.message}`
    );
    next(er);
  }
});

//Fetch the device status of the site controller
router.post("/configpaths", async function (req, res, next) {
  try {
    res.json(await admin.Fetchconfigpath(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the Available Paths for the storage ${er.message}`
    );
    next(er);
  }
});

//Fetch the Storage path  of the site controllerFetchloadbalancerserver
router.post("/storagepath", async function (req, res, next) {
  try {
    res.json(await admin.StoragePath(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the Available Paths for the storage ${er.message}`
    );
    next(er);
  }
});

//Fetch the Storage path  of the site controller
router.post("/sitemodify", async function (req, res, next) {
  try {
    res.json(await admin.SiteModify(req.body));
  } catch (er) {
    console.error(
      `Error while Modifying the Site status like activate/deactivate/delete ${er.message}`
    );
    next(er);
  }
});
//Fetch the Storage path  of the site controller
router.post("/devicemodify", async function (req, res, next) {
  try {
    res.json(await admin.DeviceModify(req.body));
  } catch (er) {
    console.error(
      `Error while Modifying the Device status like activate/deactivate/delete ${er.message}`
    );
    next(er);
  }
});

//USED TO UPDATE SITE INFORMATION
router.post("/updatesite", async function (req, res, next) {
  try {
    res.json(await admin.UpdateSite(req.body));
  } catch (er) {
    console.error(
      `Error while Updating the site Info for Site controller ${er.message}`
    );
    next(er);
  }
});

//FETCH THE ORGANIZATION LIST
router.post("/organization", async function (req, res, next) {
  try {
    res.json(await admin.OrganizationList(req.body));
  } catch (er) {
    console.error(`Error while Fetching the Organization list ${er.message}`);
    next(er);
  }
});

//FETCH THE COMPANY LIST
router.post("/companylist", async function (req, res, next) {
  try {
    res.json(await admin.Companylist(req.body));
  } catch (er) {
    console.error(`Error while Fetching the company list ${er.message}`);
    next(er);
  }
});
//FETCH THE COMPANY LIST
router.post("/individuallist", async function (req, res, next) {
  try {
    res.json(await admin.Individuallist(req.body));
  } catch (er) {
    console.error(`Error while Fetching the Individual list ${er.message}`);
    next(er);
  }
});

//FETCH THE COMPANY LIST
router.post("/demolist", async function (req, res, next) {
  try {
    res.json(await admin.DemoList(req.body));
  } catch (er) {
    console.error(`Error while Fetching the Demo list ${er.message}`);
    next(er);
  }
});

//FETCH THE COMPANY LIST
router.post("/addindividual", async function (req, res, next) {
  try {
    res.json(await admin.AddIndividual(req.body));
  } catch (er) {
    console.error(`Error while adding the Individual list ${er.message}`);
    next(er);
  }
});

//FETCH THE SDKBRAND LIST
router.post("/sdklist", async function (req, res, next) {
  try {
    res.json(await admin.Sdklist(req.body));
  } catch (er) {
    console.error(`Error while Fetching the sdk list ${er.message}`);
    next(er);
  }
});

//ADD/UPDATE COMPANY OF THE CUSTOMER
router.post("/addcompany", async function (req, res, next) {
  try {
    res.json(await admin.AddUpdatecompany(req.body));
  } catch (er) {
    console.error(`Error while Fetching the site list ${er.message}`);
    next(er);
  }
});

//ADD NEW ORGANIZATION TO THE CUSTOMER
router.post("/addorganization", async function (req, res, next) {
  try {
    res.json(await admin.AddOrganization(req.body));
  } catch (er) {
    console.error(`Error while Adding the Organization ${er.message}`);
    next(er);
  }
});

//ADD NEW ORGANIZATION TO THE CUSTOMER
router.post("/cameralist", async function (req, res, next) {
  try {
    res.json(await admin.cameralist(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the camera list of the device. ${er.message}`
    );
    next(er);
  }
});

//CAMERA SEVERITY ADD
router.post("/cameraseverity", async function (req, res, next) {
  try {
    res.json(await admin.CameraSeverity(req.body));
  } catch (er) {
    console.error(
      `Error while adding the Camera Severity of the site -> ${er.message}`
    );
    next(er);
  }
});

//CAMERA ACTIVATE
router.post("/cameraactivate", async function (req, res, next) {
  try {
    res.json(await admin.CameraActivate(req.body));
  } catch (er) {
    console.error(`Error while activating the camera. ${er.message}`);
    next(er);
  }
});

//CAMERA DEACTIVATE
router.post("/cameradeactivate", async function (req, res, next) {
  try {
    res.json(await admin.CameraDeactivate(req.body));
  } catch (er) {
    console.error(`Error while deactivating the camera. ${er.message}`);
    next(er);
  }
});

//ADD CUSTOMER SUBSCRIPTION
router.post("/addcussub", async function (req, res, next) {
  try {
    res.json(await admin.addCustomerSubscription(req.body));
  } catch (er) {
    console.error(`Error while adding Customer subscription. ${er.message}`);
    next(er);
  }
});

router.post("/getsitesub", async function (req, res, next) {
  try {
    res.json(await admin.GetSiteSub(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the subscription details of the site -> ${er.message}`
    );
    next(er);
  }
});

//GET CUSTOMER SUBSCRIPTION
router.post("/getsubscription", async function (req, res, next) {
  try {
    res.json(await admin.GetSubscriptionlist(req.body));
  } catch (er) {
    console.error(
      `Error while the fetching the subscription list. ${er.message}`
    );
    next(er);
  }
});

//ADD EMERGENCY CONTACT
router.post("/addcontact", async function (req, res, next) {
  try {
    res.json(await admin.Addcontact(req.body));
  } catch (er) {
    console.error(`Error while adding the contact list -> ${er.message}`);
    next(er);
  }
});

//ADD EMEGENCY SERVICE
router.post("/emergencyservice", async function (req, res, next) {
  try {
    res.json(await admin.Emergencyservice(req.body));
  } catch (er) {
    console.error(`Error while adding the emergency service -> ${er.message}`);
    next(er);
  }
});

//FETCH THE SITE CONTROLLER GRAPH DATA
router.post("/sitegraph", async function (req, res, next) {
  try {
    res.json(await admin.SiteGraph(req.body));
  } catch (er) {
    console.error(`Error while fetching the graph -> ${er.message}`);
    next(er);
  }
});

//ADD INDIVIDUAL LIST
router.post("/fetchcustomerlist", async function (req, res, next) {
  try {
    res.json(await admin.FetchCustomerlist(req.body));
  } catch (er) {
    console.error(`Error while adding the individual -> ${er.message}`);
    next(er);
  }
});

//FETCH SITE LIST
router.post("/site", async function (req, res, next) {
  try {
    res.json(await admin.Sitelist(req.body));
  } catch (er) {
    console.error(`Error while Fetching the site list -> ${er.message}`);
    next(er);
  }
});

//FETCH THE SITE GRAPH
router.post("/addregion", async function (req, res, next) {
  try {
    res.json(await admin.AddRegion(req.body));
  } catch (er) {
    console.error(`Error while adding the config region -> ${er.message}`);
    next(er);
  }
});

//FETCH THE SITE GRAPH
router.post("/getnotificationserver", async function (req, res, next) {
  try {
    res.json(await admin.GetNotificationServer(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the notification server list. -> ${er.message}`
    );
    next(er);
  }
});

//FETCH THE SITE GRAPH
router.post("/addnotificationserver", async function (req, res, next) {
  try {
    res.json(await admin.addnotificationserver(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the notification server list. -> ${er.message}`
    );
    next(er);
  }
});
//FETCH THE SITE GRAPH
router.post("/updatenotificationserver", async function (req, res, next) {
  try {
    res.json(await admin.UpdateNotificationserver(req.body));
  } catch (er) {
    console.error(
      `Error while updating the notification server list. -> ${er.message}`
    );
    next(er);
  }
});

//FETCH THE DEVICESDK INFORMATION
router.post("/devicedetails", async function (req, res, next) {
  try {
    res.json(await admin.getDeviceDetails(req.body));
  } catch (er) {
    console.error(`Error while fetching the device details. -> ${er.message}`);
    next(er);
  }
});

//ADD THE AISYSTEM MASTER
router.post("/aimachine", async function (req, res, next) {
  try {
    res.json(await admin.AddAIMachine(req.body));
  } catch (er) {
    console.error(`Error while adding the AI machine -> ${er.message}`);
    next(er);
  }
});

//ADD THE PRE PROCESSOR ADD
router.post("/preprocessoradd", async function (req, res, next) {
  try {
    res.json(await admin.AddPreProcessor(req.body));
  } catch (er) {
    console.error(`Error while adding the Pre processor -> ${er.message}`);
    next(er);
  }
});

//ADD THE POST PROCESSOR ADD
router.post("/postprocessoradd", async function (req, res, next) {
  try {
    res.json(await admin.AddPostProcessor(req.body));
  } catch (er) {
    console.error(`Error while adding the Post processor -> ${er.message}`);
    next(er);
  }
});

//GET THE AI MACHINE LIST
router.post("/getaimachine", async function (req, res, next) {
  try {
    res.json(await admin.GetAImachine(req.body));
  } catch (er) {
    console.error(`Error while fetching the AI machine path -> ${er.message}`);
    next(er);
  }
});

//GET THE AI MACHINE PROCESS ID
router.post("/getaimachineprocess", async function (req, res, next) {
  try {
    res.json(await admin.GetAImachineProcess(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the AI machine process id -> ${er.message}`
    );
    next(er);
  }
});

//GET THE AI MACHINE LIST
router.post("/updateaimachine", async function (req, res, next) {
  try {
    res.json(await admin.UpdateAImachine(req.body));
  } catch (er) {
    console.error(`Error while updating the AI machine path -> ${er.message}`);
    next(er);
  }
});
//UPDATE THE PRE PROCESSOR MACHINE LIST
router.post("/updatepreprocessor", async function (req, res, next) {
  try {
    res.json(await admin.UpdatePreProcessor(req.body));
  } catch (er) {
    console.error(
      `Error while updating the Pre processor engine-> ${er.message}`
    );
    next(er);
  }
});

//UPDATE THE POST PROCESSOR MACHINE LIST
router.post("/updatepostprocessor", async function (req, res, next) {
  try {
    res.json(await admin.UpdatePostProcessor(req.body));
  } catch (er) {
    console.error(
      `Error while updating the Post processor engine-> ${er.message}`
    );
    next(er);
  }
});

//UPDATE THE POST PROCESSOR MACHINE LIST
router.post("/deleteaimachine", async function (req, res, next) {
  try {
    res.json(await admin.DeleteAImachine(req.body));
  } catch (er) {
    console.error(`Error while deleting the AI machine-> ${er.message}`);
    next(er);
  }
});

//ADD THE STORAGE SERVER PATH
router.post("/addstorageserver", async function (req, res, next) {
  try {
    res.json(await admin.AddStorageServer(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the Add storage server -> ${er.message}`
    );
    next(er);
  }
});

//FETCH THE ALL AVAILABLE STORAGE PATH
router.post("/fetchstoragepath", async function (req, res, next) {
  try {
    res.json(await admin.Fetchstoragepath(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the available storage server -> ${er.message}`
    );
    next(er);
  }
});

router.post("/adddatabaseserver", async function (req, res, next) {
  try {
    res.json(await admin.AddDatabaseserver(req.body));
  } catch (er) {
    console.error(`Error while adding the database server -> ${er.message}`);
    next(er);
  }
});

router.post("/fetchdatabaseserver", async function (req, res, next) {
  try {
    res.json(await admin.FetchDatabaseServer(req.body));
  } catch (er) {
    console.error(`Error while adding the database server. -> ${er.message}`);
    next(er);
  }
});

//ADD APPLICATION SERVER
router.post("/addapplicationserver", async function (req, res, next) {
  try {
    res.json(await admin.AddApplicationserver(req.body));
  } catch (er) {
    console.error(`Error while adding the application server -> ${er.message}`);
    next(er);
  }
});

//FETCH ALL THE AVAILABLE APPLCIATION SERVER.
router.post("/fetchapplicationserver", async function (req, res, next) {
  try {
    res.json(await admin.FetchApplicationserver(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the application server -> ${er.message}`
    );
    next(er);
  }
});

//MODIFY THE STORAGE SERVER
router.post("/modifystorageserver", async function (req, res, next) {
  try {
    res.json(await admin.Updatestorageserver(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the application server -> ${er.message}`
    );
    next(er);
  }
});

//UPDATE THE APPLICATION SERVER
router.post("/updateapplicationserver", async function (req, res, next) {
  try {
    res.json(await admin.UpdateApplicationserver(req.body));
  } catch (er) {
    console.error(
      `Error while updating the application server -> ${er.message}`
    );
    next(er);
  }
});

//UPDATE THE DATABASE MASTER
router.post("/updatedatabaseserver", async function (req, res, next) {
  try {
    res.json(await admin.UpdateDatabaseserver(req.body));
  } catch (er) {
    console.error(`Error while updating the database server -> ${er.message}`);
    next(er);
  }
});

//ADD THE NEW WEB SERVER TO THE DATABASE
router.post("/addwebserver", async function (req, res, next) {
  try {
    res.json(await admin.Addwebserver(req.body));
  } catch (er) {
    console.error(`Error while adding the web server -> ${er.message}`);
    next(er);
  }
});

// FETCH THE WEB SERVER OF THE DATABASE
router.post("/fetchwebserver", async function (req, res, next) {
  try {
    res.json(await admin.Fetchwebserver(req.body));
  } catch (er) {
    console.error(`Error while Fetching the web server -> ${er.message}`);
    next(er);
  }
});

//UPDATE THE WEB SERVER
router.post("/updatewebserver", async function (req, res, next) {
  try {
    res.json(await admin.Updatewebserver(req.body));
  } catch (er) {
    console.error(`Error while Updating the web server -> ${er.message}`);
    next(er);
  }
});
//FETCH THE SITE LIST FOR SITE EXPORT
router.post("/exportsite", async function (req, res, next) {
  try {
    res.json(await admin.ExportSite(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the site for exporting -> ${er.message}`
    );
    next(er);
  }
});

//ADD ANALYTIC FILTER
router.post("/camerasnapshot", async function (req, res, next) {
  try {
    res.json(await admin.Takecamerasnapshot(req.body));
  } catch (er) {
    console.error(
      `Error while taking the snapshot for the camera id > ${er.message}`
    );
    next(er);
  }
});

//UPDATE DEVICE START STATUS
router.post("/devicestart", async function (req, res, next) {
  try {
    res.json(await admin.UpdateDeviceStart(req.body));
  } catch (er) {
    console.error(`Error while updating the device status -> ${er.message}`);
    next(er);
  }
});

//UPDATE DEVICE STOP STATUS
router.post("/devicestop", async function (req, res, next) {
  try {
    res.json(await admin.UpdateDeviceStop(req.body));
  } catch (er) {
    console.error(
      `Error while updating the site controller status -> ${er.message}`
    );
    next(er);
  }
});

//UPDATE DEVICE STOP STATUS
router.post("/devicestartstop", async function (req, res, next) {
  try {
    res.json(await admin.UpdateDeviceStartStop(req.body));
  } catch (er) {
    console.error(
      `Error while updating the site controller status -> ${er.message}`
    );
    next(er);
  }
});

//UPDATE SITE CONTROLLER START STATUS
router.post("/updatesitestatus", async function (req, res, next) {
  try {
    res.json(await admin.UpdateSiteStart(req.body));
  } catch (er) {
    console.error(`Error while updating the device status -> ${er.message}`);
    next(er);
  }
});

//UPDATE SITE CONTROLLER STATUS
router.post("/restartdevice", async function (req, res, next) {
  try {
    res.json(await admin.RestartDevice(req.body));
  } catch (er) {
    console.error(
      `Error while updating the site controller status -> ${er.message}`
    );
    next(er);
  }
});

//UPDATE SITE CONTROLLER STATUS
router.post("/restartsite", async function (req, res, next) {
  try {
    res.json(await admin.RestartSite(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the site controller status -> ${er.message}`
    );
    next(er);
  }
});

//UPDATE SITE CONTROLLER STATUS
router.post("/addeventforai", async function (req, res, next) {
  try {
    res.json(await admin.AddEventForAI(req.body));
  } catch (er) {
    console.error(`Error while adding the event for ai -> ${er.message}`);
    next(er);
  }
});

//UPDATE SITE CONTROLLER STATUS
router.post("/addruntimeevent", async function (req, res, next) {
  try {
    res.json(await admin.addeventruntime(req.body));
  } catch (er) {
    console.error(`Error while adding the event for ai -> ${er.message}`);
    next(er);
  }
});

//UPDATE SITE CONTROLLER STATUS
router.post("/addruntimeevent1", async function (req, res, next) {
  try {
    res.json(await admin.addeventruntime1(req.body));
  } catch (er) {
    console.error(`Error while adding the event for ai -> ${er.message}`);
    next(er);
  }
});
//ADD COMMUNICATION SERVER
router.post("/addcomserver", async function (req, res, next) {
  try {
    res.json(await admin.addCommunicationServer(req.body));
  } catch (er) {
    console.error(`Error while adding communication server -> ${er.message}`);
    next(er);
  }
});

//ADD COMMUNICATION SERVER
router.post("/getcomserver", async function (req, res, next) {
  try {
    res.json(await admin.FetchCommunicationServer(req.body));
  } catch (er) {
    console.error(`Error while adding communication server -> ${er.message}`);
    next(er);
  }
});

//ADD COMMUNICATION SERVER
router.post("/updatecomserver", async function (req, res, next) {
  try {
    res.json(await admin.UpdateCommunicationServer(req.body));
  } catch (er) {
    console.error(`Error while updating communication server -> ${er.message}`);
    next(er);
  }
});

//ADD LOAD BALANCER SERVER
router.post("/addlbserver", async function (req, res, next) {
  try {
    res.json(await admin.addloadbalancerserver(req.body));
  } catch (er) {
    console.error(`Error while adding load balancer server -> ${er.message}`);
    next(er);
  }
});

//GET LOAD BALANCER SERVER
router.post("/getlbserver", async function (req, res, next) {
  try {
    res.json(await admin.Fetchloadbalancerserver(req.body));
  } catch (er) {
    console.error(`Error while Fetching load balancer server -> ${er.message}`);
    next(er);
  }
});

//UPDATE LOAD BALANCER SERVER
router.post("/updatelbserver", async function (req, res, next) {
  try {
    res.json(await admin.Updateloadbalancerserver(req.body));
  } catch (er) {
    console.error(
      `Error while updating the load balancer server -> ${er.message}`
    );
    next(er);
  }
});

//get all the server list
router.post("/fetchallserver", async function (req, res, next) {
  try {
    res.json(await admin.FetchAllServer(req.body));
  } catch (er) {
    console.error(
      `Error while updating the load balancer server -> ${er.message}`
    );
    next(er);
  }
});

//MODIFY THE NOTIFIACTION SERVER
router.post("/modifynotifyserver", async function (req, res, next) {
  try {
    res.json(await admin.Modifynotificationserver(req.body));
  } catch (er) {
    console.error(
      `Error while deleting the notification server -> ${er.message}`
    );
    next(er);
  }
});

//MODIFY THE DATABASE SERVER
router.post("/modifydbserver", async function (req, res, next) {
  try {
    res.json(await admin.ModifyDatabaseserver(req.body));
  } catch (er) {
    console.error(`Error while modify the database server -> ${er.message}`);
    next(er);
  }
});

//MODIFY THE WEB SERVER
router.post("/modifywebserver", async function (req, res, next) {
  try {
    res.json(await admin.ModifyWebserver(req.body));
  } catch (er) {
    console.error(`Error while modify the web server -> ${er.message}`);
    next(er);
  }
});

//MODIFY THE WEB SERVER
router.post("/modifyappserver", async function (req, res, next) {
  try {
    res.json(await admin.ModifyApplicatiobserver(req.body));
  } catch (er) {
    console.error(`Error while modify the application server -> ${er.message}`);
    next(er);
  }
});

//MODIFY THE WEB SERVER
router.post("/modifyaiserver", async function (req, res, next) {
  try {
    res.json(await admin.ModifyAIserver(req.body));
  } catch (er) {
    console.error(`Error while modify the ai server -> ${er.message}`);
    next(er);
  }
});

//MODIFY THE WEB SERVER
router.post("/modifylbserver", async function (req, res, next) {
  try {
    res.json(await admin.Modifylbserver(req.body));
  } catch (er) {
    console.error(
      `Error while modify the load balancer server -> ${er.message}`
    );
    next(er);
  }
});

//MODIFY THE WEB SERVER
router.post("/modifycomserver", async function (req, res, next) {
  try {
    res.json(await admin.ModifyCommunicationserver(req.body));
  } catch (er) {
    console.error(
      `Error while modify the Communication server -> ${er.message}`
    );
    next(er);
  }
});

//MODIFY THE WEB SERVER
router.post("/modifyfileserver", async function (req, res, next) {
  try {
    res.json(await admin.ModifyStorageserver(req.body));
  } catch (er) {
    console.error(`Error while modify the Storage server -> ${er.message}`);
    next(er);
  }
});

//GET THE TOTAL NUMBER OF DATABASE
router.post("/dashboardcount", async function (req, res, next) {
  try {
    res.json(await admin.DashBoardCount(req.body));
  } catch (er) {
    console.error(
      `Error while fetching the total number of active and inactive server -> ${er.message}`
    );
    next(er);
  }
});

//GET THE TOTAL NUMBER OF DATABASE
router.post("/getregion", async function (req, res, next) {
  try {
    res.json(await admin.GetRegion(req.body));
  } catch (er) {
    console.error(`Error while fetching the analytic region -> ${er.message}`);
    next(er);
  }
});

//ADD PA SYSTEM FOR THE SITE OR CHANNEL
router.post("/addecs", async function (req, res, next) {
  try {
    res.json(await admin.AddEcs(req.body));
  } catch (er) {
    console.error(`Error while add the ECS System -> ${er.message}`);
    next(er);
  }
});

//ADD PA SYSTEM FOR THE SITE OR CHANNEL
router.post("/updateecs", async function (req, res, next) {
  try {
    res.json(await admin.UpdateECS(req.body));
  } catch (er) {
    console.error(`Error while updating the ECS System -> ${er.message}`);
    next(er);
  }
});

router.post("/getecs", async function (req, res, next) {
  try {
    res.json(await admin.GetEcs(req.body));
  } catch (er) {
    console.error(`Error while fetching the ECS System -> ${er.message}`);
    next(er);
  }
});

router.post("/deleteecs", async function (req, res, next) {
  try {
    res.json(await admin.DeleteEcs(req.body));
  } catch (er) {
    console.error(`Error while Deleting the ECS System -> ${er.message}`);
    next(er);
  }
});

router.post("/updatehidestatus", async function (req, res, next) {
  try {
    res.json(await admin.UpdateHideStatus(req.body));
  } catch (er) {
    console.error(`Error while updating hide status  -> ${er.message}`);
    next(er);
  }
});

router.post("/updatesitecontroller", async function (req, res, next) {
  try {
    res.json(await admin.UpdateSiteController(req.body));
  } catch (er) {
    console.error(`Error while updating the site controller -> ${er.message}`);
    next(er);
  }
});
``;

router.get("/deletesite", async function (req, res, next) {
  try {
    res.json(await admin.DeleteSite(req.body));
  } catch (er) {
    console.error(`Error while deleting the site -> ${er.message}`);
    next(er);
  }
});

// UPDATE PROCESS ID OF THE AI SERVER
router.post("/updateaiprocess", async function (req, res, next) {
  try {
    res.json(await admin.UpdateAIProcess(req.body));
  } catch (er) {
    console.error(
      `Error while Updating the Process ID for AI -> ${er.message}`
    );
    next(er);
  }
});

// UPDATE PROCESS ID OF THE AI SERVER
router.post("/aistopupdate", async function (req, res, next) {
  try {
    res.json(await admin.AIStopUpdate(req.body));
  } catch (er) {
    console.error(`Error while Updating the Device Stop -> ${er.message}`);
    next(er);
  }
});

//UPDATE NEW ENGINE PATH
router.post("/newenginepath", async function (req, res, next) {
  try {
    res.json(await admin.UpdateNewEnginePath(req.body));
  } catch (er) {
    console.error(`Error while updating the new engine path -> ${er.message}`);
    next(er);
  }
});

//GET THE AI MACHINE PROCESS ID
router.post("/getaiprocess", async function (req, res, next) {
  try {
    res.json(await admin.GetAIMachineProcess(req.body));
  } catch (er) {
    console.error(
      `Error while getting the Process id of the AI machine -> ${er.message}`
    );
    next(er);
  }
});

//FETCH THE AIILD PATH FOR THE ROLLBACK
router.post("/airollback", async function (req, res, next) {
  try {
    res.json(await admin.AIRollback(req.body));
  } catch (er) {
    console.error(
      `Error while Fetch the AI old rollback path -> ${er.message}`
    );
    next(er);
  }
});

//GET THE AI MACHINE PROCESS ID
router.post("/getsiteprocess", async function (req, res, next) {
  try {
    res.json(await admin.GetSiteControllerProcess(req.body));
  } catch (er) {
    console.error(
      `Error while getting the Process id of the Site controller -> ${er.message}`
    );
    next(er);
  }
});

router.post("/addeventpath", async function (req, res, next) {
  try {
    res.json(await admin.AddEventPath(req.body));
  } catch (er) {
    console.error(
      `Error while Adding the event path of the event -> ${er.message}`
    );
    next(er);
  }
});

router.post("/getobjectnames", async function (req, res, next) {
  try {
    res.json(await admin.GetObjectNames(req.body));
  } catch (er) {
    console.error(`Error while Fetching the object names -> ${er.message}`);
    next(er);
  }
});

router.post("/sitestatusevent", async function (req, res, next) {
  try {
    res.json(await admin.SiteStatusUpdate(req.body));
  } catch (er) {
    console.errro(`Error while Updating the site status -> ${er.message}`);
    next(er);
  }
});

router.post("/websocketserver", async function (req, res, next) {
  try {
    res.json(await admin.WebSocketServer(req.body));
  } catch (er) {
    console.error(`Error while Fetching the websocket -> ${er.message}`);
    next(er);
  }
});

router.post("/getcameraplacement", async function (req, res, next) {
  try {
    res.json(await admin.GetCameraPlacement(req.body));
  } catch (er) {
    console.error(`Error while Fetching the Camera Placement -> ${er.message}`);
    next(er);
  }
});

router.post("/addcameraplacement", async function (req, res, next) {
  try {
    res.json(await admin.AddCameraPlacement(req.body));
  } catch (er) {
    console.error(`Error while adding the Camera Placement -> ${er.message}`);
    next(er);
  }
});

router.post("/fetchcoordinate", async function (req, res, next) {
  try {
    res.json(await admin.FetchCoordinates(req.body));
  } catch (er) {
    console.error(`Error while Fetching the coordinate path -> ${er.message}`);
    next(er);
  }
});

router.get("/deactivate", async function (req, res, next) {
  try {
    res.json(await admin.SiteDeactivate(req.query));
  } catch (er) {
    console.error(`Error while Deactivating the camera's -> ${er.message}`);
    next(er);
  }
});

router.get("/sdelete", async function (req, res, next) {
  try {
    res.json(await admin.SiteDeletes(req.query));
  } catch (er) {
    console.error(`Error while Deactivating the camera's -> ${er.message}`);
    next(er);
  }
});

router.get("/demosite", async function (req, res, next) {
  try {
    res.json(await admin.DemoSite(req.query));
  } catch (er) {
    console.error(`Error while Processing the Demo -> ${er.message}`);
    next(er);
  }
});

router.post("/addvehicle", async function (req, res, next) {
  try {
    res.json(await admin.addVehicleEntry(req.body));
  } catch (er) {
    console.error(`Error while adding the Vehicle entry -> ${er.message}`);
    next(er);
  }
});

router.post("/updatevehiclepath", async function (req, res, next) {
  try {
    res.json(await admin.UpdateVehiclePath(req.body));
  } catch (er) {
    console.error(`Error while Updating the Vehicle path-> ${er.message}`);
    next(er);
  }
});
module.exports = router;
