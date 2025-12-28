import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/mail";

async function testConnection() {
    console.log("🔍 Testing Neon Database Connection...");
    try {
        const count = await prisma.certificate.count();
        console.log("✅ Successfully connected to Neon! Current Certificate count:", count);
    } catch (error) {
        console.error("❌ Database connection failed:", error);
    }
}

async function testEmail() {
    const testEmail = process.env.SMTP_USER; // Sending to self for testing
    if (!testEmail) {
        console.error("❌ SMTP_USER is not set in .env");
        return;
    }

    console.log(`📧 Sending test email to ${testEmail}...`);
    const result = await sendEmail(
        testEmail,
        "Test Certificate Email",
        "<h1>It works!</h1><p>This is a test email from your local certificate generator.</p>"
    );

    if (result.success) {
        console.log("✅ Test email sent successfully! MessageID:", result.messageId);
    } else {
        console.error("❌ Failed to send test email:", result.error);
    }
}

async function main() {
    await testConnection();
    await testEmail();
    await prisma.$disconnect();
}

main();
