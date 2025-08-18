import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Shield, Settings, Database } from "lucide-react";

export default function AdminAccounts() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till adminpanel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-red-600" />
              Hantera konton
            </h1>
            <p className="text-gray-600">Administrera användare och systeminställningar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Användarkonton</CardTitle>
              <CardDescription>
                Visa och hantera registrerade användare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  <Badge variant="secondary">1</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Lärare</span>
                  </div>
                  <Badge variant="secondary">1</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium">Elev</span>
                  </div>
                  <Badge variant="secondary">1</Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" disabled>
                  Hantera användare
                  <span className="ml-2 text-xs opacity-70">(Kommer snart)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Säkerhet</CardTitle>
              <CardDescription>
                Övervaka säkerhet och inloggningar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Aktiva sessioner</span>
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">CSRF-skydd</span>
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Rate limiting</span>
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" variant="outline" disabled>
                  Säkerhetsinställningar
                  <span className="ml-2 text-xs opacity-70">(Kommer snart)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Database className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Datahantering</CardTitle>
              <CardDescription>
                Hantera innehåll och databasoperationer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/admin/sentences" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    Grammatikmeningar
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" disabled>
                  Backup & Export
                  <span className="ml-auto text-xs opacity-70">Kommer snart</span>
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  Systemloggar
                  <span className="ml-auto text-xs opacity-70">Kommer snart</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Systeminställningar</CardTitle>
              <CardDescription>
                Konfigurera plattformsinställningar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium mb-1">Miljö</div>
                  <Badge variant="outline">Development</Badge>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium mb-1">Databas</div>
                  <Badge variant="default" className="bg-green-600">PostgreSQL ✓</Badge>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium mb-1">Lagring</div>
                  <Badge variant="default" className="bg-green-600">Google Cloud ✓</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Database className="w-6 h-6 text-gray-600" />
                Systemöversikt
              </CardTitle>
              <CardDescription>
                Aktuell status för plattformen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">3</div>
                  <div className="text-sm text-gray-600">Användare</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm text-gray-600">Autentisering</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">✓</div>
                  <div className="text-sm text-gray-600">Lagring</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">Online</div>
                  <div className="text-sm text-gray-600">Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}