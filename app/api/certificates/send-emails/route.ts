import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import fs from "node:fs";
import path from "node:path";

export async function POST(req: Request) {
    try {
        const { certificateIds, customMessage } = await req.json();

        if (!certificateIds || !Array.isArray(certificateIds)) {
            return NextResponse.json(
                { error: "certificateIds array required" },
                { status: 400 }
            );
        }

        const results: any[] = [];

        for (const certId of certificateIds) {
            try {
                const certificate = await prisma.certificate.findUnique({
                    where: { id: certId },
                });

                if (!certificate) {
                    results.push({
                        id: certId,
                        status: "error",
                        error: "Certificate not found",
                    });
                    continue;
                }

                if (!certificate.email || certificate.email.trim() === "") {
                    results.push({
                        id: certId,
                        fullName: certificate.fullName,
                        status: "skipped",
                        reason: "No email address",
                    });
                    continue;
                }

                // Skip if email was already sent successfully
                if (certificate.emailStatus === "SUCCESS") {
                    results.push({
                        id: certId,
                        fullName: certificate.fullName,
                        email: certificate.email,
                        status: "skipped",
                        reason: "Already sent",
                    });
                    continue;
                }

                if (!certificate.imagePath || !fs.existsSync(certificate.imagePath)) {
                    results.push({
                        id: certId,
                        fullName: certificate.fullName,
                        status: "error",
                        error: "Certificate image not found",
                    });
                    continue;
                }

                // Read the certificate image
                const imageBuffer = await fs.promises.readFile(certificate.imagePath);
                const imageBase64 = imageBuffer.toString("base64");

                // Create email HTML with custom message
                const verifyUrl = `${process.env.APP_URL || "http://localhost:3000"}/verify/${certificate.id}`;
                const titleCaseName = certificate.fullName
                    .split(" ")
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(" ");

                const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 10px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Congratulations, ${titleCaseName}!</h1>
                </div>
                <div class="content">
                  <p>${customMessage || "We are pleased to present you with your certificate from Addis Ababa University Technology Workshop."}</p>
                  
                  <p>Your certificate is attached to this email. You can also verify it online anytime either via the qr code directly from the certificate or this link:</p>
                  
                  <div style="text-align: center;">
                    <a href="${verifyUrl}" target="_blank">Verify Certificate Online</a>
                  </div>
                  
                  <p style="margin-top: 20px;">Keep this certificate safe as proof of your achievement!</p>
                  
                  <div style="text-align: center;">
                    <p style="font-size: 14px; color: #555;">Download & share your achievement on LinkedIn and mention our page to shine! ✨</p>
                    <a href="https://www.linkedin.com/company/aau-tech-club/" style="display: inline-block; background: #0077b5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
                      Follow ATC on LinkedIn
                    </a>
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">For further opportunities and updates.</p>
                  </div>
                </div>
                <div class="footer">
                  <p>Addis Ababa University Technology Club Workshop Team</p>
                </div>
              </div>
            </body>
          </html>
        `;

                // Send email with attachment
                const result = await sendEmail(
                    certificate.email,
                    `🎓 Your Certificate from AAU Technology Workshop Team - ${certificate.certificateNumber}`,
                    emailHtml,
                    [
                        {
                            filename: `${certificate.certificateNumber}.png`,
                            content: imageBase64,
                            encoding: "base64",
                        },
                    ]
                );

                if (result.success) {
                    await prisma.certificate.update({
                        where: { id: certId },
                        data: {
                            emailSentAt: new Date(),
                            emailStatus: "SUCCESS",
                            emailError: null,
                        },
                    });

                    results.push({
                        id: certId,
                        fullName: certificate.fullName,
                        email: certificate.email,
                        status: "sent",
                    });
                } else {
                    await prisma.certificate.update({
                        where: { id: certId },
                        data: {
                            emailStatus: "FAILED",
                            emailError: String(result.error || "Unknown error"),
                        },
                    });

                    results.push({
                        id: certId,
                        fullName: certificate.fullName,
                        email: certificate.email,
                        status: "failed",
                        error: String(result.error),
                    });
                }
            } catch (err: any) {
                results.push({
                    id: certId,
                    status: "error",
                    error: err?.message || "Unknown error",
                });
            }
        }

        const sent = results.filter((r) => r.status === "sent").length;
        const failed = results.filter((r) => r.status === "failed" || r.status === "error").length;

        return NextResponse.json({
            results,
            summary: {
                total: certificateIds.length,
                sent,
                failed,
                skipped: results.filter((r) => r.status === "skipped").length,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
