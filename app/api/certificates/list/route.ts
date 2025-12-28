import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { batchId } = await req.json();

        if (!batchId) {
            return NextResponse.json(
                { error: "batchId required" },
                { status: 400 }
            );
        }

        // For now, we'll fetch all certificates since we don't have a batchId field
        // In a real scenario, you might want to add a batchId field to the Certificate model
        // For this implementation, we'll just return all recent certificates
        const certificates = await prisma.certificate.findMany({
            orderBy: { issuedAt: "desc" },
            take: 100, // Limit to recent 100
        });

        return NextResponse.json({ certificates });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
