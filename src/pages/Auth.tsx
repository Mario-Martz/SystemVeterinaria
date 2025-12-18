import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { PawPrint } from 'lucide-react';
import { z } from 'zod';
import { AuthError } from '@supabase/supabase-js'; // 👈 Import necesario

const authSchema = z.object({
    email: z.string().email({ message: 'Email inválido' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
    fullName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }).optional(),
});

const Auth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const validation = authSchema.safeParse({ email, password });
            if (!validation.success) {
                toast.error(validation.error.errors[0].message);
                return;
            }

            setIsLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    toast.error('Email o contraseña incorrectos');
                } else {
                    toast.error(error.message);
                }
                return;
            }

            toast.success('Inicio de sesión exitoso');
            navigate('/dashboard');
        } catch (error: unknown) {
            if (error instanceof AuthError) {
                toast.error(error.message);
                console.error('Supabase AuthError:', error.message);
            } else if (error instanceof Error) {
                toast.error('Error al iniciar sesión');
                console.error('Sign in error:', error.message);
            } else {
                console.error('Sign in unexpected error:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const validation = authSchema.safeParse({ email, password, fullName });
            if (!validation.success) {
                toast.error(validation.error.errors[0].message);
                return;
            }

            setIsLoading(true);
            const redirectUrl = `${window.location.origin}/dashboard`;

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        full_name: fullName,
                        role: 'veterinario',
                    },
                },
            });

            if (error) {
                if (error.message.includes('User already registered')) {
                    toast.error('Este email ya está registrado');
                } else {
                    toast.error(error.message);
                }
                return;
            }

            toast.success('Cuenta creada exitosamente. Redirigiendo...');
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } catch (error: unknown) {
            if (error instanceof AuthError) {
                toast.error(error.message);
                console.error('Supabase AuthError:', error.message);
            } else if (error instanceof Error) {
                toast.error('Error al crear cuenta');
                console.error('Sign up error:', error.message);
            } else {
                console.error('Sign up unexpected error:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
            <Card className="w-full max-w-md shadow-medium">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
                        <PawPrint className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">VetCare Sistema</CardTitle>
                        <CardDescription>
                            Gestión integral para clínicas veterinarias
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="signin" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                            <TabsTrigger value="signup">Registrarse</TabsTrigger>
                        </TabsList>

                        <TabsContent value="signin">
                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signin-email">Email</Label>
                                    <Input
                                        id="signin-email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signin-password">Contraseña</Label>
                                    <Input
                                        id="signin-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-name">Nombre Completo</Label>
                                    <Input
                                        id="signup-name"
                                        type="text"
                                        placeholder="Juan Pérez"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <Input
                                        id="signup-email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Contraseña</Label>
                                    <Input
                                        id="signup-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default Auth;
