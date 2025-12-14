import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-7xl sm:text-8xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            404
          </h1>
        </div>
        <h2 className="text-3xl font-heading font-bold text-slate-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's
          get you back on track.
        </p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
