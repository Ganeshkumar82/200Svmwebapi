const db = require("./db");
const helper = require("../helper");
const config = require("../config");

//######################################################################################################################################################################################################
//######################################################################################################################################################################################################
//######################################################################################################################################################################################################

async function UpdateDevice(redis) {
  if (!redis.hasOwnProperty("deviceid")) {
    return helper.getErrorResponse(
      false,
      "Device id missing. Please provide the deviceid",
      "UPDATE DEVICE TO REDIS"
    );
  }
  if (!redis.hasOwnProperty("devicename")) {
    return helper.getErrorResponse(
      false,
      "Device name missing. Please provide the devicename",
      "UPDATE DEVICE TO REDIS"
    );
  }
  if (!redis.hasOwnProperty("siteid")) {
    return helper.getErrorResponse(
      false,
      "Site id missing. Please provide the site id",
      "UPDATE DEVICE TO REDIS"
    );
  }
  if (!redis.hasOwnProperty("deviceip")) {
    return helper.getErrorResponse(
      false,
      "Device ip missing. Please provide the Device ip",
      "UPDATE DEVICE TO REDIS"
    );
  }
  if (!redis.hasOwnProperty("port")) {
    return helper.getErrorResponse(
      false,
      "Port missing. Please provide the port",
      "UPDATE DEVICE TO REDIS"
    );
  }
  if (!redis.hasOwnProperty("cameras")) {
    return helper.getErrorResponse(
      false,
      "Camera missing. Please provide the device cameras",
      "UPDATE DEVICE TO REDIS"
    );
  }

  try {
    const deviceKey = redis.deviceid;

    // Convert the cameras array into a JSON string to store in the hash
    const camerasData = JSON.stringify(redis.cameras);

    await db.redis.hmset(deviceKey, {
      ipaddress: redis.deviceip,
      ipport: redis.port,
      siteid: redis.siteid,
      devicename: redis.devicename,
      deviceid: redis.deviceid,
      cameras: camerasData,
    });

    return helper.getSuccessResponse(
      true,
      "Device and cameras updated successfully",
      "ADD DEVICE"
    );
  } catch (er) {
    return helper.getErrorResponse(
      false,
      "Internal error. Please contact Administration",
      er
    );
  }
}

async function getEventId(redis) {
  try {
    // Validate required properties
    if (!redis.hasOwnProperty("deviceid")) {
      return helper.getErrorResponse(
        false,
        "Device id missing. Please provide the device id.",
        "GET EVENT ID",
        ""
      );
    }
    if (!redis.hasOwnProperty("channelid")) {
      return helper.getErrorResponse(
        false,
        "Channel id missing. Please provide the channel id.",
        "GET EVENT ID",
        ""
      );
    }

    // Fetch device data from Redis
    const deviceData = await db.redis.hgetall(redis.deviceid);

    if (!deviceData || Object.keys(deviceData).length === 0) {
      return helper.getErrorResponse(
        false,
        "Device not found",
        "FETCH EVENT ID"
      );
    }

    // Parse the cameras data stored as a JSON string
    const cameras = JSON.parse(deviceData.cameras);

    // Find the camera with the matching channel ID
    const camera = cameras.find((cam) => cam.channelno === redis.channelid);

    if (!camera) {
      return helper.getErrorResponse(
        false,
        "Camera with the given channel ID not found",
        "FETCH EVENT ID"
      );
    }

    const eventid = await db.redis.incr("eventid_counter");
    // await db.redis.hset(redis.deviceid, 'cameras', JSON.stringify(cameras));

    // Prepare the response data with cameraid and eventid
    const responseData = {
      cameraid: camera.cameraid,
      eventid: eventid,
    };

    // Return success response with the event ID and camera ID
    return helper.getSuccessResponse(
      true,
      "Event ID and Camera ID fetched successfully",
      responseData,
      ""
    );
  } catch (er) {
    // Return error response in case of exceptions
    return {
      code: false,
      message: "Internal error. Please contact Administration",
      error: JSON.stringify(er),
    };
  }
}

module.exports = {
  UpdateDevice,
  getEventId,
};
