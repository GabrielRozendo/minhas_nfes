"use client";

import type { TemplateParamField } from "@/lib/templates/types";

export function ParamFieldsInputs({
  fields,
  values,
  onChange,
}: {
  fields: TemplateParamField[];
  values: Record<string, string | number>;
  onChange: (key: string, value: string | number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `param-${field.key}`;
        const value = values[field.key] ?? field.defaultValue ?? "";

        if (field.type === "textarea") {
          return (
            <div key={field.key} className="field sm:col-span-2">
              <label className="label" htmlFor={id}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <textarea
                id={id}
                className="textarea min-h-32"
                value={String(value)}
                required={field.required}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            </div>
          );
        }

        const inputType =
          field.type === "money"
            ? "number"
            : field.type === "date"
              ? "date"
              : "text";

        return (
          <div key={field.key} className="field">
            <label className="label" htmlFor={id}>
              {field.label}
              {field.required ? " *" : ""}
            </label>
            <input
              id={id}
              className="input"
              type={inputType}
              step={field.type === "money" ? "0.01" : undefined}
              min={field.type === "money" ? "0" : undefined}
              inputMode={field.type === "money" ? "decimal" : undefined}
              value={value}
              required={field.required}
              onChange={(e) =>
                onChange(
                  field.key,
                  field.type === "money"
                    ? Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          </div>
        );
      })}
    </div>
  );
}
