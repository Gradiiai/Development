"use client";

import React from "react";
import { motion } from "framer-motion";
import { Code, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { useRouter } from "next/navigation";
import CodingInterviewList from "../_components/CodingInterviewList";
import DirectInterviewFlow from "../_components/DirectInterviewFlow";

const CodingInterviewPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Code className="h-8 w-8 text-blue-600" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Coding Interviews
              </h1>
              <p className="text-gray-600">Manage and conduct technical coding interviews</p>
            </div>
          </div>

          <DirectInterviewFlow />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CodingInterviewList />
        </motion.div>
      </div>
    </div>
  );
};

export default CodingInterviewPage;