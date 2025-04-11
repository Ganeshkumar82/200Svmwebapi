const express = require('express');
const router = express.Router();
const camera = require('../services/camera');

//CHANGE THE CAMERA STATUS TO ACTIVE
router.post('/active',async function(req,res,next){
  try {
    res.json(await camera.CameraActivate(req.body));
  }
  catch(err){
    console.error('Error while activating the camera status',err.message);
    next(err);
  }
})

//CHANGE THE CAMERA STATUS TO iNACTIVATE
router.post('/Inactive',async function(req,res,next){
  try{
    res.json(await camera.CameraInactivate(req.body));
  }
  catch(err){
    console.error('Error while Inactivating the camera status',err.message);
    next(err);
  }
})

/* POST New camera SOP data */
router.post('/addsop', async function(req, res, next) {
    try {
      res.json(await camera.create(req.body));
    } catch (err) {
      console.error(`Error while creating camera SPO`, err.message);
      next(err);
    }
  });

/* PUT Camera sop data */
router.put('/sop',async function(req, res, next) {
  try {
    res.json(await camera.update(req.body));
  } catch (err) {
    console.error(`Error while updating SOP`, err.message);
    next(err);
  }
});

/* Delete camera SOP */
router.delete('/sop', async function(req, res, next) {
  try {
    res.json(await camera.deletedata(req.body));
  } catch (err) {
    console.error(`Error while deleting SOP data`, err.message);
    next(err);
  }
});

