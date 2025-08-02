import prettier from "prettier";
import parserJava from "prettier-plugin-java";

export async function formatCode(
  code: string,
  language: "java" | "cpp" | "python" | "php"
): Promise<string> {
  if (language === "java") {
    try {
      const formattedCode = await prettier.format(code, {
        parser: "java",
        plugins: [parserJava],
        tabWidth: 4,
        useTabs: false,
      });
      return formattedCode;
    } catch (error) {
      console.error("Error formatting Java code:", error);
      throw error;
    }
  } else if (language === "cpp") {
    // Simple indentation-based formatter for C++
    return formatCpp(code);
  } else if (language === "python") {
    // Simple indentation-based formatter for Python
    return formatPython(code);
  } else if (language === "php") {
    // Simple indentation-based formatter for PHP
    return formatPhp(code);
  } else {
    throw new Error("Unsupported language");
  }
}

function formatCpp(code: string): string {
  const lines = code.split("\n");
  let indentLevel = 0;
  const formattedLines = lines.map((line) => {
    line = line.trim();
    if (line.endsWith("{")) {
      const indentedLine = "    ".repeat(indentLevel) + line;
      indentLevel++;
      return indentedLine;
    } else if (line.startsWith("}")) {
      indentLevel = Math.max(0, indentLevel - 1);
      return "    ".repeat(indentLevel) + line;
    } else {
      return "    ".repeat(indentLevel) + line;
    }
  });
  return formattedLines.join("\n");
}

function formatPython(code: string): string {
  const lines = code.split("\n");
  let indentLevel = 0;
  const formattedLines = lines.map((line) => {
    line = line.trim();
    if (line.endsWith(":")) {
      const indentedLine = "    ".repeat(indentLevel) + line;
      indentLevel++;
      return indentedLine;
    } else if (line.startsWith("return") || line.startsWith("break") || line.startsWith("continue") || line.startsWith("pass")) {
      // Dedent for return, break, continue, pass statements if they're the only ones at this level
      if (indentLevel > 0) {
        return "    ".repeat(indentLevel) + line;
      }
    } else if (line === "" && indentLevel > 0) {
      // Empty line, keep current indentation
      return line;
    } else if (indentLevel > 0 && (line.startsWith("elif") || line.startsWith("else") || line.startsWith("except") || line.startsWith("finally"))) {
      // Dedent for elif, else, except, finally
      indentLevel = Math.max(0, indentLevel - 1);
      return "    ".repeat(indentLevel) + line;
    }
    return "    ".repeat(indentLevel) + line;
  });
  return formattedLines.join("\n");
}

function formatPhp(code: string): string {
  const lines = code.split("\n");
  let indentLevel = 0;
  const formattedLines = lines.map((line) => {
    line = line.trim();
    if (line.endsWith("{")) {
      const indentedLine = "    ".repeat(indentLevel) + line;
      indentLevel++;
      return indentedLine;
    } else if (line.startsWith("}")) {
      indentLevel = Math.max(0, indentLevel - 1);
      return "    ".repeat(indentLevel) + line;
    } else {
      return "    ".repeat(indentLevel) + line;
    }
  });
  return formattedLines.join("\n");
}
