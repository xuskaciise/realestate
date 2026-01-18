"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { CreditCard, Plus, Trash2, Edit, ChevronLeft, ChevronRight, Check, Printer } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant must be selected"),
  monthlyRent: z.number().min(0, "Monthly rent must be non-negative"), // Allow 0 for service-only payments
  paidAmount: z.number().min(0, "Paid amount must be non-negative"),
  balance: z.number(),
  status: z.enum(["Paid", "Partial", "Pending", "Overdue"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  monthlyServiceId: z.string().optional(),
  notes: z.string().optional(),
});

type Payment = {
  id: string;
  tenantId: string;
  monthlyRent: number;
  paidAmount: number;
  balance: number;
  status: string;
  paymentDate: string;
  monthlyServiceId?: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    profile: string | null;
  };
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
  profile: string | null;
};

type Rent = {
  id: string;
  tenantId: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  roomId: string;
};

type Room = {
  id: string;
  name: string;
  house: {
    id: string;
    name: string;
    address: string;
  };
};

type MonthlyService = {
  id: string;
  roomId: string;
  month: string;
  totalAmount: number;
};

export default function PaymentsPage() {
  const { addToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rents, setRents] = useState<Rent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [monthlyServices, setMonthlyServices] = useState<MonthlyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    tenantId: "",
    monthlyRent: 0,
    paidAmount: 0,
    balance: 0,
    status: "Pending" as "Paid" | "Partial" | "Pending" | "Overdue",
    paymentDate: dayjs().format("YYYY-MM-DD"),
    monthlyServiceId: "",
    notes: "",
  });

  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

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
      await Promise.all([
        fetchPayments(),
        fetchTenants(),
        fetchRents(),
        fetchRooms(),
        fetchMonthlyServices(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchRooms]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate balance when monthly rent or paid amount changes (considering previous payments)
  // Note: This form is only for rent payments, not monthly services
  useEffect(() => {
    // Total amount due = monthly rent only (no monthly service in this form)
    const totalDue = paymentForm.monthlyRent;

    // Find all previous payments for this tenant with same monthlyRent (rent payments only)
    let previousPaidAmount = 0;
    if (paymentForm.tenantId) {
      const previousPayments = payments.filter((p) => {
        if (p.tenantId !== paymentForm.tenantId) return false;
        // Only count rent payments (no monthlyServiceId) with same monthlyRent
        return !p.monthlyServiceId && p.monthlyRent === paymentForm.monthlyRent;
      });
      
      previousPaidAmount = previousPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    }

    // Calculate balance: total due - (previous payments + current payment)
    const totalPaidAmount = previousPaidAmount + paymentForm.paidAmount;
    const balance = totalDue - totalPaidAmount;
    setPaymentForm((prev) => ({ ...prev, balance }));

    // Auto-update status based on balance
    if (balance <= 0) {
      setPaymentForm((prev) => ({ ...prev, status: "Paid" }));
    } else if (totalPaidAmount > 0) {
      setPaymentForm((prev) => ({ ...prev, status: "Partial" }));
    } else {
      setPaymentForm((prev) => ({ ...prev, status: "Pending" }));
    }
  }, [paymentForm.monthlyRent, paymentForm.paidAmount, paymentForm.tenantId, payments]);

  // Auto-fill monthly rent when tenant is selected
  useEffect(() => {
    if (paymentForm.tenantId && rents.length > 0) {
      const today = dayjs();
      const activeRent = rents.find(
        (r) => r.tenantId === paymentForm.tenantId && 
        (today.isAfter(dayjs(r.startDate)) || today.isSame(dayjs(r.startDate), "day")) && 
        (today.isBefore(dayjs(r.endDate)) || today.isSame(dayjs(r.endDate), "day"))
      );
      
      // If no active rent found, try to get the most recent rent for this tenant
      if (!activeRent) {
        const tenantRents = rents
          .filter((r) => r.tenantId === paymentForm.tenantId)
          .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf());
        
        if (tenantRents.length > 0 && tenantRents[0].monthlyRent !== paymentForm.monthlyRent) {
          setPaymentForm((prev) => ({ ...prev, monthlyRent: tenantRents[0].monthlyRent }));
        }
      } else if (activeRent.monthlyRent !== paymentForm.monthlyRent) {
        setPaymentForm((prev) => ({ ...prev, monthlyRent: activeRent.monthlyRent }));
      }
    } else if (!paymentForm.tenantId) {
      // Reset monthly rent when tenant is cleared
      setPaymentForm((prev) => ({ ...prev, monthlyRent: 0 }));
    }
  }, [paymentForm.tenantId, paymentForm.monthlyRent, rents]);


  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const fetchRents = async () => {
    try {
      const response = await fetch("/api/rents");
      if (response.ok) {
        const data = await response.json();
        setRents(data);
      }
    } catch (error) {
      console.error("Error fetching rents:", error);
    }
  };

  const fetchMonthlyServices = async () => {
    try {
      const response = await fetch("/api/monthly-services");
      if (response.ok) {
        const data = await response.json();
        setMonthlyServices(data);
      }
    } catch (error) {
      console.error("Error fetching monthly services:", error);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentErrors({});

    // Validate balance calculation (rent payments only, no monthly service)
    const totalDue = paymentForm.monthlyRent;

    // Find all previous payments for this tenant with same monthlyRent (rent payments only)
    let previousPaidAmount = 0;
    if (paymentForm.tenantId) {
      const previousPayments = payments.filter((p) => {
        if (p.tenantId !== paymentForm.tenantId) return false;
        if (editingPayment && p.id === editingPayment.id) return false; // Exclude current payment if editing
        // Only count rent payments (no monthlyServiceId) with same monthlyRent
        return !p.monthlyServiceId && p.monthlyRent === paymentForm.monthlyRent;
      });
      
      previousPaidAmount = previousPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    }

    const totalPaidAmount = previousPaidAmount + paymentForm.paidAmount;
    const calculatedBalance = totalDue - totalPaidAmount;

    // Validate that paid amount doesn't exceed monthly rent
    if (paymentForm.monthlyRent > 0 && paymentForm.paidAmount > paymentForm.monthlyRent) {
      setPaymentErrors({
        paidAmount: `Paid amount ($${paymentForm.paidAmount.toFixed(2)}) cannot exceed monthly rent ($${paymentForm.monthlyRent.toFixed(2)}). Maximum allowed: $${paymentForm.monthlyRent.toFixed(2)}`,
      });
      addToast({
        type: "danger",
        title: "Invalid Payment Amount",
        message: `Paid amount cannot exceed monthly rent. Maximum allowed: $${paymentForm.monthlyRent.toFixed(2)}`,
      });
      return;
    }

    // Calculate remaining balance before this payment
    const remainingBalance = totalDue - previousPaidAmount;

    // Prevent payment creation if balance is already zero or negative (only for new payments, not edits)
    if (!editingPayment && remainingBalance <= 0) {
      setPaymentErrors({
        paidAmount: `Cannot create payment. Balance is already paid ($${remainingBalance.toFixed(2)}). No payment needed.`,
      });
      addToast({
        type: "warning",
        title: "Payment Not Needed",
        message: `Balance is already paid ($${remainingBalance.toFixed(2)}). No payment needed.`,
      });
      return;
    }

    // Validate that paid amount doesn't exceed what's needed (allow small overpayment tolerance)
    if (paymentForm.paidAmount > remainingBalance + 0.01) { // Allow 1 cent tolerance for rounding
      setPaymentErrors({
        paidAmount: `Payment amount ($${paymentForm.paidAmount.toFixed(2)}) exceeds remaining balance ($${remainingBalance.toFixed(2)}). Maximum allowed: $${remainingBalance.toFixed(2)}`,
      });
      addToast({
        type: "danger",
        title: "Invalid Payment Amount",
        message: `Payment amount exceeds remaining balance. Maximum allowed: $${remainingBalance.toFixed(2)}`,
      });
      return;
    }

    // Validate balance matches calculation
    if (Math.abs(paymentForm.balance - calculatedBalance) > 0.01) {
      setPaymentErrors({
        balance: `Balance calculation mismatch. Expected: $${calculatedBalance.toFixed(2)}, Got: $${paymentForm.balance.toFixed(2)}`,
      });
      addToast({
        type: "danger",
        title: "Balance Calculation Error",
        message: "Balance calculation is incorrect. Please check the payment amount.",
      });
      return;
    }

    try {
      // For rent-only payments, ensure monthlyServiceId is not included
      const formData = { ...paymentForm };
      if (!formData.monthlyServiceId || formData.monthlyServiceId === "") {
        delete formData.monthlyServiceId;
      }
      const validated = paymentSchema.parse(formData);

      if (editingPayment) {
        const updatedPayments = payments.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                ...validated,
                updatedAt: new Date().toISOString(),
              }
            : p
        );
        setPayments(updatedPayments);

        try {
          await fetch(`/api/payments/${editingPayment.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API update failed, but local update succeeded:", error);
        }

        setPaymentForm({
          tenantId: "",
          monthlyRent: 0,
          paidAmount: 0,
          balance: 0,
          status: "Pending",
          paymentDate: dayjs().format("YYYY-MM-DD"),
          monthlyServiceId: "",
          notes: "",
        });
        setEditingPayment(null);
        setOpenPaymentModal(false);
        addToast({
          type: "success",
          title: "Payment Updated",
          message: "Payment has been updated successfully.",
        });
      } else {
        const newPayment: Payment = {
          id: uuidv4(),
          ...validated,
          notes: validated.notes ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedPayments = [...payments, newPayment];
        setPayments(updatedPayments);

        try {
          const response = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            // Refresh payments to get updated balance from server
            await fetchPayments();
          }
        } catch (error) {
          console.error("API create failed, but local create succeeded:", error);
        }

        setPaymentForm({
          tenantId: "",
          monthlyRent: 0,
          paidAmount: 0,
          balance: 0,
          status: "Pending",
          paymentDate: dayjs().format("YYYY-MM-DD"),
          monthlyServiceId: "",
          notes: "",
        });
        setOpenPaymentModal(false);
        addToast({
          type: "success",
          title: "Payment Added",
          message: "Payment has been added successfully. Balance updated.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setPaymentErrors(errors);
        addToast({
          type: "danger",
          title: "Validation Error",
          message: "Please check the form and fix the errors.",
        });
      } else {
        addToast({
          type: "danger",
          title: "Error",
          message: "An error occurred. Please try again.",
        });
      }
    }
  };

  const handleDeletePayment = (id: string) => {
    setPaymentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    const updatedPayments = payments.filter((p) => p.id !== paymentToDelete);
    setPayments(updatedPayments);

    try {
      await fetch(`/api/payments/${paymentToDelete}`, {
        method: "DELETE",
      });
      addToast({
        type: "success",
        title: "Payment Deleted",
        message: "Payment has been deleted successfully.",
      });
    } catch (error) {
      console.error("API delete failed, but local delete succeeded:", error);
      addToast({
        type: "danger",
        title: "Delete Error",
        message: "Failed to delete payment. Please try again.",
      });
    }

    setDeleteDialogOpen(false);
    setPaymentToDelete(null);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      tenantId: payment.tenantId,
      monthlyRent: payment.monthlyRent,
      paidAmount: payment.paidAmount,
      balance: payment.balance,
      status: payment.status as "Paid" | "Partial" | "Pending" | "Overdue",
      paymentDate: payment.paymentDate ? dayjs(payment.paymentDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      monthlyServiceId: payment.monthlyServiceId || "",
      notes: payment.notes || "",
    });
    setOpenPaymentModal(true);
  };

  const printInvoice = (payment: Payment) => {
    // Get monthly service info if available
    let serviceInfo = null;
    if (payment.monthlyServiceId && monthlyServices.length > 0) {
      serviceInfo = monthlyServices.find((s) => s.id === payment.monthlyServiceId);
    }

    // Get rent info for the tenant
    const tenantRent = rents.find((r) => r.tenantId === payment.tenantId);
    // Look up room information
    const tenantRoom = tenantRent ? rooms.find((r) => r.id === tenantRent.roomId) : null;

    try {
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        addToast({
          type: "danger",
          title: "Print Error",
          message: "Please allow pop-ups for this site to print invoices.",
        });
        return;
      }

      const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Invoice - ${payment.id}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #333;
            }
            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #2563eb;
              font-size: 28px;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              color: #666;
              font-size: 14px;
              text-transform: uppercase;
            }
            .info-section p {
              margin: 5px 0;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th,
            .items-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            .items-table th {
              background-color: #f8f9fa;
              font-weight: bold;
              color: #333;
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
              padding: 8px 0;
            }
            .total-label {
              width: 150px;
              font-weight: bold;
            }
            .total-value {
              width: 120px;
              text-align: right;
            }
            .grand-total {
              font-size: 20px;
              font-weight: bold;
              color: #2563eb;
              border-top: 2px solid #2563eb;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-paid {
              background-color: #d1fae5;
              color: #065f46;
            }
            .status-partial {
              background-color: #fef3c7;
              color: #92400e;
            }
            .status-pending {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .status-overdue {
              background-color: #fee2e2;
              color: #991b1b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAYMENT INVOICE</h1>
          </div>

          <div class="invoice-info">
            <div class="info-section">
              <h3>Bill To</h3>
              <p><strong>${payment.tenant?.name || "N/A"}</strong></p>
              <p>${payment.tenant?.phone || "N/A"}</p>
              ${tenantRent && tenantRoom ? `
                <p>Room: ${tenantRoom.name || "N/A"}</p>
                <p>House: ${tenantRoom.house?.name || "N/A"}</p>
              ` : ""}
            </div>
            <div class="info-section" style="text-align: right;">
              <h3>Invoice Details</h3>
              <p><strong>Invoice #:</strong> ${payment.id.substring(0, 8).toUpperCase()}</p>
              <p><strong>Date:</strong> ${dayjs(payment.paymentDate).format("MMMM DD, YYYY")}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span></p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Monthly Rent</strong>
                  ${serviceInfo ? `<br><small>For ${dayjs(serviceInfo.month).format("MMMM YYYY")}</small>` : ""}
                </td>
                <td style="text-align: right;">$${payment.monthlyRent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              ${serviceInfo ? `
                <tr>
                  <td>
                    <strong>Monthly Services</strong>
                    <br><small>Water, Electricity, Trash, Maintenance</small>
                    <br><small>For ${dayjs(serviceInfo.month).format("MMMM YYYY")}</small>
                  </td>
                  <td style="text-align: right;">$${serviceInfo.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ` : ""}
              <tr>
                <td><strong>Total Due</strong></td>
                <td style="text-align: right;"><strong>$${(payment.monthlyRent + (serviceInfo ? serviceInfo.totalAmount : 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr>
                <td><strong>Amount Paid</strong></td>
                <td style="text-align: right;"><strong>$${payment.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <div class="total-label">Balance:</div>
              <div class="total-value grand-total">$${payment.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          ${payment.notes ? `
            <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
              <strong>Notes:</strong>
              <p style="margin: 5px 0 0 0;">${payment.notes}</p>
            </div>
          ` : ""}

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>Generated on ${dayjs().format("MMMM DD, YYYY [at] HH:mm")}</p>
          </div>
        </body>
      </html>
    `;

      printWindow.document.open();
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      
      // Fallback if onload doesn't fire
      if (printWindow.document.readyState === 'complete') {
        printWindow.focus();
        printWindow.print();
      } else {
        printWindow.addEventListener('load', () => {
          printWindow.focus();
          printWindow.print();
        });
      }
    } catch (error) {
      console.error("Print error:", error);
      addToast({
        type: "danger",
        title: "Print Error",
        message: "An error occurred while trying to print. Please try again.",
      });
    }
  };

  const openPaymentForm = () => {
    setEditingPayment(null);
    setPaymentErrors({});
    setPaymentForm({
      tenantId: "",
      monthlyRent: 0,
      paidAmount: 0,
      balance: 0,
      status: "Pending",
      paymentDate: dayjs().format("YYYY-MM-DD"),
      monthlyServiceId: "",
      notes: "",
    });
    setOpenPaymentModal(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = payments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Paid":
        return "default";
      case "Partial":
        return "secondary";
      case "Pending":
        return "outline";
      case "Overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading payments..." size="lg" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage tenant payments</p>
        </div>
        <Button onClick={openPaymentForm} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>View and manage all payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments added yet.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.tenant?.profile && (
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={payment.tenant.profile.startsWith('/') ? payment.tenant.profile : `/uploads/tenants/${payment.tenant.profile}`}
                                alt={payment.tenant.name}
                              />
                              <AvatarFallback className="text-xs">
                                {payment.tenant.name[0]}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div className="font-medium">{payment.tenant?.name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{payment.tenant?.phone || "N/A"}</div>
                          </div>
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
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.paymentDate ? dayjs(payment.paymentDate).format("MMM DD, YYYY") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {payment.notes || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {dayjs(payment.createdAt).format("MMM DD, YYYY")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printInvoice(payment)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                            title="Print Invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePayment(payment.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {payments.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Items per page:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          {itemsPerPage}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { setItemsPerPage(10); setCurrentPage(1); }}>
                          {itemsPerPage === 10 && <Check className="mr-2 h-4 w-4" />}
                          10
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setItemsPerPage(25); setCurrentPage(1); }}>
                          {itemsPerPage === 25 && <Check className="mr-2 h-4 w-4" />}
                          25
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setItemsPerPage(50); setCurrentPage(1); }}>
                          {itemsPerPage === 50 && <Check className="mr-2 h-4 w-4" />}
                          50
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setItemsPerPage(100); setCurrentPage(1); }}>
                          {itemsPerPage === 100 && <Check className="mr-2 h-4 w-4" />}
                          100
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(endIndex, payments.length)} of {payments.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Edit Payment" : "Add Payment"}</DialogTitle>
            <DialogDescription>
              {editingPayment ? "Update payment information" : "Record a new payment"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-tenant">
                  Tenant <span className="text-destructive">*</span>
                </Label>
                <select
                  id="payment-tenant"
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    paymentErrors.tenantId ? "border-destructive" : "border-input"
                  }`}
                  value={paymentForm.tenantId}
                  onChange={(e) => {
                    setPaymentForm({ ...paymentForm, tenantId: e.target.value });
                    if (paymentErrors.tenantId) {
                      setPaymentErrors({ ...paymentErrors, tenantId: "" });
                    }
                  }}
                >
                  <option value="">Select tenant</option>
                  {tenants.length > 0 ? (
                    tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} - {tenant.phone}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Loading tenants...</option>
                  )}
                </select>
                {paymentErrors.tenantId && (
                  <p className="text-sm text-destructive font-medium">{paymentErrors.tenantId}</p>
                )}
                {tenants.length === 0 && !loading && (
                  <p className="text-xs text-muted-foreground">No tenants available. Please add tenants first.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-monthly-rent">
                    Monthly Rent <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment-monthly-rent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.monthlyRent}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setPaymentForm({ ...paymentForm, monthlyRent: value });
                      if (paymentErrors.monthlyRent) {
                        setPaymentErrors({ ...paymentErrors, monthlyRent: "" });
                      }
                    }}
                    className={paymentErrors.monthlyRent ? "border-destructive" : ""}
                    readOnly={!!paymentForm.tenantId}
                  />
                  {paymentErrors.monthlyRent && (
                    <p className="text-sm text-destructive font-medium">{paymentErrors.monthlyRent}</p>
                  )}
                  {paymentForm.tenantId && (
                    <p className="text-xs text-muted-foreground">Auto-filled from tenant&apos;s rent</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-paid-amount">
                    Paid Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment-paid-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={paymentForm.monthlyRent > 0 ? paymentForm.monthlyRent : undefined}
                    value={paymentForm.paidAmount}
                    onChange={(e) => {
                      let value = parseFloat(e.target.value) || 0;
                      // Cap the value at monthlyRent if monthlyRent is set
                      if (paymentForm.monthlyRent > 0 && value > paymentForm.monthlyRent) {
                        value = paymentForm.monthlyRent;
                      }
                      setPaymentForm({ ...paymentForm, paidAmount: value });
                      if (paymentErrors.paidAmount) {
                        setPaymentErrors({ ...paymentErrors, paidAmount: "" });
                      }
                    }}
                    className={paymentErrors.paidAmount ? "border-destructive" : ""}
                  />
                  {paymentErrors.paidAmount && (
                    <p className="text-sm text-destructive font-medium">{paymentErrors.paidAmount}</p>
                  )}
                  {paymentForm.monthlyRent > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Maximum: ${paymentForm.monthlyRent.toFixed(2)} (Monthly Rent)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-balance">Balance</Label>
                  <Input
                    id="payment-balance"
                    type="number"
                    step="0.01"
                    value={paymentForm.balance.toFixed(2)}
                    readOnly
                    className="bg-muted font-semibold"
                  />
                  <p className={`text-xs ${paymentForm.balance < -0.01 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                    {(() => {
                      // Rent payments only (no monthly service)
                      const totalDue = paymentForm.monthlyRent;
                      
                      // Calculate previous payments (rent payments only)
                      let previousPaidAmount = 0;
                      if (paymentForm.tenantId) {
                        const previousPayments = payments.filter((p) => {
                          if (p.tenantId !== paymentForm.tenantId) return false;
                          if (editingPayment && p.id === editingPayment.id) return false; // Exclude current if editing
                          // Only count rent payments (no monthlyServiceId) with same monthlyRent
                          return !p.monthlyServiceId && p.monthlyRent === paymentForm.monthlyRent;
                        });
                        previousPaidAmount = previousPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
                      }
                      
                      const remainingBalance = totalDue - previousPaidAmount;
                      const totalPaid = previousPaidAmount + paymentForm.paidAmount;
                      const warning = paymentForm.paidAmount > remainingBalance + 0.01 
                        ? ` ⚠️ Overpayment! Max: $${remainingBalance.toFixed(2)}`
                        : "";
                      
                      if (previousPaidAmount > 0) {
                        return `Total Due: $${totalDue.toFixed(2)} - Previous: $${previousPaidAmount.toFixed(2)} - Current: $${paymentForm.paidAmount.toFixed(2)} = $${paymentForm.balance.toFixed(2)}${warning}`;
                      }
                      return `Total Due: $${totalDue.toFixed(2)} - Current Payment: $${paymentForm.paidAmount.toFixed(2)}`;
                    })()}
                  </p>
                  {paymentForm.balance < -0.01 && (
                    <p className="text-xs text-orange-600 font-medium">
                      ⚠️ Warning: This payment exceeds the total due amount. Balance will be negative.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-status">
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="payment-status"
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      paymentErrors.status ? "border-destructive" : "border-input"
                    }`}
                    value={paymentForm.status}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, status: e.target.value as "Paid" | "Partial" | "Pending" | "Overdue" });
                      if (paymentErrors.status) {
                        setPaymentErrors({ ...paymentErrors, status: "" });
                      }
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                  {paymentErrors.status && (
                    <p className="text-sm text-destructive font-medium">{paymentErrors.status}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-date">
                    Payment Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, paymentDate: e.target.value });
                      if (paymentErrors.paymentDate) {
                        setPaymentErrors({ ...paymentErrors, paymentDate: "" });
                      }
                    }}
                    className={paymentErrors.paymentDate ? "border-destructive" : ""}
                  />
                  {paymentErrors.paymentDate && (
                    <p className="text-sm text-destructive font-medium">{paymentErrors.paymentDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Additional notes about this payment..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenPaymentModal(false);
                  setEditingPayment(null);
                    setPaymentForm({
                      tenantId: "",
                      monthlyRent: 0,
                      paidAmount: 0,
                      balance: 0,
                      status: "Pending",
                      paymentDate: dayjs().format("YYYY-MM-DD"),
                      monthlyServiceId: "",
                      notes: "",
                    });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPayment ? "Update Payment" : "Add Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePayment}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
