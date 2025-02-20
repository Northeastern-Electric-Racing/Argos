const fs = require("fs");

const filePath = "./.env"; // Replace with your file path
const linesToAdd = [
  'LOCAL_DATABASE_URL="postgresql://postgres:docker@localhost:8000/charybdis-local?schema=public"',
  'CLOUD_DATABASE_URL="postgresql://postgres:docker@localhost:8001/postgres?schema=public"',
];

// Helper function to check if a line starts with the environment variable name
const getEnvVariableName = (line) => line.split("=")[0];

if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, linesToAdd.join("\n"), "utf8");
  console.log("File created and environment variables added.");
  return;
}

fs.readFile(filePath, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  // Split file contents into lines
  const lines = data.trim().split("\n");
  const updatedLines = [...lines]; // Clone the lines array

  linesToAdd.forEach((newLine) => {
    const newEnvName = getEnvVariableName(newLine);
    const existingIndex = updatedLines.findIndex(
      (line) => getEnvVariableName(line) === newEnvName
    );

    if (existingIndex !== -1) {
      // Replace the existing line
      updatedLines[existingIndex] = newLine;
    } else {
      // Add the new line
      updatedLines.push(newLine);
    }
  });

  fs.writeFile(filePath, updatedLines.join("\n") + "\n", "utf8", (writeErr) => {
    if (writeErr) {
      console.error("Error writing file:", writeErr);
    } else {
      console.log("Environment variables updated successfully.");
    }
  });
});
