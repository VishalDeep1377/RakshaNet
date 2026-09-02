// Quick test script to verify Vonage SMS works
// Usage: node test-sms.mjs YOUR_API_KEY YOUR_API_SECRET TEST_PHONE
// Example: node test-sms.mjs abc123 xyz456 7999829540

const [,, API_KEY, API_SECRET, PHONE] = process.argv;

if (!API_KEY || !API_SECRET || !PHONE) {
  console.log("Usage: node test-sms.mjs <vonage_api_key> <vonage_api_secret> <10-digit-phone>");
  console.log("Example: node test-sms.mjs abc123 xyz456 9876543210");
  process.exit(1);
}

const number = PHONE.replace(/\D/g, "");
const e164 = number.length === 10 ? `91${number}` : number;

const message = `Test from RakshaNet SilentShield. This is a test emergency SMS. If received, the system is working. Please ignore.`;

console.log("=== Vonage SMS Test ===");
console.log("To:", e164);
console.log("Message:", message);
console.log();

const body = new URLSearchParams({
  api_key: API_KEY,
  api_secret: API_SECRET,
  to: e164,
  from: "RAKSHA",
  text: message,
});

const res = await fetch("https://rest.nexmo.com/sms/json", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
});

const data = await res.json();
console.log("HTTP Status:", res.status);
console.log("Response:", JSON.stringify(data, null, 2));

const msg = data?.messages?.[0];
if (msg?.status === "0") {
  console.log(`\n✅ SMS SENT SUCCESSFULLY! Message ID: ${msg["message-id"]}`);
} else {
  console.log(`\n❌ SMS FAILED: ${msg?.["error-text"] || "Unknown error"}`);
}
