const util = require("util");
const multer = require("multer");
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "C:/ganesh/screenshots");
  },
  filename: (req, file, cb) => {
    var ts = Date.now();console.log(ts+file.originalname);
    cb(null, file.originalname);
  },
});
const maxSize = 2 * 1024 * 1024;
let uploadFile = multer({
  storage: storage,
  limits: { fileSize: maxSize }
}).single("file");
let uploadFileMiddleware = util.promisify(uploadFile);
module.exports = uploadFileMiddleware;