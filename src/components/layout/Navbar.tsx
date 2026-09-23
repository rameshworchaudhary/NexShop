"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  ChevronDown,
  Package,
  LogOut,
  MapPin,
  LayoutDashboard,
  Store,
  Bell,
  Mic,
  Camera,
  ShieldCheck,
  Zap,
} from "lucide-react";
import NexShopLogo from "@/components/common/NexShopLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { logout } from "@/lib/firebase/auth";
import { getInitials } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants/site";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { Category } from "@/lib/types/category";

const VoiceSearchModal = dynamic(() => import("@/components/common/VoiceSearchModal"), { ssr: false });
const ImageSearchModal = dynamic(() => import("@/components/common/ImageSearchModal"), { ssr: false });

interface NavbarProps {
  categories?: Category[];
}

export default function Navbar({ categories = [] }: NavbarProps) {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const { itemCount, toggleCart } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // AI Modal States
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
    } catch {
      toast.error("Failed to logout");
    }
  };

  return (
    <>
      {/* Voice & Image Search Modals - Loaded on demand */}
      {voiceModalOpen && (
        <VoiceSearchModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
      )}
      {imageModalOpen && (
        <ImageSearchModal isOpen={imageModalOpen} onClose={() => setImageModalOpen(false)} />
      )}

      {/* Top Announcement / Delivery Bar */}
      <div className="bg-[#070b14] border-b border-slate-800/80 px-3 sm:px-6 py-2 text-center text-[10px] sm:text-xs font-semibold text-slate-300">
        <div className="container mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4 mx-auto sm:mx-0">
            <span className="flex items-center gap-1.5 text-white font-medium">
              <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Nepal Express Delivery (All 77 Districts)</span>
            </span>
            <span className="hidden md:inline text-slate-700">•</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>Free Shipping on Orders &gt; Rs. 5,000</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-slate-400">
            <Link href="/orders" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors">
              <Package className="h-3.5 w-3.5 text-cyan-400" />
              <span>My Orders</span>
            </Link>
            <span className="text-slate-800">|</span>
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 100% Genuine Guarantee
            </span>
            <span className="text-slate-800">|</span>
            <span className="text-white font-bold">Support: {SITE_CONFIG.contact.phone}</span>
          </div>
        </div>
      </div>

      {/* Main Header - Deep Navy Gradient Theme matching IMAGE 2 */}
      <header
        className={`sticky top-0 z-40 w-full border-b border-slate-800/90 bg-gradient-to-b from-[#0a101f] via-[#0d162a] to-[#0a101f] text-white backdrop-blur-xl transition-all duration-300 ${
          scrolled ? "shadow-xl shadow-slate-950/40" : ""
        }`}
      >
        <div className="container mx-auto px-3 sm:px-6">
          <div className="flex min-h-[4rem] sm:min-h-[4.5rem] items-center justify-between gap-3 sm:gap-6 py-2">
            {/* Logo - Styled matching IMAGE 2 */}
            <NexShopLogo size="md" variant="dark" />

            {/* Mega Menu Trigger - Desktop */}
            <div className="hidden lg:block relative">
              <button
                className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-slate-800 hover:text-white hover:border-cyan-500/50"
                onMouseEnter={() => setMegaMenuOpen(true)}
                onMouseLeave={() => setMegaMenuOpen(false)}
                onClick={() => setMegaMenuOpen((v) => !v)}
              >
                <Menu className="h-4 w-4 text-cyan-400" />
                <span>Categories</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${megaMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {megaMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-80 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl text-white"
                    onMouseEnter={() => setMegaMenuOpen(true)}
                    onMouseLeave={() => setMegaMenuOpen(false)}
                  >
                    <div className="space-y-1">
                      {categories.slice(0, 10).map((cat) => (
                        <Link
                          key={cat.id || cat.slug}
                          href={`/categories/${cat.slug}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                          onClick={() => setMegaMenuOpen(false)}
                        >
                          <span className="text-base">{cat.icon || "🛍️"}</span>
                          <span>{cat.name}</span>
                        </Link>
                      ))}
                      <div className="mt-2 border-t border-slate-800 pt-2 px-2">
                        <Link
                          href="/categories"
                          className="block text-center text-xs font-bold text-cyan-400 hover:underline py-1"
                          onClick={() => setMegaMenuOpen(false)}
                        >
                          Explore All Categories &rarr;
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Glassmorphic Search Bar - Desktop & Tablet */}
            <form onSubmit={handleSearchSubmit} className="hidden max-w-xl flex-1 md:flex">
              <div className="relative w-full flex items-center">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/90" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search NexShop..."
                  className="h-11 rounded-2xl border border-slate-700/80 bg-slate-900/70 pl-10 pr-24 text-xs sm:text-sm text-white placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400/50 shadow-inner backdrop-blur-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVoiceModalOpen(true)}
                    title="Voice Search"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageModalOpen(true)}
                    title="Image Search"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3.5 text-[11px] font-bold text-white hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-blue-500/20"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="navbar-notifications-btn"
                    variant="ghost"
                    size="icon"
                    className="relative rounded-xl text-slate-200 hover:bg-slate-800/80 hover:text-white"
                    suppressHydrationWarning
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-pulse" />
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 bg-slate-950 border border-slate-800 text-white p-3 shadow-2xl backdrop-blur-xl"
                >
                  <DropdownMenuLabel className="font-bold text-xs uppercase text-slate-400 mb-1 flex items-center justify-between">
                    <span>Notifications</span>
                    <span className="text-[10px] text-cyan-400 underline font-normal cursor-pointer">Mark all read</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <div className="space-y-2 py-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="font-bold text-white text-xs">🎉 Welcome to NexShop Nepal!</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Enjoy free delivery across all 77 districts on orders over Rs. 5,000.
                      </p>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Wishlist & Cart */}
              <div className="hidden md:flex items-center gap-1.5">
                <Link href="/wishlist">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-xl text-slate-200 hover:bg-slate-800/80 hover:text-white"
                  >
                    <Heart className="h-5 w-5" />
                    {mounted && wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-bold">
                        {wishlistCount > 9 ? "9+" : wishlistCount}
                      </span>
                    )}
                    <span className="sr-only">Wishlist</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-xl text-slate-200 hover:bg-slate-800/80 hover:text-white"
                  onClick={toggleCart}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {mounted && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950 shadow-xs">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                  <span className="sr-only">Cart</span>
                </Button>
              </div>

              {/* Quick Admin Access Button if Admin */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold transition-all shadow-xs hover:bg-blue-500"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin Panel</span>
                </Link>
              )}

              {/* User Menu */}
              {mounted && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button id="navbar-user-dropdown-btn" variant="ghost" size="icon" className="rounded-xl text-slate-200 hover:bg-slate-800/80" suppressHydrationWarning>
                      <Avatar className="h-8 w-8 border border-slate-700">
                        <AvatarImage src={profile?.photoURL || ""} alt={profile?.displayName || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white">
                          {getInitials(profile?.displayName || user.email || "U")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-950 border border-slate-800 text-white shadow-2xl">
                    <DropdownMenuLabel>
                      <p className="font-bold text-white truncate">{profile?.displayName || "User"}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    {isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center gap-2 cursor-pointer font-bold text-cyan-400">
                            <LayoutDashboard className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                      </>
                    )}
                    {profile?.role === "seller" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/seller/dashboard" className="flex items-center gap-2 cursor-pointer font-bold text-emerald-400">
                            <Store className="h-4 w-4" />
                            Seller Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
                        <Package className="h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/wishlist" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="h-4 w-4" />
                        Wishlist
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem
                      className="text-rose-400 hover:bg-slate-900 cursor-pointer font-bold"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-200 hover:text-white hover:bg-slate-800/80 font-semibold gap-1.5"
                    asChild
                  >
                    <Link href="/orders">
                      <Package className="h-4 w-4 text-cyan-400" />
                      <span>My Orders</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-200 hover:text-white hover:bg-slate-800/80 font-semibold" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-4 shadow-md shadow-blue-500/20" asChild>
                    <Link href="/register">Register</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-slate-200 hover:bg-slate-800/80 lg:hidden"
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Glass Search Bar - Mobile */}
          <div className="pb-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
              <Input
                type="search"
                placeholder="Search NexShop..."
                className="h-10 rounded-2xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-20 text-xs text-white placeholder:text-slate-400 shadow-inner backdrop-blur-md focus-visible:border-cyan-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(true)}
                  className="p-1 text-slate-400 hover:text-cyan-300"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="p-1 text-slate-400 hover:text-cyan-300"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed inset-y-0 left-0 z-50 w-[min(22rem,88vw)] overflow-y-auto bg-white border-r border-neutral-200 shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 p-5">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <span className="font-extrabold text-xl text-black tracking-tight">{SITE_CONFIG.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-black"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {user ? (
              <div className="border-b border-neutral-200 bg-neutral-50 p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-neutral-300">
                    <AvatarImage src={profile?.photoURL || ""} />
                    <AvatarFallback className="bg-black text-sm font-bold text-white">
                      {getInitials(profile?.displayName || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-black truncate">{profile?.displayName}</p>
                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 border-b border-neutral-200 p-5">
                <Button className="flex-1 rounded-xl bg-black text-white font-semibold hover:bg-neutral-800" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/login">Login</Link>
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl border-neutral-300 bg-white text-black hover:bg-neutral-100" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}

            <div className="p-5 space-y-6">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-black">
                  Categories
                </p>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 hover:text-black"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>{cat.icon || "🛍️"}</span>
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-1 border-t border-neutral-200 pt-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-black">
                  Account
                </p>
                {user ? (
                  <>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 rounded-lg p-3 text-sm font-bold text-white bg-black hover:bg-neutral-800 transition-all mb-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Admin Control Dashboard</span>
                      </Link>
                    )}
                    <Link href="/profile" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> My Profile
                    </Link>
                    <Link href="/orders" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <Package className="h-4 w-4" /> My Orders
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <Heart className="h-4 w-4" /> Wishlist ({wishlistCount})
                    </Link>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-black hover:bg-neutral-100"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/orders" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <Package className="h-4 w-4 text-blue-600" /> My Orders
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <Heart className="h-4 w-4" /> Wishlist ({wishlistCount})
                    </Link>
                    <Link href="/login" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> Login
                    </Link>
                    <Link href="/register" className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-bold text-blue-600 hover:bg-neutral-100" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Dynamic Voice & Image Search Modals */}
      {voiceModalOpen && (
        <VoiceSearchModal
          isOpen={voiceModalOpen}
          onClose={() => setVoiceModalOpen(false)}
        />
      )}

      {imageModalOpen && (
        <ImageSearchModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </>
  );
}
