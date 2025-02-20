const fs = require("fs");
const path = require("path");

const prismaSchemaPath = "./src/local-prisma/schema.prisma"; // Path to schema.prisma
const migrationsDir = "./src/local-prisma/migrations/"; // Path to migrations directory

// Helper to parse schema.prisma and find fields that are required
function parsePrismaSchema() {
  const schemaContent = fs.readFileSync(prismaSchemaPath, "utf8");

  const models = {};
  const modelRegex = /model (\w+) {([\s\S]*?)}/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];

    const fields = [];
    const fieldRegex = /^\s*(\w+)\s+([\w\[\]]+)(.*?(@.+)?)$/gm;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const [, fieldName, fieldType, modifiers] = fieldMatch;
      const isRequired =
        !modifiers.includes("?") && !modifiers.includes("@default");
      const isArray = fieldType.includes("[]");
      fields.push({ fieldName, fieldType, isRequired, isArray });
    }

    models[modelName] = fields;
  }

  return models;
}

// Modify the latest migration to add NOT NULL constraints for required array fields
function modifyLatestMigration(models) {
  const migrationDirs = fs.readdirSync(migrationsDir).filter((file) => {
    const fullPath = path.join(migrationsDir, file);
    return fs.statSync(fullPath).isDirectory();
  });

  if (migrationDirs.length === 0) {
    console.error(
      "No migrations found. Run `prisma migrate dev` to create a migration first."
    );
    process.exit(1);
  }

  const latestMigration = migrationDirs[migrationDirs.length - 1];
  const migrationFile = path.join(
    migrationsDir,
    latestMigration,
    "migration.sql"
  );

  if (!fs.existsSync(migrationFile)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  console.log(`Modifying migration: ${migrationFile}`);
  let migrationSQL = fs.readFileSync(migrationFile, "utf8");

  for (const [modelName, fields] of Object.entries(models)) {
    fields
      .filter(({ isRequired, isArray }) => isRequired && isArray)
      .forEach(({ fieldName }) => {
        // Match the specific table and column definition, ensuring correct scope
        const tableRegex = new RegExp(
          `CREATE TABLE "${modelName}" \\(([^)]*?)"${fieldName}"\\s+([^,]*)`, // Match the correct table and field
          "s"
        );

        migrationSQL = migrationSQL.replace(
          tableRegex,
          (match, before, columnDef) => {
            if (columnDef.includes("NOT NULL")) {
              console.warn(
                `Field ${modelName}.${fieldName} already has NOT NULL.`
              );
              return match;
            }
            console.log(
              `Adding NOT NULL constraint to ${modelName}.${fieldName}`
            );
            return match.replace(columnDef, `${columnDef} NOT NULL`);
          }
        );
      });
  }

  fs.writeFileSync(migrationFile, migrationSQL, "utf8");
  console.log("Migration modified successfully.");
}

function main() {
  const models = parsePrismaSchema();
  modifyLatestMigration(models);
}

main();
