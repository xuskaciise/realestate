"use client";

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
import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { FileText, Download, Printer, FileSpreadsheet, Filter, X } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
  contract: string | null;
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

type Payment = {
  id: string;
  tenantId: string;
  monthlyRent: number;
  paidAmount: number;
  balance: number;
  status: string;
  paymentDate: string;
  notes: string | null;
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"rent" | "payment">("rent");
  const [rents, setRents] = useState<Rent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Rent filters
  const [rentFilters, setRentFilters] = useState({
    startDate: "",
    endDate: "",
    tenantId: "",
    status: "",
  });

  // Payment filters
  const [paymentFilters, setPaymentFilters] = useState({
    startDate: "",
    endDate: "",
    tenantId: "",
    status: "",
  });

  const [showRentFilters, setShowRentFilters] = useState(false);
  const [showPaymentFilters, setShowPaymentFilters] = useState(false);

  const fetchRents = useCallback(async () => {
    try {
      const response = await fetch("/api/rents");
      if (response.ok) {
        const data = await response.json();
        setRents(data);
      }
    } catch (error) {
      console.error("Error fetching rents:", error);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch("/api/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRents(), fetchRooms(), fetchPayments(), fetchTenants()]);
    } finally {
      setLoading(false);
    }
  }, [fetchRents, fetchRooms, fetchPayments, fetchTenants]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter rents
  const filteredRents = rents.filter((rent) => {
    if (rentFilters.startDate && dayjs(rent.startDate).isBefore(dayjs(rentFilters.startDate))) {
      return false;
    }
    if (rentFilters.endDate && dayjs(rent.startDate).isAfter(dayjs(rentFilters.endDate))) {
      return false;
    }
    if (rentFilters.tenantId && rent.tenantId !== rentFilters.tenantId) {
      return false;
    }
    return true;
  });

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    if (paymentFilters.startDate && dayjs(payment.paymentDate).isBefore(dayjs(paymentFilters.startDate))) {
      return false;
    }
    if (paymentFilters.endDate && dayjs(payment.paymentDate).isAfter(dayjs(paymentFilters.endDate))) {
      return false;
    }
    if (paymentFilters.tenantId && payment.tenantId !== paymentFilters.tenantId) {
      return false;
    }
    if (paymentFilters.status && payment.status !== paymentFilters.status) {
      return false;
    }
    return true;
  });

  // Export to Excel
  const exportToExcel = () => {
    if (activeTab === "rent") {
      const data = filteredRents.map((rent) => {
        const rentRoom = rooms.find((r) => r.id === rent.roomId);
        return {
        "Room": rentRoom?.name || "N/A",
        "House": rentRoom?.house.name || "N/A",
        "Tenant": rent.tenant?.name || "N/A",
        "Tenant Phone": rent.tenant?.phone || "N/A",
        "Guarantor": rent.guarantorName,
        "Guarantor Phone": rent.guarantorPhone,
        "Monthly Rent": rent.monthlyRent,
        "Months": rent.months,
        "Total Rent": rent.totalRent,
        "Start Date": dayjs(rent.startDate).format("YYYY-MM-DD"),
        "End Date": dayjs(rent.endDate).format("YYYY-MM-DD"),
        "Created": dayjs(rent.createdAt).format("YYYY-MM-DD"),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rent Report");
      XLSX.writeFile(wb, `Rent_Report_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    } else {
      const data = filteredPayments.map((payment) => ({
        "Tenant": payment.tenant?.name || "N/A",
        "Tenant Phone": payment.tenant?.phone || "N/A",
        "Monthly Rent": payment.monthlyRent,
        "Paid Amount": payment.paidAmount,
        "Balance": payment.balance,
        "Status": payment.status,
        "Payment Date": dayjs(payment.paymentDate).format("YYYY-MM-DD"),
        "Notes": payment.notes || "",
        "Created": dayjs(payment.createdAt).format("YYYY-MM-DD"),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payment Report");
      XLSX.writeFile(wb, `Payment_Report_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    }
  };

  // Print table
  const printTable = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let tableHTML = "";
    if (activeTab === "rent") {
      tableHTML = `
        <html>
          <head>
            <title>Rent Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>Rent Report</h1>
            <p>Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}</p>
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>House</th>
                  <th>Tenant</th>
                  <th>Guarantor</th>
                  <th>Monthly Rent</th>
                  <th>Months</th>
                  <th>Total Rent</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRents.map((rent) => {
                  const rentRoom = rooms.find((r) => r.id === rent.roomId);
                  return `
                  <tr>
                    <td>${rentRoom?.name || "N/A"}</td>
                    <td>${rentRoom?.house.name || "N/A"}</td>
                    <td>${rent.tenant?.name || "N/A"}</td>
                    <td>${rent.guarantorName}</td>
                    <td>$${rent.monthlyRent.toLocaleString()}</td>
                    <td>${rent.months}</td>
                    <td>$${rent.totalRent.toLocaleString()}</td>
                    <td>${dayjs(rent.startDate).format("YYYY-MM-DD")}</td>
                    <td>${dayjs(rent.endDate).format("YYYY-MM-DD")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else {
      tableHTML = `
        <html>
          <head>
            <title>Payment Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>Payment Report</h1>
            <p>Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}</p>
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Monthly Rent</th>
                  <th>Paid Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${filteredPayments.map((payment) => `
                  <tr>
                    <td>${payment.tenant?.name || "N/A"}</td>
                    <td>$${payment.monthlyRent.toLocaleString()}</td>
                    <td>$${payment.paidAmount.toLocaleString()}</td>
                    <td>$${payment.balance.toLocaleString()}</td>
                    <td>${payment.status}</td>
                    <td>${dayjs(payment.paymentDate).format("YYYY-MM-DD")}</td>
                    <td>${payment.notes || ""}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;
    }

    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    if (activeTab === "rent") {
      doc.text("Rent Report", 14, 15);
      doc.text(`Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`, 14, 22);

      const tableData = filteredRents.map((rent) => {
        const rentRoom = rooms.find((r) => r.id === rent.roomId);
        return [
        rentRoom?.name || "N/A",
        rentRoom?.house.name || "N/A",
        rent.tenant?.name || "N/A",
        rent.guarantorName,
        `$${rent.monthlyRent.toLocaleString()}`,
        rent.months.toString(),
        `$${rent.totalRent.toLocaleString()}`,
        dayjs(rent.startDate).format("YYYY-MM-DD"),
        dayjs(rent.endDate).format("YYYY-MM-DD"),
      ]);

      (doc as any).autoTable({
        head: [["Room", "House", "Tenant", "Guarantor", "Monthly Rent", "Months", "Total Rent", "Start Date", "End Date"]],
        body: tableData,
        startY: 30,
      });
      
      doc.save(`Rent_Report_${dayjs().format("YYYY-MM-DD")}.pdf`);
    } else {
      doc.text("Payment Report", 14, 15);
      doc.text(`Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`, 14, 22);

      const tableData = filteredPayments.map((payment) => [
        payment.tenant?.name || "N/A",
        `$${payment.monthlyRent.toLocaleString()}`,
        `$${payment.paidAmount.toLocaleString()}`,
        `$${payment.balance.toLocaleString()}`,
        payment.status,
        dayjs(payment.paymentDate).format("YYYY-MM-DD"),
        payment.notes || "",
      ]);

      (doc as any).autoTable({
        head: [["Tenant", "Monthly Rent", "Paid Amount", "Balance", "Status", "Payment Date", "Notes"]],
        body: tableData,
        startY: 30,
      });
      
      doc.save(`Payment_Report_${dayjs().format("YYYY-MM-DD")}.pdf`);
    }
  };

  const clearRentFilters = () => {
    setRentFilters({
      startDate: "",
      endDate: "",
      tenantId: "",
      status: "",
    });
  };

  const clearPaymentFilters = () => {
    setPaymentFilters({
      startDate: "",
      endDate: "",
      tenantId: "",
      status: "",
    });
  };

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
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and export rent and payment reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={printTable} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("rent")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "rent"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Rent Report
        </button>
        <button
          onClick={() => setActiveTab("payment")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "payment"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Payment Report
        </button>
      </div>

      {/* Filters */}
      {activeTab === "rent" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rent Report Filters</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRentFilters(!showRentFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showRentFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </CardHeader>
          {showRentFilters && (
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={rentFilters.startDate}
                    onChange={(e) =>
                      setRentFilters({ ...rentFilters, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={rentFilters.endDate}
                    onChange={(e) =>
                      setRentFilters({ ...rentFilters, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={rentFilters.tenantId}
                    onChange={(e) =>
                      setRentFilters({ ...rentFilters, tenantId: e.target.value })
                    }
                  >
                    <option value="">All Tenants</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 flex items-end">
                  <Button variant="outline" onClick={clearRentFilters} className="w-full">
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {activeTab === "payment" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Report Filters</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentFilters(!showPaymentFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showPaymentFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </CardHeader>
          {showPaymentFilters && (
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={paymentFilters.startDate}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={paymentFilters.endDate}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={paymentFilters.tenantId}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, tenantId: e.target.value })
                    }
                  >
                    <option value="">All Tenants</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={paymentFilters.status}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, status: e.target.value })
                    }
                  >
                    <option value="">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={clearPaymentFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Rent Report Table */}
      {activeTab === "rent" && (
        <Card>
          <CardHeader>
            <CardTitle>Rent Report</CardTitle>
            <CardDescription>
              Showing {filteredRents.length} of {rents.length} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table id="rent-report-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>House</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Guarantor</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Months</TableHead>
                    <TableHead>Total Rent</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRents.map((rent) => {
                      const rentRoom = rooms.find((r) => r.id === rent.roomId);
                      return (
                      <TableRow key={rent.id}>
                        <TableCell>{rentRoom?.name || "N/A"}</TableCell>
                        <TableCell>{rentRoom?.house.name || "N/A"}</TableCell>
                        <TableCell>{rent.tenant?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rent.guarantorName}</div>
                            <div className="text-sm text-muted-foreground">{rent.guarantorPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${rent.monthlyRent.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rent.months} {rent.months === 1 ? "Month" : "Months"}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          ${rent.totalRent.toLocaleString()}
                        </TableCell>
                        <TableCell>{dayjs(rent.startDate).format("MMM DD, YYYY")}</TableCell>
                        <TableCell>{dayjs(rent.endDate).format("MMM DD, YYYY")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Report Table */}
      {activeTab === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Report</CardTitle>
            <CardDescription>
              Showing {filteredPayments.length} of {payments.length} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table id="payment-report-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.tenant?.name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{payment.tenant?.phone || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${payment.monthlyRent.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ${payment.paidAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className={`font-semibold ${payment.balance > 0 ? "text-red-600" : "text-green-600"}`}>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
