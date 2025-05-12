"use client";

import { MobileNavBar } from "@/components/ui/MobileNavBar";
import { usePathname, useRouter } from "next/navigation";
import { MapPin, Calendar, User } from "lucide-react";

export function AppMobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const navItems = [
    {
      icon: <MapPin size={24} />,
      label: "Trips",
      isActive: pathname === "/dashboard",
      onClick: () => router.push("/dashboard"),
    },
    {
      icon: <Calendar size={24} />,
      label: "Daily",
      isActive: pathname === "/daily",
      onClick: () => router.push("/daily"),
    },
    {
      icon: <User size={24} />,
      label: "Profile",
      isActive: pathname === "/profile",
      onClick: () => router.push("/profile"),
    },
  ];
  return (
    <div className="md:hidden">
      <MobileNavBar
        items={navItems}
        onItemClick={index => navItems[index].onClick && navItems[index].onClick()}
        activeIndex={navItems.findIndex(item => item.isActive)}
      />
    </div>
  );
} 