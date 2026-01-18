"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Home, Receipt, TrendingUp, UserCog } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
import { LoadingOverlay } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";

type House = {
  id: string;
  name: string;
  address: string;
  rooms?: Room[];
};

type Room = {
  id: string;
  name: string;
  monthlyRent: number;
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
};

type Rent = {
  id: string;
  tenantId: string;
  roomId: string;
  totalRent: number;
  startDate: string;
  endDate: string;
  createdAt: string;
};

type Payment = {
  id: string;
  amount: number;
  tenantId: string;
  createdAt: string;
};

type User = {
  id: string;
  fullname: string;
  status: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState<House[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rents, setRents] = useState<Rent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchHouses = useCallback(async () => {
    try {
      const response = await fetch("/api/houses", {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setHouses(data || []);
      }
    } catch (error) {
      console.error("Error fetching houses:", error);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch("/api/tenants", {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data || []);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  }, []);

  const fetchRents = useCallback(async () => {
    try {
      const response = await fetch("/api/rents", {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setRents(data || []);
      }
    } catch (error) {
      console.error("Error fetching rents:", error);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/payments", {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users", {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchHouses(),
        fetchTenants(),
        fetchRents(),
        fetchPayments(),
        fetchUsers(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchHouses, fetchTenants, fetchRents, fetchPayments, fetchUsers]);

  // Calculate statistics
  const totalProperties = houses.length;
  const totalRooms = houses.reduce((sum, house) => sum + (house.rooms?.length || 0), 0);
  const activeTenants = tenants.length;
  const activeRents = rents.filter(rent => {
    const today = dayjs();
    const endDate = dayjs(rent.endDate);
    return endDate.isAfter(today) || endDate.isSame(today, 'day');
  }).length;
  const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const activeUsers = users.filter(user => user.status === 'Active').length;

  // Get recent rents (last 5)
  const recentRents = rents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Get recent payments (last 5)
  const recentPayments = payments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Combine and sort recent activity
  const recentActivity = [
    ...recentRents.map(rent => ({
      type: 'rent' as const,
      id: rent.id,
      title: `New rent agreement created`,
      time: rent.createdAt,
      amount: rent.totalRent,
    })),
    ...recentPayments.map(payment => ({
      type: 'payment' as const,
      id: payment.id,
      title: `Payment received`,
      time: payment.createdAt,
      amount: payment.amount,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  const stats = [
    {
      title: "Total Properties",
      value: totalProperties.toString(),
      subtitle: `${totalRooms} rooms`,
      icon: Home,
    },
    {
      title: "Active Tenants",
      value: activeTenants.toString(),
      subtitle: `${activeRents} active rents`,
      icon: Users,
    },
    {
      title: "Active Users",
      value: activeUsers.toString(),
      subtitle: `${users.length} total users`,
      icon: UserCog,
    },
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${payments.length} payments`,
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Real Estate Admin Panel
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
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
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
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full ${activity.type === 'rent' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {activity.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {dayjs(activity.time).fromNow()}
                        </p>
                        <p className="text-xs font-semibold text-primary">
                          ${activity.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
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
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/properties")}
              >
                <Home className="mr-2 h-4 w-4" />
                Manage Properties
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/tenants")}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Tenants
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/rents")}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Manage Rents
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/payments")}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View Payments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
