"use server";

import { db } from "@/configs";
import { Payments } from "@/configs/schema";
import { desc, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import sha256 from "crypto-js/sha256";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";

async function currentEmail() {
  const user = await currentUser();
  return (
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user?.emailAddresses?.[0]?.emailAddress
  );
}

export async function getMyPayments() {
  const email = await currentEmail();
  if (!email) return [];
  return db
    .select()
    .from(Payments)
    .where(eq(Payments.email, email))
    .orderBy(desc(Payments.id));
}

const UAT_PAY_API_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

// Starts a PhonePe checkout entirely on the server so the merchant salt key is
// never exposed to the browser. Records the payer's email against the
// transaction so the callback can unlock the right account.
export async function initiatePayment() {
  const user = await currentUser();
  const email =
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return { error: "Please sign in before upgrading." };

  const merchantId = process.env.PHONEPE_MERCHANT_ID;
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX;
  if (!merchantId || !saltKey || !saltIndex) {
    return { error: "Payment is not configured (missing PhonePe credentials)." };
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const transactionId = "Tr-" + uuidv4().toString(36).slice(-6);

  await db.insert(Payments).values({
    transactionId,
    email,
    status: "PENDING",
    createdAt: moment().format("DD/MM/yyyy"),
  });

  const payload = {
    merchantId,
    merchantTransactionId: transactionId,
    merchantUserId: "MUID-" + uuidv4().toString(36).slice(-6),
    amount: 100,
    redirectUrl: `${base}api/status/${transactionId}`,
    redirectMode: "POST",
    callbackUrl: `${base}api/status/${transactionId}`,
    mobileNumber: "9999999999",
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const dataBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum =
    sha256(dataBase64 + "/pg/v1/pay" + saltKey) + "###" + saltIndex;

  try {
    const response = await axios.post(
      UAT_PAY_API_URL,
      { request: dataBase64 },
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );
    const redirect =
      response?.data?.data?.instrumentResponse?.redirectInfo?.url;
    if (redirect) return { redirect };
    return { error: "Could not start payment. Please try again." };
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || "Payment failed.";
    console.error("PhonePe error:", error?.response?.data || error);
    return { error: message };
  }
}
