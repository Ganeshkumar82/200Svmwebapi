
const net = require("net");

const host = "192.168.0.155";
const port = 22222;

const serverAddress = '124.123.68.64';
const serverPort = 37777;
const username = 'admin';
const password = '$ecure@360';
const startTime = '2023-10-09 00:00:00';
const endTime = '2023-10-10 23:59:00';
const channelIndex = '5';

// Define the command you want to send
const command = `<GetPlaybackCountMonth>${serverAddress},${serverPort},${username},${password},${startTime},${endTime},${channelIndex}`;

const client = net.createConnection(port, host, () => {
    console.log("Connected");
    client.write(command);
});

client.on("data", (data) => {
    console.log(`Received: ${data}`);
    console.log('Received data from the server:', data.toString());
    // Close the connection once you have received the response
    client.end();
});

client.on("error", (error) => {
    console.log(`Error: ${error.message}`);
});

client.on("close", () => {
    console.log("Connection closed");
});
// const serverAddress = '192.168.0.155';
// const serverPort = 22222;
// const username = 'admin';
// const password = '$ecure@360';
// const startTime = '2023-09-10';
// // const endTime = 'yourEndTime';
// const channelIndex = '6';

// // Define the command you want to send
// const command = `<GetPlaybackCountMonth>${serverAddress},${serverPort},${username},${password},${startTime},${channelIndex}\n`;

// // Create a TCP socket
// const client = new net.Socket();

// // Connect to the server
// client.connect(serverPort, serverAddress, () => {
//   console.log('Connected to the server');
  
//   // Send the command to the server
//   client.write(command);
// });

// // Listen for data received from the server
// client.on('data', (data) => {
//   console.log('Received data from the server:', data.toString());
  
//   // Close the connection once you have received the response
//   client.end();
// });

// // Handle connection closure
// client.on('close', () => {
//   console.log('Connection closed');
// });

// // Handle errors
// client.on('error', (error) => {
//   console.error('Error:', error);
// });

// // Handle the connection ending (e.g., server disconnects)
// client.on('end', () => {
//   console.log('Connection ended');
// });

// // Handle connection timeout (if needed)
// client.on('timeout', () => {
//   console.log('Connection timed out');
// });

// // Handle connection termination (if needed)
// client.on('finish', () => {
//   console.log('Connection finished');
// });

// // Handle any other errors that may occur
// client.on('error', (error) => {
//   console.error('Error:', error);
// });
