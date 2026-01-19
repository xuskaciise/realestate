import { ToastProvider } from "@/components/ui/toast";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
