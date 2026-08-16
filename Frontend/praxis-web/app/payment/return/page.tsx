import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturnContent } from "./PaymentReturnContent";
import { PageSpinner } from "@/components/ui/Spinner";

export const metadata: Metadata = { title: "Confirming payment" };

export default function PaymentReturnPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
      <Suspense fallback={<PageSpinner />}>
        <PaymentReturnContent />
      </Suspense>
    </div>
  );
}
