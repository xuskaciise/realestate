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
import Image from "next/image";
import { Users, Plus, Trash2, Edit, ChevronLeft, ChevronRight, Check } from "lucide-react";
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

const userSchema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  type: z.string().min(1, "User type is required"),
  status: z.string().min(1, "Status is required"),
});

type User = {
  id: string;
  fullname: string;
  username: string;
  type: string;
  status: string;
  profile: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [userForm, setUserForm] = useState({
    fullname: "",
    username: "",
    password: "",
    type: "Staff",
    status: "Active",
    profile: "",
  });

  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrors({});

    try {
      if (editingUser) {
        // Update user - password is optional
        const validated = userSchema.parse({
          ...userForm,
          password: userForm.password || undefined,
          profile: userForm.profile || undefined,
        });

        const updatedUsers = users.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                ...validated,
                profile: validated.profile || u.profile || null,
                updatedAt: new Date().toISOString(),
              }
            : u
        );
        setUsers(updatedUsers);

        try {
          await fetch(`/api/users/${editingUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API update failed, but local update succeeded:", error);
        }

        setUserForm({
          fullname: "",
          username: "",
          password: "",
          type: "Staff",
          status: "Active",
          profile: "",
        });
        setPreviewImage(null);
        setEditingUser(null);
        setOpenUserModal(false);
        addToast({
          type: "success",
          title: "User Updated",
          message: "User has been updated successfully.",
        });
      } else {
        // Create user - password is required
        const validated = userSchema.parse(userForm);

        const newUser: User = {
          id: crypto.randomUUID(),
          ...validated,
          profile: validated.profile || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);

        try {
          await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API create failed, but local create succeeded:", error);
        }

        setUserForm({
          fullname: "",
          username: "",
          password: "",
          type: "Staff",
          status: "Active",
          profile: "",
        });
        setPreviewImage(null);
        setOpenUserModal(false);
        addToast({
          type: "success",
          title: "User Added",
          message: "User has been added successfully.",
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
        setUserErrors(errors);
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

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      fullname: user.fullname,
      username: user.username,
      password: "", // Don't show password when editing
      type: user.type,
      status: user.status,
      profile: user.profile || "",
    });
    setPreviewImage(user.profile || null);
    setOpenUserModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      addToast({
        type: "danger",
        title: "Invalid File",
        message: "Please select an image file.",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: "danger",
        title: "File Too Large",
        message: "Image size must be less than 5MB.",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/users/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUserForm({ ...userForm, profile: data.path });
        setPreviewImage(data.path);
        addToast({
          type: "success",
          title: "Image Uploaded",
          message: "Profile image has been uploaded successfully.",
        });
      } else {
        const error = await response.json();
        addToast({
          type: "danger",
          title: "Upload Failed",
          message: error.error || "Failed to upload image.",
        });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      addToast({
        type: "danger",
        title: "Upload Error",
        message: "An error occurred while uploading the image.",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    setUserToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    const updatedUsers = users.filter((u) => u.id !== userToDelete);
    setUsers(updatedUsers);

    try {
      await fetch(`/api/users/${userToDelete}`, {
        method: "DELETE",
      });
      addToast({
        type: "success",
        title: "User Deleted",
        message: "User has been deleted successfully.",
      });
    } catch (error) {
      console.error("API delete failed, but local delete succeeded:", error);
      addToast({
        type: "danger",
        title: "Delete Error",
        message: "Failed to delete user. Please try again.",
      });
    }

    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const openUserForm = () => {
    setEditingUser(null);
    setUserErrors({});
    setUserForm({
      fullname: "",
      username: "",
      password: "",
      type: "Staff",
      status: "Active",
      profile: "",
    });
    setPreviewImage(null);
    setOpenUserModal(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadgeVariant = (status: string | undefined | null) => {
    if (!status) return "outline";
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTypeBadgeVariant = (type: string | undefined | null) => {
    if (!type) return "outline";
    switch (type.toLowerCase()) {
      case "admin":
        return "default";
      case "manager":
        return "secondary";
      case "staff":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingOverlay message="Loading users..." size="lg" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>
        <Button onClick={openUserForm} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users added yet.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarImage 
                            src={user.profile ? (user.profile.startsWith('/') ? user.profile : `/uploads/users/${user.profile}`) : undefined} 
                            alt={user.fullname || user.username} 
                          />
                          <AvatarFallback>
                            {user.fullname
                              ? user.fullname
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{user.fullname || user.username}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(user.type)}>
                          {user.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dayjs(user.createdAt).format("MMM DD, YYYY")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
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
              {users.length > 0 && (
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
                      {startIndex + 1}-{Math.min(endIndex, users.length)} of {users.length}
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

      {/* User Modal */}
      <Dialog open={openUserModal} onOpenChange={setOpenUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Create a new user account"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit}>
            <div className="space-y-4">
              {/* Profile Image Upload */}
              <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {previewImage ? (
                      <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-gray-200">
                        <Image
                          src={previewImage.startsWith('/') ? previewImage : `/uploads/users/${previewImage}`}
                          alt="Profile preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      id="user-profile"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="cursor-pointer"
                    />
                    {uploadingImage && (
                      <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Max size: 5MB. Supported formats: JPG, PNG, GIF, WebP
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-fullname">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-fullname"
                  value={userForm.fullname}
                  onChange={(e) => {
                    setUserForm({ ...userForm, fullname: e.target.value });
                    if (userErrors.fullname) {
                      setUserErrors({ ...userErrors, fullname: "" });
                    }
                  }}
                  className={userErrors.fullname ? "border-destructive" : ""}
                />
                {userErrors.fullname && (
                  <p className="text-sm text-destructive font-medium">{userErrors.fullname}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-username"
                  value={userForm.username}
                  onChange={(e) => {
                    setUserForm({ ...userForm, username: e.target.value });
                    if (userErrors.username) {
                      setUserErrors({ ...userErrors, username: "" });
                    }
                  }}
                  className={userErrors.username ? "border-destructive" : ""}
                />
                {userErrors.username && (
                  <p className="text-sm text-destructive font-medium">{userErrors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password">
                  Password {!editingUser && <span className="text-destructive">*</span>}
                  {editingUser && <span className="text-muted-foreground text-xs">(Leave blank to keep current password)</span>}
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => {
                    setUserForm({ ...userForm, password: e.target.value });
                    if (userErrors.password) {
                      setUserErrors({ ...userErrors, password: "" });
                    }
                  }}
                  className={userErrors.password ? "border-destructive" : ""}
                />
                {userErrors.password && (
                  <p className="text-sm text-destructive font-medium">{userErrors.password}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-type">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="user-type"
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-input"
                    value={userForm.type}
                    onChange={(e) => {
                      setUserForm({ ...userForm, type: e.target.value });
                      if (userErrors.type) {
                        setUserErrors({ ...userErrors, type: "" });
                      }
                    }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                  {userErrors.type && (
                    <p className="text-sm text-destructive font-medium">{userErrors.type}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-status">
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="user-status"
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-input"
                    value={userForm.status}
                    onChange={(e) => {
                      setUserForm({ ...userForm, status: e.target.value });
                      if (userErrors.status) {
                        setUserErrors({ ...userErrors, status: "" });
                      }
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                  {userErrors.status && (
                    <p className="text-sm text-destructive font-medium">{userErrors.status}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenUserModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? "Update User" : "Add User"}
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
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
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
