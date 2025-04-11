const express = require('express');
const router = express.Router();
const server = require('../services/server');


//GET THE SERVER STATUS FOR THE ALL THE RUNNING SERVERS

router.post('/getserverstatus', async function(req,res,next){
    try{
        res.json(await server.GetServerStatus(req.body));
    } catch(err) {
        console.error('Error while fetching the server status of the service', err.message);
        next(err);
    }
});




module.exports = router;