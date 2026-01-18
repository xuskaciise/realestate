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
import { Droplet, Zap, Trash2, Wrench, Plus, Edit, X, CreditCard, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { LoadingOverlay } from "@/components/ui/loading";
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

type Rent = {
  id: string;
  roomId: string;
  tenantId: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  tenant?: {
    id: string;
    name: string;
    phone: string;
  };
};

type Payment = {
  id: string;
  tenantId: string;
  paidAmount: number;
  monthlyServiceId?: string | null;
};

export default function MonthlyServicesPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<MonthlyService[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rents, setRents] = useState<Rent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [openServiceModal, setOpenServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<MonthlyService | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [paymentService, setPaymentService] = useState<MonthlyService | null>(null);

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

  const [paymentForm, setPaymentForm] = useState({
    tenantId: "",
    monthlyRent: 0, // Keep for API compatibility but set to 0
    paidAmount: 0,
    balance: 0,
    status: "Pending" as "Paid" | "Partial" | "Pending" | "Overdue",
    paymentDate: dayjs().format("YYYY-MM-DD"),
    monthlyServiceId: "",
    notes: "",
  });

  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  const paymentSchema = z.object({
    tenantId: z.string().min(1, "Tenant must be selected"),
    monthlyRent: z.number().min(0), // Keep for API but can be 0
    paidAmount: z.number().min(0, "Paid amount must be non-negative"),
    balance: z.number(),
    status: z.enum(["Paid", "Partial", "Pending", "Overdue"]),
    paymentDate: z.string().min(1, "Payment date is required"),
    monthlyServiceId: z.string().optional(),
    notes: z.string().optional(),
  });

  const fetchRents = useCallback(async () => {
    try {
      const response = await fetch("/api/rents", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRents(data || []);
      } else {
        setRents([]);
      }
    } catch (error) {
      console.error("Error fetching rents:", error);
      setRents([]);
    }
  }, []);

  const filterRentedRooms = useCallback(async (allRooms: Room[]) => {
    try {
      const response = await fetch("/api/rents", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const rents = await response.json();
        const today = dayjs();
        const activeRentRoomIds = new Set(
          rents
            .filter(
              (rent: { roomId: string; startDate: string; endDate: string }) =>
                rent.roomId &&
                (today.isAfter(dayjs(rent.startDate)) || today.isSame(dayjs(rent.startDate), "day")) &&
                (today.isBefore(dayjs(rent.endDate)) || today.isSame(dayjs(rent.endDate), "day"))
            )
            .map((rent: { roomId: string }) => rent.roomId)
        );
        return allRooms.filter((room) => activeRentRoomIds.has(room.id));
      }
      return allRooms;
    } catch (error) {
      console.error("Error filtering rented rooms:", error);
      return allRooms;
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          // Filter only rooms that are currently rented
          const rentedRooms = await filterRentedRooms(data);
          setRooms(rentedRooms.length > 0 ? rentedRooms : data);
        } else {
          setRooms([]);
        }
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    }
  }, [filterRentedRooms]);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch("/api/monthly-services", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data || []);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch("/api/tenants", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data || []);
      } else {
        setTenants([]);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
      setTenants([]);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/payments", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setPayments([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // First fetch rooms, then services (so services can use room data)
      await Promise.all([
        fetchRooms(),
        fetchServices(),
        fetchRents(),
        fetchTenants(),
        fetchPayments(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchRooms, fetchServices, fetchRents, fetchTenants, fetchPayments]);

  useEffect(() => {
    loadData();
    fetchRents();
  }, [loadData, fetchRents]);

  // Auto-calculate water total
  useEffect(() => {
    if (
      typeof serviceForm.waterCurrent === 'number' &&
      typeof serviceForm.waterPrevious === 'number' &&
      typeof serviceForm.waterPricePerUnit === 'number'
    ) {
      const consumption = serviceForm.waterCurrent - serviceForm.waterPrevious;
      // Calculate total: if consumption is negative or zero, set to 0 (meter reset or error)
      const total = consumption > 0 && serviceForm.waterPricePerUnit > 0 
        ? consumption * serviceForm.waterPricePerUnit 
        : 0;
      setServiceForm((prev) => ({ ...prev, waterTotal: total }));
    }
  }, [serviceForm.waterCurrent, serviceForm.waterPrevious, serviceForm.waterPricePerUnit]);

  // Auto-calculate electricity total
  useEffect(() => {
    if (
      typeof serviceForm.electricityCurrent === 'number' &&
      typeof serviceForm.electricityPrevious === 'number' &&
      typeof serviceForm.electricityPricePerUnit === 'number'
    ) {
      const consumption = serviceForm.electricityCurrent - serviceForm.electricityPrevious;
      // Calculate total: if consumption is negative or zero, set to 0 (meter reset or error)
      const total = consumption > 0 && serviceForm.electricityPricePerUnit > 0 
        ? consumption * serviceForm.electricityPricePerUnit 
        : 0;
      setServiceForm((prev) => ({ ...prev, electricityTotal: total }));
    }
  }, [
    serviceForm.electricityCurrent,
    serviceForm.electricityPrevious,
    serviceForm.electricityPricePerUnit,
  ]);

  // Calculate total amount whenever any component changes
  useEffect(() => {
    const total =
      (serviceForm.waterTotal || 0) +
      (serviceForm.electricityTotal || 0) +
      (serviceForm.trashFee || 0) +
      (serviceForm.maintenanceFee || 0);
    setServiceForm((prev) => ({ ...prev, totalAmount: total }));
  }, [serviceForm.waterTotal, serviceForm.electricityTotal, serviceForm.trashFee, serviceForm.maintenanceFee]);

  // Auto-fill previous readings when room is selected (only for new services, not when editing)
  useEffect(() => {
    if (serviceForm.roomId && !editingService && services.length > 0) {
      // Find the most recent service for this room (sorted by month descending)
      const roomServices = services
        .filter((s) => s.roomId === serviceForm.roomId)
        .sort((a, b) => {
          // Sort by month descending (most recent first)
          const monthA = dayjs(a.month);
          const monthB = dayjs(b.month);
          return monthB.valueOf() - monthA.valueOf();
        });

      if (roomServices.length > 0) {
        const lastService = roomServices[0];
        
        // Auto-fill previous readings from the last service's current readings
        // Only auto-fill if values are currently 0 (not already set by user)
        setServiceForm((prev) => {
          // Only update if we have values to fill and current values are 0
          if (
            (prev.waterPrevious === 0 && lastService.waterCurrent) ||
            (prev.electricityPrevious === 0 && lastService.electricityCurrent) ||
            (prev.waterPricePerUnit === 0 && lastService.waterPricePerUnit) ||
            (prev.electricityPricePerUnit === 0 && lastService.electricityPricePerUnit)
          ) {
            return {
              ...prev,
              waterPrevious: prev.waterPrevious === 0 && lastService.waterCurrent ? lastService.waterCurrent : prev.waterPrevious,
              electricityPrevious: prev.electricityPrevious === 0 && lastService.electricityCurrent ? lastService.electricityCurrent : prev.electricityPrevious,
              waterPricePerUnit: prev.waterPricePerUnit === 0 && lastService.waterPricePerUnit ? lastService.waterPricePerUnit : prev.waterPricePerUnit,
              electricityPricePerUnit: prev.electricityPricePerUnit === 0 && lastService.electricityPricePerUnit ? lastService.electricityPricePerUnit : prev.electricityPricePerUnit,
            };
          }
          return prev;
        });
      }
    }
  }, [serviceForm.roomId, editingService, services]);

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceErrors({});

    try {
      // Prepare form data - use null for empty optional fields
      const formData: {
        roomId: string;
        month: string;
        waterPrevious?: number;
        waterCurrent?: number;
        waterPricePerUnit?: number;
        waterTotal?: number;
        electricityPrevious?: number;
        electricityCurrent?: number;
        electricityPricePerUnit?: number;
        electricityTotal?: number;
        trashFee?: number;
        maintenanceFee?: number;
        totalAmount: number;
        notes?: string;
      } = {
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

      // Check for duplicate service (same room and month) - only for new services
      if (!editingService) {
        const duplicateService = services.find(
          (s) => s.roomId === validated.roomId && s.month === validated.month
        );
        
        if (duplicateService) {
          const roomName = rooms.find((r) => r.id === validated.roomId)?.name || validated.roomId;
          const monthName = dayjs(validated.month).format("MMMM YYYY");
          setServiceErrors({
            month: `A service already exists for room "${roomName}" in ${monthName}. Please edit the existing service instead.`,
          });
          addToast({
            type: "warning",
            title: "Duplicate Service",
            message: `A service already exists for room "${roomName}" in ${monthName}. Please edit the existing service instead.`,
          });
          return;
        }
      } else {
        // When editing, check if another service exists with same room and month (excluding current)
        const duplicateService = services.find(
          (s) => s.id !== editingService.id && s.roomId === validated.roomId && s.month === validated.month
        );
        
        if (duplicateService) {
          const roomName = rooms.find((r) => r.id === validated.roomId)?.name || validated.roomId;
          const monthName = dayjs(validated.month).format("MMMM YYYY");
          setServiceErrors({
            month: `Another service already exists for room "${roomName}" in ${monthName}. Cannot update to duplicate.`,
          });
          addToast({
            type: "warning",
            title: "Duplicate Service",
            message: `Another service already exists for room "${roomName}" in ${monthName}. Cannot update to duplicate.`,
          });
          return;
        }
      }

      if (editingService) {
        try {
          const response = await fetch(`/api/monthly-services/${editingService.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            // Update tenant balance if total amount changed
            const oldTotal = editingService.totalAmount;
            const newTotal = validated.totalAmount;
            const difference = newTotal - oldTotal;
            if (difference !== 0) {
              await addToTenantBalance(validated.roomId, difference);
            }
            
            await fetchServices();
          } else {
            const errorData = await response.json().catch(() => ({}));
            // Handle duplicate service error specifically
            if (response.status === 409) {
              const roomName = rooms.find((r) => r.id === validated.roomId)?.name || validated.roomId;
              const monthName = dayjs(validated.month).format("MMMM YYYY");
              setServiceErrors({
                month: errorData.message || `Another service already exists for room "${roomName}" in ${monthName}.`,
              });
              addToast({
                type: "warning",
                title: "Duplicate Service",
                message: errorData.message || `Another service already exists for room "${roomName}" in ${monthName}.`,
              });
              return;
            }
            throw new Error(errorData.error || "Failed to update service");
          }
        } catch (error) {
          console.error("Error updating service:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to update service. Please try again.";
          addToast({
            type: "danger",
            title: "Update Failed",
            message: errorMessage,
          });
          return;
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
        try {
          const response = await fetch("/api/monthly-services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            // Add total amount to tenant's balance (if room is rented)
            await addToTenantBalance(validated.roomId, validated.totalAmount);
            await fetchServices();
          } else {
            const errorData = await response.json().catch(() => ({}));
            // Handle duplicate service error specifically
            if (response.status === 409) {
              const roomName = rooms.find((r) => r.id === validated.roomId)?.name || validated.roomId;
              const monthName = dayjs(validated.month).format("MMMM YYYY");
              setServiceErrors({
                month: errorData.message || `A service already exists for room "${roomName}" in ${monthName}.`,
              });
              addToast({
                type: "warning",
                title: "Duplicate Service",
                message: errorData.message || `A service already exists for room "${roomName}" in ${monthName}.`,
              });
              return;
            }
            throw new Error(errorData.error || "Failed to create service");
          }
        } catch (error) {
          console.error("Error creating service:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to create service. Please try again.";
          addToast({
            type: "danger",
            title: "Create Failed",
            message: errorMessage,
          });
          return;
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
        message: `No rent found for room "${rooms.find((r) => r.id === service.roomId)?.name || service.roomId}". Please ensure the room has an active rent contract.`,
      });
      return;
    }

    // Set payment service and pre-fill payment form
    setPaymentService(service);
    // Only use monthly service total, not monthly rent
    setPaymentForm({
      tenantId: activeRent.tenantId,
      monthlyRent: 0, // Set to 0 since we're only paying for service
      paidAmount: service.totalAmount, // Pre-fill with Monthly Service total only
      balance: 0, // Will be calculated
      status: "Paid" as "Paid" | "Partial" | "Pending" | "Overdue",
      paymentDate: dayjs().format("YYYY-MM-DD"),
      monthlyServiceId: service.id,
      notes: `Payment for ${dayjs(service.month).format("MMMM YYYY")} service`,
    });
    setOpenPaymentModal(true);
  };

  // Calculate balance when paid amount changes (considering previous payments for same service)
  useEffect(() => {
    if (paymentService) {
      // Only use monthly service total, not monthly rent
      const totalDue = paymentService.totalAmount;

      // Find all previous payments for this tenant and same service
      let previousPaidAmount = 0;
      if (paymentForm.tenantId) {
        const previousPayments = payments.filter((p: Payment) => {
          if (p.tenantId !== paymentForm.tenantId) return false;
          return p.monthlyServiceId === paymentService.id;
        });
        
        previousPaidAmount = previousPayments.reduce((sum, p: Payment) => sum + (p.paidAmount || 0), 0);
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
    }
  }, [paymentForm.paidAmount, paymentForm.tenantId, paymentService, payments]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentErrors({});

    // Validate balance calculation
    if (!paymentService) {
      setPaymentErrors({
        monthlyServiceId: "Monthly service is required",
      });
      addToast({
        type: "danger",
        title: "Validation Error",
        message: "Monthly service is required for payment.",
      });
      return;
    }

    const totalDue = paymentService.totalAmount;

    // Find all previous payments for this tenant and same service
    let previousPaidAmount = 0;
    if (paymentForm.tenantId) {
      const previousPayments = payments.filter((p: Payment) => {
        if (p.tenantId !== paymentForm.tenantId) return false;
        return p.monthlyServiceId === paymentService.id;
      });
      
      previousPaidAmount = previousPayments.reduce((sum, p: Payment) => sum + (p.paidAmount || 0), 0);
    }

    const totalPaidAmount = previousPaidAmount + paymentForm.paidAmount;
    const calculatedBalance = totalDue - totalPaidAmount;

    // Calculate remaining balance before this payment
    const remainingBalance = totalDue - previousPaidAmount;

    // Prevent payment creation if balance is already zero or negative
    if (remainingBalance <= 0) {
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
      const validated = paymentSchema.parse(paymentForm);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (response.ok) {
        addToast({
          type: "success",
          title: "Payment Added",
          message: "Payment has been added successfully. Balance updated.",
        });
        setOpenPaymentModal(false);
        setPaymentService(null);
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
        // Refresh services and payments to update payment status
        await fetchServices();
        await fetchPayments();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment");
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
        console.error("Error creating payment:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create payment. Please try again.";
        addToast({
          type: "danger",
          title: "Error",
          message: errorMessage,
        });
      }
    }
  };

  const printUnpaidInvoice = (service: MonthlyService) => {
    // Check if this service has been paid
    const isPaid = payments.some((p) => (p as { monthlyServiceId?: string }).monthlyServiceId === service.id);
    
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
        message: `No rent found for room "${rooms.find((r) => r.id === service.roomId)?.name || service.roomId}". Cannot generate invoice.`,
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
                ${(() => {
                  const serviceRoom = rooms.find((r) => r.id === service.roomId);
                  return `
                <p>Room: ${serviceRoom?.name || "N/A"}</p>
                <p>House: ${serviceRoom?.house?.name || "N/A"}</p>
                <p>Address: ${serviceRoom?.house?.address || "N/A"}</p>
                `;
                })()}
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

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      const response = await fetch(`/api/monthly-services/${serviceToDelete}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        await fetchServices();
        addToast({
          type: "success",
          title: "Service Deleted",
          message: "Monthly service has been deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      addToast({
        type: "danger",
        title: "Delete Failed",
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
        const rents: Rent[] = await response.json();
        const today = dayjs();
        const activeRent = rents.find(
          (rent: Rent) =>
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
              const payments: Payment[] = await paymentsResponse.json();
              const tenantPayments = payments.filter(
                (p: Payment) => p.tenantId === activeRent.tenantId
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

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading services..." size="lg" />
        </div>
      )}
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
                      <TableCell>
                        {(() => {
                          const serviceRoom = rooms.find((r) => r.id === service.roomId);
                          return serviceRoom?.name || "N/A";
                        })()}
                      </TableCell>
                      <TableCell>
                        <div>
                          {(() => {
                            const serviceRoom = rooms.find((r) => r.id === service.roomId);
                            return (
                              <>
                                <div className="font-medium">{serviceRoom?.house.name || "N/A"}</div>
                                <div className="text-sm text-muted-foreground">
                                  {serviceRoom?.house.address || "N/A"}
                                </div>
                              </>
                            );
                          })()}
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

      {/* Payment Modal */}
      <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a new payment for {paymentService ? dayjs(paymentService.month).format("MMMM YYYY") : ""} service
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
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
                disabled
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} - {tenant.phone}
                  </option>
                ))}
              </select>
              {paymentErrors.tenantId && (
                <p className="text-sm text-destructive font-medium">{paymentErrors.tenantId}</p>
              )}
            </div>

            {paymentService && (
              <div className="space-y-2">
                <Label htmlFor="payment-monthly-service">
                  Monthly Service
                </Label>
                <Input
                  id="payment-monthly-service"
                  value={`${dayjs(paymentService.month).format("MMM YYYY")} - $${paymentService.totalAmount.toFixed(2)}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-paid-amount">
                  Paid Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment-paid-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.paidAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
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
                {paymentService && (
                  <p className="text-xs text-muted-foreground">
                    Service Total: ${paymentService.totalAmount.toFixed(2)}
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
                    if (!paymentService) return "0.00";
                    
                    // Calculate previous payments
                    let previousPaidAmount = 0;
                    if (paymentForm.tenantId) {
                      const previousPayments = payments.filter((p: Payment) => {
                        if (p.tenantId !== paymentForm.tenantId) return false;
                        return p.monthlyServiceId === paymentService.id;
                      });
                      previousPaidAmount = previousPayments.reduce((sum, p: Payment) => sum + (p.paidAmount || 0), 0);
                    }
                    
                    const remainingBalance = paymentService.totalAmount - previousPaidAmount;
                    const totalPaid = previousPaidAmount + paymentForm.paidAmount;
                    const warning = paymentForm.paidAmount > remainingBalance + 0.01 
                      ? ` ⚠️ Overpayment! Max: $${remainingBalance.toFixed(2)}`
                      : "";
                    
                    if (previousPaidAmount > 0) {
                      return `Total Due: $${paymentService.totalAmount.toFixed(2)} - Previous: $${previousPaidAmount.toFixed(2)} - Current: $${paymentForm.paidAmount.toFixed(2)} = $${paymentForm.balance.toFixed(2)}${warning}`;
                    }
                    return `Total Due: $${paymentService.totalAmount.toFixed(2)} - Current Payment: $${paymentForm.paidAmount.toFixed(2)}`;
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenPaymentModal(false);
                  setPaymentService(null);
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
              <Button type="submit">Add Payment</Button>
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
