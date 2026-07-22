"use server";

import { db } from "@/configs";
import { Payments, Users } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import moment from "moment";

async function currentEmail() {
  const user = await currentUser();
  return (
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user?.emailAddresses?.[0]?.emailAddress
  );
}

// Creates a Razorpay order server-side (key secret never leaves the server) and
// records a PENDING payment keyed by the order id. Returns the public key id so
// the client can open Checkout.
export async function createRazorpayOrder() {
  const email = await currentEmail();
  if (!email) return { error: "Please sign in before upgrading." };

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { error: "Payment is not configured (missing Razorpay keys)." };
  }

  const amount = 100; // ₹1 in paise
  const receipt = "rcpt_" + Date.now();

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR", receipt }),
    });
    const data = await res.json();
    if (!res.ok || !data?.id) {
      return { error: data?.error?.description || "Could not create order." };
    }

    await db.insert(Payments).values({
      transactionId: data.id,
      email,
      status: "PENDING",
      createdAt: moment().format("DD/MM/yyyy"),
    });

    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      email,
    };
  } catch (e) {
    console.error("Razorpay order error:", e);
    return { error: e?.message || "Payment failed." };
  }
}

// Verifies the checkout signature and, if valid, unlocks the user's plan.
export async function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  const email = await currentEmail();
  if (!email) return { error: "Unauthorized" };

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return { error: "Payment is not configured." };

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    await db
      .update(Payments)
      .set({ status: "FAILED" })
      .where(eq(Payments.transactionId, orderId));
    return { error: "Payment verification failed." };
  }

  await db
    .update(Payments)
    .set({ status: "SUCCESS" })
    .where(eq(Payments.transactionId, orderId));

  const existing = await db.select().from(Users).where(eq(Users.email, email));
  if (existing.length > 0) {
    await db
      .update(Users)
      .set({ paymentSuccess: true })
      .where(eq(Users.email, email));
  } else {
    await db.insert(Users).values({ email, paymentSuccess: true });
  }

  return { ok: true };
}
