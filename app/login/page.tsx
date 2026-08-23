import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="py-10">
      <AuthForm mode="login" />
    </div>
  );
}
