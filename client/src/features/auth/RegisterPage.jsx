
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "./authSchema";
import { registerUser } from "./authService";
import AuthField from "./AuthField";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      displayName: "",
    },
  });

  async function onSubmit(values) {
    setServerError("");

    try {
      await registerUser(values);
      navigate("/login", {
        replace: true,
        state: { message: "Account created! Please log in." },
      });
    } catch (error) {
      const data = error.response?.data;

      if (Array.isArray(data?.errors)) {
        data.errors.forEach(({ field, message }) => {
          if (["username", "email", "password", "displayName"].includes(field)) {
            setError(field, { type: "server", message });
          }
        });
      }

      setServerError(
        data?.message || "Unable to create your account. Please try again."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-semibold">InstaSpace</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Join your community and share your moments.
          </p>
        </div>

        {serverError && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <AuthField
            label="Username"
            placeholder="your_username"
            autoComplete="username"
            registration={register("username")}
            error={errors.username?.message}
          />

          <AuthField
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            registration={register("email")}
            error={errors.email?.message}
          />

          <AuthField
            label="Display name (optional)"
            placeholder="Your name"
            autoComplete="name"
            registration={register("displayName")}
            error={errors.displayName?.message}
          />

          <AuthField
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            registration={register("password")}
            error={errors.password?.message}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-neutral-950 hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
