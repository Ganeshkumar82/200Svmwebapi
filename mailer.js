const hbs = require("nodemailer-express-handlebars");
const nodemailer = require("nodemailer");
const path = require("path");
const helper = require("./helper");
const config = require("./config");

async function sendEmail(
  senderName,
  senderEmail,
  subjectstr,
  emailtemplate,
  emailLink,
  moduletag,
  pname,
  pbillingcycle,
  pfeatures = ""
) {
  // initialize nodemailer
  var queryData;
  try {
    console.log("emailtemplate ->" + emailtemplate);
    console.log("moduletag=>", moduletag);
    const settingValue = await helper.getServerSetting(moduletag);
    queryData = JSON.stringify(settingValue);
    console.log("queryData=>" + queryData);
  } catch (ex) {
    console.log("ex=>", { ex });
    return helper.getErrorResponse(moduletag + "_ERROR");
  }
  const mstr = JSON.parse(queryData);
  const SettingValue = JSON.parse(mstr.SettingValue);

  console.log("queryData.SettingValue=>" + SettingValue);
  const qEmail = SettingValue.Email;
  console.log("qEmail=>" + qEmail);
  const qpassword = SettingValue.password;
  console.log("qpassword=>" + qpassword);
  console.log("senderEmail=>" + senderEmail);
  const qFromName = SettingValue.FromName;
  console.log("qFromName=>" + qFromName);
  const qTemplate = SettingValue.Template;
  console.log("qTemplate=>" + qTemplate);
  const qSMTPSecure = SettingValue.SMTPSecure;
  console.log("qSMTPSecure=>" + qSMTPSecure);
  const qHost = SettingValue.host;
  console.log("qHost=>" + qHost);
  const qPort = SettingValue.Port;
  console.log("qPort=>" + qPort);
  var bSSL = false;
  if (qSMTPSecure == "true") bSSL = true;

  var transporter = nodemailer.createTransport({
    host: qHost,
    port: qPort,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: qEmail,
      pass: qpassword,
    },
    debug: true,
  });

  // point to the template folder
  const handlebarOptions = {
    viewEngine: {
      partialsDir: path.resolve("./views/"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views/"),
  };

  // use a template file with nodemailer
  transporter.use("compile", hbs(handlebarOptions));

  var mailOptions = {
    from: '"' + qFromName + '" <' + qEmail + ">", // sender address
    to: senderEmail, // list of receivers
    subject: subjectstr,
    template: qTemplate, // the name of the template file i.e email.handlebars
    context: {
      subject: subjectstr,
      name: senderName, // replace {{name}} with Adebola
      link: emailLink, // replace {{name}} with Adebola
      product: pname, // replace {{name}} with Adebola
      billingcycle: pbillingcycle, // replace {{name}} with Adebola
      productfeatures: pfeatures,
    },
  };

  // trigger the sending of the E-mail
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
        resolve(false);
      } else {
        console.log("Message sent: " + info.response);
        resolve(true);
      }
    });
  });
}

async function sendDemosite(
  senderName,
  senderEmail,
  subjectstr,
  emailtemplate,
  emailLink,
  moduletag,
  pname,
  pbillingcycle,
  RejectLink,
  pfeatures = ""
) {
  // initialize nodemailer
  var queryData;
  try {
    console.log("emailtemplate ->" + emailtemplate);
    console.log("moduletag=>", moduletag);
    const settingValue = await helper.getServerSetting(moduletag);
    queryData = JSON.stringify(settingValue);
    console.log("queryData=>" + queryData);
  } catch (ex) {
    console.log("ex=>", { ex });
    return helper.getErrorResponse(moduletag + "_ERROR");
  }
  const mstr = JSON.parse(queryData);
  const SettingValue = JSON.parse(mstr.SettingValue);

  console.log("queryData.SettingValue=>" + SettingValue);
  const qEmail = SettingValue.Email;
  console.log("qEmail=>" + qEmail);
  const qpassword = SettingValue.password;
  console.log("qpassword=>" + qpassword);
  console.log("senderEmail=>" + senderEmail);
  const qFromName = SettingValue.FromName;
  console.log("qFromName=>" + qFromName);
  const qTemplate = SettingValue.Template;
  console.log("qTemplate=>" + qTemplate);
  const qSMTPSecure = SettingValue.SMTPSecure;
  console.log("qSMTPSecure=>" + qSMTPSecure);
  const qHost = SettingValue.host;
  console.log("qHost=>" + qHost);
  const qPort = SettingValue.Port;
  console.log("qPort=>" + qPort);
  var bSSL = false;
  if (qSMTPSecure == "true") bSSL = true;

  var transporter = nodemailer.createTransport({
    host: qHost,
    port: qPort,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: qEmail,
      pass: qpassword,
    },
    debug: true,
  });

  // point to the template folder
  const handlebarOptions = {
    viewEngine: {
      partialsDir: path.resolve("./views/"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views/"),
  };

  // use a template file with nodemailer
  transporter.use("compile", hbs(handlebarOptions));

  var mailOptions = {
    from: '"' + qFromName + '" <' + qEmail + ">", // sender address
    to: senderEmail, // list of receivers
    subject: subjectstr,
    template: qTemplate, // the name of the template file i.e email.handlebars
    context: {
      subject: subjectstr,
      name: senderName, // replace {{name}} with Adebola
      link: emailLink, // replace {{name}} with Adebola
      product: pname, // replace {{name}} with Adebola
      billingcycle: pbillingcycle, // replace {{name}} with Adebola
      productfeatures: pfeatures,
      link1: RejectLink,
    },
  };

  // trigger the sending of the E-mail
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
        resolve(false);
      } else {
        console.log("Message sent: " + info.response);
        resolve(true);
      }
    });
  });
}

module.exports = {
  sendEmail,
  sendDemosite,
};
