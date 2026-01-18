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
import { User, Plus, Trash2, Edit, Upload, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import Image from "next/image";
import { LoadingOverlay } from "@/components/ui/loading";
import { UploadButton } from "@/lib/uploadthing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  profile: z.string().optional(),
});

type Tenant = {
  id: string;
  name: string;
  phone: string;
  address: string;
  profile: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTenantModal, setOpenTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [tenantForm, setTenantForm] = useState({
    name: "",
    phone: "",
    address: "",
    profile: "",
  });

  const [tenantErrors, setTenantErrors] = useState<Record<string, string>>({});

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleUploadComplete = (res: { url: string; key: string }[]) => {
    if (res && res[0]) {
      const fileUrl = res[0].url;
      setTenantForm({ ...tenantForm, profile: fileUrl });
      setPreviewImage(fileUrl);
      setUploadingImage(false);
    }
  };

  const handleUploadError = (error: Error) => {
    console.error("Error uploading image:", error);
    alert("Failed to upload image. Please try again.");
    setUploadingImage(false);
  };

  const handleUploadBegin = () => {
    setUploadingImage(true);
  };

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantErrors({});

    try {
      const validated = tenantSchema.parse(tenantForm);

      if (editingTenant) {
        try {
          const response = await fetch(`/api/tenants/${editingTenant.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            await fetchTenants();
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update tenant");
          }
        } catch (error) {
          console.error("Error updating tenant:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to update tenant. Please try again.";
          alert(errorMessage);
          return;
        }

        setTenantForm({ name: "", phone: "", address: "", profile: "" });
        setEditingTenant(null);
        setOpenTenantModal(false);
        setPreviewImage(null);
      } else {
        try {
          const response = await fetch("/api/tenants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            await fetchTenants();
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to create tenant");
          }
        } catch (error) {
          console.error("Error creating tenant:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to create tenant. Please try again.";
          alert(errorMessage);
          return;
        }

        setTenantForm({ name: "", phone: "", address: "", profile: "" });
        setOpenTenantModal(false);
        setPreviewImage(null);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setTenantErrors(fieldErrors);
      }
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    try {
      const response = await fetch(`/api/tenants/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        await fetchTenants();
      } else {
        throw new Error("Failed to delete tenant");
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      alert("Failed to delete tenant. Please try again.");
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setTenantForm({
      name: tenant.name,
      phone: tenant.phone,
      address: tenant.address,
      profile: tenant.profile || "",
    });
    setPreviewImage(tenant.profile || null);
    setOpenTenantModal(true);
  };

  const openTenantForm = () => {
    setEditingTenant(null);
    setTenantForm({ name: "", phone: "", address: "", profile: "" });
    setPreviewImage(null);
    setOpenTenantModal(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(tenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenants = tenants.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading tenants..." size="lg" />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage tenant information
          </p>
        </div>
        <Button 
          onClick={openTenantForm}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Tenant Modal */}
      <Dialog open={openTenantModal} onOpenChange={setOpenTenantModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTenant ? "Edit Tenant" : "Add New Tenant"}
            </DialogTitle>
            <DialogDescription>
              {editingTenant
                ? "Update tenant information"
                : "Create a new tenant with name, phone, address, and profile image"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTenantSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant-name"
                value={tenantForm.name}
                onChange={(e) => {
                  setTenantForm({ ...tenantForm, name: e.target.value });
                  if (tenantErrors.name) {
                    setTenantErrors({ ...tenantErrors, name: "" });
                  }
                }}
                className={tenantErrors.name ? "border-destructive" : ""}
              />
              {tenantErrors.name && (
                <p className="text-sm text-destructive font-medium">{tenantErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant-phone"
                value={tenantForm.phone}
                onChange={(e) => {
                  setTenantForm({ ...tenantForm, phone: e.target.value });
                  if (tenantErrors.phone) {
                    setTenantErrors({ ...tenantErrors, phone: "" });
                  }
                }}
                className={tenantErrors.phone ? "border-destructive" : ""}
              />
              {tenantErrors.phone && (
                <p className="text-sm text-destructive font-medium">{tenantErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant-address"
                value={tenantForm.address}
                onChange={(e) => {
                  setTenantForm({ ...tenantForm, address: e.target.value });
                  if (tenantErrors.address) {
                    setTenantErrors({ ...tenantErrors, address: "" });
                  }
                }}
                className={tenantErrors.address ? "border-destructive" : ""}
              />
              {tenantErrors.address && (
                <p className="text-sm text-destructive font-medium">{tenantErrors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-profile">Profile Image</Label>
              <div className="flex items-center gap-4">
                {previewImage && (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={previewImage}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <UploadButton
                    endpoint="tenantImage"
                    onClientUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                    onUploadBegin={handleUploadBegin}
                  />
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground mt-1">Uploading...</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenTenantModal(false);
                  setEditingTenant(null);
                  setTenantForm({ name: "", phone: "", address: "", profile: "" });
                  setPreviewImage(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingImage}>
                {editingTenant ? "Update Tenant" : "Create Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants List</CardTitle>
          <CardDescription>
            All tenants ({tenants.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="py-12 text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tenants added yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage 
                          src={tenant.profile || undefined} 
                          alt={tenant.name} 
                        />
                        <AvatarFallback>
                          {tenant.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.phone}</TableCell>
                    <TableCell>{tenant.address}</TableCell>
                    <TableCell>
                      {dayjs(tenant.createdAt).format("MMM D, YYYY")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="default"
                          size="icon"
                          onClick={() => handleEditTenant(tenant)}
                          className="bg-primary hover:bg-primary/90 h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteTenant(tenant.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
