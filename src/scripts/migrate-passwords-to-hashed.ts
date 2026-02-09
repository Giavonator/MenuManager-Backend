/**
 * Migration script to hash existing plaintext passwords in the UserAuthentication collection
 *
 * This script:
 * 1. Finds all users with plaintext passwords
 * 2. Hashes each plaintext password using bcrypt
 * 3. Updates the user document with the hashed password
 *
 * The script is idempotent and safe to run multiple times.
 */

import { getDb } from "@utils/database.ts";
import { hashPassword, isHashed } from "@utils/password.ts";
import { Collection } from "npm:mongodb";

interface UsersDoc {
  _id: string;
  username: string;
  password: string;
  admin: boolean;
}

interface MigrationStats {
  usersProcessed: number;
  passwordsHashed: number;
  passwordsSkipped: number;
  errors: Array<{ username?: string; userId?: string; error: string }>;
}

const COLLECTION_PREFIX = "UserAuthentication.users";

async function migratePasswordsToHashed() {
  console.log("Starting password hashing migration...\n");

  // Initialize database connection
  const [db, client] = await getDb();
  console.log("Database connection established.\n");

  // Access the users collection directly
  const usersCollection = db.collection<UsersDoc>(COLLECTION_PREFIX);

  const stats: MigrationStats = {
    usersProcessed: 0,
    passwordsHashed: 0,
    passwordsSkipped: 0,
    errors: [],
  };

  try {
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to process.\n`);

    if (users.length === 0) {
      console.log("No users found. Skipping migration.");
      return;
    }

    // Process each user
    for (const user of users) {
      stats.usersProcessed++;

      try {
        // Check if password is already hashed
        if (isHashed(user.password)) {
          stats.passwordsSkipped++;
          console.log(
            `  ⊙ User ${user.username} (${user._id}): Password already hashed`,
          );
          continue;
        }

        // Hash the plaintext password
        const hashedPassword = await hashPassword(user.password);

        // Update the user document
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } },
        );

        stats.passwordsHashed++;
        console.log(
          `  ✓ User ${user.username} (${user._id}): Password hashed successfully`,
        );
      } catch (error) {
        stats.errors.push({
          username: user.username,
          userId: user._id,
          error: `Failed to hash password: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        console.error(
          `  ✗ User ${user.username} (${user._id}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Print summary
    printSummary(stats);
  } catch (error) {
    console.error("Fatal error during migration:", error);
    stats.errors.push({
      error: `Fatal error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  } finally {
    // Close database connection
    await client.close();
    console.log("\nDatabase connection closed.");
  }
}

function printSummary(stats: MigrationStats) {
  console.log("\n" + "=".repeat(60));
  console.log("Migration Summary");
  console.log("=".repeat(60));
  console.log(`Users processed: ${stats.usersProcessed}`);
  console.log(`  Passwords hashed: ${stats.passwordsHashed}`);
  console.log(
    `  Passwords skipped (already hashed): ${stats.passwordsSkipped}`,
  );
  console.log(`\nTotal errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of stats.errors) {
      if (error.username) {
        console.log(`  User ${error.username} (${error.userId}): ${error.error}`);
      } else {
        console.log(`  ${error.error}`);
      }
    }
  }

  console.log("=".repeat(60));
}

// Run the migration
if (import.meta.main) {
  migratePasswordsToHashed()
    .then(() => {
      console.log("\nMigration completed.");
      Deno.exit(0);
    })
    .catch((error) => {
      console.error("\nMigration failed:", error);
      Deno.exit(1);
    });
}

