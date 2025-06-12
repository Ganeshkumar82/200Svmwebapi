const express = require("express");
const cron = require("node-cron");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const port = 8080;

// Importing routers
const Sitestatus = require("./Sitestatus");
const subscriptionRouter = require("./routes/subscription");
const userRouter = require("./routes/user");
const customerRouter = require("./routes/customer");
const deviceRouter = require("./routes/device");
const branchRouter = require("./routes/branch");
const deptRouter = require("./routes/dept");
const uiRouter = require("./routes/ui");
const cameraRouter = require("./routes/camera");
const eventRouter = require("./routes/event");
const reportRouter = require("./routes/report");
const serverconfRouter = require("./routes/serverconf");
const contactRouter = require("./routes/contact");
const devicesdkRouter = require("./routes/devicesdk");
const adminRouter = require("./routes/admin");
const serverRouter = require("./routes/server");
const verificationRouter = require("./routes/verification");
const GraphRouter = require("./routes/graph");
const SecureRouter = require("./routes/secureshutter");
const RedisRouter = require("./routes/redis");
const VoipRouter = require("./routes/voip");
const ImageRouter = require("./routes/images");

const app = express();

app.use(cors());
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({ extended: true }));

// Middleware for logging requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - Received request for: ${req.method} ${req.url}`);
  next(); // Call the next middleware in the stack
});

// Define routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.use("/subscription", subscriptionRouter);
app.use("/user", userRouter);
app.use("/customer", customerRouter);
app.use("/device", deviceRouter);
app.use("/branch", branchRouter);
app.use("/dept", deptRouter);
app.use("/ui", uiRouter);
app.use("/camera", cameraRouter);
app.use("/event", eventRouter);
app.use("/report", reportRouter);
app.use("/serversetting", serverconfRouter);
app.use("/contact", contactRouter);
app.use("/devicesdk", devicesdkRouter);
app.use("/admin", adminRouter);
app.use("./server", serverRouter);
app.use("/verification", verificationRouter);
app.use("/graph", GraphRouter);
app.use("/secureshutter", SecureRouter);
app.use("/redis", RedisRouter);
app.use("/voipcall", VoipRouter);
app.use("/images", ImageRouter);
/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message }).end();
});

// Create HTTP server manually to set keep-alive settings
const server = http.createServer(app);

// Set keep-alive timeouts
server.keepAliveTimeout = 60 * 1000; // Keep connections alive for 60 seconds
server.headersTimeout = 65 * 1000; // Ensure this is slightly larger than keepAliveTimeout

// Start the server
server.listen(port, async () => {
  const ts = Date.now();
  console.log(`${ts} SVMWebAPI app listening at http://localhost:${port}`);
  const db = require("./services/db");
  const sql = await db.query(
    `update webservermaster set runningstatus = 1 where httpport = ${port}`
  );
  cron.schedule("30 11 * * *", async () => {
    try {
      await Sitestatus.fetchAndSendEmail();
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }
  });
});

// Handle graceful shutdown and update status
process.on("SIGINT", async () => {
  console.log("Received SIGINT. Shutting down gracefully...");
  const db = require("./services/db");
  await db.query(
    `update webservermaster set runningstatus = 0 where httpport = ${port}`
  );
  console.log("Database status updated to stopped.");

  // Close the server gracefully
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0); // Exit the process
  });
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  const db = require("./services/db");
  await db.query(
    `update webservermaster set runningstatus = 0 where httpport = ${port}`
  );
  console.log("Database status updated to stopped.");

  // Close the server gracefully
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0); // Exit the process
  });
});
