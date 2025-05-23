"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link, { LinkProps as NextLinkProps } from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "@/components/ui/ProfileMenu";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

const transition = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative ">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-foreground hover:opacity-[0.9]"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-4">
              <motion.div
                transition={transition}
                layoutId="active"
                className="bg-popover backdrop-blur-sm rounded-2xl overflow-hidden border border-border shadow-xl"
              >
                <motion.div
                  layout
                  className="w-max h-full p-4"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
  right,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative rounded-full border border-border bg-background shadow-input flex items-center px-3 py-2"
      style={{ minHeight: 56 }}
    >
      <div className="flex-1 flex justify-center">
        <div className="flex space-x-4">{children}</div>
      </div>
      {right && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {right}
        </div>
      )}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <Link href={href} className="flex space-x-2">
      <Image
        src={src}
        width={140}
        height={70}
        alt={title}
        className="flex-shrink-0 rounded-md shadow-2xl"
      />
      <div>
        <h4 className="text-xl font-bold mb-1 text-foreground">
          {title}
        </h4>
        <p className="text-muted-foreground text-sm max-w-[10rem]">
          {description}
        </p>
      </div>
    </Link>
  );
};

export const HoveredLink = ({ children, className, ...rest }: React.PropsWithChildren<NextLinkProps> & { className?: string }) => {
  return (
    <Link
      {...rest}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {children}
    </Link>
  );
};

export function Navbar({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [trips, setTrips] = useState<{ id: string; name: string; bannerUrl?: string }[]>([]);
  useEffect(() => {
    fetch("/api/trips")
      .then(res => res.ok ? res.json() : [])
      .then(data => setTrips(Array.isArray(data) ? data : []));
  }, []);
  return (
    <div
      className={cn(
        "w-full z-50",
        "fixed bottom-0 left-0 right-0 md:static md:mt-8 md:max-w-7xl md:mx-auto",
        className
      )}
    >
      <Menu
        setActive={setActive}
        right={
          <ProfileMenu />
        }
      >
        <MenuItem setActive={setActive} active={active} item="Trips">
          <div className="flex flex-col space-y-2 text-sm min-w-[220px]">
            <HoveredLink href="/dashboard">Your Trips</HoveredLink>
            {trips.length > 0 ? (
              <>
                <div className="border-t border-border my-2" />
                {trips.map(trip => (
                  <HoveredLink key={trip.id} href={`/trips/${trip.id}`}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent transition-colors"
                  >
                    {trip.bannerUrl && (
                      <img
                        src={trip.bannerUrl}
                        alt={trip.name}
                        className="w-10 h-10 object-cover rounded shadow border border-border"
                      />
                    )}
                    <span className="truncate max-w-[120px]">{trip.name}</span>
                  </HoveredLink>
                ))}
              </>
            ) : (
              <div className="text-muted-foreground text-xs">No trips found</div>
            )}
          </div>
        </MenuItem>
      </Menu>
    </div>
  );
} 