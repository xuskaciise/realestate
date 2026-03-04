"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Settings } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { LoadingOverlay } from "@/components/ui/loading";

export default function SettingsPage() {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openClearDialog, setOpenClearDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [clearing, setClearing] = useState(false);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleClearData = async () => {
    if (!password) {
      addToast({
        type: "danger",
        title: "Password Required",
        message: "Please enter your password to confirm.",
      });
      return;
    }

    setClearing(true);
    try {
      const response = await fetch("/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        addToast({
          type: "success",
          title: "Data Cleared",
          message: "All database data has been cleared successfully.",
        });
        setOpenClearDialog(false);
        setPassword("");
        // Optionally reload the page or redirect
        window.location.href = "/admin";
      } else {
        const errorData = await response.json().catch(() => ({}));
        addToast({
          type: "danger",
          title: "Error",
          message: errorData.error || "Failed to clear data. Please check your password.",
        });
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      addToast({
        type: "danger",
        title: "Error",
        message: "Failed to clear data. Please try again.",
      });
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  // Only show to Admin users
  if (!currentUser || currentUser.type !== "Admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only Admin users can access settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage system settings and configurations
        </p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-destructive">Clear All Data</h3>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all data from the database including:
                  houses, rooms, tenants, rents, payments, monthly services, and maintenance requests.
                  <br />
                  <strong className="text-destructive">This action cannot be undone!</strong>
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => setOpenClearDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={openClearDialog} onOpenChange={setOpenClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Clear All Data
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete all data from the database.
              Please enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password) {
                    handleClearData();
                  }
                }}
              />
            </div>
            <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: This will delete all data except users. This action cannot be undone!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenClearDialog(false);
                setPassword("");
              }}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={clearing || !password}
            >
              {clearing ? "Clearing..." : "Clear All Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
