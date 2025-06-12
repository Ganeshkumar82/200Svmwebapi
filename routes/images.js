const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

router.get("/sporadalogo", async function (req, res, next) {
  const imagePath = path.join(__dirname, "SporadaLogo.png");
  console.log(imagePath);
  if (fs.existsSync(imagePath)) {
    const image = fs.readFileSync(imagePath);
    res.contentType("image/jpeg");
    res.send(image);
  } else {
    res.status(404).send("Image not found");
  }
});

module.exports = router;
