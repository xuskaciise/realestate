"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import dayjs from "dayjs";
import { Wrench, Plus, Trash2, Edit, Check, X, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const issueSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
});

const requestSchema = z.object({
  tenantId: z.string().optional(),
  roomId: z.string().optional(),
  issueIds: z.array(z.string()).min(1, "At least one issue must be selected"),
  notes: z.string().optional(),
});

type MaintenanceIssue = {
  id: string;
  name: string;
  description?: string;
  price: number;
  createdAt: string;
  updatedAt: string;
};

type MaintenanceRequest = {
  id: string;
  tenantId?: string;
  roomId?: string;
  issueIds: string[];
  totalPrice: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  issues?: MaintenanceIssue[];
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
};

type Room = {
  id: string;
  name: string;
  house: {
    id: string;
    name: string;
  };
};

type Rent = {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
};

type RentedRoom = {
  roomId: string;
  tenantId: string;
  roomName: string;
  houseName: string;
  tenantName: string;
  tenantPhone: string;
};

export default function MaintenancePage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"issues" | "requests">("issues");
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rentedRooms, setRentedRooms] = useState<RentedRoom[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIssueModal, setOpenIssueModal] = useState(false);
  const [openRequestModal, setOpenRequestModal] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openEditRequestModal, setOpenEditRequestModal] = useState(false);
  const [deleteRequestDialogOpen, setDeleteRequestDialogOpen] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState<MaintenanceRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [editingIssue, setEditingIssue] = useState<MaintenanceIssue | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [issueForm, setIssueForm] = useState({
    name: "",
    description: "",
    price: 0,
  });

  const [requestForm, setRequestForm] = useState({
    rentedRoomId: "", // Combined tenantId-roomId identifier
    selectedIssueIds: [] as string[],
    notes: "",
  });

  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState({
    paidAmount: 0,
    paymentDate: dayjs().format("YYYY-MM-DD"),
    notes: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  const fetchIssues = useCallback(async () => {
    try {
      const response = await fetch("/api/maintenance-issues");
      if (response.ok) {
        const data = await response.json();
        setIssues(data || []);
      }
    } catch (error) {
      console.error("Error fetching maintenance issues:", error);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/maintenance-requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data || []);
      }
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }, []);

  // Calculate remaining balance for a maintenance request
  const calculateRequestBalance = useCallback((requestId: string, totalPrice: number): number => {
    const requestPayments = payments.filter(
      (p) => p.maintenanceRequestId === requestId
    );
    const totalPaid = requestPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    return Math.max(0, totalPrice - totalPaid);
  }, [payments]);

  const fetchRentedRooms = useCallback(async () => {
    try {
      // Fetch rents to get active rentals
      const rentsResponse = await fetch("/api/rents");
      if (!rentsResponse.ok) {
        setRentedRooms([]);
        return;
      }
      const rents: Rent[] = await rentsResponse.json();

      // Filter only active rents (current date is between startDate and endDate)
      const today = dayjs();
      const activeRents = rents.filter((rent) => {
        const startDate = dayjs(rent.startDate);
        const endDate = dayjs(rent.endDate);
        return (
          (today.isAfter(startDate) || today.isSame(startDate, "day")) &&
          (today.isBefore(endDate) || today.isSame(endDate, "day"))
        );
      });

      if (activeRents.length === 0) {
        setRentedRooms([]);
        return;
      }

      // Fetch rooms and tenants
      const [roomsResponse, tenantsResponse] = await Promise.all([
        fetch("/api/rooms"),
        fetch("/api/tenants"),
      ]);

      if (!roomsResponse.ok || !tenantsResponse.ok) {
        setRentedRooms([]);
        return;
      }

      const rooms: Room[] = await roomsResponse.json();
      const tenants: Tenant[] = await tenantsResponse.json();

      // Create a map for quick lookup
      const roomsMap = new Map(rooms.map((r) => [r.id, r]));
      const tenantsMap = new Map(tenants.map((t) => [t.id, t]));

      // Combine rented rooms with their tenants
      const rentedRoomsData: RentedRoom[] = activeRents
        .map((rent) => {
          const room = roomsMap.get(rent.roomId);
          const tenant = tenantsMap.get(rent.tenantId);
          if (!room || !tenant) return null;
          return {
            roomId: rent.roomId,
            tenantId: rent.tenantId,
            roomName: room.name,
            houseName: room.house?.name || "Unknown",
            tenantName: tenant.name,
            tenantPhone: tenant.phone,
          };
        })
        .filter((r): r is RentedRoom => r !== null);

      setRentedRooms(rentedRoomsData);
    } catch (error) {
      console.error("Error fetching rented rooms:", error);
      setRentedRooms([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchIssues(),
        fetchRequests(),
        fetchRentedRooms(),
        fetchPayments(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchIssues, fetchRequests, fetchRentedRooms, fetchPayments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate total price for selected issues
  const calculateTotalPrice = useCallback((selectedIds: string[]) => {
    return issues
      .filter(issue => selectedIds.includes(issue.id))
      .reduce((sum, issue) => sum + (issue.price || 0), 0);
  }, [issues]);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueErrors({});

    try {
      const validated = issueSchema.parse(issueForm);

      if (editingIssue) {
        try {
          const response = await fetch(`/api/maintenance-issues/${editingIssue.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });

          if (response.ok) {
            await fetchIssues();
            setIssueForm({ name: "", description: "", price: 0 });
            setEditingIssue(null);
            setOpenIssueModal(false);
            addToast({
              type: "success",
              title: "Issue Updated",
              message: "Maintenance issue has been updated successfully.",
            });
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update issue");
          }
        } catch (error) {
          console.error("Error updating issue:", error);
          addToast({
            type: "danger",
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to update issue. Please try again.",
          });
        }
      } else {
        try {
          const response = await fetch("/api/maintenance-issues", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });

          if (response.ok) {
            await fetchIssues();
            setIssueForm({ name: "", description: "", price: 0 });
            setOpenIssueModal(false);
            addToast({
              type: "success",
              title: "Issue Added",
              message: "Maintenance issue has been added successfully.",
            });
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to create issue");
          }
        } catch (error) {
          console.error("Error creating issue:", error);
          addToast({
            type: "danger",
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to create issue. Please try again.",
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setIssueErrors(errors);
        addToast({
          type: "danger",
          title: "Validation Error",
          message: "Please check the form and fix the errors.",
        });
      }
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestErrors({});

    if (requestForm.selectedIssueIds.length === 0) {
      setRequestErrors({ issueIds: "At least one issue must be selected" });
      addToast({
        type: "danger",
        title: "Validation Error",
        message: "Please select at least one maintenance issue.",
      });
      return;
    }

    // Extract tenantId and roomId from rentedRoomId
    const selectedRentedRoom = rentedRooms.find(
      (r) => `${r.tenantId}-${r.roomId}` === requestForm.rentedRoomId
    );

    try {
      const validated = requestSchema.parse({
        tenantId: selectedRentedRoom?.tenantId || undefined,
        roomId: selectedRentedRoom?.roomId || undefined,
        issueIds: requestForm.selectedIssueIds,
        notes: requestForm.notes || undefined,
      });

      try {
        const response = await fetch("/api/maintenance-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validated),
        });

        if (response.ok) {
          await fetchRequests();
          setRequestForm({ rentedRoomId: "", selectedIssueIds: [], notes: "" });
          setOpenRequestModal(false);
          addToast({
            type: "success",
            title: "Request Created",
            message: "Maintenance request has been created successfully.",
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create request");
        }
      } catch (error) {
        console.error("Error creating request:", error);
        addToast({
          type: "danger",
          title: "Error",
          message: error instanceof Error ? error.message : "Failed to create request. Please try again.",
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
        setRequestErrors(errors);
        addToast({
          type: "danger",
          title: "Validation Error",
          message: "Please check the form and fix the errors.",
        });
      }
    }
  };

  const handleEditIssue = (issue: MaintenanceIssue) => {
    setEditingIssue(issue);
    setIssueForm({
      name: issue.name,
      description: issue.description || "",
      price: issue.price,
    });
    setOpenIssueModal(true);
  };

  const handleDeleteIssue = (id: string) => {
    setIssueToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteIssue = async () => {
    if (!issueToDelete) return;

    try {
      const response = await fetch(`/api/maintenance-issues/${issueToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchIssues();
        addToast({
          type: "success",
          title: "Issue Deleted",
          message: "Maintenance issue has been deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete issue");
      }
    } catch (error) {
      console.error("Error deleting issue:", error);
      addToast({
        type: "danger",
        title: "Delete Error",
        message: "Failed to delete issue. Please try again.",
      });
    }

    setDeleteDialogOpen(false);
    setIssueToDelete(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentErrors({});

    if (!selectedRequestForPayment || !selectedRequestForPayment.tenantId) {
      addToast({
        type: "danger",
        title: "Error",
        message: "No tenant associated with this maintenance request.",
      });
      return;
    }

    if (paymentForm.paidAmount <= 0) {
      setPaymentErrors({ paidAmount: "Paid amount must be greater than 0" });
      return;
    }

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedRequestForPayment.tenantId,
          monthlyRent: 0, // Maintenance payments don't use monthly rent
          paidAmount: paymentForm.paidAmount,
          balance: selectedRequestForPayment.totalPrice - paymentForm.paidAmount,
          status: paymentForm.paidAmount >= selectedRequestForPayment.totalPrice ? "Paid" : "Partial",
          paymentDate: paymentForm.paymentDate,
          maintenanceRequestId: selectedRequestForPayment.id,
          notes: paymentForm.notes || null,
        }),
      });

      if (response.ok) {
        addToast({
          type: "success",
          title: "Payment Created",
          message: "Payment has been recorded successfully.",
        });
        setOpenPaymentModal(false);
        setSelectedRequestForPayment(null);
        setPaymentForm({
          paidAmount: 0,
          paymentDate: dayjs().format("YYYY-MM-DD"),
          notes: "",
        });
        await Promise.all([fetchRequests(), fetchPayments()]); // Refresh requests and payments
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      addToast({
        type: "danger",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create payment. Please try again.",
      });
    }
  };

  const handleEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    if (requestForm.selectedIssueIds.length === 0) {
      setRequestErrors({ issueIds: "At least one issue must be selected" });
      addToast({
        type: "danger",
        title: "Validation Error",
        message: "Please select at least one maintenance issue.",
      });
      return;
    }

    try {
      const selectedRentedRoom = rentedRooms.find(
        (r) => `${r.tenantId}-${r.roomId}` === requestForm.rentedRoomId
      );

      const response = await fetch(`/api/maintenance-requests/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedRentedRoom?.tenantId || editingRequest.tenantId || undefined,
          roomId: selectedRentedRoom?.roomId || editingRequest.roomId || undefined,
          issueIds: requestForm.selectedIssueIds,
          notes: requestForm.notes || undefined,
        }),
      });

      if (response.ok) {
        await fetchRequests();
        setRequestForm({ rentedRoomId: "", selectedIssueIds: [], notes: "" });
        setEditingRequest(null);
        setOpenEditRequestModal(false);
        addToast({
          type: "success",
          title: "Request Updated",
          message: "Maintenance request has been updated successfully.",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update request");
      }
    } catch (error) {
      console.error("Error updating request:", error);
      addToast({
        type: "danger",
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update request. Please try again.",
      });
    }
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      const response = await fetch(`/api/maintenance-requests/${requestToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchRequests();
        addToast({
          type: "success",
          title: "Request Deleted",
          message: "Maintenance request has been deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete request");
      }
    } catch (error) {
      console.error("Error deleting request:", error);
      addToast({
        type: "danger",
        title: "Delete Error",
        message: "Failed to delete request. Please try again.",
      });
    }

    setDeleteRequestDialogOpen(false);
    setRequestToDelete(null);
  };

  const toggleIssueSelection = (issueId: string) => {
    setRequestForm(prev => {
      const isSelected = prev.selectedIssueIds.includes(issueId);
      const newSelectedIds = isSelected
        ? prev.selectedIssueIds.filter(id => id !== issueId)
        : [...prev.selectedIssueIds, issueId];
      return { ...prev, selectedIssueIds: newSelectedIds };
    });
  };

  const totalPrice = calculateTotalPrice(requestForm.selectedIssueIds);

  // Pagination for issues
  const totalPages = Math.ceil(issues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIssues = issues.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default";
      case "In Progress":
        return "secondary";
      case "Pending":
        return "outline";
      case "Cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading maintenance..." size="lg" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">Manage maintenance issues and requests</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "issues" | "requests")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Manage Issues</TabsTrigger>
          <TabsTrigger value="requests">Create Request</TabsTrigger>
        </TabsList>

        {/* Manage Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Maintenance Issues</CardTitle>
                  <CardDescription>Create and manage maintenance issues with prices</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingIssue(null);
                  setIssueForm({ name: "", description: "", price: 0 });
                  setOpenIssueModal(true);
                }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Issue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <div className="py-12 text-center">
                  <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No maintenance issues added yet.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedIssues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell className="font-medium">{issue.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {issue.description || "-"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${issue.price.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {dayjs(issue.createdAt).format("MMM D, YYYY")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditIssue(issue)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteIssue(issue.id)}
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
                  {issues.length > 0 && (
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {startIndex + 1}-{Math.min(endIndex, issues.length)} of {issues.length}
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
        </TabsContent>

        {/* Create Request Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Request Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Create Maintenance Request</CardTitle>
                    <CardDescription>Select multiple issues and create a request</CardDescription>
                  </div>
                  <Button onClick={() => {
                    setRequestForm({ rentedRoomId: "", selectedIssueIds: [], notes: "" });
                    setOpenRequestModal(true);
                  }} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    New Request
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-900 dark:text-blue-100">Total Price:</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {requestForm.selectedIssueIds.length} issue(s) selected
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Maintenance Issues</Label>
                    <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                      {issues.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No maintenance issues available. Please add issues first.
                        </p>
                      ) : (
                        issues.map((issue) => {
                          const isSelected = requestForm.selectedIssueIds.includes(issue.id);
                          return (
                            <div
                              key={issue.id}
                              onClick={() => toggleIssueSelection(issue.id)}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected
                                    ? "bg-blue-600 border-blue-600"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{issue.name}</div>
                                  {issue.description && (
                                    <div className="text-sm text-muted-foreground">{issue.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="font-semibold text-blue-600 dark:text-blue-400 ml-4">
                                ${issue.price.toLocaleString()}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => setOpenRequestModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={requestForm.selectedIssueIds.length === 0}
                  >
                    Create Request ({requestForm.selectedIssueIds.length} selected)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Requests List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>View all maintenance requests</CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="py-12 text-center">
                    <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No maintenance requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 10).map((request) => {
                      const balance = calculateRequestBalance(request.id, request.totalPrice);
                      const totalPaid = request.totalPrice - balance;
                      return (
                        <div
                          key={request.id}
                          className="p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                ${request.totalPrice.toLocaleString()}
                              </div>
                              {balance > 0 && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                  Balance: ${balance.toLocaleString()}
                                </div>
                              )}
                              {balance === 0 && totalPaid > 0 && (
                                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  Paid
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {request.issues?.length || request.issueIds.length} issue(s) • {dayjs(request.createdAt).format("MMM D, YYYY")}
                          </div>
                          {request.notes && (
                            <div className="text-sm text-muted-foreground mb-3">
                              {request.notes}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {request.tenantId && balance > 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequestForPayment(request);
                                  setPaymentForm({
                                    paidAmount: balance,
                                    paymentDate: dayjs().format("YYYY-MM-DD"),
                                    notes: `Payment for maintenance request #${request.id}`,
                                  });
                                  setOpenPaymentModal(true);
                                }}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm"
                              >
                                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                                Pay ${balance.toLocaleString()}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRequest(request);
                                const selectedRentedRoom = rentedRooms.find(
                                  (r) => r.tenantId === request.tenantId && r.roomId === request.roomId
                                );
                                setRequestForm({
                                  rentedRoomId: selectedRentedRoom ? `${selectedRentedRoom.tenantId}-${selectedRentedRoom.roomId}` : "",
                                  selectedIssueIds: request.issueIds,
                                  notes: request.notes || "",
                                });
                                setOpenEditRequestModal(true);
                              }}
                              className="px-2"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRequestToDelete(request.id);
                                setDeleteRequestDialogOpen(true);
                              }}
                              className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Issue Modal */}
      <Dialog open={openIssueModal} onOpenChange={setOpenIssueModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIssue ? "Edit Issue" : "Add Maintenance Issue"}</DialogTitle>
            <DialogDescription>
              {editingIssue ? "Update maintenance issue information" : "Create a new maintenance issue with price"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issue-name">
                  Issue Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="issue-name"
                  value={issueForm.name}
                  onChange={(e) => {
                    setIssueForm({ ...issueForm, name: e.target.value });
                    if (issueErrors.name) {
                      setIssueErrors({ ...issueErrors, name: "" });
                    }
                  }}
                  className={issueErrors.name ? "border-destructive" : ""}
                  placeholder="e.g., Plumbing Repair, Electrical Fix"
                />
                {issueErrors.name && (
                  <p className="text-sm text-destructive font-medium">{issueErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-description">Description</Label>
                <Textarea
                  id="issue-description"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  placeholder="Optional description of the maintenance issue"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-price">
                  Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="issue-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={issueForm.price}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setIssueForm({ ...issueForm, price: value });
                    if (issueErrors.price) {
                      setIssueErrors({ ...issueErrors, price: "" });
                    }
                  }}
                  className={issueErrors.price ? "border-destructive" : ""}
                  placeholder="0.00"
                />
                {issueErrors.price && (
                  <p className="text-sm text-destructive font-medium">{issueErrors.price}</p>
                )}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenIssueModal(false);
                  setEditingIssue(null);
                  setIssueForm({ name: "", description: "", price: 0 });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingIssue ? "Update Issue" : "Add Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Modal */}
      <Dialog open={openRequestModal} onOpenChange={setOpenRequestModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Maintenance Request</DialogTitle>
            <DialogDescription>
              Select multiple maintenance issues and create a request
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request-tenant-room">Tenant & Room (Optional)</Label>
                <select
                  id="request-tenant-room"
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={requestForm.rentedRoomId}
                  onChange={(e) => setRequestForm({ ...requestForm, rentedRoomId: e.target.value })}
                >
                  <option value="">Select tenant & room</option>
                  {rentedRooms.map((rentedRoom) => (
                    <option key={`${rentedRoom.tenantId}-${rentedRoom.roomId}`} value={`${rentedRoom.tenantId}-${rentedRoom.roomId}`}>
                      {rentedRoom.roomName} ({rentedRoom.houseName}) - {rentedRoom.tenantName}
                    </option>
                  ))}
                </select>
                {rentedRooms.length === 0 && (
                  <p className="text-sm text-muted-foreground">No rented rooms available</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Select Issues <span className="text-destructive">*</span>
                </Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No maintenance issues available. Please add issues first.
                    </p>
                  ) : (
                    issues.map((issue) => {
                      const isSelected = requestForm.selectedIssueIds.includes(issue.id);
                      return (
                        <div
                          key={issue.id}
                          onClick={() => toggleIssueSelection(issue.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{issue.name}</div>
                              {issue.description && (
                                <div className="text-sm text-muted-foreground">{issue.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="font-semibold text-blue-600 dark:text-blue-400 ml-4">
                            ${issue.price.toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {requestErrors.issueIds && (
                  <p className="text-sm text-destructive font-medium">{requestErrors.issueIds}</p>
                )}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900 dark:text-blue-100">Total Price:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${totalPrice.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {requestForm.selectedIssueIds.length} issue(s) selected
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-notes">Notes (Optional)</Label>
                <Textarea
                  id="request-notes"
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Additional notes about this maintenance request"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenRequestModal(false);
                  setRequestForm({ rentedRoomId: "", selectedIssueIds: [], notes: "" });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={requestForm.selectedIssueIds.length === 0}>
                Create Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Maintenance Request</DialogTitle>
            <DialogDescription>
              Record payment for maintenance request
            </DialogDescription>
          </DialogHeader>
          {selectedRequestForPayment && (() => {
            const currentBalance = calculateRequestBalance(selectedRequestForPayment.id, selectedRequestForPayment.totalPrice);
            return (
              <form onSubmit={handlePaymentSubmit}>
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-2xl font-bold">
                      ${selectedRequestForPayment.totalPrice.toLocaleString()}
                    </div>
                    {currentBalance < selectedRequestForPayment.totalPrice && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Already paid: ${(selectedRequestForPayment.totalPrice - currentBalance).toLocaleString()}
                      </div>
                    )}
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-amount">
                    Paid Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={currentBalance}
                    value={paymentForm.paidAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const maxValue = currentBalance;
                      setPaymentForm({ ...paymentForm, paidAmount: Math.min(value, maxValue) });
                      if (paymentErrors.paidAmount) {
                        setPaymentErrors({ ...paymentErrors, paidAmount: "" });
                      }
                    }}
                    className={paymentErrors.paidAmount ? "border-destructive" : ""}
                    placeholder="0.00"
                  />
                  {paymentErrors.paidAmount && (
                    <p className="text-sm text-destructive font-medium">{paymentErrors.paidAmount}</p>
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
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Additional notes about this payment"
                    rows={3}
                  />
                </div>

                {paymentForm.paidAmount > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Remaining Balance:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        ${(currentBalance - paymentForm.paidAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenPaymentModal(false);
                    setSelectedRequestForPayment(null);
                    setPaymentForm({
                      paidAmount: 0,
                      paymentDate: dayjs().format("YYYY-MM-DD"),
                      notes: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </DialogFooter>
            </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Request Modal */}
      <Dialog open={openEditRequestModal} onOpenChange={setOpenEditRequestModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Request</DialogTitle>
            <DialogDescription>
              Update maintenance request details
            </DialogDescription>
          </DialogHeader>
          {editingRequest && (
            <form onSubmit={handleEditRequest}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tenant & Room (Optional)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={requestForm.rentedRoomId}
                    onChange={(e) => setRequestForm({ ...requestForm, rentedRoomId: e.target.value })}
                  >
                    <option value="">Select tenant & room</option>
                    {rentedRooms.map((rentedRoom) => (
                      <option key={`${rentedRoom.tenantId}-${rentedRoom.roomId}`} value={`${rentedRoom.tenantId}-${rentedRoom.roomId}`}>
                        {rentedRoom.roomName} ({rentedRoom.houseName}) - {rentedRoom.tenantName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Select Issues <span className="text-destructive">*</span>
                  </Label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {issues.map((issue) => {
                      const isSelected = requestForm.selectedIssueIds.includes(issue.id);
                      return (
                        <div
                          key={issue.id}
                          onClick={() => toggleIssueSelection(issue.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{issue.name}</div>
                              {issue.description && (
                                <div className="text-sm text-muted-foreground">{issue.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="font-semibold text-blue-600 dark:text-blue-400 ml-4">
                            ${issue.price.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 dark:text-blue-100">Total Price:</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${calculateTotalPrice(requestForm.selectedIssueIds).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-request-notes">Notes (Optional)</Label>
                  <Textarea
                    id="edit-request-notes"
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                    placeholder="Additional notes about this maintenance request"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenEditRequestModal(false);
                    setEditingRequest(null);
                    setRequestForm({ rentedRoomId: "", selectedIssueIds: [], notes: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={requestForm.selectedIssueIds.length === 0}>
                  Update Request
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Request Confirmation Dialog */}
      <AlertDialog open={deleteRequestDialogOpen} onOpenChange={setDeleteRequestDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the maintenance request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRequest}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the maintenance issue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIssueToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteIssue}
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
