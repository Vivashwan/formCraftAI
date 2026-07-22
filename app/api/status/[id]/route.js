import { NextResponse } from "next/server";
import sha256 from "crypto-js/sha256";
import axios from "axios";
import { db } from "@/configs";
import { Payments, Users } from "@/configs/schema";
import { eq } from "drizzle-orm";

// Marks the user who started this transaction as paid so they can create
// unlimited forms. The payer's email was recorded (by the upgrade page) in the
// Payments table when checkout began, keyed by transactionId.
async function unlockUserForTransaction(transactionId) {
    const rows = await db
        .select()
        .from(Payments)
        .where(eq(Payments.transactionId, transactionId));

    const payment = rows?.[0];
    if (!payment) return;

    await db
        .update(Payments)
        .set({ status: "SUCCESS" })
        .where(eq(Payments.transactionId, transactionId));

    // Upsert the user's paid flag (insert if this is their first record).
    const existing = await db
        .select()
        .from(Users)
        .where(eq(Users.email, payment.email));

    if (existing?.length > 0) {
        await db
            .update(Users)
            .set({ paymentSuccess: true })
            .where(eq(Users.email, payment.email));
    } else {
        await db
            .insert(Users)
            .values({ email: payment.email, paymentSuccess: true });
    }
}

export async function POST(req) {
    const data = await req.formData();
    console.log(data);
    const status = data.get("code");
    const merchantId = data.get("merchantId");
    const transactionId = data.get("transactionId");

    const st = `/pg/v1/status/${merchantId}/${transactionId}` + process.env.PHONEPE_SALT_KEY;
    const dataSha256 = sha256(st);

    const checksum = dataSha256 + "###" + process.env.PHONEPE_SALT_INDEX;
    console.log(checksum);

    const options = {
        method: "GET",
        url: `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${transactionId}`,
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
            "X-MERCHANT-ID": `${merchantId}`,
        },
    };

    try {
        // CHECK PAYMENT STATUS
        const response = await axios.request(options);
        console.log("r===", response.data.code);

        if (response.data.code == "PAYMENT_SUCCESS") {
            await unlockUserForTransaction(transactionId);
        }

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}dashboard`, {
            status: 301,
        });
    } catch (error) {
        console.error("Error checking payment status:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}dashboard`, {
            status: 301,
        });
    }
}