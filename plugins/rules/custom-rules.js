const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const XBasedOnRule = () => {
  return {
    Schema: {
      // Target schema objects with properties
      enter(schema, ctx) {
        if ("x-based-on" in schema) {
          const source = ctx.location.source.absoluteRef;

          const referrerPath = path.resolve(
            path.dirname(source),
            schema["x-based-on"].schema
          );

          if (!fs.existsSync(referrerPath)) {
            ctx.report({
              message: `x-based-on in field "${schema["x-based-on"].field}" references non-existent schema file: ${schema["x-based-on"].schema}`,
            });
            return;
          }

          const referrerContent = fs.readFileSync(referrerPath, "utf8");
          const referrerSchema = yaml.load(referrerContent);

          const fieldExists = checkFieldExists({
            schema: referrerSchema,
            fieldPath: schema["x-based-on"].field,
          });

          if (!fieldExists) {
            ctx.report({
              message: `x-based-on in field "${schema["x-based-on"].field}" references non-existent field: ${schema["x-based-on"].field}`,
            });
            return;
          }

          // TODO: check if the field is the same type as the source field
        }
      },
    },
  };
};

function checkFieldExists({ schema, fieldPath }) {
  if (!schema || typeof schema !== "object") return false;

  // Handle nested field paths (e.g., "user.profile.name")
  const fieldParts = fieldPath.split(".");
  let current = schema;

  for (const part of fieldParts) {
    // Check in properties
    if (current.properties && current.properties[part]) {
      current = current.properties[part];
      continue;
    }

    // Check direct property
    if (current[part]) {
      current = current[part];
      continue;
    }

    // Check if it's a component reference
    if (
      current.components &&
      current.components.schemas &&
      current.components.schemas[part]
    ) {
      current = current.components.schemas[part];
      continue;
    }

    return false; // Field not found
  }

  return true; // Field exists
}

module.exports = {
  id: "custom-rules",
  rules: {
    oas3: {
      "x-based-on-validator": XBasedOnRule,
    },
  },
};
