import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function VerifyPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Try finding by internal ID (UUID) first, then by Certificate Number (Serial)
    const certificate = await prisma.certificate.findFirst({
        where: {
            OR: [
                { id },
                { certificateNumber: id }
            ]
        },
    });

    if (!certificate) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full">
                    <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                        ></path>
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Certificate Verified
                </h1>
                <p className="text-slate-500 mb-8">
                    This digital certificate is authentic and has been verified by <a href="https://www.linkedin.com/company/aau-tech-club/" target="_blank">Addis Ababa Technology Club</a>.
                </p>

                <div className="space-y-4 text-left border-t border-slate-100 pt-6">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Issued To
                        </label>
                        <p className="text-lg font-medium text-slate-900">
                            {certificate.fullName}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Certificate Number
                        </label>
                        <p className="font-mono text-slate-700">
                            {certificate.certificateNumber}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Issue Date
                        </label>
                        <p className="text-slate-700">
                            {new Date(certificate.issuedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Signed by <a href="https://t.me/AAU_Tech_Club" target="_blank">Addis Ababa Technology Club</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
