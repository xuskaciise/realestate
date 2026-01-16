"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import dayjs from "dayjs";

const mockDocuments = [
  {
    id: 1,
    name: "Property Agreement.pdf",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    type: "PDF",
  },
  {
    id: 2,
    name: "Contract Template.docx",
    size: "1.8 MB",
    uploadDate: "2024-01-14",
    type: "DOCX",
  },
  {
    id: 3,
    name: "Financial Report.xlsx",
    size: "3.2 MB",
    uploadDate: "2024-01-13",
    type: "XLSX",
  },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Manage and view uploaded documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            View and download uploaded files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.size} • {dayjs(doc.uploadDate).format("MMM D, YYYY")}
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border p-2 hover:bg-accent">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
