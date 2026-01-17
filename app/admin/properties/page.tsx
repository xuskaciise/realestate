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
import { v4 as uuidv4 } from "uuid";
import { Home, Plus, Trash2, Edit, Building2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const houseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
});

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  houseId: z.string().min(1, "House must be selected"),
  status: z.enum(["available", "rented"]).default("available"),
});

type House = {
  id: string;
  name: string;
  address: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
};

type Room = {
  id: string;
  name: string;
  monthlyRent: number;
  houseId: string;
  status?: "available" | "rented";
  createdAt: string;
  updatedAt: string;
};

export default function PropertiesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [openHouseModal, setOpenHouseModal] = useState(false);
  const [openRoomModal, setOpenRoomModal] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showAddRoomForHouse, setShowAddRoomForHouse] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [roomsCurrentPage, setRoomsCurrentPage] = useState<Record<string, number>>({});
  const [roomsItemsPerPage, setRoomsItemsPerPage] = useState<Record<string, number>>({});

  const [houseForm, setHouseForm] = useState({
    name: "",
    address: "",
    description: "",
  });

  const [roomForm, setRoomForm] = useState({
    name: "",
    monthlyRent: 0,
    houseId: "",
    status: "available" as "available" | "rented",
  });

  const [houseErrors, setHouseErrors] = useState<Record<string, string>>({});
  const [roomErrors, setRoomErrors] = useState<Record<string, string>>({});

  const fetchHouses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/houses", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHouses(data || []);
      } else {
        setHouses([]);
      }
    } catch (error) {
      console.error("Error fetching houses:", error);
      setHouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

  const handleHouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHouseErrors({});

    try {
      // Validate form data
      const validated = houseSchema.parse(houseForm);
      let createdHouseId: string | null = null;
      
      if (editingHouse) {
        try {
          const response = await fetch(`/api/houses/${editingHouse.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            await fetchHouses();
          } else {
            throw new Error("Failed to update house");
          }
        } catch (error) {
          console.error("Error updating house:", error);
          alert("Failed to update house. Please try again.");
          return;
        }
        
        setHouseForm({ name: "", address: "", description: "" });
        setEditingHouse(null);
        setOpenHouseModal(false);
      } else {
        try {
          const response = await fetch("/api/houses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            const newHouse = await response.json();
            createdHouseId = newHouse.id;
            await fetchHouses();
            setShowAddRoomForHouse(createdHouseId);
          } else {
            throw new Error("Failed to create house");
          }
        } catch (error) {
          console.error("Error creating house:", error);
          alert("Failed to create house. Please try again.");
          return;
        }

        setHouseForm({ name: "", address: "", description: "" });
        setEditingHouse(null);
        setOpenHouseModal(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setHouseErrors(fieldErrors);
      }
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomErrors({});

    try {
      // Validate form data
      const validated = roomSchema.parse({
        ...roomForm,
        houseId: selectedHouseId || roomForm.houseId,
      });

      if (editingRoom) {
        try {
          const response = await fetch(`/api/rooms/${editingRoom.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            await fetchHouses();
          } else {
            throw new Error("Failed to update room");
          }
        } catch (error) {
          console.error("Error updating room:", error);
          alert("Failed to update room. Please try again.");
          return;
        }
      } else {
        try {
          const response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
          
          if (response.ok) {
            await fetchHouses();
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.details || "Failed to create room";
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error("Error creating room:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to create room. Please try again.";
          alert(errorMessage);
          return;
        }
      }

      setRoomForm({ name: "", monthlyRent: 0, houseId: "", status: "available" });
      setSelectedHouseId("");
      setEditingRoom(null);
      setOpenRoomModal(false);
      setShowAddRoomForHouse(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setRoomErrors(fieldErrors);
      }
    }
  };

  const handleDeleteHouse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this house?")) return;

    try {
      const response = await fetch(`/api/houses/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        await fetchHouses();
      } else {
        throw new Error("Failed to delete house");
      }
    } catch (error) {
      console.error("Error deleting house:", error);
      alert("Failed to delete house. Please try again.");
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        await fetchHouses();
      } else {
        throw new Error("Failed to delete room");
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      alert("Failed to delete room. Please try again.");
    }
  };

  const handleEditHouse = (house: House) => {
    setEditingHouse(house);
    setHouseForm({
      name: house.name,
      address: house.address,
      description: house.description || "",
    });
    setOpenHouseModal(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      monthlyRent: room.monthlyRent,
      houseId: room.houseId,
      status: room.status || "available",
    });
    setSelectedHouseId(room.houseId);
    setOpenRoomModal(true);
  };

  const openRoomForm = (houseId?: string) => {
    if (houseId) {
      setSelectedHouseId(houseId);
      setRoomForm({ name: "", monthlyRent: 0, houseId, status: "available" });
      setShowAddRoomForHouse(null);
    }
    setOpenRoomModal(true);
  };

  const openHouseForm = () => {
    setEditingHouse(null);
    setHouseForm({ name: "", address: "", description: "" });
    setShowAddRoomForHouse(null);
    setOpenHouseModal(true);
  };

  // Pagination calculations for houses
  const housesTotalPages = Math.ceil(houses.length / itemsPerPage);
  const housesStartIndex = (currentPage - 1) * itemsPerPage;
  const housesEndIndex = housesStartIndex + itemsPerPage;
  const paginatedHouses = houses.slice(housesStartIndex, housesEndIndex);

  const handleHousesPageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleHousesItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Pagination for rooms within each house
  const getPaginatedRooms = (rooms: Room[], houseId: string) => {
    const page = roomsCurrentPage[houseId] || 1;
    const perPage = roomsItemsPerPage[houseId] || 5;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return rooms.slice(startIndex, endIndex);
  };

  const getRoomsTotalPages = (roomsCount: number, houseId: string) => {
    const perPage = roomsItemsPerPage[houseId] || 5;
    return Math.ceil(roomsCount / perPage);
  };

  const handleRoomsPageChange = (houseId: string, page: number) => {
    setRoomsCurrentPage({ ...roomsCurrentPage, [houseId]: page });
  };

  const handleRoomsItemsPerPageChange = (houseId: string, items: number) => {
    setRoomsItemsPerPage({ ...roomsItemsPerPage, [houseId]: items });
    setRoomsCurrentPage({ ...roomsCurrentPage, [houseId]: 1 });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-muted-foreground font-medium">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Properties
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage houses and rooms
          </p>
        </div>
        <Button 
          onClick={openHouseForm}
          className="gradient-primary hover:opacity-90 text-white shadow-medium px-6 py-6 text-base font-semibold rounded-lg transition-all hover:scale-105"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add House
        </Button>
      </div>

      {/* House Modal */}
      <Dialog open={openHouseModal} onOpenChange={setOpenHouseModal}>
        <DialogContent className="sm:max-w-[500px] shadow-xl border-2">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              {editingHouse ? "Edit House" : "Add New House"}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {editingHouse
                ? "Update house information"
                : "Create a new house with name, address, and description"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleHouseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="house-name" className="text-sm font-semibold text-gray-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="house-name"
                value={houseForm.name}
                onChange={(e) => {
                  setHouseForm({ ...houseForm, name: e.target.value });
                  if (houseErrors.name) {
                    setHouseErrors({ ...houseErrors, name: "" });
                  }
                }}
                className={`${houseErrors.name ? "border-red-500 border-2" : "border-gray-300 focus:border-blue-500"} transition-colors`}
                placeholder="Enter house name"
              />
              {houseErrors.name && (
                <p className="text-sm text-destructive font-medium">{houseErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="house-address" className="text-sm font-semibold text-gray-700">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="house-address"
                value={houseForm.address}
                onChange={(e) => {
                  setHouseForm({ ...houseForm, address: e.target.value });
                  if (houseErrors.address) {
                    setHouseErrors({ ...houseErrors, address: "" });
                  }
                }}
                className={`${houseErrors.address ? "border-red-500 border-2" : "border-gray-300 focus:border-blue-500"} transition-colors`}
                placeholder="Enter house address"
              />
              {houseErrors.address && (
                <p className="text-sm text-destructive font-medium">{houseErrors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="house-description">Description</Label>
              <Textarea
                id="house-description"
                value={houseForm.description}
                onChange={(e) =>
                  setHouseForm({ ...houseForm, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenHouseModal(false);
                  setEditingHouse(null);
                  setHouseForm({ name: "", address: "", description: "" });
                }}
                className="px-6 font-semibold border-2 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="gradient-primary hover:opacity-90 text-white shadow-medium px-6 font-semibold"
              >
                {editingHouse ? "Update House" : "Create House"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Room Modal */}
      <Dialog open={openRoomModal} onOpenChange={setOpenRoomModal}>
        <DialogContent className="sm:max-w-[500px] shadow-xl border-2">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-800 bg-clip-text text-transparent">
              {editingRoom ? "Edit Room" : "Add New Room"}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {editingRoom
                ? "Update room information"
                : "Add a room to a house with name and monthly rent"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-house" className="text-sm font-semibold text-gray-700">
                House <span className="text-red-500">*</span>
              </Label>
              <select
                id="room-house"
                className={`flex h-11 w-full rounded-lg border-2 bg-background px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${
                  roomErrors.houseId ? "border-red-500" : "border-gray-300 focus:border-blue-500"
                }`}
                value={selectedHouseId || roomForm.houseId}
                onChange={(e) => {
                  setSelectedHouseId(e.target.value);
                  setRoomForm({ ...roomForm, houseId: e.target.value });
                  if (roomErrors.houseId) {
                    setRoomErrors({ ...roomErrors, houseId: "" });
                  }
                }}
                disabled={!!editingRoom}
              >
                <option value="">Select a house</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name} - {house.address}
                  </option>
                ))}
              </select>
              {roomErrors.houseId && (
                <p className="text-sm text-destructive font-medium">{roomErrors.houseId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-name" className="text-sm font-semibold text-gray-700">
                Room Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="room-name"
                value={roomForm.name}
                onChange={(e) => {
                  setRoomForm({ ...roomForm, name: e.target.value });
                  if (roomErrors.name) {
                    setRoomErrors({ ...roomErrors, name: "" });
                  }
                }}
                placeholder="e.g., 101, 102"
                className={`${roomErrors.name ? "border-red-500 border-2" : "border-gray-300 focus:border-blue-500"} transition-colors`}
              />
              {roomErrors.name && (
                <p className="text-sm text-destructive font-medium">{roomErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-rent" className="text-sm font-semibold text-gray-700">
                Monthly Rent <span className="text-red-500">*</span>
              </Label>
              <Input
                id="room-rent"
                type="number"
                step="0.01"
                min="0"
                value={roomForm.monthlyRent}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setRoomForm({ ...roomForm, monthlyRent: value });
                  if (roomErrors.monthlyRent) {
                    setRoomErrors({ ...roomErrors, monthlyRent: "" });
                  }
                }}
                placeholder="0.00"
                className={`${roomErrors.monthlyRent ? "border-red-500 border-2" : "border-gray-300 focus:border-blue-500"} transition-colors`}
              />
              {roomErrors.monthlyRent && (
                <p className="text-sm text-destructive font-medium">{roomErrors.monthlyRent}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-status" className="text-sm font-semibold text-gray-700">Status</Label>
              <select
                id="room-status"
                className="flex h-11 w-full rounded-lg border-2 border-gray-300 focus:border-blue-500 bg-background px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                value={roomForm.status}
                onChange={(e) =>
                  setRoomForm({
                    ...roomForm,
                    status: e.target.value as "available" | "rented",
                  })
                }
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
              </select>
            </div>

            <DialogFooter className="gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenRoomModal(false);
                  setEditingRoom(null);
                  setRoomForm({ name: "", monthlyRent: 0, houseId: "", status: "available" });
                  setSelectedHouseId("");
                  setShowAddRoomForHouse(null);
                }}
                className="px-6 font-semibold border-2 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-medium px-6 font-semibold"
              >
                {editingRoom ? "Update Room" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Houses Cards */}
      {houses.length === 0 ? (
        <Card className="shadow-soft border-2 border-dashed border-gray-300">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No houses added yet</h3>
            <p className="text-muted-foreground mb-6">Get started by adding your first property</p>
            <Button 
              onClick={openHouseForm}
              className="gradient-primary hover:opacity-90 text-white shadow-medium px-6 py-6 text-base font-semibold rounded-lg transition-all hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Your First House
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-6">
            {paginatedHouses.map((house) => {
            const isNewlyCreated = showAddRoomForHouse === house.id;
            return (
              <Card
                key={house.id}
                className={`shadow-soft hover:shadow-medium transition-all duration-300 border-2 ${
                  isNewlyCreated ? "border-l-4 border-l-blue-500 shadow-blue-100" : "border-gray-100"
                }`}
              >
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2 font-bold text-gray-900">{house.name}</CardTitle>
                      <CardDescription className="text-base text-gray-600 font-medium">{house.address}</CardDescription>
                      <div className="flex items-center gap-2 mt-3">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-700">
                          {house.rooms.length} {house.rooms.length === 1 ? "room" : "rooms"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => handleEditHouse(house)}
                        className="gradient-primary hover:opacity-90 text-white shadow-sm hover:shadow-md transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteHouse(house.id)}
                        className="gradient-danger hover:opacity-90 text-white shadow-sm hover:shadow-md transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <h3 className="font-bold text-xl text-gray-800">Rooms</h3>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openRoomForm(house.id)}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all font-semibold"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Room
                      </Button>
                    </div>

                    {house.rooms.length === 0 ? (
                      <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <Home className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-500">
                          No rooms added yet.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                              <TableHead className="font-bold text-gray-700">ROOM NUMBER</TableHead>
                              <TableHead className="font-bold text-gray-700">MONTHLY RATE</TableHead>
                              <TableHead className="font-bold text-gray-700">STATUS</TableHead>
                              <TableHead className="text-right font-bold text-gray-700">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedRooms(house.rooms, house.id).map((room) => (
                            <TableRow key={room.id} className="hover:bg-blue-50/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <Home className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <span className="font-semibold text-gray-900">{room.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-lg text-green-600">
                                  ${room.monthlyRent.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    room.status === "rented" ? "success" : "default"
                                  }
                                >
                                  {room.status === "rented" ? "Rented" : "Available"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={() => handleEditRoom(room)}
                                    className="gradient-primary hover:opacity-90 text-white shadow-sm hover:shadow-md transition-all h-9 w-9"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleDeleteRoom(room.id)}
                                    className="gradient-danger hover:opacity-90 text-white shadow-sm hover:shadow-md transition-all h-9 w-9"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {getRoomsTotalPages(house.rooms.length, house.id) > 1 && (
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Rows per page:</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8">
                                    {roomsItemsPerPage[house.id] || 5} per page
                                    <ChevronRight className="ml-2 h-4 w-4 rotate-90" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onClick={() => handleRoomsItemsPerPageChange(house.id, 5)}>
                                    <div className="flex items-center gap-2 w-full">
                                      {(roomsItemsPerPage[house.id] || 5) === 5 && <Check className="h-4 w-4" />}
                                      <span className={(roomsItemsPerPage[house.id] || 5) === 5 ? "" : "ml-6"}>5 per page</span>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRoomsItemsPerPageChange(house.id, 10)}>
                                    <div className="flex items-center gap-2 w-full">
                                      {(roomsItemsPerPage[house.id] || 5) === 10 && <Check className="h-4 w-4" />}
                                      <span className={(roomsItemsPerPage[house.id] || 5) === 10 ? "" : "ml-6"}>10 per page</span>
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRoomsItemsPerPageChange(house.id, 25)}>
                                    <div className="flex items-center gap-2 w-full">
                                      {(roomsItemsPerPage[house.id] || 5) === 25 && <Check className="h-4 w-4" />}
                                      <span className={(roomsItemsPerPage[house.id] || 5) === 25 ? "" : "ml-6"}>25 per page</span>
                                    </div>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                {((roomsCurrentPage[house.id] || 1) - 1) * (roomsItemsPerPage[house.id] || 5) + 1}-
                                {Math.min(
                                  (roomsCurrentPage[house.id] || 1) * (roomsItemsPerPage[house.id] || 5),
                                  house.rooms.length
                                )} of {house.rooms.length}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
                                  onClick={() => {
                                    const current = roomsCurrentPage[house.id] || 1;
                                    if (current > 1) {
                                      handleRoomsPageChange(house.id, current - 1);
                                    }
                                  }}
                                  disabled={(roomsCurrentPage[house.id] || 1) === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
                                  onClick={() => {
                                    const current = roomsCurrentPage[house.id] || 1;
                                    const total = getRoomsTotalPages(house.rooms.length, house.id);
                                    if (current < total) {
                                      handleRoomsPageChange(house.id, current + 1);
                                    }
                                  }}
                                  disabled={(roomsCurrentPage[house.id] || 1) >= getRoomsTotalPages(house.rooms.length, house.id)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          {houses.length > itemsPerPage && (
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
                    <DropdownMenuItem onClick={() => handleHousesItemsPerPageChange(10)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 10 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 10 ? "" : "ml-6"}>10 per page</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleHousesItemsPerPageChange(25)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 25 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 25 ? "" : "ml-6"}>25 per page</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleHousesItemsPerPageChange(50)}>
                      <div className="flex items-center gap-2 w-full">
                        {itemsPerPage === 50 && <Check className="h-4 w-4" />}
                        <span className={itemsPerPage === 50 ? "" : "ml-6"}>50 per page</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleHousesItemsPerPageChange(100)}>
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
                  {housesStartIndex + 1}-{Math.min(housesEndIndex, houses.length)} of {houses.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
                    onClick={() => {
                      if (currentPage > 1) {
                        handleHousesPageChange(currentPage - 1);
                      }
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
                    onClick={() => {
                      if (currentPage < housesTotalPages) {
                        handleHousesPageChange(currentPage + 1);
                      }
                    }}
                    disabled={currentPage >= housesTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
