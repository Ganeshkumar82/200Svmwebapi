const cron = require("node-cron");
const db = require("./services/db");
const mailer = require("./mailer");

// cron.schedule("05 15 * * *", fetchAndSendEmail);

async function fetchAndSendEmail() {
  try {
    // Fetch records from the demo_end table
    const sql = await db.query(`
      SELECT branch_id, log_date, end_date 
      FROM demo_end 
      WHERE status = 1 AND end_date = CURDATE() + INTERVAL 1 DAY and branch_id In(select branch_id from branchmaster where status = 1);
    `);

    if (sql.length === 0) {
      console.log("No records found to send.");
      return;
    }

    // Fetch administrator email IDs
    const sql1 = await db.query(`
      SELECT Email_id FROM usermaster 
      WHERE status = 1 AND user_design = 'administrator'
    `);

    const emailid =
      sql1.map((item) => item.Email_id).join(",") ||
      `support@sporadasecure.com,ceo@sporadasecure.com,sales@sporadasecure.com`;

    // Process all emails concurrently
    const emailPromises = sql.map(async (record) => {
      const { branch_id, end_date } = record;

      // Fetch branch name
      const branchData = await db.query(
        `SELECT branch_name FROM branchmaster WHERE branch_id = ?`,
        [branch_id]
      );

      if (branchData.length === 0) {
        console.log(`No branch found for branch_id: ${branch_id}`);
        return;
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1); // Get tomorrow's date
      const formattedDate = tomorrow.toISOString().split("T")[0];
      const branchName = branchData[0].branch_name;
      const emailSubject = `Action Required!!! Demo Subscription expiring on ${formattedDate} for ${branchName}`;
      const extendLink = `http://api.ssipl.org/admin/demosite?siteid=${branch_id}&action=extend`;
      const endLink = `http://api.ssipl.org/admin/demosite?siteid=${branch_id}&action=end`;

      const emailSent = await mailer.sendDemosite(
        "Administrator",
        emailid,
        emailSubject,
        "demosite.html",
        extendLink,
        "DEMO_SITE",
        branchName,
        "DEMO SITE",
        endLink,
        ""
      );

      if (emailSent == true) {
        // Mark email as sent
        await db.query(
          `UPDATE demo_end SET mail_sent = 1 WHERE branch_id = ?`,
          [branch_id]
        );
        console.log(`Email sent successfully for branch: ${branchName}`);
      } else {
        console.log(`Failed to send email for branch: ${branchName}`);
      }
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error("Error fetching data or sending email:", error);
  }
}

module.exports = {
  fetchAndSendEmail,
};
