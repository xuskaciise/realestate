"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Home, FileText, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Total Properties",
    value: "1,234",
    change: "+12.5%",
    icon: Home,
  },
  {
    title: "Active Users",
    value: "856",
    change: "+8.2%",
    icon: Users,
  },
  {
    title: "Documents",
    value: "3,421",
    change: "+15.3%",
    icon: FileText,
  },
  {
    title: "Revenue",
    value: "$45,231",
    change: "+23.1%",
    icon: TrendingUp,
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Somali International University Admin Panel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> from last
                  month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates and changes in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      Activity item {i}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Just now
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent">
                Add New Property
              </button>
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent">
                Upload Document
              </button>
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent">
                Manage Users
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
