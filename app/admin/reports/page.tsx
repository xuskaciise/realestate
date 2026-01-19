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
import autoTable from "jspdf-autotable";
import { LoadingOverlay } from "@/components/ui/loading";

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

type MonthlyService = {
  id: string;
  roomId: string;
  month: string;
  totalAmount: number;
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
  const [monthlyServices, setMonthlyServices] = useState<MonthlyService[]>([]);
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
    monthlyServiceId: "",
    paymentType: "", // "rent", "services", "maintenance", or "" for all
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

  const fetchMonthlyServices = useCallback(async () => {
    try {
      const response = await fetch("/api/monthly-services");
      if (response.ok) {
        const data = await response.json();
        setMonthlyServices(data || []);
      }
    } catch (error) {
      console.error("Error fetching monthly services:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRents(), fetchRooms(), fetchPayments(), fetchTenants(), fetchMonthlyServices()]);
    } finally {
      setLoading(false);
    }
  }, [fetchRents, fetchRooms, fetchPayments, fetchTenants, fetchMonthlyServices]);

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
    
    // Filter by payment type
    if (paymentFilters.paymentType) {
      if (paymentFilters.paymentType === "rent") {
        // Rent payments: no monthlyServiceId and no maintenanceRequestId, and monthlyRent > 0
        if (payment.monthlyServiceId || payment.maintenanceRequestId || payment.monthlyRent === 0) {
          return false;
        }
      } else if (paymentFilters.paymentType === "services") {
        // Services payments: has monthlyServiceId
        if (!payment.monthlyServiceId) {
          return false;
        }
      } else if (paymentFilters.paymentType === "maintenance") {
        // Maintenance payments: has maintenanceRequestId
        if (!payment.maintenanceRequestId) {
          return false;
        }
      }
    }
    
    if (paymentFilters.monthlyServiceId) {
      // Filter by service: if filter is set, show only payments with that service
      // If filter is "none", show only payments without a service
      if (paymentFilters.monthlyServiceId === "none") {
        if (payment.monthlyServiceId) {
          return false;
        }
      } else {
        if (payment.monthlyServiceId !== paymentFilters.monthlyServiceId) {
          return false;
        }
      }
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
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rent Report");
      XLSX.writeFile(wb, `Rent_Report_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    } else {
      const data = filteredPayments.map((payment) => ({
        "Tenant": payment.tenant?.name || "N/A",
        "Tenant Phone": payment.tenant?.phone || "N/A",
        "Payment Type": getPaymentType(payment),
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

  // Print invoice for rent
  const printRentInvoice = (rent: Rent) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rentRoom = rooms.find((r) => r.id === rent.roomId);
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rent Invoice - ${rent.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 40px; 
              background: #fff;
              color: #333;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border: 1px solid #e0e0e0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #2563eb;
            }
            .company-info h1 {
              font-size: 28px;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .company-info p {
              color: #666;
              font-size: 14px;
            }
            .invoice-info {
              text-align: right;
            }
            .invoice-info h2 {
              font-size: 24px;
              color: #333;
              margin-bottom: 10px;
            }
            .invoice-info p {
              color: #666;
              font-size: 14px;
              margin: 5px 0;
            }
            .details-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
            }
            .section h3 {
              font-size: 16px;
              color: #2563eb;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .section p {
              margin: 8px 0;
              color: #333;
              font-size: 14px;
            }
            .section strong {
              color: #000;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th {
              background: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
            .items-table tr:last-child td {
              border-bottom: none;
            }
            .total-section {
              margin-top: 30px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin: 10px 0;
              font-size: 16px;
            }
            .total-row label {
              width: 150px;
              text-align: right;
              color: #666;
            }
            .total-row span {
              width: 150px;
              text-align: right;
              font-weight: 600;
              color: #333;
            }
            .grand-total {
              font-size: 24px;
              color: #2563eb;
              font-weight: 700;
              padding-top: 10px;
              border-top: 2px solid #2563eb;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              .invoice-container { border: none; padding: 20px; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>Real Estate Management</h1>
                <p>Rent Invoice</p>
              </div>
              <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> RENT-${rent.id.slice(-8).toUpperCase()}</p>
                <p><strong>Date:</strong> ${dayjs(rent.createdAt).format("MMMM DD, YYYY")}</p>
                <p><strong>Due Date:</strong> ${dayjs(rent.endDate).format("MMMM DD, YYYY")}</p>
              </div>
            </div>

            <div class="details-section">
              <div class="section">
                <h3>Tenant Information</h3>
                <p><strong>Name:</strong> ${rent.tenant?.name || "N/A"}</p>
                <p><strong>Phone:</strong> ${rent.tenant?.phone || "N/A"}</p>
                <p><strong>Guarantor:</strong> ${rent.guarantorName}</p>
                <p><strong>Guarantor Phone:</strong> ${rent.guarantorPhone}</p>
              </div>
              <div class="section">
                <h3>Property Information</h3>
                <p><strong>House:</strong> ${rentRoom?.house.name || "N/A"}</p>
                <p><strong>Address:</strong> ${rentRoom?.house.address || "N/A"}</p>
                <p><strong>Room:</strong> ${rentRoom?.name || "N/A"}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Period</th>
                  <th>Monthly Rent</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Rent Payment</td>
                  <td>${rent.months} month(s)<br>
                      ${dayjs(rent.startDate).format("MMM DD, YYYY")} - ${dayjs(rent.endDate).format("MMM DD, YYYY")}
                  </td>
                  <td>$${rent.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>$${rent.totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <label>Subtotal:</label>
                <span>$${rent.totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row">
                <label>Total Amount:</label>
                <span class="grand-total">$${rent.totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Generated on ${dayjs().format("MMMM DD, YYYY [at] HH:mm")}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Print invoice for payment
  const printPaymentInvoice = (payment: Payment) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${payment.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 40px; 
              background: #fff;
              color: #333;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border: 1px solid #e0e0e0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #10b981;
            }
            .company-info h1 {
              font-size: 28px;
              color: #10b981;
              margin-bottom: 10px;
            }
            .company-info p {
              color: #666;
              font-size: 14px;
            }
            .invoice-info {
              text-align: right;
            }
            .invoice-info h2 {
              font-size: 24px;
              color: #333;
              margin-bottom: 10px;
            }
            .invoice-info p {
              color: #666;
              font-size: 14px;
              margin: 5px 0;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 10px;
            }
            .status-paid {
              background: #d1fae5;
              color: #065f46;
            }
            .status-partial {
              background: #fef3c7;
              color: #92400e;
            }
            .status-overdue {
              background: #fee2e2;
              color: #991b1b;
            }
            .details-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
            }
            .section h3 {
              font-size: 16px;
              color: #10b981;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .section p {
              margin: 8px 0;
              color: #333;
              font-size: 14px;
            }
            .section strong {
              color: #000;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th {
              background: #10b981;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
            .items-table tr:last-child td {
              border-bottom: none;
            }
            .total-section {
              margin-top: 30px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin: 10px 0;
              font-size: 16px;
            }
            .total-row label {
              width: 150px;
              text-align: right;
              color: #666;
            }
            .total-row span {
              width: 150px;
              text-align: right;
              font-weight: 600;
              color: #333;
            }
            .grand-total {
              font-size: 24px;
              color: #10b981;
              font-weight: 700;
              padding-top: 10px;
              border-top: 2px solid #10b981;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              .invoice-container { border: none; padding: 20px; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>Real Estate Management</h1>
                <p>Payment Receipt</p>
              </div>
              <div class="invoice-info">
                <h2>RECEIPT</h2>
                <p><strong>Receipt #:</strong> PAY-${payment.id.slice(-8).toUpperCase()}</p>
                <p><strong>Date:</strong> ${dayjs(payment.paymentDate).format("MMMM DD, YYYY")}</p>
                <span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span>
              </div>
            </div>

            <div class="details-section">
              <div class="section">
                <h3>Tenant Information</h3>
                <p><strong>Name:</strong> ${payment.tenant?.name || "N/A"}</p>
                <p><strong>Phone:</strong> ${payment.tenant?.phone || "N/A"}</p>
              </div>
              <div class="section">
                <h3>Payment Details</h3>
                <p><strong>Payment Date:</strong> ${dayjs(payment.paymentDate).format("MMMM DD, YYYY")}</p>
                <p><strong>Status:</strong> ${payment.status}</p>
                ${payment.notes ? `<p><strong>Notes:</strong> ${payment.notes}</p>` : ''}
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Monthly Rent</th>
                  <th>Paid Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Rent Payment</td>
                  <td>$${payment.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>$${payment.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>$${payment.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <label>Monthly Rent:</label>
                <span>$${payment.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row">
                <label>Amount Paid:</label>
                <span class="grand-total">$${payment.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row">
                <label>Remaining Balance:</label>
                <span style="color: ${payment.balance > 0 ? '#dc2626' : '#10b981'}">$${payment.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your payment!</p>
              <p>Generated on ${dayjs().format("MMMM DD, YYYY [at] HH:mm")}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Print all invoices in one document - Invoice style report with totals
  const printAllInvoices = () => {
    // Get the filtered data - exactly what's shown in the table
    const dataToPrint = activeTab === "rent" ? filteredRents : filteredPayments;
    
    if (dataToPrint.length === 0) {
      alert("No records to print. Please apply filters to see records.");
      return;
    }

    // Calculate totals
    let totalAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalMonthlyRent = 0;

    if (activeTab === "rent") {
      totalAmount = filteredRents.reduce((sum, rent) => sum + rent.totalRent, 0);
      totalMonthlyRent = filteredRents.reduce((sum, rent) => sum + rent.monthlyRent, 0);
    } else {
      totalPaid = filteredPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
      totalBalance = filteredPayments.reduce((sum, payment) => sum + payment.balance, 0);
      totalAmount = totalPaid + totalBalance;
      totalMonthlyRent = filteredPayments.reduce((sum, payment) => sum + payment.monthlyRent, 0);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportTitle = activeTab === "rent" ? "Rent Report" : "Payment Report";
    const primaryColor = activeTab === "rent" ? "#2563eb" : "#10b981";

    let reportHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              padding: 40px; 
              background: #f5f5f5;
              color: #333;
            }
            .report-container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              padding: 50px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 4px solid ${primaryColor};
            }
            .company-info h1 {
              font-size: 32px;
              color: ${primaryColor};
              margin-bottom: 8px;
              font-weight: 700;
            }
            .company-info p {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            .report-info {
              text-align: right;
            }
            .report-info h2 {
              font-size: 28px;
              color: #333;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .report-info p {
              color: #666;
              font-size: 14px;
              margin: 5px 0;
            }
            .report-info .badge {
              display: inline-block;
              padding: 8px 16px;
              background: ${primaryColor};
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 10px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .data-table thead {
              background: ${primaryColor};
              color: white;
            }
            .data-table th {
              padding: 16px 12px;
              text-align: left;
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .data-table td {
              padding: 14px 12px;
              border-bottom: 1px solid #e0e0e0;
              font-size: 14px;
            }
            .data-table tbody tr:hover {
              background: #f8f9fa;
            }
            .data-table tbody tr:last-child td {
              border-bottom: none;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .status-paid {
              background: #d1fae5;
              color: #065f46;
            }
            .status-partial {
              background: #fef3c7;
              color: #92400e;
            }
            .status-pending {
              background: #e0e7ff;
              color: #3730a3;
            }
            .status-overdue {
              background: #fee2e2;
              color: #991b1b;
            }
            .totals-section {
              margin-top: 40px;
              padding: 30px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 2px solid ${primaryColor};
            }
            .totals-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .total-item {
              text-align: center;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .total-item label {
              display: block;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
              font-weight: 600;
            }
            .total-item .amount {
              font-size: 24px;
              font-weight: 700;
              color: ${primaryColor};
            }
            .grand-total {
              text-align: center;
              padding: 25px;
              background: ${primaryColor};
              color: white;
              border-radius: 8px;
              margin-top: 20px;
            }
            .grand-total label {
              display: block;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
              opacity: 0.9;
            }
            .grand-total .amount {
              font-size: 36px;
              font-weight: 700;
            }
            .footer {
              margin-top: 50px;
              padding-top: 30px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .summary-info {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item label {
              display: block;
              color: #666;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .summary-item .value {
              font-size: 20px;
              font-weight: 600;
              color: ${primaryColor};
            }
            @media print {
              body { padding: 0; background: white; }
              .report-container { box-shadow: none; padding: 20px; }
              @page { margin: 1cm; size: A4; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="company-info">
                <h1>Real Estate Management</h1>
                <p>${reportTitle}</p>
              </div>
              <div class="report-info">
                <h2>${reportTitle.toUpperCase()}</h2>
                <p><strong>Generated:</strong> ${dayjs().format("MMMM DD, YYYY [at] HH:mm")}</p>
                <p><strong>Total Records:</strong> ${dataToPrint.length}</p>
                <span class="badge">${activeTab === "rent" ? "RENT" : "PAYMENT"} REPORT</span>
              </div>
            </div>

            <div class="summary-info">
              <div class="summary-item">
                <label>Total Records</label>
                <div class="value">${dataToPrint.length}</div>
              </div>
              ${activeTab === "rent" ? `
              <div class="summary-item">
                <label>Total Monthly Rent</label>
                <div class="value">$${totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="summary-item">
                <label>Total Amount</label>
                <div class="value">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              ` : `
              <div class="summary-item">
                <label>Total Paid</label>
                <div class="value">$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="summary-item">
                <label>Total Balance</label>
                <div class="value">$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              `}
            </div>

            <table class="data-table">
              <thead>
                <tr>
    `;

    // Generate table headers and rows based on active tab
    if (activeTab === "rent") {
      reportHTML += `
                  <th>Room</th>
                  <th>House</th>
                  <th>Tenant</th>
                  <th>Guarantor</th>
                  <th class="text-right">Monthly Rent</th>
                  <th class="text-center">Months</th>
                  <th class="text-right">Total Rent</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
      `;

      filteredRents.forEach((rent) => {
        const rentRoom = rooms.find((r) => r.id === rent.roomId);
        reportHTML += `
                <tr>
                  <td>${rentRoom?.name || "N/A"}</td>
                  <td>${rentRoom?.house.name || "N/A"}</td>
                  <td>
                    <div><strong>${rent.tenant?.name || "N/A"}</strong></div>
                    <div style="font-size: 12px; color: #666;">${rent.tenant?.phone || "N/A"}</div>
                  </td>
                  <td>
                    <div><strong>${rent.guarantorName}</strong></div>
                    <div style="font-size: 12px; color: #666;">${rent.guarantorPhone}</div>
                  </td>
                  <td class="text-right">$${rent.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-center">${rent.months}</td>
                  <td class="text-right"><strong>$${rent.totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td>${dayjs(rent.startDate).format("MMM DD, YYYY")}</td>
                  <td>${dayjs(rent.endDate).format("MMM DD, YYYY")}</td>
                </tr>
        `;
      });

      reportHTML += `
                <tr style="background: #f8f9fa; font-weight: 600;">
                  <td colspan="6" class="text-right"><strong>TOTAL:</strong></td>
                  <td class="text-right" style="font-size: 16px; color: ${primaryColor};">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colspan="2"></td>
                </tr>
              </tbody>
            </table>
      `;
    } else {
      reportHTML += `
                  <th>Tenant</th>
                  <th>Type</th>
                  <th class="text-right">Monthly Rent</th>
                  <th class="text-right">Paid Amount</th>
                  <th class="text-right">Balance</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
      `;

      filteredPayments.forEach((payment) => {
        reportHTML += `
                <tr>
                  <td>
                    <div><strong>${payment.tenant?.name || "N/A"}</strong></div>
                    <div style="font-size: 12px; color: #666;">${payment.tenant?.phone || "N/A"}</div>
                  </td>
                  <td><span class="status-badge status-${getPaymentType(payment).toLowerCase()}">${getPaymentType(payment)}</span></td>
                  <td class="text-right">$${payment.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right" style="color: #10b981; font-weight: 600;">$${payment.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right" style="color: ${payment.balance > 0 ? '#dc2626' : '#10b981'}; font-weight: 600;">$${payment.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td><span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span></td>
                  <td>${dayjs(payment.paymentDate).format("MMM DD, YYYY")}</td>
                  <td style="font-size: 12px; color: #666;">${payment.notes || "-"}</td>
                </tr>
        `;
      });

      reportHTML += `
                <tr style="background: #f8f9fa; font-weight: 600;">
                  <td colspan="2" class="text-right"><strong>TOTALS:</strong></td>
                  <td class="text-right">$${totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right" style="color: #10b981; font-size: 16px;">$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right" style="color: ${totalBalance > 0 ? '#dc2626' : '#10b981'}; font-size: 16px;">$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colspan="3"></td>
                </tr>
              </tbody>
            </table>
      `;
    }

    reportHTML += `
            <div class="totals-section">
              <div class="totals-grid">
                ${activeTab === "rent" ? `
                <div class="total-item">
                  <label>Total Records</label>
                  <div class="amount">${filteredRents.length}</div>
                </div>
                <div class="total-item">
                  <label>Total Monthly Rent</label>
                  <div class="amount">$${totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div class="total-item">
                  <label>Total Amount</label>
                  <div class="amount">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                ` : `
                <div class="total-item">
                  <label>Total Records</label>
                  <div class="amount">${filteredPayments.length}</div>
                </div>
                <div class="total-item">
                  <label>Total Paid</label>
                  <div class="amount" style="color: #10b981;">$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div class="total-item">
                  <label>Total Balance</label>
                  <div class="amount" style="color: ${totalBalance > 0 ? '#dc2626' : '#10b981'};">$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                `}
              </div>
              <div class="grand-total">
                <label>Grand Total</label>
                <div class="amount">$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Real Estate Management System</strong></p>
              <p>Report generated on ${dayjs().format("MMMM DD, YYYY [at] HH:mm")}</p>
              <p style="margin-top: 10px;">This is a computer-generated report. No signature required.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Write all content at once
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    // Wait for content to render, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
    
    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        printWindow.print();
      }
    }, 1000);
  };

  // Export to PDF - Invoice style with totals
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = activeTab === "rent" ? [37, 99, 235] : [16, 185, 129];
    
    // Calculate totals
    let totalAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalMonthlyRent = 0;

    if (activeTab === "rent") {
      totalAmount = filteredRents.reduce((sum, rent) => sum + rent.totalRent, 0);
      totalMonthlyRent = filteredRents.reduce((sum, rent) => sum + rent.monthlyRent, 0);
    } else {
      totalPaid = filteredPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
      totalBalance = filteredPayments.reduce((sum, payment) => sum + payment.balance, 0);
      totalAmount = totalPaid + totalBalance;
      totalMonthlyRent = filteredPayments.reduce((sum, payment) => sum + payment.monthlyRent, 0);
    }
    
    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", 'bold');
    doc.text(activeTab === "rent" ? "RENT REPORT" : "PAYMENT REPORT", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", 'normal');
    doc.text(`Generated: ${dayjs().format("YYYY-MM-DD HH:mm")}`, 14, 28);
    doc.text(`Total Records: ${activeTab === "rent" ? filteredRents.length : filteredPayments.length}`, 14, 34);
    
    doc.setTextColor(0, 0, 0);
    let startY = 50;

    if (activeTab === "rent") {
      const tableData = filteredRents.map((rent) => {
        const rentRoom = rooms.find((r) => r.id === rent.roomId);
        return [
          rentRoom?.name || "N/A",
          rentRoom?.house.name || "N/A",
          rent.tenant?.name || "N/A",
          rent.guarantorName,
          `$${rent.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          rent.months.toString(),
          `$${rent.totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          dayjs(rent.startDate).format("MM/DD/YYYY"),
          dayjs(rent.endDate).format("MM/DD/YYYY"),
        ];
      });

      // Add total row
      tableData.push([
        "", "", "", "", "", "",
        `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "", ""
      ]);

      autoTable(doc, {
        head: [["Room", "House", "Tenant", "Guarantor", "Monthly Rent", "Months", "Total Rent", "Start Date", "End Date"]],
        body: tableData,
        startY: startY,
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
        },
        didDrawPage: (data: any) => {
          // Draw totals section on last page
          if (data.pageNumber === data.pageCount) {
            const finalY = data.cursor.y + 10;
            doc.setFillColor(245, 247, 250);
            doc.rect(14, finalY, pageWidth - 28, 50, 'F');
            
            doc.setFontSize(12);
            doc.setFont("helvetica", 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text("SUMMARY", pageWidth / 2, finalY + 10, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont("helvetica", 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Monthly Rent: $${totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2, finalY + 20, { align: 'center' });
            
            doc.setFontSize(16);
            doc.setFont("helvetica", 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`Grand Total: $${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2, finalY + 35, { align: 'center' });
          }
        },
      });
      
      doc.save(`Rent_Report_${dayjs().format("YYYY-MM-DD")}.pdf`);
    } else {
      const tableData = filteredPayments.map((payment) => [
        payment.tenant?.name || "N/A",
        getPaymentType(payment),
        `$${payment.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${payment.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${payment.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        payment.status,
        dayjs(payment.paymentDate).format("MM/DD/YYYY"),
        payment.notes || "",
      ]);

      // Add total row
      tableData.push([
        "TOTALS", "",
        `$${totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "", "", ""
      ]);

      autoTable(doc, {
        head: [["Tenant", "Type", "Monthly Rent", "Paid Amount", "Balance", "Status", "Payment Date", "Notes"]],
        body: tableData,
        startY: startY,
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
        },
        didDrawPage: (data: any) => {
          // Draw totals section on last page
          if (data.pageNumber === data.pageCount) {
            const finalY = data.cursor.y + 10;
            doc.setFillColor(245, 247, 250);
            doc.rect(14, finalY, pageWidth - 28, 50, 'F');
            
            doc.setFontSize(12);
            doc.setFont("helvetica", 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text("SUMMARY", pageWidth / 2, finalY + 10, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont("helvetica", 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Paid: $${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2, finalY + 20, { align: 'center' });
            doc.text(`Total Balance: $${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2, finalY + 28, { align: 'center' });
            
            doc.setFontSize(16);
            doc.setFont("helvetica", 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`Grand Total: $${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2, finalY + 40, { align: 'center' });
          }
        },
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
      monthlyServiceId: "",
      paymentType: "",
    });
  };

  // Get payment type label
  const getPaymentType = (payment: Payment): string => {
    if (payment.maintenanceRequestId) {
      return "Maintenance";
    } else if (payment.monthlyServiceId) {
      return "Services";
    } else if (payment.monthlyRent > 0) {
      return "Rent";
    }
    return "Other";
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading reports..." size="lg" />
        </div>
      )}
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
          <Button onClick={printAllInvoices} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print All Invoices
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
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[140px]">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={paymentFilters.startDate}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, startDate: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2 min-w-[140px]">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={paymentFilters.endDate}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, endDate: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2 min-w-[160px]">
                  <Label className="text-xs">Tenant</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                <div className="space-y-2 min-w-[130px]">
                  <Label className="text-xs">Status</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                <div className="space-y-2 min-w-[150px]">
                  <Label className="text-xs">Payment Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={paymentFilters.paymentType}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, paymentType: e.target.value })
                    }
                  >
                    <option value="">All Types</option>
                    <option value="rent">Rent</option>
                    <option value="services">Services</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="space-y-2 min-w-[160px]">
                  <Label className="text-xs">Monthly Service</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={paymentFilters.monthlyServiceId}
                    onChange={(e) =>
                      setPaymentFilters({ ...paymentFilters, monthlyServiceId: e.target.value })
                    }
                  >
                    <option value="">All Services</option>
                    <option value="none">No Service</option>
                    {monthlyServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {dayjs(service.month).format("MMM YYYY")} - ${service.totalAmount.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" onClick={clearPaymentFilters} className="h-9">
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
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
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printRentInvoice(rent)}
                              className="h-8 w-8 p-0"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
                    <TableHead>Type</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => printPaymentInvoice(payment)}
                            className="h-8 w-8 p-0"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
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
