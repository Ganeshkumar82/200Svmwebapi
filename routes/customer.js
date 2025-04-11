const express = require('express');
const router = express.Router();
const customer = require('../services/customer');

/* POST New Customer data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await customer.create(req.body));
    } catch (err) {
      console.error(`Error while creating customer profile`, err.message);
      next(err);
    }
  });

  //1. Register new customer
  router.post('/create', async function(req, res, next) {
    try {
      res.json(await customer.register(req.body));
    } catch (err) {
      console.error(`Error while creating customer profile`, err.message);
      next(err);
    }
  });
  //3. Getting customer organization list
  router.post('/getorganizationlist',async function(req, res , next){
    try{
      res.json(await customer.getOrganizationList(req.body));
    }
    catch(err){
      console.error('Error while getting customer organization list',err.message);
      next(err);
    }
  });
  //2. Getting company list
  router.post('/getcompanylist', async function(req, res, next) {
    try {
      res.json(await customer.getCompanylist(req.body));
    } catch (err) {
      console.error(`Error while getting company list`, err.message);
      next(err);
    }
});
    //3. Getting company list
    router.post('/getcompanysitelist', async function(req, res, next) {
      try {
        res.json(await customer.getCompanySitelist(req.body));
      } catch (err) {
        console.error(`Error while getting company site list`, err.message);
        next(err);
      }
});
  //3. Getting Site dept list
       router.post('/getsitedeptlist', async function(req, res, next) {
        try {
          res.json(await customer.getSiteDeptlist(req.body));
        } catch (err) {
          console.error(`Error while getting site department list`, err.message);
          next(err);
        }
});
    //3. Getting Site dept list
       router.post('/getdevicelist', async function(req, res, next) {
       try {
       res.json(await customer.getdeptdevicelist(req.body));
       } catch (err) {
        console.error(`Error while getting department device list`, err.message);
        next(err);
       }
      });
       //Getting the device channel list
       router.post('/getchannellist', async function(req,res,next){
        try{ 
          res.json(await customer.getdevicechannallist(req.body));
        } 
        catch(err){
           console.error(`Error while fetching device channel list`,err.message);
           next(err);
        }
      });
     //Getting the channel camera list
     router.post('/getcameralist',async function(req,res,next){
      try{
        res.json(await customer.getcameralist(req.body));
      }
      catch(err){
        console.error(`Error while fetching channel camera list`,err.message);
        next(err);
      }
     })
     //Getting the customer contact list
     router.post('/getcontactlist',async function(req,res,next){
      try{
        res.json(await customer.getcontactlist(req.body));
      }
      catch(err){
        console.log(`Error while fetching customer contact list`,err.message);
        next(err);
      }
     })
//Getting the customer billing list
 router.post('/getbillinglist',async function(req,res,next){
  try{
    res.json(await customer.getbillinglist(req.body));
  }
  catch(err){
      console.log('Error while fetching customer contact list',err.message);
      next(err);
  }
 })
 //Getting the customer invoice list
 router.post('/getinvoicelist',async function(req,res,next){
  try{
    res.json(await customer.getinvoicelist(req.body));
  }
  catch(err){
    console.log('Error while fetching customer invoice list',err.message);
    next(err);
  }
 });
 //GETTING THE CUSTOMER PAYMENT LIST
  router.post('/getpaymentlist',async function(req,res,next){
    try{
      res.json(await customer.getpaymentlist(req.body));
    }
    catch(err){
      console.log('Error while fetching customer payment list',err.message);
      next(err);
    }
  });
  //getting the customer payment bank list
  router.post('/getpaymentbank',async function(req,res,next){
    try{
      res.json(await customer.getpaymentbanklist(req.body));
    }
    catch(err){
      console.log("Error while fetching customer payment bank list",err.message);
      next(err);
    }
  });

  //4. Verify the registered customer
  router.post('/verifyaccount', async function(req, res, next) {
    try {
      res.json(await customer.verifyaccount(req.body));
    } catch (err) {
      console.error(`Error while verifying customer profile`, err.message);
      next(err);
    }
  });
  //5. Add subscription to the customer
  router.post('/newsubscription', async function(req, res, next) {
    try {
      res.json(await customer.newsubscription(req.body));
    } catch (err) {
      console.error(`Error while verifying customer profile`, err.message);
      next(err);
    }
  });

  //5. customer add site/company for subscription billing
  router.post('/addsubscriptionbilling', async function(req, res, next) {
    try {
      res.json(await customer.addsubscriptionbilling(req.body));
    } catch (err) {
      console.error(`Error while verifying customer profile`, err.message);
      next(err);
    }
  });
  // add a customer individual to a subscription
  router.post('/addnewsubscription',async function(req,res, next){
    try {
      res.json(await customer.indisubscription(req.body));
    } catch(err) {
      console.error('Error while adding a new subscription to the customer',err.message);
      next(err);
    }
  });
  //CHECK IF THE USER IS FIRST TIME USER OR NOT
   router.post('/firsttimeuser',async function(req,res,next){
    try{
      res.json(await customer.checkfirsttimeuser(req.body));
    }
    catch(err){
      console.error('Error while checking whether the customer is first time or not',err.message);
      next(err);
    }
   });
  //6. Add a new company to the customer
  router.post('/company', async function(req, res, next) {
    try {
      res.json(await customer.addcompany(req.body));
    } catch (err) {
      console.error(`Error while creating customer profile`, err.message);
      next(err);
    }
  });
  router.post('/individual', async function(req,res,next){
    try {
      res.json(await customer.addindividual(req.body));
    }
    catch (err){
      console.error('Error while adding customer individual',err.message);
      next(err);
    }
  })
  //ADD a new organization to the customer
  router.post('/organization',async function(req,res,next){
    try{
      res.json(await customer.addorganization(req.body));
    }
    catch(err){
      console.error('Error while adding a customer organization',err.message);
      next(err);
    }
  });
  //ADD A NEW COMPANY TO THE ORGANIZATION
  router.post('/organizationcompany',async function(req,res,next){
    try{
      res.json(await customer.addorganizationcompany(req.body));
    }
    catch(err){
      console.error('Error while adding a new company to the organization',err.message);
      next(err);
    }
  }); 

  //7. Add a new company site to the customer
  router.post('/site', async function(req, res, next) {
    try {
      res.json(await customer.addcompanysite(req.body));
    } catch (err) {
      console.error(`Error while creating customer profile`, err.message);
      next(err);
    }
  });
   //8. Add a new site department to the customer
   router.post('/dept', async function(req, res, next) {
    try {
      res.json(await customer.addsitedept(req.body));
    } catch (err) {
      console.error(`Error while creating customer profile`, err.message);
      next(err);
    }
  });
  

/* POST New device data */
router.post('/device', async function(req, res, next) {
  try {
    res.json(await customer.adddevice(req.body));
  } catch (err) {
    console.error(`Error while creating device`, err.message);
    next(err);
  }
});
//POST new contact list
router.post('/emergencycontact',async function(req,res,next){
  try{
    res.json(await customer.addcontacts(req.body));
  }
  catch(err){
    console.error(`Error while creating customer contacts`,err.message);
    next(err);
  }
});
//POST A NEW EMERGENCY SERVICE LIST
router.post('/emergencyservice',async function(req,res,next){
  try{
    res.json(await customer.addemergencyservice(req.body));
  }
  catch(err){
    console.error('Error while creating customer emergency service',err.message);
  }
});
//POST a new payment list
router.post('/addpayment',async function(req,res,next){
  try{
    res.json(await customer.addpayment(req.body));
  }
  catch(err){
    console.error(`Error while creating customer payment`,err.message);
    next(err);
  }
});
//post a new invoice list
  router.post('/addinvoice',async function(req,res,next){
    try{
      res.json(await customer.addinvoice(req.body));s
    }
    catch(err){
      console.error(`Error while creating company invoice`,err.message);
      next(err);
    }
  })
