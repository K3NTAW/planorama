"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="absolute top-8 left-3 z-40 p-2 rounded-full bg-black/50 hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
      aria-label="Back"
    >
      <ArrowLeft className="w-6 h-6 text-white" />
    </button>
  );
} 