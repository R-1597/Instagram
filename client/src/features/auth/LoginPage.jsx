
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "./authSchema";
import { loginUser } from "./authService";
import AuthField from "./AuthField";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    setServerError("");

    try {
      const data = await loginUser(values);

      if (!data.accessToken || !data.user) {
        throw new Error("The server returned an unexpected login response.");
      }

      // Temporary session storage; Stage 2.3 will centralize session state.
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      navigate(location.state?.from || "/", { replace: true });
    } catch (error) {
      setServerError(
        error.response?.data?.message ||
          error.message ||
          "Unable to log in. Please try again."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-semibold">InstaSpace</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Welcome back. Log in to continue.
          </p>
        </div>

        {location.state?.message && (
          <p className="mb-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {location.state.message}
          </p>
        )}

        {serverError && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <AuthField
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            registration={register("email")}
            error={errors.email?.message}
          />

          <AuthField
            label="Password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            registration={register("password")}
            error={errors.password?.message}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-neutral-950 hover:underline">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
