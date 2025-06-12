const config = {
  db: {
    /* don't expose password or any sensitive info, done only for demo */
    host: "192.168.0.158",
    user: "ssipl_serveradmin",
    password: "Sporada@2014",
    multipleStatements: true,
    database: "ssipl_clouddb1",
    connectionLimit: 10000,
  },
  db1: {
    /* don't expose password or any sensitive info, done only for demo */
    host: "192.168.0.158",
    user: "ssipl_serveradmin",
    password: "Sporada@2014",
    multipleStatements: true,
    database: "sporadaanpr",
    connectionLimit: 10000,
  },
  folderpath: {
    serverip: "192.168.0.198",
    storagepath: "\\\\192.168.0.198\\volumes", //for events also i have given this path-- ganesh  , also for creating the site folder
    username: "Administrator",
    password: "Sporada@2014",
  },
  sitecontrollerpath:
    "\\\\192.168.0.155\\Site_Controllers\\Master_Files\\MASTER",
  deviceinfopath: "http://192.168.0.155:54321",
  aienginepath:
    "\\\\192.168.0.156\\Production\\pre_infer_post_grpc\\Enginepath_master",
  listPerPage: 10,
  sitesalt: "Sporada@2014",
};
module.exports = config;
