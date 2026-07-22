"use server";

import { db } from "@/configs";
import { Users } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function getPaymentStatus() {
  const user = await currentUser();
  const email =
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return false;
  const rows = await db.select().from(Users).where(eq(Users.email, email));
  return rows?.[0]?.paymentSuccess === true;
}
