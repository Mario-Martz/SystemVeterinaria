import { Toaster } from "./components/ui/toaster.tsx";
import { Toaster as Sonner } from "../src/components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider.tsx";
import ProtectedRoute from "./components/ProtectedRoute"; // 👈 Asegurarte de que lo importas
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import Citas from "./pages/Citas";
import Inventario from "./pages/Inventario";
//import Facturacion from "./pages/Facturacion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        {/* Redirigir "/" a dashboard si está autenticado */}
                        <Route
                            path="/"
                            element={<Navigate to="/dashboard" replace />}
                        />

                        {/* Ruta pública (login) */}
                        <Route path="/auth" element={<Auth />} />

                        {/* 🔐 Rutas protegidas */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/pacientes"
                            element={
                                <ProtectedRoute>
                                    <Pacientes />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/citas"
                            element={
                                <ProtectedRoute>
                                    <Citas />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/inventario"
                            element={
                                <ProtectedRoute>
                                    <Inventario />
                                </ProtectedRoute>
                            }
                        />
                        {/* Ruta para páginas no existentes
                        <Route
                            path="/facturacion"
                            element={
                                <ProtectedRoute>
                                    <Facturacion />
                                </ProtectedRoute>
                            }
                        />
                        */}
                        {/* Ruta para páginas no existentes */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
