const mysql = require("mysql2/promise");
const config = require("../config");
const Redis = require("ioredis");
const pool = mysql.createPool(config.db);

const pool1 = mysql.createPool(config.db1);

async function query(sql, params) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    if (error.code == "ECONNREFUSED") {
    }
    throw error;
  } finally {
    connection.release(); // Release the connection back to the pool
  }
}

async function spcall(sql, params) {
  const connection = await pool.getConnection();
  try {
    const results = await connection.query(sql, params);
    return results;
  } catch (error) {
    if (error.code == "ECONNREFUSED") {
    }
    throw error;
  } finally {
    connection.release(); // Release the connection back to the pool
  }
}
async function query1(sql, params) {
  const connection = await pool1.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    if (error.code == "ECONNREFUSED") {
    }
    throw error;
  } finally {
    connection.release(); // Release the connection back to the pool
  }
}

async function spcall1(sql, params) {
  const connection = await pool1.getConnection();
  try {
    const results = await connection.query(sql, params);
    return results;
  } catch (error) {
    if (error.code == "ECONNREFUSED") {
    }
    throw error;
  } finally {
    connection.release(); // Release the connection back to the pool
  }
}

const redis = new Redis({
  host: "192.168.0.245", // Replace with your Redis host
  port: 6379, // Replace with your Redis port
});

module.exports = {
  query,
  spcall,
  query1,
  spcall1,
  pool,
  redis,
};
