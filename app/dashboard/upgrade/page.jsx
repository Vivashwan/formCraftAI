"use client"
import React, { useEffect, useState } from 'react'
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { getMyPayments } from "@/app/_actions/payments";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "@/app/_actions/razorpay";
import { getPaymentStatus } from "@/app/_actions/user";

// Loads Razorpay's Checkout script on demand.
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

function Upgrade() {
  const [isPaid, setIsPaid] = useState(false);
  const [payments, setPayments] = useState([]);

  const refresh = () => {
    getPaymentStatus().then(setIsPaid);
    getMyPayments().then((p) => setPayments(p || []));
  };

  useEffect(() => {
    refresh();
  }, []);

  const makePayment = async (e) => {
    e.preventDefault();

    // 1) Create the order on the server (secret key stays server-side).
    const order = await createRazorpayOrder();
    if (order?.error) {
      toast.error(order.error);
      return;
    }

    // 2) Load Razorpay Checkout.
    const ok = await loadRazorpay();
    if (!ok) {
      toast.error("Failed to load the payment SDK. Check your connection.");
      return;
    }

    // 3) Open Checkout; verify the signature on the server when it completes.
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "formCraftAi",
      description: "Hero Pack — unlimited forms",
      prefill: { email: order.email },
      theme: { color: "#6366f1" },
      handler: async (resp) => {
        const v = await verifyRazorpayPayment({
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        });
        if (v?.ok) {
          toast("Payment successful — Pro unlocked!");
          refresh();
          // The sidebar lives in the persistent dashboard layout and won't
          // re-read the plan on its own — reload so Pro reflects everywhere.
          setTimeout(() => window.location.reload(), 1200);
        } else {
          toast.error(v?.error || "Payment verification failed.");
        }
      },
    });
    rzp.on("payment.failed", (resp) => {
      toast.error(resp?.error?.description || "Payment failed.");
    });
    rzp.open();
  };

  return (
    <div className='p-4 md:p-10'>
      {isPaid && (
        <div className="mx-auto max-w-3xl mb-6 flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 text-amber-800 px-4 py-3">
          <Crown className="h-5 w-5" />
          <span className="font-semibold">You're on the Hero (Pro) plan</span>
          <span className="text-sm">with unlimited forms unlocked.</span>
        </div>
      )}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch md:gap-8">
          <div
            className="flex flex-col rounded-2xl border-2 border-primary p-6 shadow-sm sm:order-last sm:px-8 lg:p-12"
          >
            <div className="text-center">
              <h2 className="text-lg font-medium text-foreground">
                Hero Pack
                <span className="sr-only">Plan</span>
              </h2>

              <p className="mt-2 sm:mt-4">
                <strong className="text-3xl font-bold text-foreground sm:text-4xl"> Rs.1 </strong>

                <span className="text-sm font-medium text-gray-700"></span>
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Unlimited form creation </span>
              </li>



              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Email support </span>
              </li>



              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Phone support </span>
              </li>

              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Community access </span>
              </li>
            </ul>

            <button
              disabled={isPaid}
              className="mt-6 block w-full mx-auto rounded-full bg-primary text-primary-foreground px-12 py-3 text-center text-sm font-medium hover:opacity-90 focus:outline-none focus:ring disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => makePayment(e)}
            >
              {isPaid ? "Current plan" : "Pay Now"}
            </button>

          </div>

          <div className="flex flex-col rounded-2xl border p-6 shadow-sm sm:px-8 lg:p-12">
            <div className="text-center">
              <h2 className="text-lg font-medium text-foreground">
                Starter Pack
                <span className="sr-only">Plan</span>
              </h2>

              <p className="mt-2 sm:mt-4">
                <strong className="text-3xl font-bold text-foreground sm:text-4xl"> Free </strong>

                <span className="text-sm font-medium text-gray-700"></span>
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Limited form creation </span>
              </li>



              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Email support </span>
              </li>

              <li className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 text-primary"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>

                <span className="text-muted-foreground"> Help center access </span>
              </li>
            </ul>


          </div>
        </div>

        {/* Billing history */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Billing history</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments yet.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Transaction</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">{p.createdAt || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.transactionId}
                      </td>
                      <td className="px-3 py-2">Rs. 1</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                            p.status === "SUCCESS"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.status || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Upgrade