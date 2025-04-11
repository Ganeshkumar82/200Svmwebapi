const express = require("express");
const router = express.Router();
const voip = require("../services/voip");

router.post('/playsound', async function(req,res,next){
    try{
       res.json(await voip.PlaySound(req.body));
    }catch(er){
       console.error(`Error while Playing the sound ${er.message}`);
       next(er);
    }
});

router.post('/stopsound', async function(req,res,next){
    try{
       res.json(await voip.StopSound(req.body));
    }catch(er){
       console.error(`Error while Stoping the sound ${er.message}`);
       next(er);
    }
});

router.post('/getvoipcommand', async function(req,res,next){
  try{
    res.json(await voip.GetVoipCommand(req.body));
  }catch(er){
    console.error(`Error while getting the voip command ${er.message}`);
    next(er);
  }
});

module.exports = router;