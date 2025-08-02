"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// Utility function for combining class names
const cn = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};

const transition = {
  type: "spring" as const,
  mass: 0.3,
  damping: 15,
  stiffness: 150,
  restDelta: 0.001,
  restSpeed: 0.001,
};

// Create a context to share the timeout ref
const MenuContext = React.createContext<{
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null> | null;
}>({ timeoutRef: null });

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
  // Access the shared timeout ref
  const { timeoutRef } = React.useContext(MenuContext);

  const handleMouseEnter = () => {
    // Clear any existing timeout when entering the menu item
    if (timeoutRef && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActive(item);
  };

  return (
    <div onMouseEnter={handleMouseEnter} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
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
            <div 
              className="absolute top-[calc(100%_+_0.5rem)] left-1/2 transform -translate-x-1/2 pt-2 z-50"
              onMouseEnter={handleMouseEnter} // Clear timeout and keep dropdown open
            >
              <motion.div
                transition={transition}
                layoutId="active" // layoutId ensures smooth animation
                className="bg-white backdrop-blur-sm rounded-lg overflow-hidden border border-gray-200 shadow-lg"
              >
                <motion.div
                  layout // layout ensures smooth animation
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
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  // Use a ref to store the timeout ID
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a new timeout to close the dropdown after a delay
    timeoutRef.current = setTimeout(() => {
      setActive(null);
    }, 300); // 300ms delay before closing
  };

  return (
    <MenuContext.Provider value={{ timeoutRef }}>
      <nav
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center space-x-4"
      >
        {children}
      </nav>
    </MenuContext.Provider>
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
        <h4 className="text-xl font-bold mb-1 text-black dark:text-white">
          {title}
        </h4>
        <p className="text-neutral-700 text-sm max-w-[10rem] dark:text-neutral-300">
          {description}
        </p>
      </div>
    </Link>
  );
};

export const HoveredLink = ({ children, href, className, setActive, item }: { children: React.ReactNode; href: string; className?: string; setActive?: (item: string) => void; item?: string }) => {
  // Access the shared timeout ref
  const { timeoutRef } = React.useContext(MenuContext);

  const handleMouseEnter = () => {
    // Only proceed if both setActive and item are provided
    if (setActive && item) {
      // Clear any existing timeout when hovering over the link
      if (timeoutRef && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setActive(item);
    }
  };

  return (
    <Link
      href={href}
      className={cn(
        "text-gray-700 hover:text-indigo-600 block py-2 px-3 text-sm font-medium transition-colors duration-200 rounded-md hover:bg-gray-100",
        className
      )}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Link>
  );
};