const express = require("express");
const router = express.Router();
const secure = require("../services/secureshutter");

router.post("/adddetails", async function (req, res, next) {
  try {
    res.json(await secure.AddDetails(req.body));
  } catch (er) {
    console.error(
      `Error while adding the details of the secure shutter -> ${er.message}`
    );
    next(er);
  }
});

router.post("/getdetails", async function (req, res, next) {
  try {
    res.json(await secure.FetchDetails(req.body));
  } catch (er) {
    console.error(
      `Error while Fetching the details of the secure shutter -> ${er.messsage}`
    );
    next(er);
  }
});

router.post("/updatedetails", async function (req, res, next) {
  try {
    res.json(await secure.UpdateDetails(req.body));
  } catch (er) {
    console.error(
      `Error while Updating the details of the secure shutter -> ${er.message}`
    );
    next(er);
  }
});
module.exports = router;
