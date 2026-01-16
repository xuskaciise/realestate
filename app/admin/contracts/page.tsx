"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { AlertTriangle, Clock, FileX, RefreshCw } from "lucide-react";

type Rent = {
  id: string;
  roomId: string;
  tenantId: string;
  monthlyRent: number;
  months: number;
  totalRent: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    profile: string | null;
  };
  room?: {
    id: string;
    name: string;
    house: {
      id: string;
      name: string;
      address: string;
    };
  };
};

type ContractStatus = "expired" | "expiring_soon";

type ContractWithBalance = {
  id: string;
  tenantName: string;
  tenantPhone: string;
  tenantProfile: string | null;
  roomName: string;
  houseName: string;
  houseAddress: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  totalRent: number;
  status: ContractStatus;
  daysRemaining: number;
  balance: number; // Remaining amount to be paid
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expired" | "expiring_soon">("all");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      // First try to fetch from API
      const response = await fetch("/api/rents");
      let rents: Rent[] = [];

      if (response.ok) {
        const data = await response.json();
        rents = data;
      }

      // If no data, use sample data
      if (rents.length === 0) {
        rents = getSampleRents();
      }

      // Process rents to contracts with balance calculation
      const processedContracts = processContracts(rents);
      setContracts(processedContracts);
    } catch (error) {
      console.error("Error loading contracts:", error);
      // Use sample data on error
      const sampleRents = getSampleRents();
      const processedContracts = processContracts(sampleRents);
      setContracts(processedContracts);
    } finally {
      setLoading(false);
    }
  };

  const getSampleRents = (): Rent[] => {
    const today = dayjs();
    return [
      {
        id: "sample-rent-1",
        roomId: "sample-room-1",
        tenantId: "sample-tenant-1",
        monthlyRent: 100,
        months: 12,
        totalRent: 1200,
        startDate: today.subtract(11, "month").format("YYYY-MM-DD"),
        endDate: today.add(1, "month").format("YYYY-MM-DD"),
        createdAt: today.subtract(11, "month").format("YYYY-MM-DD"),
        tenant: {
          id: "sample-tenant-1",
          name: "Ahmed Hassan",
          phone: "+252 61 1234567",
          profile: null,
        },
        room: {
          id: "sample-room-1",
          name: "101",
          house: {
            id: "sample-house-1",
            name: "Nasrudiin",
            address: "Mogadishu, Somalia",
          },
        },
      },
      {
        id: "sample-rent-2",
        roomId: "sample-room-2",
        tenantId: "sample-tenant-2",
        monthlyRent: 90,
        months: 6,
        totalRent: 540,
        startDate: today.subtract(5, "month").format("YYYY-MM-DD"),
        endDate: today.add(1, "month").format("YYYY-MM-DD"),
        createdAt: today.subtract(5, "month").format("YYYY-MM-DD"),
        tenant: {
          id: "sample-tenant-2",
          name: "Fatima Ali",
          phone: "+252 61 2345678",
          profile: null,
        },
        room: {
          id: "sample-room-2",
          name: "102",
          house: {
            id: "sample-house-1",
            name: "Nasrudiin",
            address: "Mogadishu, Somalia",
          },
        },
      },
      {
        id: "sample-rent-3",
        roomId: "sample-room-3",
        tenantId: "sample-tenant-3",
        monthlyRent: 120,
        months: 12,
        totalRent: 1440,
        startDate: today.subtract(13, "month").format("YYYY-MM-DD"),
        endDate: today.subtract(1, "month").format("YYYY-MM-DD"), // Expired
        createdAt: today.subtract(13, "month").format("YYYY-MM-DD"),
        tenant: {
          id: "sample-tenant-3",
          name: "Mohamed Ibrahim",
          phone: "+252 61 3456789",
          profile: null,
        },
        room: {
          id: "sample-room-3",
          name: "201",
          house: {
            id: "sample-house-2",
            name: "Muuse galaal",
            address: "Mogadishu, Somalia",
          },
        },
      },
      {
        id: "sample-rent-4",
        roomId: "sample-room-4",
        tenantId: "sample-tenant-4",
        monthlyRent: 150,
        months: 12,
        totalRent: 1800,
        startDate: today.subtract(12, "month").format("YYYY-MM-DD"),
        endDate: today.format("YYYY-MM-DD"), // Expiring today
        createdAt: today.subtract(12, "month").format("YYYY-MM-DD"),
        tenant: {
          id: "sample-tenant-4",
          name: "Aisha Mohamed",
          phone: "+252 61 4567890",
          profile: null,
        },
        room: {
          id: "sample-room-4",
          name: "301",
          house: {
            id: "sample-house-2",
            name: "Muuse galaal",
            address: "Mogadishu, Somalia",
          },
        },
      },
      {
        id: "sample-rent-5",
        roomId: "sample-room-5",
        tenantId: "sample-tenant-5",
        monthlyRent: 80,
        months: 6,
        totalRent: 480,
        startDate: today.subtract(2, "month").format("YYYY-MM-DD"),
        endDate: today.add(4, "month").format("YYYY-MM-DD"), // Not expiring soon
        createdAt: today.subtract(2, "month").format("YYYY-MM-DD"),
        tenant: {
          id: "sample-tenant-5",
          name: "Omar Abdullahi",
          phone: "+252 61 5678901",
          profile: null,
        },
        room: {
          id: "sample-room-5",
          name: "202",
          house: {
            id: "sample-house-2",
            name: "Muuse galaal",
            address: "Mogadishu, Somalia",
          },
        },
      },
    ];
  };

  const processContracts = (rents: Rent[]): ContractWithBalance[] => {
    const today = dayjs();
    const oneMonthFromNow = today.add(1, "month");

    return rents
      .map((rent) => {
        const endDate = dayjs(rent.endDate);
        const startDate = dayjs(rent.startDate);
        const daysRemaining = endDate.diff(today, "day");
        const isExpired = endDate.isBefore(today);
        const isExpiringSoon = !isExpired && endDate.isBefore(oneMonthFromNow);

        // Calculate balance (remaining amount)
        // Balance = total rent - (months passed * monthly rent)
        const monthsPassed = Math.max(0, today.diff(startDate, "month", true));
        const paidAmount = Math.min(rent.totalRent, monthsPassed * rent.monthlyRent);
        const balance = Math.max(0, rent.totalRent - paidAmount);

        let status: ContractStatus = "expired";
        if (!isExpired && isExpiringSoon) {
          status = "expiring_soon";
        } else if (!isExpired && !isExpiringSoon) {
          // Skip contracts that are not expiring soon
          return null;
        }

        return {
          id: rent.id,
          tenantName: rent.tenant?.name || "N/A",
          tenantPhone: rent.tenant?.phone || "N/A",
          tenantProfile: rent.tenant?.profile || null,
          roomName: rent.room?.name || "N/A",
          houseName: rent.room?.house.name || "N/A",
          houseAddress: rent.room?.house.address || "N/A",
          startDate: rent.startDate,
          endDate: rent.endDate,
          monthlyRent: rent.monthlyRent,
          totalRent: rent.totalRent,
          status,
          daysRemaining,
          balance,
        };
      })
      .filter((contract): contract is ContractWithBalance => contract !== null);
  };

  const filteredContracts = contracts.filter((contract) => {
    if (filter === "all") return true;
    if (filter === "expired") return contract.status === "expired";
    if (filter === "expiring_soon") return contract.status === "expiring_soon";
    return true;
  });

  const expiredCount = contracts.filter((c) => c.status === "expired").length;
  const expiringSoonCount = contracts.filter((c) => c.status === "expiring_soon").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expired & Expiring Contracts</h1>
          <p className="text-muted-foreground">Monitor contracts that are expired or expiring within one month</p>
        </div>
        <Button onClick={loadContracts} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Contracts</CardDescription>
            <CardTitle className="text-2xl">{contracts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expired</CardDescription>
            <CardTitle className="text-2xl text-red-600">{expiredCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiring Soon</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{expiringSoonCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({contracts.length})
        </Button>
        <Button
          variant={filter === "expired" ? "default" : "outline"}
          onClick={() => setFilter("expired")}
          className="text-red-600"
        >
          <FileX className="mr-2 h-4 w-4" />
          Expired ({expiredCount})
        </Button>
        <Button
          variant={filter === "expiring_soon" ? "default" : "outline"}
          onClick={() => setFilter("expiring_soon")}
          className="text-yellow-600"
        >
          <Clock className="mr-2 h-4 w-4" />
          Expiring Soon ({expiringSoonCount})
        </Button>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
          <CardDescription>
            Showing {filteredContracts.length} of {contracts.length} contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contracts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>House</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contract.tenantProfile && (
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={contract.tenantProfile.startsWith('/') ? contract.tenantProfile : `/uploads/tenants/${contract.tenantProfile}`}
                                alt={contract.tenantName}
                              />
                              <AvatarFallback className="text-xs">
                                {contract.tenantName[0]}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div className="font-medium">{contract.tenantName}</div>
                            <div className="text-sm text-muted-foreground">{contract.tenantPhone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{contract.roomName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contract.houseName}</div>
                          <div className="text-sm text-muted-foreground">{contract.houseAddress}</div>
                        </div>
                      </TableCell>
                      <TableCell>{dayjs(contract.startDate).format("MMM DD, YYYY")}</TableCell>
                      <TableCell>{dayjs(contract.endDate).format("MMM DD, YYYY")}</TableCell>
                      <TableCell>
                        {contract.daysRemaining < 0 ? (
                          <span className="text-red-600 font-semibold">
                            Expired {Math.abs(contract.daysRemaining)} days ago
                          </span>
                        ) : (
                          <span className="text-yellow-600 font-semibold">
                            {contract.daysRemaining} days
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${contract.monthlyRent.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        ${contract.balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {contract.status === "expired" ? (
                          <Badge variant="destructive">
                            <FileX className="mr-1 h-3 w-3" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Clock className="mr-1 h-3 w-3" />
                            Expiring Soon
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
