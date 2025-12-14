import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb } from "lucide-react";

export default function Placeholder() {
  const location = useLocation();

  const pageTitle = location.pathname
    .split("/")
    .pop()
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          {pageTitle || "Page"}
        </h1>
        <p className="text-slate-600 mt-2">
          This page is ready to be customized with your content.
        </p>
      </div>

      <Card className="p-12 text-center">
        <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto mb-4 opacity-50" />
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">
          Page Under Development
        </h2>
        <p className="text-slate-600 mb-6">
          This section of the application is ready for implementation. Provide
          more details to customize this page content.
        </p>
        <Button className="bg-primary hover:bg-primary/90">
          Request Implementation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    </div>
  );
}
