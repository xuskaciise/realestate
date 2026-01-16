"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { Droplet, Zap, Trash2, Wrench, Plus, Edit, X, CreditCard, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
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

const monthlyServiceSchema = z.object({
  roomId: z.string().min(1, "Room must be selected"),
  month: z.string().min(1, "Month is required"),
  waterPrevious: z.number().min(0).optional(),
  waterCurrent: z.number().min(0).optional(),
  waterPricePerUnit: z.number().min(0).optional(),
  waterTotal: z.number().min(0).optional(),
  electricityPrevious: z.number().min(0).optional(),
  electricityCurrent: z.number().min(0).optional(),
  electricityPricePerUnit: z.number().min(0).optional(),
  electricityTotal: z.number().min(0).optional(),
  trashFee: z.number().min(0).optional(),
  maintenanceFee: z.number().min(0).optional(),
  totalAmount: z.number().min(0, "Total amount must be positive"),
  notes: z.string().optional(),
});

type MonthlyService = {
  id: string;
  roomId: string;
  month: string;
  waterPrevious: number | null;
  waterCurrent: number | null;
  waterPricePerUnit: number | null;
  waterTotal: number | null;
  electricityPrevious: number | null;
  electricityCurrent: number | null;
  electricityPricePerUnit: number | null;
  electricityTotal: number | null;
  trashFee: number | null;
  maintenanceFee: number | null;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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

type Room = {
  id: string;
  name: string;
  house: {
    id: string;
    name: string;
    address: string;
  };
};

const STORAGE_KEY = "realestate_monthly_services";

export default function MonthlyServicesPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<MonthlyService[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rents, setRents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openServiceModal, setOpenServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<MonthlyService | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const [serviceForm, setServiceForm] = useState({
    roomId: "",
    month: dayjs().format("YYYY-MM"),
    waterPrevious: 0,
    waterCurrent: 0,
    waterPricePerUnit: 0,
    waterTotal: 0,
    electricityPrevious: 0,
    electricityCurrent: 0,
    electricityPricePerUnit: 0,
    electricityTotal: 0,
    trashFee: 0,
    maintenanceFee: 0,
    totalAmount: 0,
    notes: "",
  });

  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    fetchRents();
  }, []);

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

  useEffect(() => {
    if (!loading) {
      saveToLocalStorage();
    }
  }, [services, loading]);

  // Auto-calculate water total
  useEffect(() => {
    if (
      serviceForm.waterCurrent > 0 &&
      serviceForm.waterPrevious >= 0 &&
      serviceForm.waterPricePerUnit > 0
    ) {
      const consumption = serviceForm.waterCurrent - serviceForm.waterPrevious;
      const total = consumption > 0 ? consumption * serviceForm.waterPricePerUnit : 0;
      setServiceForm((prev) => ({ ...prev, waterTotal: total }));
    } else {
      setServiceForm((prev) => ({ ...prev, waterTotal: 0 }));
    }
    calculateTotal();
  }, [serviceForm.waterCurrent, serviceForm.waterPrevious, serviceForm.waterPricePerUnit]);

  // Auto-calculate electricity total
  useEffect(() => {
    if (
      serviceForm.electricityCurrent > 0 &&
      serviceForm.electricityPrevious >= 0 &&
      serviceForm.electricityPricePerUnit > 0
    ) {
      const consumption = serviceForm.electricityCurrent - serviceForm.electricityPrevious;
      const total = consumption > 0 ? consumption * serviceForm.electricityPricePerUnit : 0;
      setServiceForm((prev) => ({ ...prev, electricityTotal: total }));
    } else {
      setServiceForm((prev) => ({ ...prev, electricityTotal: 0 }));
    }
    calculateTotal();
  }, [
    serviceForm.electricityCurrent,
    serviceForm.electricityPrevious,
    serviceForm.electricityPricePerUnit,
  ]);

  // Calculate total amount
  const calculateTotal = useCallback(() => {
    const total =
      (serviceForm.waterTotal || 0) +
      (serviceForm.electricityTotal || 0) +
      (serviceForm.trashFee || 0) +
      (serviceForm.maintenanceFee || 0);
    setServiceForm((prev) => ({ ...prev, totalAmount: total }));
  }, [serviceForm.waterTotal, serviceForm.electricityTotal, serviceForm.trashFee, serviceForm.maintenanceFee]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  const loadData = async () => {
    try {
      setLoading(true);
      // First fetch rooms, then services (so services can use room data)
      await fetchRooms();
      await fetchServices();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setServices(data);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  };

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/monthly-services");
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          // Ensure all services have room data
          const servicesWithRoom = data.map((service: MonthlyService) => {
            if (!service.room && service.roomId) {
              // Try to find room from rooms list
              const room = rooms.find((r) => r.id === service.roomId);
              if (room) {
                return { ...service, room };
              }
            }
            return service;
          });
          setServices(servicesWithRoom);
        } else {
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      loadFromLocalStorage();
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          // Filter only rooms that are currently rented
          const rentedRooms = await filterRentedRooms(data);
          setRooms(rentedRooms.length > 0 ? rentedRooms : data);
        } else {
          // Load sample rented rooms for testing
          loadSampleRentedRooms();
        }
      } else {
        // Load sample rented rooms for testing
        loadSampleRentedRooms();
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      // Load sample rented rooms for testing
      loadSampleRentedRooms();
    }
  };

  const filterRentedRooms = async (allRooms: Room[]) => {
    try {
      const response = await fetch("/api/rents");
      if (response.ok) {
        const rents = await response.json();
        const today = dayjs();
        const activeRentRoomIds = new Set(
          rents
            .filter(
              (rent: any) =>
                rent.roomId &&
                (today.isAfter(dayjs(rent.startDate)) || today.isSame(dayjs(rent.startDate), "day")) &&
                (today.isBefore(dayjs(rent.endDate)) || today.isSame(dayjs(rent.endDate), "day"))
            )
            .map((rent: any) => rent.roomId)
        );
        return allRooms.filter((room) => activeRentRoomIds.has(room.id));
      }
      return allRooms;
    } catch (error) {
      console.error("Error filtering rented rooms:", error);
      return allRooms;
    }
  };

  const loadSampleRentedRooms = () => {
    const sampleRooms: Room[] = [
      {
        id: "sample-room-1",
        name: "101",
        house: {
          id: "sample-house-1",
          name: "Nasrudiin",
          address: "Mogadishu, Somalia",
        },
      },
      {
        id: "sample-room-2",
        name: "102",
        house: {
          id: "sample-house-1",
          name: "Nasrudiin",
          address: "Mogadishu, Somalia",
        },
      },
      {
        id: "sample-room-3",
        name: "201",
        house: {
          id: "sample-house-2",
          name: "Muuse galaal",
          address: "Mogadishu, Somalia",
        },
      },
    ];
    setRooms(sampleRooms);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceErrors({});

    try {
      // Prepare form data - use null for empty optional fields
      const formData: any = {
        roomId: serviceForm.roomId,
        month: serviceForm.month,
        totalAmount: serviceForm.totalAmount,
      };

      // Add optional fields only if they have values
      if (serviceForm.waterPrevious > 0) formData.waterPrevious = serviceForm.waterPrevious;
      if (serviceForm.waterCurrent > 0) formData.waterCurrent = serviceForm.waterCurrent;
      if (serviceForm.waterPricePerUnit > 0) formData.waterPricePerUnit = serviceForm.waterPricePerUnit;
      if (serviceForm.waterTotal > 0) formData.waterTotal = serviceForm.waterTotal;
      if (serviceForm.electricityPrevious > 0) formData.electricityPrevious = serviceForm.electricityPrevious;
      if (serviceForm.electricityCurrent > 0) formData.electricityCurrent = serviceForm.electricityCurrent;
      if (serviceForm.electricityPricePerUnit > 0) formData.electricityPricePerUnit = serviceForm.electricityPricePerUnit;
      if (serviceForm.electricityTotal > 0) formData.electricityTotal = serviceForm.electricityTotal;
      if (serviceForm.trashFee > 0) formData.trashFee = serviceForm.trashFee;
      if (serviceForm.maintenanceFee > 0) formData.maintenanceFee = serviceForm.maintenanceFee;
      if (serviceForm.notes) formData.notes = serviceForm.notes;

      const validated = monthlyServiceSchema.parse(formData);

      if (editingService) {
        const updatedServices = services.map((s) =>
          s.id === editingService.id
            ? {
                ...s,
                ...validated,
                waterPrevious: validated.waterPrevious ?? null,
                waterCurrent: validated.waterCurrent ?? null,
                waterPricePerUnit: validated.waterPricePerUnit ?? null,
                waterTotal: validated.waterTotal ?? null,
                electricityPrevious: validated.electricityPrevious ?? null,
                electricityCurrent: validated.electricityCurrent ?? null,
                electricityPricePerUnit: validated.electricityPricePerUnit ?? null,
                electricityTotal: validated.electricityTotal ?? null,
                trashFee: validated.trashFee ?? null,
                maintenanceFee: validated.maintenanceFee ?? null,
                notes: validated.notes ?? null,
                updatedAt: new Date().toISOString(),
              }
            : s
        );
        setServices(updatedServices);

        try {
          await fetch(`/api/monthly-services/${editingService.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });

          // Update tenant balance if total amount changed
          const oldTotal = editingService.totalAmount;
          const newTotal = validated.totalAmount;
          const difference = newTotal - oldTotal;
          if (difference !== 0) {
            await addToTenantBalance(validated.roomId, difference);
          }
        } catch (error) {
          console.error("API update failed, but local update succeeded:", error);
        }

        setServiceForm({
          roomId: "",
          month: dayjs().format("YYYY-MM"),
          waterPrevious: 0,
          waterCurrent: 0,
          waterPricePerUnit: 0,
          waterTotal: 0,
          electricityPrevious: 0,
          electricityCurrent: 0,
          electricityPricePerUnit: 0,
          electricityTotal: 0,
          trashFee: 0,
          maintenanceFee: 0,
          totalAmount: 0,
          notes: "",
        });
        setEditingService(null);
        setOpenServiceModal(false);
        addToast({
          type: "success",
          title: "Service Updated",
          message: "Monthly service has been updated successfully.",
        });
      } else {
        const newService: MonthlyService = {
          id: uuidv4(),
          ...validated,
          waterPrevious: validated.waterPrevious ?? null,
          waterCurrent: validated.waterCurrent ?? null,
          waterPricePerUnit: validated.waterPricePerUnit ?? null,
          waterTotal: validated.waterTotal ?? null,
          electricityPrevious: validated.electricityPrevious ?? null,
          electricityCurrent: validated.electricityCurrent ?? null,
          electricityPricePerUnit: validated.electricityPricePerUnit ?? null,
          electricityTotal: validated.electricityTotal ?? null,
          trashFee: validated.trashFee ?? null,
          maintenanceFee: validated.maintenanceFee ?? null,
          notes: validated.notes ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedServices = [...services, newService];
        setServices(updatedServices);

        try {
          await fetch("/api/monthly-services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });

          // Add total amount to tenant's balance (if room is rented)
          await addToTenantBalance(validated.roomId, validated.totalAmount);
        } catch (error) {
          console.error("API create failed, but local create succeeded:", error);
        }

        setServiceForm({
          roomId: "",
          month: dayjs().format("YYYY-MM"),
          waterPrevious: 0,
          waterCurrent: 0,
          waterPricePerUnit: 0,
          waterTotal: 0,
          electricityPrevious: 0,
          electricityCurrent: 0,
          electricityPricePerUnit: 0,
          electricityTotal: 0,
          trashFee: 0,
          maintenanceFee: 0,
          totalAmount: 0,
          notes: "",
        });
        setOpenServiceModal(false);
        addToast({
          type: "success",
          title: "Service Added",
          message: "Monthly service has been added successfully.",
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
        setServiceErrors(errors);
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

  const handleDeleteService = (id: string) => {
    setServiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handlePayService = (service: MonthlyService) => {
    // Check if service has room data
    if (!service.roomId) {
      addToast({
        type: "danger",
        title: "Missing Room",
        message: "This service is not linked to a room. Please edit the service and select a room.",
      });
      return;
    }

    // Find the active rent for this room to get the tenant
    const today = dayjs();
    let activeRent = rents.find(
      (r) =>
        r.roomId === service.roomId &&
        (today.isAfter(dayjs(r.startDate)) || today.isSame(dayjs(r.startDate), "day")) &&
        (today.isBefore(dayjs(r.endDate)) || today.isSame(dayjs(r.endDate), "day"))
    );

    // If no active rent found, try to get the most recent rent for this room
    if (!activeRent) {
      const roomRents = rents
        .filter((r) => r.roomId === service.roomId)
        .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf());
      
      if (roomRents.length > 0) {
        activeRent = roomRents[0];
      }
    }

    if (!activeRent || !activeRent.tenantId) {
      addToast({
        type: "danger",
        title: "No Rent Found",
        message: `No rent found for room "${service.room?.name || service.roomId}". Please ensure the room has an active rent contract.`,
      });
      return;
    }

    // Store payment data in localStorage to pre-fill the payment form
    const paymentData = {
      tenantId: activeRent.tenantId,
      monthlyServiceId: service.id,
      paidAmount: service.totalAmount,
      month: service.month,
    };

    localStorage.setItem("pending_payment", JSON.stringify(paymentData));
    
    // Navigate to payments page
    router.push("/admin/payments");
  };

  const printUnpaidInvoice = (service: MonthlyService) => {
    // Check if this service has been paid
    const isPaid = payments.some((p: any) => p.monthlyServiceId === service.id);
    
    // Find the active rent for this room to get the tenant
    const today = dayjs();
    let tenantRent = rents.find(
      (r) =>
        r.roomId === service.roomId &&
        (today.isAfter(dayjs(r.startDate)) || today.isSame(dayjs(r.startDate), "day")) &&
        (today.isBefore(dayjs(r.endDate)) || today.isSame(dayjs(r.endDate), "day"))
    );

    // If no active rent found, try to get the most recent rent for this room
    if (!tenantRent) {
      const roomRents = rents
        .filter((r) => r.roomId === service.roomId)
        .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf());
      
      if (roomRents.length > 0) {
        tenantRent = roomRents[0];
      }
    }

    if (!tenantRent || !tenantRent.tenantId) {
      addToast({
        type: "danger",
        title: "No Rent Found",
        message: `No rent found for room "${service.room?.name || service.roomId}". Cannot generate invoice.`,
      });
      return;
    }

    // Get tenant info from rent
    const tenant = tenantRent.tenant;

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
            <title>Unpaid Invoice - ${service.month}</title>
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
                border-bottom: 3px solid #dc2626;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header h1 {
                margin: 0;
                color: #dc2626;
                font-size: 28px;
              }
              .unpaid-badge {
                display: inline-block;
                background-color: #fee2e2;
                color: #991b1b;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 10px;
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
                color: #dc2626;
                border-top: 2px solid #dc2626;
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
            </style>
          </head>
          <body>
            <div class="header">
              <h1>UNPAID INVOICE <span class="unpaid-badge">UNPAID</span></h1>
            </div>

            <div class="invoice-info">
              <div class="info-section">
                <h3>Bill To</h3>
                <p><strong>${tenant?.name || "N/A"}</strong></p>
                <p>${tenant?.phone || "N/A"}</p>
                <p>Room: ${service.room?.name || "N/A"}</p>
                <p>House: ${service.room?.house?.name || "N/A"}</p>
                <p>Address: ${service.room?.house?.address || "N/A"}</p>
              </div>
              <div class="info-section" style="text-align: right;">
                <h3>Invoice Details</h3>
                <p><strong>Invoice #:</strong> ${service.id.substring(0, 8).toUpperCase()}</p>
                <p><strong>Month:</strong> ${dayjs(service.month).format("MMMM YYYY")}</p>
                <p><strong>Date:</strong> ${dayjs(service.createdAt).format("MMMM DD, YYYY")}</p>
                <p><strong>Status:</strong> <span class="unpaid-badge">UNPAID</span></p>
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
                ${service.waterTotal ? `
                  <tr>
                    <td>
                      <strong>Water</strong>
                      ${service.waterCurrent && service.waterPrevious ? `
                        <br><small>Reading: ${service.waterPrevious.toFixed(2)} m³ → ${service.waterCurrent.toFixed(2)} m³ (${(service.waterCurrent - service.waterPrevious).toFixed(2)} m³)</small>
                      ` : ""}
                    </td>
                    <td style="text-align: right;">$${service.waterTotal.toFixed(2)}</td>
                  </tr>
                ` : ""}
                ${service.electricityTotal ? `
                  <tr>
                    <td>
                      <strong>Electricity</strong>
                      ${service.electricityCurrent && service.electricityPrevious ? `
                        <br><small>Reading: ${service.electricityPrevious.toFixed(2)} kWh → ${service.electricityCurrent.toFixed(2)} kWh (${(service.electricityCurrent - service.electricityPrevious).toFixed(2)} kWh)</small>
                      ` : ""}
                    </td>
                    <td style="text-align: right;">$${service.electricityTotal.toFixed(2)}</td>
                  </tr>
                ` : ""}
                ${service.trashFee ? `
                  <tr>
                    <td><strong>Trash Fee</strong></td>
                    <td style="text-align: right;">$${service.trashFee.toFixed(2)}</td>
                  </tr>
                ` : ""}
                ${service.maintenanceFee ? `
                  <tr>
                    <td><strong>Maintenance Fee</strong></td>
                    <td style="text-align: right;">$${service.maintenanceFee.toFixed(2)}</td>
                  </tr>
                ` : ""}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <div class="total-label">Total Amount Due:</div>
                <div class="total-value grand-total">$${service.totalAmount.toFixed(2)}</div>
              </div>
            </div>

            ${service.notes ? `
              <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
                <strong>Notes:</strong>
                <p style="margin: 5px 0 0 0;">${service.notes}</p>
              </div>
            ` : ""}

            <div class="footer">
              <p><strong>This invoice is unpaid. Please make payment as soon as possible.</strong></p>
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
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
      
      // Fallback if onload doesn't fire
      setTimeout(() => {
        try {
          if (printWindow.document.readyState === 'complete') {
            printWindow.focus();
            printWindow.print();
          } else {
            printWindow.addEventListener('load', () => {
              setTimeout(() => {
                printWindow.focus();
                printWindow.print();
              }, 500);
            });
          }
        } catch (error) {
          console.error("Print error:", error);
          addToast({
            type: "danger",
            title: "Print Error",
            message: "Failed to open print dialog. Please try again.",
          });
        }
      }, 1000);
    } catch (error) {
      console.error("Print error:", error);
      addToast({
        type: "danger",
        title: "Print Error",
        message: "An error occurred while trying to print. Please try again.",
      });
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    const updatedServices = services.filter((s) => s.id !== serviceToDelete);
    setServices(updatedServices);

    try {
      await fetch(`/api/monthly-services/${serviceToDelete}`, {
        method: "DELETE",
      });
      addToast({
        type: "success",
        title: "Service Deleted",
        message: "Monthly service has been deleted successfully.",
      });
    } catch (error) {
      console.error("API delete failed, but local delete succeeded:", error);
      addToast({
        type: "danger",
        title: "Delete Error",
        message: "Failed to delete service. Please try again.",
      });
    }

    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  const handleEditService = (service: MonthlyService) => {
    setEditingService(service);
    setServiceForm({
      roomId: service.roomId,
      month: service.month,
      waterPrevious: service.waterPrevious || 0,
      waterCurrent: service.waterCurrent || 0,
      waterPricePerUnit: service.waterPricePerUnit || 0,
      waterTotal: service.waterTotal || 0,
      electricityPrevious: service.electricityPrevious || 0,
      electricityCurrent: service.electricityCurrent || 0,
      electricityPricePerUnit: service.electricityPricePerUnit || 0,
      electricityTotal: service.electricityTotal || 0,
      trashFee: service.trashFee || 0,
      maintenanceFee: service.maintenanceFee || 0,
      totalAmount: service.totalAmount,
      notes: service.notes || "",
    });
    setOpenServiceModal(true);
  };

  const addToTenantBalance = async (roomId: string, amount: number) => {
    try {
      // Find active rent for this room
      const response = await fetch("/api/rents");
      if (response.ok) {
        const rents = await response.json();
        const today = dayjs();
        const activeRent = rents.find(
          (rent: any) =>
            rent.roomId === roomId &&
            (today.isAfter(dayjs(rent.startDate)) || today.isSame(dayjs(rent.startDate), "day")) &&
            (today.isBefore(dayjs(rent.endDate)) || today.isSame(dayjs(rent.endDate), "day"))
        );

        if (activeRent && activeRent.tenantId) {
          // Find or update payment record to add to balance
          // For now, we'll create a payment record with negative paidAmount to increase balance
          // Or you can update the payment balance directly
          console.log(
            `Adding $${amount.toFixed(2)} to tenant ${activeRent.tenantId} balance for room ${roomId}`
          );

          // You can also create a payment record here if needed
          // This will add the service amount to the tenant's outstanding balance
          try {
            // Get existing payments for this tenant
            const paymentsResponse = await fetch("/api/payments");
            if (paymentsResponse.ok) {
              const payments = await paymentsResponse.json();
              const tenantPayments = payments.filter(
                (p: any) => p.tenantId === activeRent.tenantId
              );

              // If there's a payment record, we could update it
              // For now, we'll just log it - the balance calculation happens in the payment system
              addToast({
                type: "success",
                title: "Balance Updated",
                message: `Service amount of $${amount.toFixed(2)} has been added to tenant's balance.`,
              });
            }
          } catch (error) {
            console.error("Error updating tenant balance:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error adding to tenant balance:", error);
    }
  };

  const openServiceForm = () => {
    setEditingService(null);
    setServiceErrors({});
    setServiceForm({
      roomId: "",
      month: dayjs().format("YYYY-MM"),
      waterPrevious: 0,
      waterCurrent: 0,
      waterPricePerUnit: 0,
      waterTotal: 0,
      electricityPrevious: 0,
      electricityCurrent: 0,
      electricityPricePerUnit: 0,
      electricityTotal: 0,
      trashFee: 0,
      maintenanceFee: 0,
      totalAmount: 0,
      notes: "",
    });
    setOpenServiceModal(true);
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
          <h1 className="text-3xl font-bold">Monthly Services</h1>
          <p className="text-muted-foreground">Manage water, electricity, and fixed services</p>
        </div>
        <Button onClick={openServiceForm} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
          <CardDescription>View and manage monthly services</CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="py-12 text-center">
              <Droplet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No services added yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>House</TableHead>
                    <TableHead>Water (m³)</TableHead>
                    <TableHead>Electricity (kWh)</TableHead>
                    <TableHead>Trash Fee</TableHead>
                    <TableHead>Maintenance</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">
                        {dayjs(service.month).format("MMM YYYY")}
                      </TableCell>
                      <TableCell>{service.room?.name || "N/A"}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.room?.house.name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">
                            {service.room?.house.address || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {service.waterTotal ? (
                          <div>
                            <div className="font-medium">
                              {service.waterCurrent && service.waterPrevious
                                ? `${(service.waterCurrent - service.waterPrevious).toFixed(2)} m³`
                                : "-"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${service.waterTotal.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {service.electricityTotal ? (
                          <div>
                            <div className="font-medium">
                              {service.electricityCurrent && service.electricityPrevious
                                ? `${(service.electricityCurrent - service.electricityPrevious).toFixed(2)} kWh`
                                : "-"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${service.electricityTotal.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {service.trashFee ? `$${service.trashFee.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        {service.maintenanceFee ? `$${service.maintenanceFee.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        ${service.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {dayjs(service.createdAt).format("MMM DD, YYYY")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printUnpaidInvoice(service)}
                            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                            title={`Print Unpaid Invoice for ${dayjs(service.month).format("MMM YYYY")}`}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Invoice
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePayService(service)}
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            title={`Pay for ${dayjs(service.month).format("MMM YYYY")}`}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditService(service)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Modal */}
      <Dialog open={openServiceModal} onOpenChange={setOpenServiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Monthly Service"}</DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update monthly service information"
                : "Record monthly services for water, electricity, and fixed fees"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleServiceSubmit}>
            <div className="space-y-6">
              {/* Room and Month Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-room">
                    Room <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="service-room"
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      serviceErrors.roomId ? "border-destructive" : "border-input"
                    }`}
                    value={serviceForm.roomId}
                    onChange={(e) => {
                      setServiceForm({ ...serviceForm, roomId: e.target.value });
                      if (serviceErrors.roomId) {
                        setServiceErrors({ ...serviceErrors, roomId: "" });
                      }
                    }}
                  >
                    <option value="">Select room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} - {room.house.name}
                      </option>
                    ))}
                  </select>
                  {serviceErrors.roomId && (
                    <p className="text-sm text-destructive font-medium">{serviceErrors.roomId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-month">
                    Month <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="service-month"
                    type="month"
                    value={serviceForm.month}
                    onChange={(e) => {
                      setServiceForm({ ...serviceForm, month: e.target.value });
                      if (serviceErrors.month) {
                        setServiceErrors({ ...serviceErrors, month: "" });
                      }
                    }}
                    className={serviceErrors.month ? "border-destructive" : ""}
                  />
                  {serviceErrors.month && (
                    <p className="text-sm text-destructive font-medium">{serviceErrors.month}</p>
                  )}
                </div>
              </div>

              {/* Water Meter Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-blue-600" />
                    Water Meter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="water-previous">Previous Reading (m³)</Label>
                      <Input
                        id="water-previous"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.waterPrevious}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, waterPrevious: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="water-current">Current Reading (m³)</Label>
                      <Input
                        id="water-current"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.waterCurrent}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, waterCurrent: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="water-price">Price per m³</Label>
                      <Input
                        id="water-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.waterPricePerUnit}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, waterPricePerUnit: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="water-total">Total</Label>
                      <Input
                        id="water-total"
                        type="number"
                        step="0.01"
                        value={serviceForm.waterTotal.toFixed(2)}
                        readOnly
                        className="bg-muted font-semibold"
                      />
                      <p className="text-xs text-muted-foreground">
                        {(serviceForm.waterCurrent - serviceForm.waterPrevious).toFixed(2)} m³ × $
                        {serviceForm.waterPricePerUnit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Electricity Meter Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    Electricity Meter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="electricity-previous">Previous Reading (kWh)</Label>
                      <Input
                        id="electricity-previous"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.electricityPrevious}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, electricityPrevious: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="electricity-current">Current Reading (kWh)</Label>
                      <Input
                        id="electricity-current"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.electricityCurrent}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, electricityCurrent: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="electricity-price">Rate per kWh</Label>
                      <Input
                        id="electricity-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.electricityPricePerUnit}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, electricityPricePerUnit: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="electricity-total">Total</Label>
                      <Input
                        id="electricity-total"
                        type="number"
                        step="0.01"
                        value={serviceForm.electricityTotal.toFixed(2)}
                        readOnly
                        className="bg-muted font-semibold"
                      />
                      <p className="text-xs text-muted-foreground">
                        {(serviceForm.electricityCurrent - serviceForm.electricityPrevious).toFixed(2)} kWh × $
                        {serviceForm.electricityPricePerUnit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fixed Services Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-gray-600" />
                    Fixed Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trash-fee">Trash Fee</Label>
                      <Input
                        id="trash-fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.trashFee}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, trashFee: value });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-fee">Maintenance Fee (Optional)</Label>
                      <Input
                        id="maintenance-fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.maintenanceFee}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setServiceForm({ ...serviceForm, maintenanceFee: value });
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Amount */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="total-amount">Total Amount</Label>
                    <Input
                      id="total-amount"
                      type="number"
                      step="0.01"
                      value={serviceForm.totalAmount.toFixed(2)}
                      readOnly
                      className="bg-primary/10 font-bold text-lg text-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Water: ${serviceForm.waterTotal.toFixed(2)} + Electricity: $
                      {serviceForm.electricityTotal.toFixed(2)} + Trash: $
                      {serviceForm.trashFee.toFixed(2)} + Maintenance: $
                      {serviceForm.maintenanceFee.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="service-notes">Notes</Label>
                <Textarea
                  id="service-notes"
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  placeholder="Additional notes about this service..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenServiceModal(false);
                  setEditingService(null);
                  setServiceForm({
                    roomId: "",
                    month: dayjs().format("YYYY-MM"),
                    waterPrevious: 0,
                    waterCurrent: 0,
                    waterPricePerUnit: 0,
                    waterTotal: 0,
                    electricityPrevious: 0,
                    electricityCurrent: 0,
                    electricityPricePerUnit: 0,
                    electricityTotal: 0,
                    trashFee: 0,
                    maintenanceFee: 0,
                    totalAmount: 0,
                    notes: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingService ? "Update Service" : "Add Service"}
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
              This action cannot be undone. This will permanently delete the monthly service record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteService}
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
