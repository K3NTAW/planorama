"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MapPin, Calendar, User } from "lucide-react"

export interface MobileNavItem {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  isActive?: boolean
}

interface MobileNavBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MobileNavItem[]
  onItemClick?: (index: number) => void
  activeIndex?: number
}

const springConfig = {
  duration: 0.3,
  ease: "easeInOut"
}

export function MobileNavBar({ 
  items, 
  className, 
  onItemClick,
  activeIndex: controlledActiveIndex,
  ...props 
}: MobileNavBarProps) {
  const [internalActiveIndex, setInternalActiveIndex] = React.useState<number | null>(null)
  const activeIndex = controlledActiveIndex !== undefined ? controlledActiveIndex : internalActiveIndex
  
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, width: 0 })
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  const handleItemClick = (index: number) => {
    if (onItemClick) {
      onItemClick(index)
    } else {
      setInternalActiveIndex(index)
    }
  }

  const handleMouseEnter = (index: number) => {
    setInternalActiveIndex(index)
  }

  const handleMouseLeave = () => {
    setInternalActiveIndex(null)
  }

  React.useEffect(() => {
    if (
      activeIndex !== null &&
      activeIndex >= 0 &&
      items[activeIndex] &&
      menuRef.current &&
      tooltipRef.current
    ) {
      const menuItem = menuRef.current.children[activeIndex] as HTMLElement
      const menuRect = menuRef.current.getBoundingClientRect()
      const itemRect = menuItem.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
    
      const left = itemRect.left - menuRect.left + (itemRect.width - tooltipRect.width) / 2
    
      setTooltipPosition({
        left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
        width: tooltipRect.width
      })
    }
  }, [activeIndex, items])

  return (
    <div className={cn("fixed bottom-0 left-0 right-0 z-50", className)} {...props}>
      <AnimatePresence>
        {activeIndex !== null && activeIndex >= 0 && items[activeIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={springConfig}
            className="absolute left-0 right-0 -top-[31px] pointer-events-none z-50"
          >
            <motion.div
              ref={tooltipRef}
              className={cn(
                "h-7 px-3 rounded-lg mx-auto inline-flex justify-center items-center overflow-hidden",
                "bg-background/95 backdrop-blur",
                "border border-border/50",
                "shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
                "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              )}
              initial={{ x: tooltipPosition.left }}
              animate={{ x: tooltipPosition.left }}
              transition={springConfig}
              style={{ width: "auto" }}
            >
              <p className="text-[13px] font-medium leading-tight whitespace-nowrap">
                {items[activeIndex].label}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div 
        ref={menuRef}
        className={cn(
          "h-16 px-4 flex justify-between items-center w-full",
          "bg-background/95 backdrop-blur",
          "border-t border-border/50",
          "shadow-[0_-2px_10px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
        )}
      >
        {items.map((item, index) => {
          const isCenter = index === 1;
          return (
            <button 
              key={index}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isCenter ? "relative -mt-6" : "px-4",
                item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleItemClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              {isCenter ? (
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                  {item.icon}
                </div>
              ) : (
                <div className="w-6 h-6 flex justify-center items-center">
                  {item.icon}
                </div>
              )}
              <span className={cn(
                "text-xs font-medium",
                isCenter ? "sr-only" : ""
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Usage example
function MobileNavBarDemo() {
  const [activeIndex, setActiveIndex] = React.useState<number>(0)

  const navItems: MobileNavItem[] = [
    {
      icon: <MapPin size={24} />,
      label: "Trips",
      isActive: activeIndex === 0
    },
    {
      icon: <Calendar size={24} />,
      label: "Daily",
      isActive: activeIndex === 1
    },
    {
      icon: <User size={24} />,
      label: "Profile",
      isActive: activeIndex === 2
    }
  ]

  const handleItemClick = (index: number) => {
    setActiveIndex(index)
  }

  return (
    <div className="h-screen w-full bg-background relative">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Mobile App</h1>
        <p className="text-muted-foreground">
          {activeIndex === 0 && "View and plan your trips"}
          {activeIndex === 1 && "Your daily activities"}
          {activeIndex === 2 && "Your profile settings"}
        </p>
      </div>
      <MobileNavBar 
        items={navItems} 
        onItemClick={handleItemClick}
        activeIndex={activeIndex}
      />
    </div>
  )
}

export default MobileNavBarDemo 