/* PUT Customer package */
router.put('/',async function(req, res, next) {
  try {
    res.json(await customer.update(req.body));
  } catch (err) {
    console.error(`Error while updating customer profile`, err.message);
    next(err);
  }
});

/* POST New Customer Subscription */
router.post('/subscription', async function(req, res, next) {
  try {
    res.json(await customer.createpackage(req.body));
  } catch (err) {
    console.error(`Error while creating customer profile`, err.message);
    next(err);
  }
});
//get users branch details 
router.post('/getcompany',async function(req,res,next){
  try{
    res.json(await customer.getcompany(req.body));
  }catch(err){
    console.error('Error while fetching user company details',err.message);
    next(err);
  }
});

router.post('/getbranch',async function(req,res,next){
  try{
    res.json(await customer.getbranch(req.body));
  }catch(err){
    console.error('Error while fetching user branch details',err.message);
    next(err);
  }
});


router.post('/creategroup',async function(req,res,next){
  try{
    res.json(await customer.createGroup(req.body));
  }catch(err){
    console.error('Error while creating the group name',err.message);
    next(err);
  }
});

router.post('/getplaybackgroup',async function(req,res,next){
  try{
    res.json(await customer.getPlaybackGroup(req.body));
  }catch(err){
    console.error('Error while getting the playback group',err.message);
    next(err);
  }
});

