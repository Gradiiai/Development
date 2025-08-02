import "dotenv/config";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "@/lib/database/connection";

// This script runs database migrations and seeds
async function main() {
  console.log("Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations completed successfully!");
    
    // Run seed script after migrations
    console.log("Running database seeding...");
    const { execSync } = require('child_process');
    execSync('npm run db:seed', { stdio: 'inherit' });
    console.log("Database seeding completed!");
  } catch (error) {
    console.error("Error running migrations or seeding:", error);
    process.exit(1);
  }
}

main();