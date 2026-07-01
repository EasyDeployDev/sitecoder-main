"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { ReactNode } from "react";
import { motion } from "framer-motion";

export default function CodeViewerLayout({
  children,
  isShowing,
  onClose,
}: {
  children: ReactNode;
  isShowing: boolean;
  onClose: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <>
      {isMobile ? (
        <Drawer open={isShowing} onClose={onClose}>
          <DrawerContent className="border-slate-700 bg-[#0B0F19]">
            <VisuallyHidden.Root>
              <DrawerTitle>Code</DrawerTitle>
              <DrawerDescription>Code preview</DrawerDescription>
            </VisuallyHidden.Root>

            <div className="flex h-[90vh] flex-col overflow-y-scroll">
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <motion.div
          initial={false}
          animate={{ width: isShowing ? "65%" : "0%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="hidden h-full overflow-hidden py-4 lg:block"
        >
          <div className="ml-3 flex h-full flex-col overflow-hidden">
            {children}
          </div>
        </motion.div>
      )}
    </>
  );
}
