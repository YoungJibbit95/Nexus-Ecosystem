import React from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.replace("/", "") || "unknown";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#060614", color: "#e5e7eb" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center text-center max-w-sm w-full"
      >
        {/* Glow mark */}
        <motion.span
          animate={{
            textShadow: [
              "0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.3)",
              "0 0 32px rgba(168,85,247,0.9), 0 0 64px rgba(168,85,247,0.5)",
              "0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.3)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-5xl text-purple-400 mb-6 select-none"
          style={{ fontFamily: "serif" }}
        >
          ✦
        </motion.span>

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="font-bold mb-2 select-none"
          style={{
            fontSize: "6rem",
            lineHeight: 1,
            background:
              "linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold text-gray-300 mb-2"
        >
          Seite nicht gefunden
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-gray-600 mb-8"
        >
          Die Seite{" "}
          <span
            className="font-mono px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(128,0,255,0.12)",
              color: "#a855f7",
              border: "1px solid rgba(128,0,255,0.2)",
            }}
          >
            /{pageName}
          </span>{" "}
          existiert nicht.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => (window.location.href = "/editor")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #8000ff, #0033ff)",
              boxShadow: "0 0 20px rgba(128,0,255,0.35)",
            }}
          >
            <Home size={15} />
            Zum Editor
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#9ca3af",
            }}
          >
            <ArrowLeft size={15} />
            Zurück
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
