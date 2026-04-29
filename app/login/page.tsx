"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Building2, Lock, User, UserCircle, UserPlus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { getSignedGetUrl, isHttpUrl } from "@/lib/signed-uploads";

function LoginForm() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    fullname: "",
    username: "",
    password: "",
    profile: "",
  });
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          router.push("/admin");
          return;
        }
      } catch (error) {
        // Not authenticated, stay on login page
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          type: "success",
          title: "Success",
          message: "Login successful! Redirecting...",
        });
        setTimeout(() => {
          router.push("/admin");
          router.refresh();
        }, 500);
      } else {
        addToast({
          type: "danger",
          title: "Error",
          message: data.error || "Failed to login. Please try again.",
        });
      }
    } catch (error) {
      addToast({
        type: "danger",
        title: "Error",
        message: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});
    setRegisterLoading(true);

    if (!registerForm.fullname || !registerForm.username || !registerForm.password) {
      setRegisterErrors({
        fullname: !registerForm.fullname ? "Full name is required" : "",
        username: !registerForm.username ? "Username is required" : "",
        password: !registerForm.password ? "Password is required" : "",
      });
      setRegisterLoading(false);
      return;
    }

    if (registerForm.password.length < 6) {
      setRegisterErrors({ password: "Password must be at least 6 characters" });
      setRegisterLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname: registerForm.fullname,
          username: registerForm.username,
          password: registerForm.password,
          type: "Staff",
          status: "Inactive",
          profile: registerForm.profile || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          type: "success",
          title: "Registration Successful",
          message: "Your account has been created. Please wait for admin approval.",
        });
        setOpenRegisterModal(false);
        setRegisterForm({ fullname: "", username: "", password: "", profile: "" });
        setPreviewImage(null);
        setShowRegisterPassword(false);
      } else {
        addToast({
          type: "danger",
          title: "Registration Failed",
          message: data.error || "Failed to register. Please try again.",
        });
        if (data.error?.includes("username")) {
          setRegisterErrors({ username: data.error });
        }
      }
    } catch (error) {
      addToast({
        type: "danger",
        title: "Error",
        message: "An error occurred. Please try again.",
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleUploadComplete = (key: string) => {
    setRegisterForm({ ...registerForm, profile: key });
    void (async () => {
      if (!key) return;
      if (isHttpUrl(key)) {
        setPreviewImage(key);
        return;
      }
      try {
        const signed = await getSignedGetUrl(key);
        setPreviewImage(signed);
      } catch {
        setPreviewImage(null);
      }
    })();
    addToast({
      type: "success",
      title: "Image Uploaded",
      message: "Profile image has been uploaded successfully.",
    });
  };

  const handleUploadError = (error: string) => {
    console.error("Error uploading image:", error);
    addToast({
      type: "danger",
      title: "Upload Error",
      message: error || "An error occurred while uploading the image.",
    });
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
        {/* Animated background image */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 animate-zoom-in-out"
            style={{
              backgroundImage: "url('https://www.skyscrapercity.com/attachments/8473c928-170b-4e80-bd9d-d41302d80208-jpeg.7917607/?auto=webp&fit=bounds&format=pjgp&height=1920&optimize=high&width=1920')",
            }}
          />
        </div>
        
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full">
          {/* Animated Building Icon */}
          <div className="mb-6 animate-float">
            <Building2 className="h-32 w-32 opacity-90 drop-shadow-2xl" />
          </div>
          
          {/* Animated Title */}
          <h1 className="text-5xl font-bold mb-4 text-center drop-shadow-lg animate-slide-in-left">
            Real Estate Management
          </h1>
          
          {/* Animated Subtitle */}
          <p className="text-xl text-center text-blue-100 max-w-md mb-8 animate-fade-in-up animation-delay-300">
            Manage your properties, tenants, and rentals with ease
          </p>
          
          {/* Animated Stats Cards */}
          <div className="mt-8 grid grid-cols-2 gap-6 w-full max-w-md animate-fade-in-up animation-delay-600">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-pulse-slow">
              <div className="text-3xl font-bold mb-1">100+</div>
              <div className="text-sm text-blue-100">Properties</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-pulse-slow animation-delay-500">
              <div className="text-3xl font-bold mb-1">500+</div>
              <div className="text-sm text-blue-100">Tenants</div>
            </div>
          </div>
        </div>
        
        {/* Animated Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float-slow-reverse" />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    className="pl-10 h-12"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="pl-10 pr-10 h-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Secure login powered by Real Estate Management System</p>
            </div>

            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider">
                <span className="bg-card px-3 text-muted-foreground">New here?</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenRegisterModal(true)}
              className="mt-5 h-11 w-full border-blue-200/80 bg-gradient-to-b from-blue-50/80 to-transparent text-sm font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-900/50 dark:from-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60 dark:hover:text-blue-200"
            >
              <UserPlus className="mr-2 h-4 w-4 shrink-0" />
              Register now
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Staff signup — admin activates your account after review
            </p>
          </CardContent>
          </Card>
        </div>
      </div>

      {/* Registration Modal */}
      <Dialog
        open={openRegisterModal}
        onOpenChange={(open) => {
          setOpenRegisterModal(open);
          if (!open) {
            setRegisterForm({ fullname: "", username: "", password: "", profile: "" });
            setPreviewImage(null);
            setRegisterErrors({});
            setShowRegisterPassword(false);
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] max-w-lg gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-2xl">
          <div className="max-h-[min(90vh,720px)] overflow-y-auto">
            <div className="border-b border-border/60 bg-muted/25 px-6 pb-6 pt-8 text-center sm:text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg ring-4 ring-blue-600/10">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Create your account
              </DialogTitle>
              <DialogDescription className="pt-2 text-base text-muted-foreground">
                Join as staff. You can sign in after an administrator activates your account.
              </DialogDescription>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-5 px-6 py-6">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                <Label className="text-sm font-medium">Profile photo</Label>
                <p className="mb-3 text-xs text-muted-foreground">Optional — helps admins recognize you</p>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    {previewImage ? (
                      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-blue-200 shadow-md ring-2 ring-blue-600/10">
                        <Image
                          src={previewImage}
                          alt="Profile preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 bg-background">
                        <UserCircle className="h-10 w-10 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="w-full min-w-0 flex-1">
                    <FileUpload
                      folder="users"
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                      currentFile={previewImage || undefined}
                      maxSize={2}
                      label="Upload photo"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-fullname" className="text-sm font-medium">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="register-fullname"
                    placeholder="Your full name"
                    value={registerForm.fullname}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, fullname: e.target.value });
                      if (registerErrors.fullname) {
                        setRegisterErrors({ ...registerErrors, fullname: "" });
                      }
                    }}
                    disabled={registerLoading}
                    className={`h-12 pl-10 ${registerErrors.fullname ? "border-destructive" : ""}`}
                  />
                </div>
                {registerErrors.fullname ? (
                  <p className="text-sm font-medium text-destructive">{registerErrors.fullname}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-sm font-medium">
                  Username <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="register-username"
                    placeholder="Choose a username"
                    value={registerForm.username}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, username: e.target.value });
                      if (registerErrors.username) {
                        setRegisterErrors({ ...registerErrors, username: "" });
                      }
                    }}
                    disabled={registerLoading}
                    className={`h-12 pl-10 ${registerErrors.username ? "border-destructive" : ""}`}
                  />
                </div>
                {registerErrors.username ? (
                  <p className="text-sm font-medium text-destructive">{registerErrors.username}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-sm font-medium">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={registerForm.password}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, password: e.target.value });
                      if (registerErrors.password) {
                        setRegisterErrors({ ...registerErrors, password: "" });
                      }
                    }}
                    disabled={registerLoading}
                    className={`h-12 pl-10 pr-10 ${registerErrors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {registerErrors.password ? (
                  <p className="text-sm font-medium text-destructive">{registerErrors.password}</p>
                ) : null}
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="h-12 w-full text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {registerLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating account…
                    </span>
                  ) : (
                    "Create account"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setOpenRegisterModal(false)}
                  disabled={registerLoading}
                >
                  Back to sign in
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Secure registration — Real Estate Management System
              </p>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
