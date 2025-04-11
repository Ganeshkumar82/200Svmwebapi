//This code was posted for an article at https://codingislove.com/send-sms-developers/

const axios = require("axios");
const { Curl } = require("node-libcurl");
const { exec } = require("child_process");
var request = require("request"); 

const tlClient = axios.create({
  baseURL: "https://api.textlocal.in/",
  params: {
    apiKey: "/DmiVPTXV04-siQYIOu8KGCzfGqSzbK3SiDTXfzjLg", //Text local api key
    sender: "sporad"
  }
});

const smsClient = {
  sendPartnerWelcomeMessage: user => {
    if (user && user.phone && user.name) {
      const params = new URLSearchParams();
      params.append("numbers", [parseInt("91" + user.phone)]);
      params.append(
        "message",
        `Dear ${user.name}, Thanks for registering us, We ensure your property is protected 24/7, For any queries call us at +91-7399750001- Sporada Secure`
      );
      tlClient.post("/send", params);
    }
  },
  sendVerificationMessage: user => {
    if (user && user.phone) {
      const params = new URLSearchParams();
      params.append("numbers", [parseInt("91" + user.phone)]);
      params.append(
        "message",
        `Dear ${user.name}, Thanks for registering us, We ensure your property is protected 24/7, For any queries call us at +91-7399750001- Sporada Secure`
      );
      tlClient.post("/send", params);
    }
  }
};


const username = "vmssupport@sporadasecure.com";
const hash  = "f1bc87ee9a2bf23c09fccf7f2dce22da644deed99c59dff538842629aca37835";

// Config variables. Consult https://api.textlocal.in/docs for more info.
const test = "0";


// SMS Gateway API endpoint
const smsApiUrl = 'https://api.textlocal.in/send/';

