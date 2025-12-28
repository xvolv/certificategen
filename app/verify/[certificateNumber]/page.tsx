import { prisma } from "../../../lib/prisma";

export default async function VerifyPage({
  params,
}: {
  params: { certificateNumber: string };
}) {
  const cert = await prisma.certificate.findUnique({
    where: { certificateNumber: params.certificateNumber },
  });

  if (!cert) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Certificate Verification</h1>
        <p className="mt-4 text-red-600">Status: Invalid</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Certificate Verification</h1>
      <div className="mt-4 space-y-2">
        <p>
          <span className="font-medium">Full Name:</span> {cert.fullName}
        </p>
        <p>
          <span className="font-medium">Certificate Number:</span>{" "}
          {cert.certificateNumber}
        </p>
        <p>
          <span className="font-medium">Issuer:</span> Addis Ababa University
        </p>
        <p>
          <span className="font-medium">Issued Date:</span>{" "}
          {new Date(cert.issuedAt).toLocaleString()}
        </p>
        <p>
          <span className="font-medium">Status:</span> Valid
        </p>
      </div>
    </div>
  );
}
