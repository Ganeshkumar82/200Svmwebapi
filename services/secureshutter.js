const db = require('./db');
const helper = require('../helper');
const config = require('../config');

async function AddDetails(secure){
    if(secure.hasOwnProperty('name') == false || secure.name == ''){
        return ({code:false,message:"Name missing. Please provide the name",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('phoneno') == false || secure.phoneno == ''){
        return ({code:false,message:"Contact number missing. Please provide the Contact number",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('emailid') == false || secure.emailid == ''){
        return ({code:false,message:"Email id missing. Please provide the Email id",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('location') == false || secure.location == ''){
        return ({code:false,message:"Location missing. Please provide the Location",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('brandname') == false || secure.brandname == ''){
        return ({code:false,message:"Brand name missing. Please provide the brand name",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('businessname') == false || secure.businessname == ''){
        return ({code:false,message:"Business name missing. Please provide the business name",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('securitystatus') == false || secure.securitystatus == ''){
        return ({code:false,message:"Security status missing. Please provide the security status",module:"ADD SECURE SHUTTER DETAILS"});
    }
    if(secure.hasOwnProperty('cctvstatus') == false || secure.cctvstatus == ''){
        retrun ({code:false,message:"CCTV status missing. Please provide the CCTV status",module:"ADD SECURE SHUTTER DETAILS"});
    }


    try{
        const [sql] = await db.spcall('call SP_SECURE_SHUTTER_ADD_DETAILS(?,?,?,?,?,?,?,?,@proofid); select @proofid',
        [secure.name,secure.phoneno,secure.emailid,secure.location,secure.brandname,secure.businessname,secure.securitystatus,secure.cctvstatus]);
        const objectvalue = sql[1][0];
        const proofid = objectvalue["@proofid"];
        if(proofid != '' && proofid != null){
            return ({code:true,message:"Add successfully",proofid:proofid});
        }else{
            return ({code:false,message:"Error Adding the Details. Please try again.",module:"ADD SECURE SHUTTER DETAILS"});
        }
    }catch(er){
        console.log(er);
        if(er.sqlMessage == 'Email already exist')
           return ({code:false,message:"Email already exist",error:er.sqlMessage});
        else if(er.sqlMessage == 'Phone number already exist')
           return ({code:false,message:"Phone number already exist",error:er.sqlMessage});
        else if(er.sqlMessage == 'Wrong phone number')
           return ({code:false,message:"Wrong phone number format. Please provide the valid format",error:er.sqlMessage});
        else if(er.sqlMessage == 'Wrong email')
           return ({code: false,message:"Invalid Email. Please provide the Valid Email",error:er.sqlMessage});
        else
           return ({code:false,message:"Internel error. Please try again",error:er.sqlMessage});
    }
}

//#################################################################################################################################################################################################
//#################################################################################################################################################################################################
//#################################################################################################################################################################################################

async function FetchDetails(secure) {
    try {
        const sql = await db.query(`
            SELECT proof_id, Name, Phone_number, Email_id, Location, Brand_name, Business_name, 
                   Security_status, CCTV_status, Remarks, Row_updated_date 
            FROM secureshuttermaster 
            WHERE status = 1;
        `);

        // Map the Security_status and CCTV_status to 'YES' or 'NO'
        const modifiedSql = sql.map(record => {
            return {
                ...record,
                Security_status: record.Security_status === 1 ? 'YES' : 'NO',
                CCTV_status: record.CCTV_status === 1 ? 'YES' : 'NO'
            };
        });

        return { code: true, message: "Secure shutter details fetched Successfully", sql: modifiedSql };
    } catch (er) {
        return { code: false, message: "Error Fetching the Details. Please try again", error: er };
    }
}

//#################################################################################################################################################################################################
//#################################################################################################################################################################################################
//#################################################################################################################################################################################################


async function UpdateDetails(secure){
    if(secure.hasOwnProperty('proofid') == false){
        return ({code:false,message:"Customer proof id missing. Please provide the proof id",module:"Update secure shutter details"})
    }
    if(secure.hasOwnProperty('remarks') == false){
        return ({code:false,message:"Customer remarks missing. Please provide the Remarks",module:"Update secure shutter details"});
    }
    try{
       const sql = await db.query(`Update secureshuttermaster set Remarks = ${secure.remarks} where proof_id = ${secure.proofid}`);
       if(sql.affectedRows){
        return ({code:true,message:"Details Updated Successfully",proofid:secure.proofid});
       }else{
        return ({code:false,message:"Error Updating the details. Please try again.",module:"Update secure shutter details"});
       } 
    }catch(er){
        console.log(er);
       return ({code:false,message:"Internal error. Please contact administration.",module:er.message});
    }

}

module.exports ={
    AddDetails,
    FetchDetails,
    UpdateDetails,
}