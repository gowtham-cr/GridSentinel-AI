import { motion } from "framer-motion";
import { Power } from "lucide-react";

export function InitializeButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-initialize group"
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: 2.9, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      <motion.span
        className="flex size-2 rounded-full bg-primary shadow-[var(--glow-primary)] group-hover:bg-primary-foreground"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span>Initialize System</span>
      <Power className="size-4 transition-transform duration-500 group-hover:rotate-180" strokeWidth={2.2} />
    </motion.button>
  );
}
