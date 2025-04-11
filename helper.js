//Checking the crypto module
const db = require("./services/db");
const config = require("./config");
const crypto = require("crypto");

function encrypt(text, secret) {
  let cipher = crypto.createCipheriv("aes-128-cbc", secret, secret);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

async function decrypt(encrypted, secret) {
  let decipher = crypto.createDecipheriv("aes-128-cbc", secret, secret);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  return decrypted + decipher.final("utf8");
}

async function checkAPIKey(apikey, apisecret) {
  const [result1] = await db.spcall(
    "CALL SP_API_CHECK(?,?,@isValid);select @isValid;",
    [apikey, apisecret]
  );
  const objectValue = result1[1][0];

  if (objectValue["@isValid"] == null) {
    const IsValidAPI = JSON.stringify(0);
    return { IsValidAPI };
  } else {
    const IsValidAPI = JSON.stringify(1);
    return { IsValidAPI };
  }
}

async function getCustomerID(srcID, srcType) {
  var btype = srcType;
  var sSQLstr = "";
  var returnID = 0;
  if (btype == 0)
    sSQLstr =
      "SELECT customerreg_id from customermaster where status=1 and customer_id=" +
      srcID;
  else
    sSQLstr =
      "SELECT customerreg_id from customermaster where status=1 and customer_id in (select customer_id from branchmaster where branch_id=" +
      srcID +
      ")";

  const result = await db.query(sSQLstr);
  console.log("helper->" + result);
  if (result[0]) {
    returnID = result[0].customerreg_id;
  }
  return returnID;
}

function phonenumber(inputtxt) {
  var phoneno = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  if (inputtxt.match(phoneno)) {
    return true;
  } else {
    return false;
  }
}

async function getSuccessResponse(code, message, Value, secret) {
  // const result = await db.query('select * from dberrormessages where errorcode="'+successcode+'";');
  // console.log("helper->"+result);
  // if (result[0])
  // {
  //   const successcode = result[0].errorcode;
  //   const successmessage = result[0].errormessage;
  //   const returnstr = JSON.stringify({successcode,successmessage,Value});
  //   try
  //   {
  //     if (secret!="")
  //     {
  //       const encryptedResponse = encrypt(returnstr,secret);
  //       console.log("returnstr=>"+JSON.stringify(encryptedResponse));
  //       return {encryptedResponse};
  //     }
  //     else
  //     {
  //       return {successcode,successmessage,Value};

  //     }
  //   }
  //   catch(Ex)
  //   {
  //     return {successcode,successmessage,Value};

  //   }
  // }
  // else
  // {
  try {
    const returnstr = JSON.stringify({ code, message, Value });
    if (secret != "") {
      const encryptedResponse = encrypt(returnstr, secret);
      console.log("returnstr=>" + JSON.stringify(encryptedResponse));
      return { encryptedResponse };
    } else {
      return { code, message, Value };
    }
  } catch (Ex) {
    return { code, message, Value };
  }
}
// }

async function getErrorResponse(code, message, modulename, secret) {
  // console.log("modulename ->"+modulename);
  // const result = await db.query('select * from dberrormessages where errorcode="'+errorcode+'";');
  // console.log("helper->"+JSON.stringify(result));
  // if (result[0])
  // {
  //   const errorcode = result[0].errorcode;
  //   const errormessage = result[0].errormessage;
  //   const returnstr = JSON.stringify({errorcode,errormessage,modulename});
  //   try
  //   {
  //     if (secret!="")
  //     {
  //       const encryptedResponse = encrypt(returnstr,secret);
  //       console.log("returnstr=>"+JSON.stringify(encryptedResponse));
  //       return {encryptedResponse};
  //     }
  //     else
  //     {
  //       return {errorcode,errormessage,modulename};
  //     }
  //   }
  //   catch(Ex)
  //   {
  //     return {errorcode,errormessage,modulename};
  //   }
  // }
  // else
  // {
  try {
    const returnstr = JSON.stringify({ code, message, modulename });
    if (secret != "") {
      const encryptedResponse = encrypt(returnstr, secret);
      console.log("returnstr=>" + JSON.stringify(encryptedResponse));
      return { encryptedResponse };
    } else {
      return { code, message, modulename };
    }
  } catch (Ex) {
    return { code, message, modulename };
  }
  // }
}

// async function getErrorResponse(errorcode, modulename, secret, errorFromDB) {
//   const result = await db.query('select * from dberrormessages where errorcode = ?', [errorcode]);
//   console.log("helper->", result);

//   if (result[0]) {
//     const errorcode = result[0].errorcode;
//     const errormessage = result[0].errormessage;
//     const returnstr = JSON.stringify({ errorcode, errormessage, modulename });

//     try {
//       if (secret !== "") {
//         const encryptedResponse = encrypt(returnstr, secret);
//         console.log("returnstr=>", JSON.stringify(encryptedResponse));
//         return { encryptedResponse };
//       } else {
//         return { errorcode, errormessage };
//       }
//     } catch (Ex) {
//       return { errorcode, errormessage };
//     }
//   } else {
//     try {
//       const returnstr = JSON.stringify({ errorcode, modulename });

//       if (secret !== "") {
//         const encryptedResponse = encrypt(returnstr, secret);
//         console.log("returnstr=>", JSON.stringify(encryptedResponse));
//         return { encryptedResponse };
//       } else {
//         return { errorcode, modulename };
//       }
//     } catch (Ex) {
//       return { errorcode, modulename };
//     }
//   }
// }

async function getServerSetting(SettingName) {
  const result = await db.query(
    "select setting_value from serversettings where setting_name='" +
      SettingName +
      "';"
  );
  console.log("helper->getServerSetting->" + result[0].setting_value);
  if (result[0]) {
    const SettingValueStr = result[0].setting_value;
    const SettingValue = await decrypt(SettingValueStr, "SporadaSecure@23");
    console.log("SettingValue after decrypt=>" + SettingValue);
    return { SettingValue };
  } else {
    const errormessage = "Error occured in modulename. No Error description.";
    return { errorcode, errormessage };
  }
}

function getEncryptionKey() {
  return secretKey;
}

function getOffset(currentPage = 1, listPerPage) {
  return (currentPage - 1) * [listPerPage];
}

function emptyOrRows(rows) {
  if (!rows) {
    return [];
  }
  return rows;
}

function hashSiteId(siteId, salt) {
  return crypto
    .createHash("sha256")
    .update(siteId.toString() + salt)
    .digest("hex");
}

module.exports = {
  phonenumber,
  checkAPIKey,
  getEncryptionKey,
  getErrorResponse,
  getSuccessResponse,
  getOffset,
  encrypt,
  decrypt,
  getServerSetting,
  getCustomerID,
  emptyOrRows,
  hashSiteId,
};
