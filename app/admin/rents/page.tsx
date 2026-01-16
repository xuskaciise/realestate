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
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { Receipt, Plus, Trash2, Edit, FileText, Download, ChevronLeft, ChevronRight, Check } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const rentSchema = z.object({
  roomId: z.string().min(1, "Room must be selected"),
  tenantId: z.string().min(1, "Tenant must be selected"),
  guarantorName: z.string().min(1, "Guarantor name is required"),
  guarantorPhone: z.string().min(1, "Guarantor phone is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  months: z.number().int().min(1).max(12),
  totalRent: z.number().positive("Total rent must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  contract: z.string().optional(),
});

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
  updatedAt: string;
  room?: {
    id: string;
    name: string;
    monthlyRent: number;
    house: {
      id: string;
      name: string;
      address: string;
    };
  };
  tenant?: {
    id: string;
    name: string;
    phone: string;
    profile: string | null;
  };
};

type Room = {
  id: string;
  name: string;
  monthlyRent: number;
  house: {
    name: string;
    address: string;
  };
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
  profile: string | null;
};

const STORAGE_KEY = "realestate_rents";

export default function RentsPage() {
  const [rents, setRents] = useState<Rent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRentModal, setOpenRentModal] = useState(false);
  const [editingRent, setEditingRent] = useState<Rent | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [rentForm, setRentForm] = useState({
    roomId: "",
    tenantId: "",
    guarantorName: "",
    guarantorPhone: "",
    monthlyRent: 0,
    months: 1,
    totalRent: 0,
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
    contract: "",
  });

  const [rentErrors, setRentErrors] = useState<Record<string, string>>({});

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rents));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [rents]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRents(),
        fetchRooms(),
        fetchTenants(),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      saveToLocalStorage();
    }
  }, [rents, loading, saveToLocalStorage]);

  // Calculate total rent when monthly rent or months change
  useEffect(() => {
    if (rentForm.monthlyRent > 0 && rentForm.months > 0) {
      const total = rentForm.monthlyRent * rentForm.months;
      setRentForm((prev) => ({ ...prev, totalRent: total }));
    }
  }, [rentForm.monthlyRent, rentForm.months]);

  // Calculate end date when start date or months change
  useEffect(() => {
    if (rentForm.startDate && rentForm.months > 0) {
      const start = dayjs(rentForm.startDate);
      const end = start.add(rentForm.months, "month");
      setRentForm((prev) => ({ ...prev, endDate: end.format("YYYY-MM-DD") }));
    }
  }, [rentForm.startDate, rentForm.months]);

  // Auto-fill monthly rent when room is selected
  useEffect(() => {
    if (rentForm.roomId && rooms.length > 0) {
      const selectedRoom = rooms.find((r) => r.id === rentForm.roomId);
      if (selectedRoom && selectedRoom.monthlyRent !== rentForm.monthlyRent) {
        setRentForm((prev) => ({ ...prev, monthlyRent: selectedRoom.monthlyRent }));
      }
    }
  }, [rentForm.roomId, rentForm.monthlyRent, rooms]);

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setRents(data);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  };

  const fetchRents = async () => {
    try {
      const response = await fetch("/api/rents");
      if (response.ok) {
        const data = await response.json();
        setRents(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error("Error fetching rents:", error);
      loadFromLocalStorage();
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setRooms(data);
        } else {
          // Load sample rooms for testing if no data
          loadSampleRooms();
        }
      } else {
        // Load sample rooms for testing
        loadSampleRooms();
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      // Load sample rooms for testing
      loadSampleRooms();
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setTenants(data);
        } else {
          // Load sample tenants for testing if no data
          loadSampleTenants();
        }
      } else {
        // Load sample tenants for testing
        loadSampleTenants();
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
      // Load sample tenants for testing
      loadSampleTenants();
    }
  };

  const loadSampleRooms = () => {
    const sampleRooms: Room[] = [
      {
        id: "sample-room-1",
        name: "101",
        monthlyRent: 100,
        house: {
          name: "Nasrudiin",
          address: "Mogadishu, Somalia",
        },
      },
      {
        id: "sample-room-2",
        name: "102",
        monthlyRent: 90,
        house: {
          name: "Nasrudiin",
          address: "Mogadishu, Somalia",
        },
      },
      {
        id: "sample-room-3",
        name: "101",
        monthlyRent: 50,
        house: {
          name: "Muuse galaal",
          address: "Mogadishu, Somalia",
        },
      },
      {
        id: "sample-room-4",
        name: "201",
        monthlyRent: 120,
        house: {
          name: "Nasrudiin",
          address: "Mogadishu, Somalia",
        },
      },
      {
        id: "sample-room-5",
        name: "202",
        monthlyRent: 110,
        house: {
          name: "Muuse galaal",
          address: "Mogadishu, Somalia",
        },
      },
    ];
    setRooms(sampleRooms);
  };

  const loadSampleTenants = () => {
    const sampleTenants: Tenant[] = [
      {
        id: "sample-tenant-1",
        name: "Ahmed Hassan",
        phone: "+252 61 123 4567",
        profile: null,
      },
      {
        id: "sample-tenant-2",
        name: "Fatima Ali",
        phone: "+252 61 234 5678",
        profile: null,
      },
      {
        id: "sample-tenant-3",
        name: "Mohamed Ibrahim",
        phone: "+252 61 345 6789",
        profile: null,
      },
      {
        id: "sample-tenant-4",
        name: "Aisha Mohamed",
        phone: "+252 61 456 7890",
        profile: null,
      },
      {
        id: "sample-tenant-5",
        name: "Omar Abdullahi",
        phone: "+252 61 567 8901",
        profile: null,
      },
    ];
    setTenants(sampleTenants);
  };

  const handleContractUpload = async (file: File) => {
    try {
      setUploadingContract(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/rents/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setRentForm({ ...rentForm, contract: data.fileName });
        return data.fileName;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading contract:", error);
      alert("Failed to upload contract. Please try again.");
      return null;
    } finally {
      setUploadingContract(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleContractUpload(file);
    }
  };

  const handleRentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRentErrors({});

    try {
      const validated = rentSchema.parse(rentForm);

      if (editingRent) {
        const updatedRents = rents.map((r) =>
          r.id === editingRent.id
            ? {
                ...r,
                ...validated,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        setRents(updatedRents);

        try {
          await fetch(`/api/rents/${editingRent.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API update failed, but local update succeeded:", error);
        }

        setRentForm({
          roomId: "",
          tenantId: "",
          guarantorName: "",
          guarantorPhone: "",
          monthlyRent: 0,
          months: 1,
          totalRent: 0,
          startDate: dayjs().format("YYYY-MM-DD"),
          endDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
          contract: "",
        });
        setEditingRent(null);
        setOpenRentModal(false);
      } else {
        const newRent: Rent = {
          id: uuidv4(),
          ...validated,
          contract: validated.contract ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedRents = [...rents, newRent];
        setRents(updatedRents);

        try {
          await fetch("/api/rents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API create failed, but local create succeeded:", error);
        }

        setRentForm({
          roomId: "",
          tenantId: "",
          guarantorName: "",
          guarantorPhone: "",
          monthlyRent: 0,
          months: 1,
          totalRent: 0,
          startDate: dayjs().format("YYYY-MM-DD"),
          endDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
          contract: "",
        });
        setOpenRentModal(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setRentErrors(fieldErrors);
      }
    }
  };

  const handleDeleteRent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rent?")) return;

    const updatedRents = rents.filter((r) => r.id !== id);
    setRents(updatedRents);

    try {
      await fetch(`/api/rents/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("API delete failed, but local delete succeeded:", error);
    }
  };

  const handleEditRent = (rent: Rent) => {
    setEditingRent(rent);
    setRentForm({
      roomId: rent.roomId,
      tenantId: rent.tenantId,
      guarantorName: rent.guarantorName,
      guarantorPhone: rent.guarantorPhone,
      monthlyRent: rent.monthlyRent,
      months: rent.months,
      totalRent: rent.totalRent,
      startDate: rent.startDate ? dayjs(rent.startDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      endDate: rent.endDate ? dayjs(rent.endDate).format("YYYY-MM-DD") : dayjs().add(1, "month").format("YYYY-MM-DD"),
      contract: rent.contract || "",
    });
    setOpenRentModal(true);
  };

  const openRentForm = () => {
    setEditingRent(null);
    setRentErrors({});
    setRentForm({
      roomId: "",
      tenantId: "",
      guarantorName: "",
      guarantorPhone: "",
      monthlyRent: 0,
      months: 1,
      totalRent: 0,
      startDate: dayjs().format("YYYY-MM-DD"),
      endDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
      contract: "",
    });
    setOpenRentModal(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(rents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRents = rents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rents</h1>
          <p className="text-muted-foreground">
            Manage rent agreements and contracts
          </p>
        </div>
        <Button 
          onClick={openRentForm}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Rent
        </Button>
      </div>

      {/* Rent Modal */}
      <Dialog open={openRentModal} onOpenChange={setOpenRentModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRent ? "Edit Rent" : "Add New Rent"}
            </DialogTitle>
            <DialogDescription>
              {editingRent
                ? "Update rent agreement information"
                : "Create a new rent agreement with room, tenant, guarantor, and contract"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent-room">
                  Room <span className="text-destructive">*</span>
                </Label>
                <select
                  id="rent-room"
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    rentErrors.roomId ? "border-destructive" : "border-input"
                  }`}
                  value={rentForm.roomId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRentForm({ ...rentForm, roomId: value });
                    // Clear error immediately when a value is selected
                    if (value && rentErrors.roomId) {
                      const newErrors = { ...rentErrors };
                      delete newErrors.roomId;
                      setRentErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.house.name} (${room.monthlyRent}/mo)
                    </option>
                  ))}
                </select>
                {rentErrors.roomId && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.roomId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent-tenant">
                  Tenant <span className="text-destructive">*</span>
                </Label>
                <select
                  id="rent-tenant"
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    rentErrors.tenantId ? "border-destructive" : "border-input"
                  }`}
                  value={rentForm.tenantId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRentForm({ ...rentForm, tenantId: value });
                    // Clear error immediately when a value is selected
                    if (value && rentErrors.tenantId) {
                      const newErrors = { ...rentErrors };
                      delete newErrors.tenantId;
                      setRentErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select a tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.phone}
                    </option>
                  ))}
                </select>
                {rentErrors.tenantId && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.tenantId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent-guarantor-name">
                  Guarantor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rent-guarantor-name"
                  value={rentForm.guarantorName}
                  onChange={(e) => {
                    setRentForm({ ...rentForm, guarantorName: e.target.value });
                    if (rentErrors.guarantorName) {
                      setRentErrors({ ...rentErrors, guarantorName: "" });
                    }
                  }}
                  className={rentErrors.guarantorName ? "border-destructive" : ""}
                />
                {rentErrors.guarantorName && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.guarantorName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent-guarantor-phone">
                  Guarantor Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rent-guarantor-phone"
                  value={rentForm.guarantorPhone}
                  onChange={(e) => {
                    setRentForm({ ...rentForm, guarantorPhone: e.target.value });
                    if (rentErrors.guarantorPhone) {
                      setRentErrors({ ...rentErrors, guarantorPhone: "" });
                    }
                  }}
                  className={rentErrors.guarantorPhone ? "border-destructive" : ""}
                />
                {rentErrors.guarantorPhone && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.guarantorPhone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent-monthly-rent">
                  Monthly Rent <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rent-monthly-rent"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rentForm.monthlyRent}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setRentForm({ ...rentForm, monthlyRent: value });
                    if (rentErrors.monthlyRent) {
                      setRentErrors({ ...rentErrors, monthlyRent: "" });
                    }
                  }}
                  className={rentErrors.monthlyRent ? "border-destructive" : ""}
                  readOnly={!!rentForm.roomId}
                />
                {rentErrors.monthlyRent && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.monthlyRent}</p>
                )}
                {rentForm.roomId && (
                  <p className="text-xs text-muted-foreground">Auto-filled from room</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent-months">
                  Months <span className="text-destructive">*</span>
                </Label>
                <select
                  id="rent-months"
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    rentErrors.months ? "border-destructive" : "border-input"
                  }`}
                  value={rentForm.months}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setRentForm({ ...rentForm, months: value });
                    if (rentErrors.months) {
                      setRentErrors({ ...rentErrors, months: "" });
                    }
                  }}
                >
                  <option value={1}>1 Month</option>
                  <option value={2}>2 Months</option>
                  <option value={3}>3 Months</option>
                  <option value={4}>4 Months</option>
                  <option value={5}>5 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={7}>7 Months</option>
                  <option value={8}>8 Months</option>
                  <option value={9}>9 Months</option>
                  <option value={10}>10 Months</option>
                  <option value={11}>11 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                </select>
                {rentErrors.months && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.months}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent-total-rent">Total Rent Amount</Label>
                <Input
                  id="rent-total-rent"
                  type="number"
                  step="0.01"
                  value={rentForm.totalRent.toFixed(2)}
                  readOnly
                  className="bg-muted font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  {rentForm.monthlyRent} × {rentForm.months} months
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent-start-date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rent-start-date"
                  type="date"
                  value={rentForm.startDate}
                  onChange={(e) => {
                    setRentForm({ ...rentForm, startDate: e.target.value });
                    if (rentErrors.startDate) {
                      setRentErrors({ ...rentErrors, startDate: "" });
                    }
                  }}
                  className={rentErrors.startDate ? "border-destructive" : ""}
                />
                {rentErrors.startDate && (
                  <p className="text-sm text-destructive font-medium">{rentErrors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent-end-date">End Date</Label>
                <Input
                  id="rent-end-date"
                  type="date"
                  value={rentForm.endDate}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Auto-calculated from start date and months</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rent-contract">Contract Document</Label>
              <div className="flex items-center gap-4">
                {rentForm.contract && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Contract uploaded</span>
                  </div>
                )}
                <Input
                  id="rent-contract"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={uploadingContract}
                  className="cursor-pointer"
                />
                {uploadingContract && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenRentModal(false);
                  setEditingRent(null);
                  setRentForm({
                    roomId: "",
                    tenantId: "",
                    guarantorName: "",
                    guarantorPhone: "",
                    monthlyRent: 0,
                    months: 1,
                    totalRent: 0,
                    startDate: dayjs().format("YYYY-MM-DD"),
                    endDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
                    contract: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingContract}>
                {editingRent ? "Update Rent" : "Create Rent"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rents List</CardTitle>
          <CardDescription>
            All rent agreements ({rents.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rents.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No rents added yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Guarantor</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Start / End Date</TableHead>
                  <TableHead>Total Rent</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRents.map((rent) => (
                  <TableRow key={rent.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {rent.room?.name || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rent.room?.house.name || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {rent.tenant?.profile && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage 
                              src={rent.tenant.profile.startsWith('/') ? rent.tenant.profile : `/uploads/tenants/${rent.tenant.profile}`} 
                              alt={rent.tenant.name} 
                            />
                            <AvatarFallback className="text-xs">
                              {rent.tenant.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <div className="font-medium">{rent.tenant?.name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{rent.tenant?.phone || "N/A"}</div>
                        </div>
                      </div>
                    </TableCell>
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
                      <Badge variant="secondary">
                        {rent.months} {rent.months === 1 ? "Month" : "Months"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {rent.startDate ? dayjs(rent.startDate).format("MMM DD, YYYY") : "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rent.endDate ? dayjs(rent.endDate).format("MMM DD, YYYY") : "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      ${rent.totalRent.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {rent.contract ? (
                        <a
                          href={rent.contract.startsWith('/') ? rent.contract : `/uploads/contracts/${rent.contract}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download className="h-4 w-4" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">No contract</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dayjs(rent.createdAt).format("MMM D, YYYY")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="default"
                          size="icon"
                          onClick={() => handleEditRent(rent)}
                          className="bg-primary hover:bg-primary/90 h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteRent(rent.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {rents.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      {itemsPerPage} per page
                      <ChevronRight className="ml-2 h-4 w-4 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleItemsPerPageChange(10)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 10 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 10 ? "" : "ml-6"}>10 per page</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleItemsPerPageChange(25)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 25 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 25 ? "" : "ml-6"}>25 per page</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleItemsPerPageChange(50)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 50 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 50 ? "" : "ml-6"}>50 per page</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleItemsPerPageChange(100)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 100 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 100 ? "" : "ml-6"}>100 per page</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, rents.length)} of {rents.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
