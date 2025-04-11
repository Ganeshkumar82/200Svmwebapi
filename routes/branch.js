const express = require('express');
const router = express.Router();
const branch = require('../services/branch');

/* POST New branch data */
router.post('/', async function(req, res, next) {
    try {
      res.json(await branch.create(req.body));
    } catch (err) {
      console.error(`Error while creating branch`, err.message);
      next(err);
    }
  });

/* PUT branch data */
router.put('/',async function(req, res, next) {
  try {
    res.json(await branch.update(req.body));
  } catch (err) {
    console.error(`Error while updating branch`, err.message);
    next(err);
  }
});

/* Delete branch data */
router.delete('/', async function(req, res, next) {
  try {
    res.json(await branch.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting branch data`, err.message);
    next(err);
  }
});

/* Get branch data */
router.get('/', async function(req, res, next) {
  try {
    res.json(await branch.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching branch list`, err.message);
    next(err);
  }
});

/* POST New site timing data */
router.post('/sitetiming', async function(req, res, next) {
  try {
    res.json(await branch.createSiteTiming(req.body));
  } catch (err) {
    console.error(`Error while creating branch`, err.message);
    next(err);
  }
});

/* PUT branch timing data */
router.put('/sitetiming',async function(req, res, next) {
try {
  res.json(await branch.updateSiteTiming(req.body));
} catch (err) {
  console.error(`Error while updating branch`, err.message);
  next(err);
}
});

/* Delete branch timing data */
router.delete('/sitetiming', async function(req, res, next) {
try {
  res.json(await branch.deletedataSiteTiming(req.body));
} catch (err) {
  console.error(`Error while deleting branch data`, err.message);
  next(err);
}
});

/* Get branch timing data */
router.get('/sitetiming', async function(req, res, next) {
try {
  res.json(await branch.getSiteTimingMultiple(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching branch list`, err.message);
  next(err);
}
});

// ADD THE BRANCH EMERGENCY CONTACT
router.post('/addbranch',async function(req,res,next){
  try{
    res.json(await branch.addbranch(req.body));
  }catch(err){
    console.error('Error while adding the customer site',err.message);
    next(err);
  }
});

// ADD THE BRANCH EMERGENCY CONTACT
router.post('/emergencycontact',async function(req,res,next){
  try{
    res.json(await branch.addemergencycontact(req.body));
  }catch(err){
    console.error('Error while adding the customer emergency contact list',err.message);
    next(err);
  }
});


/* POST New site timing data */
router.post('/createsitetiming', async function(req, res, next) {
  try {
    res.json(await branch.createsiteTiming(req.body));
  } catch (err) {
    console.error(`Error while creating branch timing`, err.message);
    next(err);
  }
});

/* PUT branch timing data */
router.post('/updatesitetiming',async function(req, res, next) {
  try {
    res.json(await branch.updatesiteTiming(req.body));
  } catch (err) {
    console.error(`Error while updating branch site timing`, err.message);
    next(err);
  }
  });


/* Delete branch timing data */
router.delete('/deletesitetiming', async function(req, res, next) {
  try {
    res.json(await branch.deletesiteTiming(req.body));
  } catch (err) {
    console.error(`Error while deleting branch data`, err.message);
    next(err);
  }
  });
  

/* Delete branch timing data */
router.post('/sitelocation', async function(req, res, next) {
  try {
    res.json(await branch.GetSiteLocation(req.body));
  } catch (err) {
    console.error(`Error while getting the site location`, err.message);
    next(err);
  }
  });

  /* Delete branch timing data */
router.post('/deletesitelocation', async function(req, res, next) {
  try {
    res.json(await branch.DeleteSiteLocation(req.body));
  } catch (err) {
    console.error(`Error while deleting branch location`, err.message);
    next(err);
  }
  });
  
    /* Delete branch timing data */
router.post('/updatesitelocation', async function(req, res, next) {
  try {
    res.json(await branch.UpdateSiteLocation(req.body));
  } catch (err) {
    console.error(`Error while Updating branch location`, err.message);
    next(err);
  }
  });

module.exports = router;