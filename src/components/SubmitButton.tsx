"use client";

// Bir <form> içinde kullanılan buton — form gönderilirken otomatik olarak
// disabled olur, böylece kullanıcı aynı butona iki kere art arda basıp
// aynı isteği tekrar gönderemez (çift tıklama koruması).
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <button {...props} type="submit" disabled={pending}>
      {pending ? pendingText ?? "..." : children}
    </button>
  );
}