function sendSMS(sender, mobile, msgType, otp, link , cname) {
  let message = "";
   console.log("Message type ->"+ msgType);
  // Define the message based on msgType
    if(msgType == '0'){
      message = 'The OTP for validating your mobile number is '+otp+' - Sporada Secure';
    }
    else if(msgType == '1'){
      message = 'The OTP for validating your new mobile number'+mobile+' is '+otp+'. - Sporada Secure';
    }
    else if(msgType == '2'){
      message = 'The OTP for your password change request is OTP '+otp+' , If you have not requested for change report immediately by calling +91-7399750001 - Sporada Secure';
    }
    else if(msgType == '3'){
      message = 'Please click this link '+link+' to activate your account '+mobile+' with Sporada Secure.';
    }
    else if(msgType == '4'){
      message = `Critical alert at ".$_GET["sitename"]." - on ".$_GET["datevar"]." - View event snapshot, video and Live video using the link : ".$_GET["snapurl"]." - Sporada Secure`;
    }
    else if(msgType == '5'){
      message = `Thanks for your payment of Rs : ".$_GET["amount"]." towards invoice for the month of ".$_GET["month"]." is received, To view the receipt click the link ".$_GET["receipturl"].". For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '6'){
      message = `Your mobile number is changed to ".$_GET["newnumber"]." successfully. - Sporada Secure`;
    }
    else if(msgType == '7'){
      message = `Your mobile number is changed to ".$_GET["newnumber"]." successfully. - If you have not made the request kindly call us at +91-7399750001 - Sporada Secure`;
    }
    else if(msgType == '8'){
      message = `Dear ".$_GET["cname"].", Thanks for registering us, We ensure your property is protected 24/7, For any queries call us at +91-7399750001- Sporada Secure`;
    }
    else if(msgType == '8'){
      message = `Your password is changed successfully – Sporada Secure`;
    }
    else if(msgType == '9'){
      message = `Your account '.$_GET["aid"].' is registered successfully. Login using your registered mobile no or email in Sporada Secure\'s - "JUJU" mobile app or desktop application - Sporada Secure`;
    }
    else if(msgType == '10'){
      message = `Your site - ".$_GET["sitename"]." is armed by Sporada secure command centre at ".$_GET["time"]." - For any queried contact us at +91-7399750001 - Sporada Secure`;
    }
    else if(msgType == '11'){
      message = `Your site - ".$_GET["sitename"]." is disarmed by Sporada secure command centre at ".$_GET["time"]." - For any queried contact us at +91-7399750001 - Sporada Secure`;
    }
    else if(msgType == '12'){
      message = `Your mobile number is changed from ".$_GET["cmobile"]." to ".$_GET["nmobile"]." successfully. If you have not requested for change kindly report immediately by calling +91-7399750001- Sporada Secure`;
    }
    else if(msgType == '13'){
      message = `Dear customer, Your account ".$_GET["acname"]." has been activated under plan ".$_GET["plname"]." and the monthly charges are".$_GET["billvalue"].". Thanks for your valuable order. For any queries call us at +91-7399750001 - Sporada Secure`;
    }
    else if(msgType == '14'){
      message = `Your upgrade plan request is processed and your current plan ".$_GET["cplan"]." is upgraded to ".$_GET["nplan"]." and the monthly charges for the new plan will Rs: ".$_GET["value"]." - For any queries call us at +91-7399750001 - Sporada Secure`;
    }
    else if(msgType == '15'){
      message = `Invoice for the month of ".$_GET["mname"]." is generated and the due date is ".$_GET["duedate"].", to view the invoice by clicking the link ".$_GET["invoiceurl"].". For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '16'){
      message = `The due date towards the invoice for the month of ".$_GET["mname"]." is Rs : ".$_GET["mvalue"].". Kindly make the payment before ".$_GET["duedate"].". If already paid please ignore this SMS. For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '17'){
      message = `The payment towards the invoice for the month of ".$_GET["mname"]." is still pending beyond the due date, Kindly make the payment immediately. For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '18'){
      message = `The service will be stopped within next 48 hrs due to non-payment towards the invoice for the month ".$_GET["mname"].", Kindly make the payment to avail un-interrupted services. For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '19'){
      message = `The service is stopped towards the account of non-payment towards the invoice for the month ".$_GET["mname"].". Kindly make the payment to resume the service. For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '20'){
      message = `The service is temporarily activated for 72 hrs, Kindly make the payment to enjoy un-interrupted services. For any queries call us at +91-7399750001 – Sporada Secure`;
    }
    else if(msgType == '21'){
      message = `Your esurveillance report is ready for download. Total alarm received ".$_GET["totevvrec"].", Real threats ".$_GET["totrth"].". Device functioning status ".$_GET["dstatus"].". For detailed report visit : ".$_GET["rurl"]." - Sporada Secure`;
    }
    else if(msgType == '22'){
      message = `Dear ".$_GET["pname"].", Thanks for your payment of Rs:".$_GET["cpamt"]." paid towards channel partner signup fee. - Sporada Secure`;
    }
    else if(msgType == '23'){
      message = `Congrats ".$_GET["pname"].", you have secured the business from ".$_GET["cname"]." today for ".$_GET["lvalue"].". - Sporada Secure" successfully. If you have not requested for change kindly report immediately by calling +91-7399750001- Sporada Secure`;
    }
    else if(msgType == '24'){
      message = `Your appointment today ".$_GET["appdate"]." by ".$_GET["apptime"]." with ".$_GET["pname"]." at ".$_GET["cname"]." , ".$_GET["addr"]." for ".$_GET["ename"]." is cancelled due to ".$_GET["reason"]." . - Sporada Secure`;
    }
    else if(msgType == '25'){
      message = `Your appointment today ".$_GET["appdate"]." by ".$_GET["apptime"]." with ".$_GET["pname"]." at ".$_GET["cname"].", ".$_GET["addr"]." for ".$_GET["ename"]." has been postponed to ".$_GET["ndate"]." - ".$_GET["ntime"].". - Sporada Secure`;
    }
    else if(msgType == '26'){
      message = `Good morning ".$_GET["pname"].", you have ".$_GET["appcnt"]." appointments today. Have a great day. Your estimated target is ".$_GET["target"].", achieved is ".$_GET["achieved"]." and the pending is ".$_GET["pending"].".- Sporada Secure`;
    }
    else if(msgType == '27'){
      message = `Good morning ".$_GET["pname"].", you have appointment today by ".$_GET["apptime"]." with our ".$_GET["design"].", ".$_GET["tname"]." regarding ".$_GET["ename"].". Thanks for your appointment, Have a great day.- Sporada Secure`;
    }
    else if(msgType == '28'){
      message = `Hi ".$_GET["pname"].", you have an appointment on ".$_GET["appdatetime"]." with our sales executive ".$_GET["tname"]." regarding ".$_GET["ename"].". Thanks for your appointment, Have a great day.- Sporada Secure`;
    }
    else if(msgType == '29'){
      message = `Dear ".$_GET["pname"].", Thanks for your valuable order and we welcome you to Sporada Secure. Your current plan ".$_GET["planname"].", Monthly bill amount is ".$_GET["planamt"].", bill cycle ".$_GET["plancycle"]." - For any queries call us at +91-739-975-0001 - Sporada Secure`;
    }
    else if(msgType == '30'){
      message = `Dear ".$_GET["pname"].", Thanks for signing up with Sporada Secure as ".$_GET["design"].". You can now login to the dashboard at ".$_GET["url"].". - Sporada Secure`;
    }
    else if(msgType == '31'){
      message = `Dear ".$_GET["pname"].", Thanks for your payment of Rs:".$_GET["pamt"]." paid towards channel partner signup fee. - Sporada Secure`;
    }
    else if(msgType == '32'){
      message = `Dear Sir / Madam, ".$_GET["pname"]." has sent you a proposal for ".$_GET["sub"].". Please click the link ".$_GET["url"]." to download the proposal. - Sporada Secure`;
    }
    else if(msgType == '33'){
      message = `You have an appointment on ".$_GET["appdate"]." by ".$_GET["apptime"]." with ".$_GET["cpname"]." at ".$_GET["cname"]." ,".$_GET["addr"]." for ".$_GET["ename"]." . - Sporada Secure`;
    }
console.log("Message->"+message);

  // Encode the message for the URL
  message = encodeURIComponent(message);
  // const data = `{username=${username}&hash=${hash}&message=${message}&sender=${sender}&numbers=${mobile}&test=${test}}`;
  // Data for text message
  const data = new URLSearchParams();
  data.append('username',username);
  data.append('hash', hash);
  data.append('message', message);
  data.append('sender', sender);
  data.append('numbers', mobile);
  data.append('test', test);

  // Send the POST request to the Textlocal API using Axios
  axios
    .post('https://api.textlocal.in/send/', data)
    .then((response) => {
      console.log('OTP sent successfully:', response.data);
    })
    .catch((error) => {
      console.error('Error sending OTP:', error);
    });
}


module.exports = {
  smsClient,
  sendSMS,
};

// Now import the client in any other file or wherever required and run these functions
// const smsClient = require("./smsClient");
// smsClient.sendVerificationMessage(user)