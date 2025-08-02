'use client';

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Users, Brain, Target } from "lucide-react";

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/robocard";
import { Spotlight } from "@/components/ui/spotlight";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";

export function SplineSceneBasic() {
  return (
    <Card className="w-full h-[600px] bg-black/[0.96] relative overflow-hidden">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
      />

      <div className="flex h-full">
        {/* Left content */}
        <div className="flex-1 p-8 md:p-12 relative z-10 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-400/30 text-sm px-4 py-2">
              <Brain className="h-4 w-4 mr-2" />
              AI-Powered Recruitment
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-tight mb-6">
              Hire Smarter
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                with AI Agents
              </span>
            </h1>

            <p className="mt-4 text-neutral-300 max-w-lg text-lg leading-relaxed mb-8">
              Transform your recruitment process with intelligent AI agents that screen,
              interview, and evaluate candidates automatically. Reduce hiring time by 70%
              while improving candidate quality.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-3 text-lg font-semibold shadow-lg shadow-emerald-500/25"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 px-8 py-3 text-lg"
              >
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>10,000+ Companies</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>95% Accuracy Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right content */}
        <div className="flex-1 relative">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-full"
          >
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </motion.div>
        </div>
      </div>
    </Card>
  );
}