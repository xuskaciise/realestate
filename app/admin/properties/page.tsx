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
  houseId: z.string().uuid("House must be selected"),
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

const STORAGE_KEY = "realestate_properties";

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
      const response = await fetch("/api/houses");
      if (response.ok) {
        const data = await response.json();
        setHouses(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error fetching houses:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(houses));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [houses]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setHouses(data);
      } else {
        fetchHouses();
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      fetchHouses();
    } finally {
      setLoading(false);
    }
  }, [fetchHouses]);

  // Load from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Save to localStorage whenever houses change
  useEffect(() => {
    if (!loading) {
      saveToLocalStorage();
    }
  }, [houses, loading, saveToLocalStorage]);

  const handleHouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHouseErrors({});

    try {
      // Validate form data
      const validated = houseSchema.parse(houseForm);
      let createdHouseId: string | null = null;
      
      if (editingHouse) {
        const updatedHouses = houses.map((h) =>
          h.id === editingHouse.id
            ? {
                ...h,
                ...validated,
                updatedAt: new Date().toISOString(),
              }
            : h
        );
        setHouses(updatedHouses);
        
        try {
          await fetch(`/api/houses/${editingHouse.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API update failed, but local update succeeded:", error);
        }
        
        setHouseForm({ name: "", address: "", description: "" });
        setEditingHouse(null);
        setOpenHouseModal(false);
      } else {
        const newHouse: House = {
          id: uuidv4(),
          ...validated,
          description: validated.description ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rooms: [],
        };
        
        createdHouseId = newHouse.id;
        const updatedHouses = [...houses, newHouse];
        setHouses(updatedHouses);
        
        try {
          await fetch("/api/houses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API create failed, but local create succeeded:", error);
        }

        setHouseForm({ name: "", address: "", description: "" });
        setEditingHouse(null);
        setOpenHouseModal(false);

        setShowAddRoomForHouse(createdHouseId);
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
        const updatedHouses = houses.map((house) => ({
          ...house,
          rooms: house.rooms.map((r) =>
            r.id === editingRoom.id
              ? {
                  ...r,
                  name: validated.name,
                  monthlyRent: validated.monthlyRent,
                  status: validated.status,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
        setHouses(updatedHouses);
        
        try {
          await fetch(`/api/rooms/${editingRoom.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API update failed, but local update succeeded:", error);
        }
      } else {
        const newRoom: Room = {
          id: uuidv4(),
          name: validated.name,
          monthlyRent: validated.monthlyRent,
          houseId: validated.houseId,
          status: validated.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedHouses = houses.map((house) =>
          house.id === validated.houseId
            ? { ...house, rooms: [...house.rooms, newRoom] }
            : house
        );
        setHouses(updatedHouses);
        
        try {
          await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
          });
        } catch (error) {
          console.error("API create failed, but local create succeeded:", error);
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

    const updatedHouses = houses.filter((h) => h.id !== id);
    setHouses(updatedHouses);
    
    try {
      await fetch(`/api/houses/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("API delete failed, but local delete succeeded:", error);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    const updatedHouses = houses.map((house) => ({
      ...house,
      rooms: house.rooms.filter((r) => r.id !== id),
    }));
    setHouses(updatedHouses);
    
    try {
      await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("API delete failed, but local delete succeeded:", error);
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
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage houses and rooms
          </p>
        </div>
        <Button 
          onClick={openHouseForm}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add House
        </Button>
      </div>

      {/* House Modal */}
      <Dialog open={openHouseModal} onOpenChange={setOpenHouseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingHouse ? "Edit House" : "Add New House"}
            </DialogTitle>
            <DialogDescription>
              {editingHouse
                ? "Update house information"
                : "Create a new house with name, address, and description"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleHouseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="house-name">
                Name <span className="text-destructive">*</span>
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
                className={houseErrors.name ? "border-destructive" : ""}
              />
              {houseErrors.name && (
                <p className="text-sm text-destructive font-medium">{houseErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="house-address">
                Address <span className="text-destructive">*</span>
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
                className={houseErrors.address ? "border-destructive" : ""}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenHouseModal(false);
                  setEditingHouse(null);
                  setHouseForm({ name: "", address: "", description: "" });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingHouse ? "Update House" : "Create House"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Room Modal */}
      <Dialog open={openRoomModal} onOpenChange={setOpenRoomModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Add New Room"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom
                ? "Update room information"
                : "Add a room to a house with name and monthly rent"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-house">
                House <span className="text-destructive">*</span>
              </Label>
              <select
                id="room-house"
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  roomErrors.houseId ? "border-destructive" : "border-input"
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
              <Label htmlFor="room-name">
                Room Number <span className="text-destructive">*</span>
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
                className={roomErrors.name ? "border-destructive" : ""}
              />
              {roomErrors.name && (
                <p className="text-sm text-destructive font-medium">{roomErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-rent">
                Monthly Rent <span className="text-destructive">*</span>
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
                className={roomErrors.monthlyRent ? "border-destructive" : ""}
              />
              {roomErrors.monthlyRent && (
                <p className="text-sm text-destructive font-medium">{roomErrors.monthlyRent}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-status">Status</Label>
              <select
                id="room-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

            <DialogFooter>
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
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingRoom ? "Update Room" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Houses Cards */}
      {houses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No houses added yet.</p>
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
                className={isNewlyCreated ? "border-l-4 border-l-primary" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-1">{house.name}</CardTitle>
                      <CardDescription className="text-base">{house.name}</CardDescription>
                      <p className="text-sm text-muted-foreground mt-2">
                        {house.rooms.length} {house.rooms.length === 1 ? "room" : "rooms"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => handleEditHouse(house)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteHouse(house.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Rooms</h3>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openRoomForm(house.id)}
                        className="bg-gray-500 hover:bg-gray-600 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Room
                      </Button>
                    </div>

                    {house.rooms.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No rooms added yet.
                      </p>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ROOM NUMBER</TableHead>
                              <TableHead>MONTHLY RATE</TableHead>
                              <TableHead>STATUS</TableHead>
                              <TableHead className="text-right">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedRooms(house.rooms, house.id).map((room) => (
                            <TableRow key={room.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{room.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">
                                ${room.monthlyRent.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    room.status === "rented" ? "success" : "secondary"
                                  }
                                >
                                  {room.status === "rented" ? "rented" : "available"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="default"
                                    size="icon"
                                    onClick={() => handleEditRoom(room)}
                                    className="bg-primary hover:bg-primary/90 h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleDeleteRoom(room.id)}
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
                                  className="h-8 w-8"
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
                                  className="h-8 w-8"
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
                    className="h-8 w-8"
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
                    className="h-8 w-8"
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
