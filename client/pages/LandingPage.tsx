import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  BarChart3,
  Users,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-heading font-bold text-lg">
                KB
              </span>
            </div>
            <h1 className="text-xl font-heading font-bold text-slate-900">
              KalaboBoarding
            </h1>
          </div>
          <div className="flex gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-8 mb-16">
          <div className="inline-block">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Modern Education Management
              </span>
            </div>
          </div>

          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-slate-900 leading-tight">
            School Results Made{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Simple
            </span>
          </h2>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Manage student results, analyze performance, and streamline
            administrative tasks with our modern school results management
            system.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-8"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: BookOpen,
              title: "Result Entry",
              description:
                "Easily enter and manage student grades with our intuitive interface",
            },
            {
              icon: BarChart3,
              title: "Performance Analysis",
              description:
                "Gain insights into student performance with detailed analytics",
            },
            {
              icon: Users,
              title: "Multi-User Access",
              description:
                "Separate dashboards for admins and teachers with role-based access",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* User Types */}
        <div className="mt-20 grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-heading font-bold text-slate-900 mb-3">
              For Administrators
            </h3>
            <p className="text-slate-600 mb-6">
              Complete control over classes, teachers, and comprehensive result
              analysis with reporting capabilities.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Class Management
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Teacher Management
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Report Cards
              </li>
            </ul>
            <Link to="/signup?role=admin">
              <Button className="w-full bg-primary hover:bg-primary/90">
                Admin Sign Up
              </Button>
            </Link>
          </div>

          <div className="bg-gradient-to-br from-secondary/5 to-accent/5 rounded-2xl p-8 border border-secondary/20">
            <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="text-2xl font-heading font-bold text-slate-900 mb-3">
              For Teachers
            </h3>
            <p className="text-slate-600 mb-6">
              Enter grades, monitor student progress, and view personalized
              analytics for your classes.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 mb-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Result Entry
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Progress Analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Class Performance
              </li>
            </ul>
            <Link to="/signup?role=teacher">
              <Button className="w-full bg-secondary hover:bg-secondary/90">
                Teacher Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-secondary py-16 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h3 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Ready to modernize your school?
          </h3>
          <p className="text-lg opacity-90 mb-8">
            Join thousands of schools already using KalaboBoarding to manage
            results more efficiently.
          </p>
          <Link to="/signup">
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-primary hover:bg-slate-100 px-8"
            >
              Get Started Today
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p>
            &copy; 2024 KalaboBoarding. All rights reserved. Modernizing
            education, one result at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
