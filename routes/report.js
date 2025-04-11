const express = require('express');
const router = express.Router();
const report = require('../services/report');

router.get('/sitereport', async function(req, res, next) {
  try {
    res.json(await report.createSiteReport(req.body));
  } catch (err) {
    console.error(`Error while fetching report list`, err.message);
    next(err);
  }
});

router.get('/summaryreport', async function(req, res, next) {
  try {
    res.json(await report.createSummartReport(req.body));
  } catch (err) {
    console.error(`Error while fetching report list`, err.message);
    next(err);
  }
});


router.post('/sitereport', async function(req, res, next) {
  try {
    res.json(await report.SetSiteReportTiming(req.body));
  } catch (err) {
    console.error(`Error while setting site report timing list`, err.message);
    next(err);
  }
});

router.post('/summaryreport', async function(req, res, next) {
  try {
    res.json(await report.SetSummaryReportTiming(req.body));
  } catch (err) {
    console.error(`Error while setting site report timing  list`, err.message);
    next(err);
  }
});


router.post('/eventreport', async function(req, res, next) {
  try {
    res.json(await report.createsummaryreport(req.body));
  } catch (err) {
    console.error(`Error while fetching report list`, err.message);
    next(err);
  }
});

router.post('/daily', async function(req, res, next) {
  try {
    res.json(await report.createdailyreport(req.body));
  } catch (err) {
    console.error(`Error while fetching cumulative record data`, err.message);
    next(err);
  }
});


router.post('/cumulative', async function(req, res, next) {
  try {
    res.json(await report.createcumulativereport(req.body));
  } catch (err) {
    console.error(`Error while fetching cumulative record data`, err.message);
    next(err);
  }
});


router.post('/deviceinfo', async function(req, res, next) {
  try {
    res.json(await report.DeviceInfo(req.body));
  } catch (err) {
    console.error(`Error while fetching Device info data`, err.message);
    next(err);
  }
});



module.exports = router;