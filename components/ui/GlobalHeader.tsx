"use client";
import { Button } from "@/components/ui/shared/button";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Briefcase } from "lucide-react";
import Link from "next/link";

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/30 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 shadow-glow-subtle">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="p-2 bg-teal-50 rounded-lg shadow-glow-subtle">
              <Briefcase className="h-5 w-5 text-teal-600" />
            </div>
            <span className="text-xl font-bold tracking-tight gradient-text-teal">Gradii</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-teal-700 hover:text-teal-900 hover:bg-teal-50/50">Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] glass-strong rounded-xl">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-teal-50/80 to-teal-100/40 p-6 no-underline outline-none focus:shadow-md hover:shadow-glow-subtle transition-all duration-300"
                            href="/landing/about">
                            <div className="mb-2 mt-4 text-lg font-medium text-teal-800">About Gradii</div>
                            <p className="text-sm leading-tight text-teal-700">
                              Learn more about our AI-powered interview platform.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800" asChild>
              <Link href="/sign-in">
                Sign In
              </Link>
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link href="/sign-up">
                Sign Up
              </Link>
            </Button>
            <Button variant="outline" asChild className="border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}