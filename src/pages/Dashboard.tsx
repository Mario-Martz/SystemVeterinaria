import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
    PawPrint,
    Calendar,
    TrendingUp,
    AlertCircle,
    Package,
    Users,
    Clock,
    Heart,
    Stethoscope,
    ShoppingBag,
    MoreVertical
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

interface Stats {
    totalPets: number;
    todayAppointments: number;
    lowStockItems: number;
    activeVets: number;
    upcomingAppointments: number;
    totalInventoryItems: number;
}

interface RecentActivity {
    id: string;
    type: 'appointment' | 'pet' | 'inventory';
    description: string;
    timestamp: string;
    details?: never;
}

interface Appointment {
    id: string;
    appointment_date: string;
    reason: string;
    pets: {
        name: string;
    };
    profiles?: {
        full_name: string;
    };
}

const Dashboard = () => {
    const [stats, setStats] = useState<Stats>({
        totalPets: 0,
        todayAppointments: 0,
        lowStockItems: 0,
        activeVets: 0,
        upcomingAppointments: 0,
        totalInventoryItems: 0,
    });

    const [loading, setLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

    useEffect(() => {
        loadDashboardData();
    }, [timeRange]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Calcular fechas para esta semana
            const weekStart = startOfWeek(today);
            const weekEnd = endOfWeek(today);

            // Cargar estadísticas principales
            const [
                petsResult,
                appointmentsResult,
                inventoryResult,
                vetsResult,
                upcomingResult,
                totalInventoryResult,
            ] = await Promise.all([
                // Total de mascotas activas
                supabase.from('pets').select('id', { count: 'exact', head: true }).eq('active', true),

                // Citas de hoy
                supabase
                    .from('appointments')
                    .select('id', { count: 'exact', head: true })
                    .gte('appointment_date', today.toISOString())
                    .lt('appointment_date', tomorrow.toISOString())
                    .eq('status', 'programada'),

                // Items con stock bajo
                supabase
                    .from('inventory')
                    .select('id', { count: 'exact', head: true })
                    .filter('quantity', 'lte', 'min_quantity')
                    .eq('active', true),

                // Veterinarios activos
                supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('role', 'veterinario'),

                // Próximas citas (próximos 7 días)
                supabase
                    .from('appointments')
                    .select(`
            id,
            appointment_date,
            reason,
            pets (name),
            profiles (full_name)
          `)
                    .gte('appointment_date', today.toISOString())
                    .lt('appointment_date', new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
                    .eq('status', 'programada')
                    .order('appointment_date', { ascending: true })
                    .limit(5),

                // Total de productos en inventario
                supabase
                    .from('inventory')
                    .select('id', { count: 'exact', head: true })
                    .eq('active', true),
            ]);

            setStats({
                totalPets: petsResult.count || 0,
                todayAppointments: appointmentsResult.count || 0,
                lowStockItems: inventoryResult.count || 0,
                activeVets: vetsResult.count || 0,
                upcomingAppointments: upcomingResult.data?.length || 0,
                totalInventoryItems: totalInventoryResult.count || 0,
            });

            // Cargar próximas citas
            setUpcomingAppointments(upcomingResult.data || []);

            // Cargar actividad reciente
            await loadRecentActivities();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            toast.error('Error al cargar el dashboard');
        } finally {
            setLoading(false);
        }
    };

    const loadRecentActivities = async () => {
        try {
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Obtener actividades de diferentes fuentes
            const [recentAppointments, recentPets, recentInventory] = await Promise.all([
                supabase
                    .from('appointments')
                    .select('id, appointment_date, reason, created_at')
                    .gte('created_at', lastWeek.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(4),

                supabase
                    .from('pets')
                    .select('id, name, species, created_at')
                    .gte('created_at', lastWeek.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(4),

                supabase
                    .from('inventory')
                    .select('id, name, quantity, created_at')
                    .lte('quantity', 10)
                    .gte('created_at', lastWeek.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(4),
            ]);

            const activities: RecentActivity[] = [];

            // Convertir citas recientes
            recentAppointments.data?.forEach(apt => {
                activities.push({
                    id: apt.id,
                    type: 'appointment',
                    description: `Nueva cita programada: ${apt.reason}`,
                    timestamp: apt.created_at,
                    details: apt
                });
            });

            // Convertir mascotas recientes
            recentPets.data?.forEach(pet => {
                activities.push({
                    id: pet.id,
                    type: 'pet',
                    description: `Nuevo paciente registrado: ${pet.name} (${pet.species})`,
                    timestamp: pet.created_at,
                    details: pet
                });
            });

            // Convertir inventario reciente
            recentInventory.data?.forEach(item => {
                activities.push({
                    id: item.id,
                    type: 'inventory',
                    description: `Stock bajo: ${item.name} (${item.quantity} unidades)`,
                    timestamp: item.created_at,
                    details: item
                });
            });

            // Ordenar por fecha más reciente
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRecentActivities(activities.slice(0, 8)); // Mostrar solo las 8 más recientes

        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    };

    const getActivityIcon = (type: RecentActivity['type']) => {
        const icons = {
            appointment: <Calendar className="w-4 h-4" />,
            pet: <PawPrint className="w-4 h-4" />,
            inventory: <Package className="w-4 h-4" />,
        };
        return icons[type];
    };

    const getActivityColor = (type: RecentActivity['type']) => {
        const colors = {
            appointment: "bg-blue-100 text-blue-800",
            pet: "bg-purple-100 text-purple-800",
            inventory: "bg-orange-100 text-orange-800",
        };
        return colors[type];
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) {
            return 'Hace unos minutos';
        } else if (diffHours < 24) {
            return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
        }
    };

    const statCards = [
        {
            title: 'Pacientes Activos',
            value: stats.totalPets,
            icon: PawPrint,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
            description: 'Mascotas registradas',
            trend: '+5 esta semana',
            link: '/pacientes'
        },
        {
            title: 'Citas Hoy',
            value: stats.todayAppointments,
            icon: Calendar,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            description: 'Programadas para hoy',
            trend: `+${Math.floor(stats.todayAppointments * 0.2)} vs ayer`,
            link: '/citas'
        },
        {
            title: 'Veterinarios Activos',
            value: stats.activeVets,
            icon: Users,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-100',
            description: 'Profesionales disponibles',
            trend: 'Todas las especialidades',
            link: '/personal'
        },
        {
            title: 'Stock Bajo',
            value: stats.lowStockItems,
            icon: AlertCircle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            description: 'Productos por reabastecer',
            trend: `${stats.lowStockItems > 0 ? '¡Necesita atención!' : 'Todo en orden'}`,
            link: '/inventario'
        },
        {
            title: 'Próximas Citas',
            value: stats.upcomingAppointments,
            icon: Clock,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100',
            description: 'Próximos 7 días',
            trend: `${stats.upcomingAppointments > 0 ? 'Revisar agenda' : 'Sin citas próximas'}`,
            link: '/citas'
        },
        {
            title: 'Productos en Inventario',
            value: stats.totalInventoryItems,
            icon: ShoppingBag,
            color: 'text-pink-600',
            bgColor: 'bg-pink-100',
            description: 'Items disponibles',
            trend: '+12% este mes',
            link: '/inventario'
        },
    ];

    return (
        <Layout>
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard de la Clínica</h1>
                        <p className="text-muted-foreground">
                            Resumen general y métricas clave de la clínica veterinaria
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2">
                                    {timeRange === 'today' && 'Hoy'}
                                    {timeRange === 'week' && 'Esta semana'}
                                    {timeRange === 'month' && 'Este mes'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setTimeRange('today')}>
                                    Hoy
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeRange('week')}>
                                    Esta semana
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeRange('month')}>
                                    Este mes
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            onClick={loadDashboardData}
                            className="flex items-center gap-2"
                        >
                            <TrendingUp className="w-4 h-4" />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Grid de Estadísticas - 3x2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {statCards.map((stat, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            {stat.title}
                                        </p>
                                        <p className="text-3xl font-bold text-foreground">
                                            {loading ? '...' : stat.value}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {stat.description}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className={`text-xs font-medium ${stat.trend.includes('+') ? 'text-green-600' : stat.trend.includes('¡') ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {stat.trend}
                                    </p>
                                    {stat.link && (
                                        <Button
                                            variant="link"
                                            className="p-0 h-auto text-xs mt-2"
                                            onClick={() => window.location.href = stat.link}
                                        >
                                            Ver detalles →
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Sección inferior con más información */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Actividad Reciente */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Actividad Reciente
                                <Badge variant="outline" className="ml-auto">
                                    Últimos 7 días
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentActivities.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No hay actividad reciente</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentActivities.map((activity) => (
                                        <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                                                {getActivityIcon(activity.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {activity.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatTimeAgo(activity.timestamp)}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="shrink-0">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {recentActivities.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={() => loadRecentActivities()}
                                >
                                    Ver más actividad
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Próximas Citas */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Próximas Citas
                                <Badge variant="outline" className="ml-auto">
                                    Próximos 7 días
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {upcomingAppointments.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No hay citas programadas para los próximos días</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingAppointments.map((appointment) => {
                                        const appointmentDate = new Date(appointment.appointment_date);
                                        const isTodayAppointment = isToday(appointmentDate);
                                        const isTomorrowAppointment = isTomorrow(appointmentDate);

                                        return (
                                            <div key={appointment.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div className="text-center min-w-16">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {format(appointmentDate, "dd")}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(appointmentDate, "MMM", { locale: es })}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-foreground truncate">
                                                            {appointment.pets?.name || 'Sin mascota'}
                                                        </p>
                                                        {isTodayAppointment && (
                                                            <Badge className="bg-green-100 text-green-800 text-xs">Hoy</Badge>
                                                        )}
                                                        {isTomorrowAppointment && (
                                                            <Badge className="bg-blue-100 text-blue-800 text-xs">Mañana</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                                        {appointment.reason}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Stethoscope className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">
                              {appointment.profiles?.full_name || 'Sin asignar'}
                            </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-foreground">
                                                        {format(appointmentDate, "h:mm a")}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="mt-1"
                                                        onClick={() => window.location.href = `/citas?id=${appointment.id}`}
                                                    >
                                                        Ver
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {upcomingAppointments.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={() => window.location.href = '/citas'}
                                >
                                    Ver calendario completo
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="w-5 h-5" />
                            Acciones Rápidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Button
                                className="flex flex-col items-center justify-center h-24 gap-2 hover:scale-[1.02] transition-transform"
                                variant="outline"
                                onClick={() => window.location.href = '/citas?new=true'}
                            >
                                <Calendar className="w-6 h-6" />
                                <span>Nueva Cita</span>
                            </Button>

                            <Button
                                className="flex flex-col items-center justify-center h-24 gap-2 hover:scale-[1.02] transition-transform"
                                variant="outline"
                                onClick={() => window.location.href = '/pacientes?new=true'}
                            >
                                <PawPrint className="w-6 h-6" />
                                <span>Nuevo Paciente</span>
                            </Button>

                            <Button
                                className="flex flex-col items-center justify-center h-24 gap-2 hover:scale-[1.02] transition-transform"
                                variant="outline"
                                onClick={() => window.location.href = '/inventario?new=true'}
                            >
                                <Package className="w-6 h-6" />
                                <span>Agregar Producto</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default Dashboard;