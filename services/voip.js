const helper = require("../helper");
const db = require("./db");
const config = require("../config");



//################################################################################################################################################################################################################

async function PlaySound(voip) {
    try {
        // Check for required properties
        if (!voip.hasOwnProperty('voipid')) {
            return helper.getErrorResponse(false, "Voip id missing. Please provide the voip id", "VOIP NAME PLAY SOUND");
        }
        if (!voip.hasOwnProperty('volume')) {
            return helper.getErrorResponse(false, "Voip volume missing. Please provide the Volumes", "PLAY SOUND VOLUMES");
        }

        // Fetch user file from the database
        const sql = await db.query(`SELECT user_file FROM voipcallmaster WHERE voip_id = ?`, [voip.voipid]);
        if (!sql[0]) {
            return helper.getErrorResponse(false, 'User file not available', "VOIP CALL", "");
        }

        const userfile = sql[0].user_file;

        // Prepare the API URL with query parameters
        const url = `http://my.sporada.in:28888/api/play?action=start&file=userfile${encodeURIComponent(userfile)}&mode=once&volume=${voip.volume}`;

        // Call the external API
        const response = await fetch(url);
        if (!response.ok) {
            return helper.getErrorResponse(false, `Failed to play sound: ${response.status}`, "VOIP PLAY SOUND ERROR");
        }

        const data = await response.json(); // Parse JSON response

        // Check the result from the API response
        if (data.result === 0) {
            return helper.getSuccessResponse(true, "Sound played successfully", data);
        } else {
            return helper.getErrorResponse(false, `Failed to play sound: ${data.reason}`, "VOIP PLAY SOUND ERROR");
        }

    } catch (error) {
        return helper.getErrorResponse(false, 'Internal error. Please contact Administrator', error.message);
    }
}



//################################################################################################################################################################################################################

async function GetVoipCommand(voip){
     try{
       const sql = await db.query(`select voip_id,voip_name,description,duration from voipcallmaster where status =1`);
       if(sql[0]){
          return helper.getSuccessResponse(true,"SUCCESS",sql,"");
       }
       else{
          return helper.getErrorResponse(false,"Voip command not available.",sql,"");
       }
     }catch(er){
        return helper.getErrorResponse(false,'Internal error. Please contact Administrator',er);
     }
}


//################################################################################################################################################################################################################

async function StopSound(voip) {
    try {

        // Prepare the API URL with query parameters
        const url = `http://my.sporada.in:28888/api/play?action=stop`;

        // Call the external API
        const response = await fetch(url);
        if (!response.ok) {
            return helper.getErrorResponse(false, `Failed to play sound: ${response.status}`, "VOIP PLAY SOUND ERROR");
        }

        const data = await response.json(); // Parse JSON response

        // Check the result from the API response
        if (data.result === 0) {
            return helper.getSuccessResponse(true, "Sound stopped successfully", data);
        } else {
            return helper.getErrorResponse(false, `Failed to stop sound: ${data.reason}`, "VOIP PLAY SOUND ERROR");
        }

    } catch (error) {
        return helper.getErrorResponse(false, 'Internal error. Please contact Administrator', error.message);
    }
}

module.exports ={
    PlaySound,
    GetVoipCommand,
    StopSound,
}