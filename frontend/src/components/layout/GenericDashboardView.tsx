import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GenericDashboardViewProps {
  title: string;
  data: Record<string, any>;
}

export function GenericDashboardView({ title, data }: GenericDashboardViewProps) {
  // Separate scalar values (numbers/strings) from arrays
  const metrics: { key: string; value: string | number }[] = [];
  const lists: { key: string; items: any[] }[] = [];
  const objects: { key: string; value: Record<string, any> }[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      lists.push({ key, items: value });
    } else if (typeof value === "object" && value !== null) {
      objects.push({ key, value });
    } else {
      metrics.push({ key, value });
    }
  });

  const formatKey = (str: string) => {
    return str
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, " ");
  };

  const formatValue = (val: any) => {
    if (typeof val === "number") {
      // Basic formatting for numbers
      return val.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        style: val > 1000 ? "currency" : "decimal",
        currency: "INR",
      }).replace("₹", "₹ ");
    }
    return val;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

      {/* Metrics Row */}
      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {formatKey(metric.key)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatValue(metric.value)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Nested Objects (like aging analysis) */}
      {objects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objects.map((obj) => (
            <Card key={obj.key}>
              <CardHeader>
                <CardTitle>{formatKey(obj.key)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(obj.value).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{formatKey(k)}</span>
                      <span className="font-medium">{formatValue(v)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lists / Tables */}
      {lists.length > 0 && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {lists.map((list) => {
            if (list.items.length === 0) return null;
            const columns = Object.keys(list.items[0]);

            return (
              <Card key={list.key} className="col-span-1">
                <CardHeader>
                  <CardTitle>{formatKey(list.key)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col}>{formatKey(col)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.items.map((item, idx) => (
                        <TableRow key={idx}>
                          {columns.map((col) => (
                            <TableCell key={col}>
                              {formatValue(item[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
