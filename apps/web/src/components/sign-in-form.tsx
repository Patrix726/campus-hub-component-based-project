import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, GraduationCap } from "lucide-react";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard");
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-amber-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-600">Sign in to your CampusHub account</p>
      </div>

      {/* Form */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <div>
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name} className="text-lg font-medium text-gray-900">
                    Email
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-xl border-amber-200 focus:border-amber-400 focus:ring-amber-400 h-12"
                    placeholder="your@email.com"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-red-500 text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name} className="text-lg font-medium text-gray-900">
                    Password
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="rounded-xl border-amber-200 focus:border-amber-400 focus:ring-amber-400 h-12"
                    placeholder="••••••••"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-red-500 text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 rounded-full py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                disabled={!canSubmit || isSubmitting}
              >
                <LogIn className="w-5 h-5 mr-2" />
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={onSwitchToSignUp}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Need an account? Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}