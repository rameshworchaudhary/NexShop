"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingBag, User, ShieldCheck, Package } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount, toggleCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = mounted ? itemCount : 0;
  const wishCount = mounted ? wishlistCount : 0;

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Categories",
      href: "/categories",
      icon: LayoutGrid,
      isActive: pathname.startsWith("/categories"),
    },
    {
      label: "Wishlist",
      href: "/wishlist",
      icon: Heart,
      badge: wishCount,
      isActive: pathname.startsWith("/wishlist"),
    },
    {
      label: "Cart",
      href: "/cart",
      icon: ShoppingBag,
      badge: cartCount,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        toggleCart();
      },
      isActive: pathname.startsWith("/cart"),
    },
    {
      label: isAdmin ? "Admin" : user ? "Account" : "My Orders",
      href: isAdmin ? "/admin" : user ? "/profile" : "/orders",
      icon: isAdmin ? ShieldCheck : user ? User : Package,
      isActive: isAdmin
        ? pathname.startsWith("/admin")
        : user
        ? (pathname.startsWith("/profile") || pathname.startsWith("/orders"))
        : pathname.startsWith("/orders"),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors relative ${
                  item.isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors relative ${
                item.isActive ? "text-blue-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
