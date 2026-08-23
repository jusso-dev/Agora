import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="py-10">
      <AuthForm mode="signup" />
    </div>
  );
}