router.post('/updategroup',async function(req,res,next){
  try{
    res.json(await customer.UpdateGroup(req.body));
  }catch(err){
    console.error('Error while updating the playback group',err.message);
    next(err);
  }
});

//POST new contact list
router.post('/escalationcontact',async function(req,res,next){
  try{
    res.json(await customer.addescalation(req.body));
  }
  catch(err){
    console.error(`Error while adding customer escalation contacts`,err.message);
    next(err);
  }
});

//POST new contact list
router.post('/getescalation',async function(req,res,next){
  try{
    res.json(await customer.Getescalation(req.body));
  }
  catch(err){
    console.error(`Error while fetching the customer escalation contacts`,err.message);
    next(err);
  }
});

router.delete('/deletegroup',async function(req,res,next){
  try{
    res.json(await customer.DeleteGroup(req.body));
  }catch(err){
    console.error('Error while deleting the playback group',err.message);
    next(err);
  }
});

router.delete('/deletecamera',async function(req,res,next){
  try{
    res.json(await customer.DeleteCamera(req.body));
  }catch(err){
    console.error('Error while deleting the Live group cameras',err.message);
    next(err);
  }
});


router.post('/getgroupinfo',async function(req,res,next){
  try{
    res.json(await customer.getGroupInfo(req.body));
  }catch(err){
    console.error('Error while getting the playback group info',err.message);
    next(err);
  }
});

 //Update the company site to the customer
 router.post('/updatesite', async function(req, res, next) {
  try {
    res.json(await customer.updatesite(req.body));
  } catch (err) {
    console.error(`Error while updating customer site`, err.message);
    next(err);
  }
});

 //Update the company device to the customer
 router.post('/updatedevice', async function(req, res, next) {
  try {
    res.json(await customer.updateDevice(req.body));
  } catch (err) {
    console.error(`Error while updating customer site Department device`, err.message);
    next(err);
  }
});


 //Update the company site to the customer
 router.post('/paymenthistory', async function(req, res, next) {
  try {
    res.json(await customer.getPaymentHistory(req.body));
  } catch (err) {
    console.error(`Error while fetching the customer payment history`, err.message);
    next(err);
  }
});

//Update the company site to the customer
router.post('/pendinginvoice', async function(req, res, next) {
  try {
    res.json(await customer.getPendingInvoice(req.body));
  } catch (err) {
    console.error(`Error while fetching the customer payment`, err.message);
    next(err);
  }
});

//Get the payment invoice to the customer
router.post('/paymentinvoice', async function(req, res, next) {
  try {
    res.json(await customer.getPaymentInvoice(req.body));
  } catch (err) {
    console.error(`Error while fetching the customer payment Invoice`, err.message);
    next(err);
  }
});

//U the company site to the customer
router.post('/statementaccount', async function(req, res, next) {
  try {
    res.json(await customer.getStatementAccount(req.body));
  } catch (err) {
    console.error(`Error while fetching the customer statement of account`, err.message);
    next(err);
  }
});


//U the company site to the customer
router.post('/getinvoicedetails', async function(req, res, next) {
  try {
    res.json(await customer.getInvoiceforbillid(req.body));
  } catch (err) {
    console.error(`Error while fetching the customer statement of account`, err.message);
    next(err);
  }
});

//U the company site to the customer
router.post('/updatesubscription', async function(req, res, next) {
  try {
    res.json(await customer.UpdateSubscription(req.body));
  } catch (err) {
    console.error(`Error while updating the customer subscription`, err.message);
    next(err);
  }
});

//delete the company site to the customer
router.delete('/site', async function(req, res, next) {
  try {
    res.json(await customer.deletesite(req.body));
  } catch (err) {
    console.error(`Error while while deleting the customer site`, err.message);
    next(err);
  }
}); 

//delete the company site  DEVICE to the customer
router.delete('/device', async function(req, res, next) {
  try {
    res.json(await customer.deletedevice(req.body));
  } catch (err) {
    console.error(`Error while while deleting the customer site Device`, err.message);
    next(err);
  }
});

router.post('/getdvrcamera',async function(req,res,next){
  try{
    res.json(await customer.getdvrnvr(req.body));
  }catch(err){
    console.error('Error while getting the total camera list for the company',err.message);
    next(err);
  }
});

router.post('/invoicefilter',async function(req,res,next){
  try{
    res.json(await customer.Filterinvoice(req.body));
  }catch(err){
    console.error('Error while filtering the invoice filter',err.message);
    next(err);
  }
});


router.post('/gstcalculation',async function(req,res,next){
  try{
    res.json(await customer.generateGst(req.body));
  }catch(err){
    console.error('Error while filtering the invoice filter',err.message);
    next(err);
  }
});




module.exports = router;