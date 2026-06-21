import "dotenv/config";
import { calendarService } from "../src/server/api/routers/calendar/service";
import { emailsService } from "../src/server/api/routers/emails/service";
import { ensureCorsairConfigured } from "../src/server/corsair";

async function main() {
  await ensureCorsairConfigured();
  const tenantId = "dEm4pbtfLrTqheuMfqQzVASeTET1mhi7";

  console.log("Scheduling calendar invite...");
  // Next Thursday (from Wednesday June 17, 2026) is June 25, 2026
  const startTime = "2026-06-25T09:00:00+05:30";
  const endTime = "2026-06-25T10:00:00+05:30";

  const calendarResult = await calendarService.create(tenantId, {
    calendarId: "primary",
    summary: "Meeting",
    description: "I look forward to our meeting.",
    startTime,
    endTime,
    attendees: ["iamsubhrangsubera@gmail.com"],
  });

  console.log("Calendar event scheduled:", calendarResult);

  console.log("Sending email...");
  const emailResult = await emailsService.send(tenantId, {
    to: "iamsubhrangsubera@gmail.com",
    subject: "Looking forward to our meeting",
    body: "Hi,\n\nI look forward to our meeting next Thursday at 9 AM.\n\nBest regards,\nSubhrangsu",
  });

  console.log("Email sent successfully:", emailResult);
}

main().catch(console.error).finally(() => process.exit());
