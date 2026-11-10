import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="pt-16">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
