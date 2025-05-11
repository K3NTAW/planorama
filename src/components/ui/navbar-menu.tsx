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

export const HoveredLink = ({ children, ...rest }: React.PropsWithChildren<NextLinkProps>) => {
  return (
    <Link
      {...rest}
      className="text-muted-foreground hover:text-foreground"
    >
      {children}
    </Link>
  );
};

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const options = [
    { value: "light", icon: <Sun size={18} />, label: "Light" },
    { value: "dark", icon: <Moon size={18} />, label: "Dark" },
    { value: "system", icon: <Laptop size={18} />, label: "System" },
  ];
  if (!mounted) return null;
  return (
    <div className="flex gap-1 items-center">
      {options.map((opt) => (
        <button
          key={opt.value}
          aria-label={opt.label}
          onClick={() => setTheme(opt.value)}
          className={
            `p-1 rounded transition-colors border border-transparent hover:border-border
            ${theme === opt.value ? "bg-accent border-accent text-accent-foreground" : "text-muted-foreground"}`
          }
          type="button"
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

export function Navbar({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
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
          <>
            <ThemeSwitcher />
            <ProfileMenu />
          </>
        }
      >
        <MenuItem setActive={setActive} active={active} item="Services">
          <div className="flex flex-col space-y-4 text-sm">
            <HoveredLink href="/web-dev">Web Development</HoveredLink>
            <HoveredLink href="/interface-design">Interface Design</HoveredLink>
            <HoveredLink href="/seo">Search Engine Optimization</HoveredLink>
            <HoveredLink href="/branding">Branding</HoveredLink>
          </div>
        </MenuItem>
        <MenuItem setActive={setActive} active={active} item="Pricing">
          <div className="flex flex-col space-y-4 text-sm">
            <HoveredLink href="/hobby">Hobby</HoveredLink>
            <HoveredLink href="/individual">Individual</HoveredLink>
            <HoveredLink href="/team">Team</HoveredLink>
            <HoveredLink href="/enterprise">Enterprise</HoveredLink>
          </div>
        </MenuItem>
      </Menu>
    </div>
  );
} 