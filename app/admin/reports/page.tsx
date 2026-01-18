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

  // Print all invoices in one document
  const printAllInvoices = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let allInvoicesHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeTab === "rent" ? "Rent Invoices" : "Payment Receipts"}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 20px; 
              background: #fff;
              color: #333;
            }
            .invoice-page {
              max-width: 800px;
              margin: 0 auto 40px auto;
              background: white;
              padding: 40px;
              border: 1px solid #e0e0e0;
              page-break-after: always;
            }
            .invoice-page:last-child {
              page-break-after: auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid ${activeTab === "rent" ? "#2563eb" : "#10b981"};
            }
            .company-info h1 {
              font-size: 28px;
              color: ${activeTab === "rent" ? "#2563eb" : "#10b981"};
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
              color: ${activeTab === "rent" ? "#2563eb" : "#10b981"};
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
              background: ${activeTab === "rent" ? "#2563eb" : "#10b981"};
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
              color: ${activeTab === "rent" ? "#2563eb" : "#10b981"};
              font-weight: 700;
              padding-top: 10px;
              border-top: 2px solid ${activeTab === "rent" ? "#2563eb" : "#10b981"};
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
              .invoice-page { border: none; padding: 20px; margin-bottom: 20px; }
              @page { margin: 0; size: A4; }
            }
          </style>
        </head>
        <body>
    `;

    if (activeTab === "rent") {
      filteredRents.forEach((rent) => {
        const rentRoom = rooms.find((r) => r.id === rent.roomId);
        allInvoicesHTML += `
          <div class="invoice-page">
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
        `;
      });
    } else {
      filteredPayments.forEach((payment) => {
        allInvoicesHTML += `
          <div class="invoice-page">
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
        `;
      });
    }

    allInvoicesHTML += `
        </body>
      </html>
    `;

    printWindow.document.write(allInvoicesHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
        ];
      });

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
      monthlyServiceId: "",
    });
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
              <div className="grid grid-cols-5 gap-4">
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
                <div className="space-y-2">
                  <Label>Monthly Service</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
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
