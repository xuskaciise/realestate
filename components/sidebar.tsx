"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Home,
  Building2,
  Receipt,
  CreditCard,
  BarChart3,
  Droplet,
  UserCog,
  Wrench,
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Properties",
    href: "/admin/properties",
    icon: Home,
  },
  {
    title: "Tenants",
    href: "/admin/tenants",
    icon: Users,
  },
  {
    title: "Rents",
    href: "/admin/rents",
    icon: Receipt,
  },
  {
    title: "Monthly Services",
    href: "/admin/monthly-services",
    icon: Droplet,
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    title: "Maintenance",
    href: "/admin/maintenance",
    icon: Wrench,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: UserCog,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-4">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Knowledge, Skills & Morality
          </p>
        </div>
      </div>
    </div>
  );
}