router.get('/sop', async function(req, res, next) {
  try {
    res.json(await camera.getMultiple(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching SOP list`, err.message);
    next(err);
  }
});



/* POST New camera AI data */
router.post('/addai', async function(req, res, next) {
  try {
    res.json(await camera.createAi(req.body));
  } catch (err) {
    console.error(`Error while creating camera AI`, err.message);
    next(err);
  }
});

/* PUT AI Data */
router.put('/ai',async function(req, res, next) {
try {
  res.json(await camera.updateAi(req.body));
} catch (err) {
  console.error(`Error while updating Ai`, err.message);
  next(err);
}
});

/* delete Camera AI */
router.delete('/ai', async function(req, res, next) {
try {
  res.json(await camera.deletedataAi(req.body));
} catch (err) {
  console.error(`Error while deleting Ai data`, err.message);
  next(err);
}
});

router.get('/ai', async function(req, res, next) {
try {
  res.json(await camera.getMultipleAi(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching Ai list`, err.message);
  next(err);
}
});


/* POST New camera Nearby data */
router.post('/nearby', async function(req, res, next) {
  try {
    res.json(await camera.createNearby(req.body));
  } catch (err) {
    console.error(`Error while creating camera Nearby hardwares`, err.message);
    next(err);
  }
});

/* nearby AI Data */
router.put('/nearby',async function(req, res, next) {
try {
  res.json(await camera.updateNearby(req.body));
} catch (err) {
  console.error(`Error while updating Nearby camera hardwares`, err.message);
  next(err);
}
});

/* delete Camera AI */
router.delete('/nearby', async function(req, res, next) {
try {
  res.json(await camera.deletedataNearby(req.body));
} catch (err) {
  console.error(`Error while deleting Nearby camera data`, err.message);
  next(err);
}
});

router.get('/nearby', async function(req, res, next) {
try {
  res.json(await camera.getMultipleNearby(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching Nearby camera list`, err.message);
  next(err);
}
});


/* POST New camera storage data */
router.post('/storage', async function(req, res, next) {
  try {
    res.json(await camera.createStorage(req.body));
  } catch (err) {
    console.error(`Error while creating camera storage`, err.message);
    next(err);
  }
});

/* nearby storage Data */
router.put('/storage',async function(req, res, next) {
try {
  res.json(await camera.updateStorage(req.body));
} catch (err) {
  console.error(`Error while updating Storage camera`, err.message);
  next(err);
}
});

/* delete Camera AI */
router.delete('/storage', async function(req, res, next) {
try {
  res.json(await camera.deletedataStorage(req.body));
} catch (err) {
  console.error(`Error while deleting Storage camera data`, err.message);
  next(err);
}
});

router.get('/storage', async function(req, res, next) {
try {
  res.json(await camera.getMultipleStorage(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching Storage camera list`, err.message);
  next(err);
}
});

/* POST New camera activation data */
router.post('/activate', async function(req, res, next) {
  try {
    res.json(await camera.createActivate(req.body));
  } catch (err) {
    console.error(`Error while creating camera activation`, err.message);
    next(err);
  }
});

/* nearby storage Data */
router.put('/activate',async function(req, res, next) {
try {
  res.json(await camera.updateActivate(req.body));
} catch (err) {
  console.error(`Error while updating camera deactivation`, err.message);
  next(err);
}
});

router.get('/allcamera', async function(req, res, next) {
try {
  res.json(await camera.getMultipleActivate(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching camera camera list`, err.message);
  next(err);
}
});

router.get('/status', async function(req, res, next) {
  try {
    res.json(await camera.getMultipleactivatestatus(req.query.page,req.body));
  } catch (err) {
    console.error(`Error while fetching camera activation status list`, err.message);
    next(err);
  }
  });



/* POST New camera Ignore data */
router.post('/ignore', async function(req, res, next) {
  try {
    res.json(await camera.createIgnore(req.body));
  } catch (err) {
    console.error(`Error while creating camera storage`, err.message);
    next(err);
  }
});

/* nearby storage Data */
router.put('/ignore',async function(req, res, next) {
try {
  res.json(await camera.updateIgnore(req.body));
} catch (err) {
  console.error(`Error while updating Storage camera`, err.message);
  next(err);
}
});

/* delete Camera AI */
router.delete('/ignore', async function(req, res, next) {
try {
  res.json(await camera.deletedataIgnore(req.body));
} catch (err) {
  console.error(`Error while deleting Storage camera data`, err.message);
  next(err);
}
});

router.get('/ignore', async function(req, res, next) {
try {
  res.json(await camera.getMultipleIgnore(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching Storage camera list`, err.message);
  next(err);
}
});


/* POST New camera Ignore data */
router.post('/recurrence', async function(req, res, next) {
  try {
    res.json(await camera.createRecurrence(req.body));
  } catch (err) {
    console.error(`Error while creating camera storage`, err.message);
    next(err);
  }
});

/* nearby storage Data */
router.put('/recurrence',async function(req, res, next) {
try {
  res.json(await camera.updateRecurrence(req.body));
} catch (err) {
  console.error(`Error while updating Storage camera`, err.message);
  next(err);
}
});

/* delete Camera AI */
router.delete('/recurrence', async function(req, res, next) {
try {
  res.json(await camera.deletedataRecurrence(req.body));
} catch (err) {
  console.error(`Error while deleting Storage camera data`, err.message);
  next(err);
}
});

router.get('/recurrence', async function(req, res, next) {
try {
  res.json(await camera.getMultipleRecurrence(req.query.page,req.body));
} catch (err) {
  console.error(`Error while fetching Storage camera list`, err.message);
  next(err);
}
});

router.get('/live', async function(req, res, next) {
  try {
    res.json(await camera.getLive(req.body));
  } catch (err) {
    console.error(`Error while fetching Storage camera list`, err.message);
    next(err);
  }
  });

  router.post('/getcamerainfo', async function(req, res, next) {
    try {
      res.json(await camera.getcamera(req.body));
    } catch (err) {
      console.error(`Error while fetching camera info list`, err.message);
      next(err);
    }
  });
  
  router.post('/getcameralive', async function(req, res, next) {
    try {
      res.json(await camera.getcameralive(req.body));
    } catch (err) {
      console.error(`Error while fetching camera rtsp url`, err.message);
      next(err);
    }
  });

  //get video playback url
  router.post('/videoplayback', async function(req, res, next) {
    try {
      res.json(await camera.videoplayback(req.body));
    } catch (err) {
      console.error(`Error while fetching camera playvideo url`, err.message);
      next(err);
    }
  });

  router.post('/camerainfo', async function(req, res, next) {
    try {
      res.json(await camera.camerainfo(req.body));
    } catch (err) {
      console.error(`Error while fetching camera info list for group`, err.message);
      next(err);
    }
  });

  router.post('/getcamerasop', async function(req, res, next) {
    try {
      res.json(await camera.GetCameraSOP(req.body));
    } catch (err) {
      console.error(`Error while fetching Event camera info list`, err.message);
      next(err);
    }
  });

  router.post('/addlatlon', async function(req, res, next) {
    try {
      res.json(await camera.AddCamLatLon(req.body));
    } catch (err) {
      console.error(`Error while adding the camera latitute and longitute`, err.message);
      next(err);
    }
  });

router.delete('/deletelatlon', async function(req, res, next) {
    try {
      res.json(await camera.DeleteCamLatLon(req.body));
    } catch (err) {
      console.error(`Error while deleting the camera latitute and longitute`, err.message);
      next(err);
    }
  });

  router.post('/dailyplayback', async function(req, res, next) {
    try {
      res.json(await camera.GetPlaybackDaily(req.body));
    } catch (err) {
      console.error(`Error while fetching available playback hours `, err.message);
      next(err);
    }
  });

  router.post('/monthplayback', async function(req, res, next) {
    try {
      res.json(await camera.GetPlaybackMonth(req.body));
    } catch (err) {
      console.error(`Error while fetching available playback dates`, err.message);
      next(err);
    }
  });
  
module.exports = router;