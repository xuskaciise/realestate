"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingOverlay } from "@/components/ui/loading";

import { Filter, FileSpreadsheet, X } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type Rent = {
  id: string;
  roomId: string;
  tenantId: string;
  guarantorName: string;
  guarantorPhone: string;
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
  };
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
};

type Payment = {
  id: string;
  tenantId: string;
  monthlyRent: number;
  paidAmount: number;
  balance: number;
  status: string;
  paymentDate: string;
  monthlyServiceId?: string | null;
  maintenanceRequestId?: string | null;
  notes: string | null;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
    phone: string;
  };
};

type Room = {
  id: string;
  name: string;
  house: {
    name: string;
    address: string;
  };
};

type MonthlyService = {
  id: string;
  roomId: string;
  room?: Room | null;
};

type MaintenanceRequest = {
  id: string;
  tenantId?: string;
  roomId?: string;
  totalPrice: number;
  status: string;
  issueIds: string[];
  notes?: string | null;
  createdAt: string;
};

export default function RoomReportPage() {
  const [loading, setLoading] = useState(true);

  const [rents, setRents] = useState<Rent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [monthlyServices, setMonthlyServices] = useState<MonthlyService[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);

  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState<"rent" | "payment">("rent");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        rentsRes,
        roomsRes,
        paymentsRes,
        tenantsRes,
        monthlyServicesRes,
        maintenanceRequestsRes,
      ] = await Promise.all([
        fetch("/api/rents"),
        fetch("/api/rooms"),
        fetch("/api/payments"),
        fetch("/api/tenants"),
        fetch("/api/monthly-services"),
        fetch("/api/maintenance-requests"),
      ]);

      setRents(rentsRes.ok ? await rentsRes.json() : []);
      setRooms(roomsRes.ok ? await roomsRes.json() : []);
      setPayments(paymentsRes.ok ? await paymentsRes.json() : []);
      setTenants(tenantsRes.ok ? await tenantsRes.json() : []);
      setMonthlyServices(monthlyServicesRes.ok ? await monthlyServicesRes.json() : []);
      setMaintenanceRequests(
        maintenanceRequestsRes.ok ? await maintenanceRequestsRes.json() : []
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Kick off load once
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredRoomRents = useMemo(() => {
    return rents.filter((rent) => {
      const rentStart = dayjs(rent.startDate);
      const rentEnd = dayjs(rent.endDate);
      const from = filters.startDate ? dayjs(filters.startDate) : null;
      const to = filters.endDate ? dayjs(filters.endDate) : null;

      if (from && rentEnd.valueOf() < from.startOf("day").valueOf()) return false;
      if (to && rentStart.valueOf() > to.endOf("day").valueOf()) return false;
      return true;
    });
  }, [filters.endDate, filters.startDate, rents]);

  const filteredRoomPayments = useMemo(() => {
    return payments.filter((payment) => {
      const paymentDate = dayjs(payment.paymentDate);
      const from = filters.startDate ? dayjs(filters.startDate) : null;
      const to = filters.endDate ? dayjs(filters.endDate) : null;

      if (from && paymentDate.valueOf() < from.startOf("day").valueOf()) return false;
      if (to && paymentDate.valueOf() > to.endOf("day").valueOf()) return false;
      return true;
    });
  }, [filters.endDate, filters.startDate, payments]);

  const getPaymentType = (payment: Payment): string => {
    if (payment.maintenanceRequestId) return "Maintenance";
    if (payment.monthlyServiceId) return "Services";
    if (payment.monthlyRent > 0) return "Rent";
    return "Other";
  };

  const resolvePaymentRoom = (payment: Payment): { room: Room | null; house: Room["house"] | null } => {
    if (payment.monthlyServiceId) {
      const service = monthlyServices.find((s) => s.id === payment.monthlyServiceId);
      const room =
        service?.room ||
        (service?.roomId ? rooms.find((r) => r.id === service.roomId) || null : null);
      return { room, house: room?.house || null };
    }

    if (payment.maintenanceRequestId) {
      const req = maintenanceRequests.find((r) => r.id === payment.maintenanceRequestId);
      const room = req?.roomId ? rooms.find((r) => r.id === req.roomId) || null : null;
      return { room, house: room?.house || null };
    }

    // Rent payments: infer by tenantId + payment date overlap
    const paymentDateMs = dayjs(payment.paymentDate).valueOf();
    const matchedRent = rents.find((r) => {
      const startMs = dayjs(r.startDate).valueOf();
      const endMs = dayjs(r.endDate).valueOf();
      return payment.tenantId === r.tenantId && paymentDateMs >= startMs && paymentDateMs <= endMs;
    });

    const room = matchedRent?.roomId ? rooms.find((r) => r.id === matchedRent.roomId) || null : null;
    return { room, house: room?.house || null };
  };

  const exportToExcel = () => {
    const rentData = filteredRoomRents.map((rent) => {
      const rentRoom = rooms.find((r) => r.id === rent.roomId);
      const tenant = tenants.find((t) => t.id === rent.tenantId);
      return {
        "Room": rentRoom?.name || "N/A",
        "House": rentRoom?.house.name || "N/A",
        "Tenant": tenant?.name || "N/A",
        "Monthly Rent": rent.monthlyRent,
        "Months": rent.months,
        "Total Rent": rent.totalRent,
        "Start Date": dayjs(rent.startDate).format("YYYY-MM-DD"),
        "End Date": dayjs(rent.endDate).format("YYYY-MM-DD"),
        "Created": dayjs(rent.createdAt).format("YYYY-MM-DD"),
      };
    });

    const paymentData = filteredRoomPayments.map((payment) => {
      const resolved = resolvePaymentRoom(payment);
      const tenantName =
        payment.tenant?.name || tenants.find((t) => t.id === payment.tenantId)?.name || "N/A";

      return {
        "Room": resolved.room?.name || "N/A",
        "House": resolved.house?.name || "N/A",
        "Tenant": tenantName,
        "Payment Type": getPaymentType(payment),
        "Monthly Rent": payment.monthlyRent,
        "Paid Amount": payment.paidAmount,
        "Balance": payment.balance,
        "Status": payment.status,
        "Payment Date": dayjs(payment.paymentDate).format("YYYY-MM-DD"),
        "Notes": payment.notes || "",
        "Created": dayjs(payment.createdAt).format("YYYY-MM-DD"),
      };
    });

    const wb = XLSX.utils.book_new();
    if (activeTab === "rent") {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rentData), "Rent Report");
      XLSX.writeFile(wb, `Room_Rent_Report_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentData), "Payment Report");
      XLSX.writeFile(wb, `Room_Payment_Report_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading room report..." size="lg" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Room Report</h1>
          <p className="text-muted-foreground">Rent + Payments filtered by date range</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel ({activeTab === "rent" ? "Rent" : "Payment"})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
          {showFilters && (
            <CardDescription>Use From/To date to filter rent & payment records</CardDescription>
          )}
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ startDate: "", endDate: "" })}
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room Report</CardTitle>
          <CardDescription>Rent and Payment in 2 tabs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rent" | "payment")}>
            <TabsList className="mb-4">
              <TabsTrigger value="rent">Rent</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="rent">
              <CardDescription className="mb-4">
                Showing {filteredRoomRents.length} of {rents.length} records
              </CardDescription>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>House</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead>Months</TableHead>
                      <TableHead>Total Rent</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoomRents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No rent records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoomRents.map((rent) => {
                        const rentRoom = rooms.find((r) => r.id === rent.roomId);
                        const tenant = tenants.find((t) => t.id === rent.tenantId);
                        return (
                          <TableRow key={rent.id}>
                            <TableCell>{rentRoom?.name || "N/A"}</TableCell>
                            <TableCell>{rentRoom?.house.name || "N/A"}</TableCell>
                            <TableCell>{tenant?.name || "N/A"}</TableCell>
                            <TableCell>${rent.monthlyRent.toLocaleString()}</TableCell>
                            <TableCell>
                              {rent.months} {rent.months === 1 ? "Month" : "Months"}
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              ${rent.totalRent.toLocaleString()}
                            </TableCell>
                            <TableCell>{dayjs(rent.startDate).format("MMM DD, YYYY")}</TableCell>
                            <TableCell>{dayjs(rent.endDate).format("MMM DD, YYYY")}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="payment">
              <CardDescription className="mb-4">
                Showing {filteredRoomPayments.length} of {payments.length} records
              </CardDescription>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>House</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoomPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          No payment records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoomPayments.map((payment) => {
                        const resolved = resolvePaymentRoom(payment);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{resolved.room?.name || "N/A"}</TableCell>
                            <TableCell>{resolved.house?.name || "N/A"}</TableCell>
                            <TableCell>
                              {payment.tenant?.name ||
                                tenants.find((t) => t.id === payment.tenantId)?.name ||
                                "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  getPaymentType(payment) === "Rent"
                                    ? "default"
                                    : getPaymentType(payment) === "Services"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {getPaymentType(payment)}
                              </Badge>
                            </TableCell>
                            <TableCell>${payment.monthlyRent.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ${payment.paidAmount.toLocaleString()}
                            </TableCell>
                            <TableCell
                              className={`font-semibold ${
                                payment.balance > 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              ${payment.balance.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.status === "Paid"
                                    ? "default"
                                    : payment.status === "Partial"
                                    ? "secondary"
                                    : payment.status === "Overdue"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{dayjs(payment.paymentDate).format("MMM DD, YYYY")}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.notes || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

