import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function Home() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth-session");

    if (authCookie && authCookie.value) {
      try {
        const cookieValue = authCookie.value.trim();
        if (cookieValue) {
          JSON.parse(cookieValue);
          redirect("/admin");
        }
      } catch {
        // Invalid cookie, redirect to login
      }
    }
    redirect("/login");
  } catch (error) {
    redirect("/login");
  }
}
