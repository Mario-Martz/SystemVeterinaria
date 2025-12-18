import {type JSX, useEffect, useState} from 'react';
import { supabase } from '../integrations/supabase/client';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
    Plus,
    Search,
    Calendar as CalendarIcon,
    Clock,
    User,
    PawPrint,
    Stethoscope,
    Filter,
    CheckCircle,
    XCircle,
    PlayCircle,
    MoreVertical,
    Download
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

// Tipo simplificado sin la relación profiles
interface Appointment {
    id: string;
    appointment_date: string;
    reason: string;
    status: string;
    duration_minutes: number;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
    pet_id: string | null;
    veterinarian_id: string | null;
    pets?: {
        id: string;
        name: string;
        species: string;
        breed: string | null;
        owners?: {
            full_name: string;
            phone: string;
        } | null;
    } | null;
    veterinarian_name?: string; // Nombre del veterinario cargado separadamente
}

interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    owners?: {
        full_name: string;
    } | null;
}

interface Vet {
    id: string;
    full_name: string;
    role: string;
}

interface AppointmentFormData {
    pet_id: string;
    veterinarian_id: string;
    appointment_date: string;
    reason: string;
    duration_minutes: number;
    notes: string;
}

const Citas = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal states
    const [openModal, setOpenModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

    // Form data
    const [formData, setFormData] = useState<AppointmentFormData>({
        pet_id: '',
        veterinarian_id: '',
        appointment_date: '',
        reason: '',
        duration_minutes: 30,
        notes: ''
    });

    const [pets, setPets] = useState<Pet[]>([]);
    const [vets, setVets] = useState<Vet[]>([]);

    useEffect(() => {
        loadAppointments();
        loadPets();
        loadVets();
    }, []);

    const loadAppointments = async () => {
        try {
            setLoading(true);

            // Cargar citas sin la relación profiles
            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    pets (
                        id,
                        name,
                        species,
                        breed,
                        owners (
                            full_name,
                            phone
                        )
                    )
                `)
                .order('appointment_date', { ascending: true });

            if (appointmentsError) {
                console.error('Error loading appointments:', appointmentsError);
                throw appointmentsError;
            }

            if (!appointmentsData) {
                setAppointments([]);
                return;
            }

            // Obtener todos los IDs de veterinarios únicos
            const vetIds = [...new Set(appointmentsData
                .filter(a => a.veterinarian_id)
                .map(a => a.veterinarian_id)
            )] as string[];

            // Cargar nombres de veterinarios por separado
            let vetNamesMap: Record<string, string> = {};

            if (vetIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', vetIds);

                if (!profilesError && profilesData) {
                    vetNamesMap = profilesData.reduce((acc, profile) => {
                        acc[profile.id] = profile.full_name;
                        return acc;
                    }, {} as Record<string, string>);
                }
            }

            // Crear los datos tipados con los nombres de veterinarios
            const typedData: Appointment[] = appointmentsData.map(item => ({
                id: item.id,
                appointment_date: item.appointment_date,
                reason: item.reason || '',
                status: item.status || 'programada',
                duration_minutes: item.duration_minutes || 30,
                notes: item.notes || null,
                created_at: item.created_at || null,
                updated_at: item.updated_at || null,
                created_by: item.created_by || null,
                pet_id: item.pet_id || null,
                veterinarian_id: item.veterinarian_id || null,
                pets: item.pets || null,
                veterinarian_name: item.veterinarian_id ? vetNamesMap[item.veterinarian_id] || 'Sin nombre' : 'Sin veterinario'
            }));

            setAppointments(typedData);
        } catch (error) {
            console.error('Error loading appointments:', error);
            toast.error("Error al cargar las citas");
        } finally {
            setLoading(false);
        }
    };

    const loadPets = async () => {
        try {
            const { data, error } = await supabase
                .from('pets')
                .select(`
                    id,
                    name,
                    species,
                    breed,
                    owners (
                        full_name
                    )
                `)
                .eq('active', true)
                .order('name');

            if (error) {
                console.error('Error loading pets:', error);
                return;
            }

            setPets(data || []);
        } catch (error) {
            console.error('Error loading pets:', error);
        }
    };

    const loadVets = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('role', 'veterinario')
                .order('full_name');

            if (error) {
                console.error('Error loading vets:', error);
                return;
            }

            setVets(data || []);
        } catch (error) {
            console.error('Error loading vets:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            pet_id: '',
            veterinarian_id: '',
            appointment_date: '',
            reason: '',
            duration_minutes: 30,
            notes: ''
        });
        setEditingAppointment(null);
    };

    const openEditModal = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setFormData({
            pet_id: appointment.pet_id || '',
            veterinarian_id: appointment.veterinarian_id || '',
            appointment_date: appointment.appointment_date ?
                format(new Date(appointment.appointment_date), "yyyy-MM-dd'T'HH:mm") : '',
            reason: appointment.reason || '',
            duration_minutes: appointment.duration_minutes || 30,
            notes: appointment.notes || ''
        });
        setOpenModal(true);
    };

    const handleSubmit = async () => {
        // Validaciones
        if (!formData.pet_id || !formData.veterinarian_id || !formData.appointment_date || !formData.reason) {
            toast.error("Completa todos los campos requeridos");
            return;
        }

        if (formData.duration_minutes < 15 || formData.duration_minutes > 240) {
            toast.error("La duración debe estar entre 15 y 240 minutos");
            return;
        }

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;

            if (editingAppointment) {
                // Actualizar cita existente
                const { error } = await supabase
                    .from('appointments')
                    .update({
                        pet_id: formData.pet_id,
                        veterinarian_id: formData.veterinarian_id,
                        appointment_date: formData.appointment_date,
                        reason: formData.reason,
                        duration_minutes: formData.duration_minutes,
                        notes: formData.notes || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingAppointment.id);

                if (error) throw error;
                toast.success("Cita actualizada correctamente");
            } else {
                // Crear nueva cita
                const { error } = await supabase
                    .from('appointments')
                    .insert({
                        pet_id: formData.pet_id,
                        veterinarian_id: formData.veterinarian_id,
                        appointment_date: formData.appointment_date,
                        reason: formData.reason,
                        duration_minutes: formData.duration_minutes,
                        notes: formData.notes || null,
                        status: 'programada',
                        created_by: user?.id
                    });

                if (error) throw error;
                toast.success("Cita creada correctamente");
            }

            resetForm();
            setOpenModal(false);
            loadAppointments();
        } catch (error: unknown) {
            console.error('Error saving appointment:', error);
            toast.error(error instanceof Error ? error.message : "Error al guardar la cita");
        }
    };

    const updateAppointmentStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Cita ${newStatus === 'completada' ? 'completada' : 'cancelada'}`);
            loadAppointments();
        } catch (error) {
            console.error('Error updating appointment status:', error);
            toast.error("Error al actualizar el estado");
        }
    };

    const deleteAppointment = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta cita?")) return;

        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Cita eliminada correctamente");
            loadAppointments();
        } catch (error) {
            console.error('Error deleting appointment:', error);
            toast.error("Error al eliminar la cita");
        }
    };

    const exportToCalendar = (appointment: Appointment) => {
        const startDate = new Date(appointment.appointment_date);
        const endDate = new Date(startDate.getTime() + (appointment.duration_minutes || 30) * 60000);

        const calendarEvent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Cita Veterinaria - ${appointment.pets?.name}
DESCRIPTION:${appointment.reason}\\nVeterinario: ${appointment.veterinarian_name}
DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss")}
DTEND:${format(endDate, "yyyyMMdd'T'HHmmss")}
LOCATION:Clínica Veterinaria
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([calendarEvent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cita-${appointment.pets?.name}-${format(startDate, 'yyyy-MM-dd')}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Evento exportado al calendario");
    };

    // Filtros y búsqueda
    const filteredAppointments = appointments.filter((appointment) => {
        // Búsqueda por texto
        const searchMatch = search === '' ||
            appointment.pets?.name?.toLowerCase().includes(search.toLowerCase()) ||
            appointment.pets?.species?.toLowerCase().includes(search.toLowerCase()) ||
            (appointment.pets?.breed || '').toLowerCase().includes(search.toLowerCase()) ||
            (appointment.veterinarian_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (appointment.reason || '').toLowerCase().includes(search.toLowerCase());

        // Filtro por estado
        const statusMatch = statusFilter === 'all' || appointment.status === statusFilter;

        // Filtro por fecha
        const appointmentDate = new Date(appointment.appointment_date);
        let dateMatch = true;

        if (dateFilter === 'today') {
            dateMatch = isToday(appointmentDate);
        } else if (dateFilter === 'tomorrow') {
            dateMatch = isTomorrow(appointmentDate);
        } else if (dateFilter === 'past') {
            dateMatch = isPast(appointmentDate) && !isToday(appointmentDate);
        } else if (dateFilter === 'upcoming') {
            dateMatch = !isPast(appointmentDate) || isToday(appointmentDate);
        }

        return searchMatch && statusMatch && dateMatch;
    });

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            programada: "bg-blue-100 text-blue-800 border-blue-200",
            completada: "bg-green-100 text-green-800 border-green-200",
            cancelada: "bg-red-100 text-red-800 border-red-200",
            en_progreso: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, JSX.Element> = {
            programada: <Clock className="w-4 h-4" />,
            completada: <CheckCircle className="w-4 h-4" />,
            cancelada: <XCircle className="w-4 h-4" />,
            en_progreso: <PlayCircle className="w-4 h-4" />,
        };
        return icons[status] || <Clock className="w-4 h-4" />;
    };

    const getDateInfo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (isToday(date)) {
            return { text: 'Hoy', className: 'bg-green-50 text-green-700' };
        } else if (isTomorrow(date)) {
            return { text: 'Mañana', className: 'bg-blue-50 text-blue-700' };
        } else if (diffHours < 24 && diffHours > 0) {
            return { text: 'Próximas 24h', className: 'bg-yellow-50 text-yellow-700' };
        } else if (isPast(date)) {
            return { text: 'Pasada', className: 'bg-gray-100 text-gray-600' };
        }
        return null;
    };

    // Estadísticas
    const stats = {
        total: appointments.length,
        today: appointments.filter(a => isToday(new Date(a.appointment_date))).length,
        pending: appointments.filter(a => a.status === 'programada').length,
        completed: appointments.filter(a => a.status === 'completada').length,
    };

    return (
        <Layout>
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Citas</h1>
                        <p className="text-muted-foreground">
                            Programa y administra las citas veterinarias
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                            className="hidden md:flex"
                        >
                            {viewMode === 'grid' ? 'Vista Lista' : 'Vista Grid'}
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90"
                            onClick={() => {
                                resetForm();
                                setOpenModal(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Cita
                        </Button>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Citas</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <CalendarIcon className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Para Hoy</p>
                                    <p className="text-2xl font-bold">{stats.today}</p>
                                </div>
                                <Clock className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pendientes</p>
                                    <p className="text-2xl font-bold">{stats.pending}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Completadas</p>
                                    <p className="text-2xl font-bold">{stats.completed}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros y búsqueda */}
                <Card className="shadow-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
                                <Input
                                    placeholder="Buscar por mascota, veterinario o motivo..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        <SelectItem value="programada">Programada</SelectItem>
                                        <SelectItem value="en_progreso">En progreso</SelectItem>
                                        <SelectItem value="completada">Completada</SelectItem>
                                        <SelectItem value="cancelada">Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <CalendarIcon className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Fecha" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las fechas</SelectItem>
                                        <SelectItem value="today">Hoy</SelectItem>
                                        <SelectItem value="tomorrow">Mañana</SelectItem>
                                        <SelectItem value="upcoming">Próximas</SelectItem>
                                        <SelectItem value="past">Pasadas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Citas */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Cargando citas...</p>
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <Card className="shadow-soft">
                        <CardContent className="py-12 text-center">
                            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-2">
                                {search || statusFilter !== 'all' || dateFilter !== 'all'
                                    ? "No se encontraron citas con los filtros aplicados"
                                    : "No hay citas programadas"}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter('all');
                                    setDateFilter('all');
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </CardContent>
                    </Card>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAppointments.map((appointment) => {
                            const dateInfo = getDateInfo(appointment.appointment_date);

                            return (
                                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={`flex items-center gap-1 ${getStatusColor(appointment.status)}`}>
                                                        {getStatusIcon(appointment.status)}
                                                        {appointment.status.replace('_', ' ')}
                                                    </Badge>
                                                    {dateInfo && (
                                                        <Badge variant="outline" className={dateInfo.className}>
                                                            {dateInfo.text}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardTitle className="text-xl flex items-center gap-2">
                                                    <PawPrint className="w-5 h-5 text-blue-600" />
                                                    {appointment.pets?.name || 'Sin mascota'}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {appointment.pets?.breed || 'Sin raza'} • {appointment.pets?.species || 'Sin especie'}
                                                </p>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setViewingAppointment(appointment)}>
                                                        Ver detalles
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditModal(appointment)}>
                                                        Editar
                                                    </DropdownMenuItem>
                                                    {appointment.status === 'programada' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => updateAppointmentStatus(appointment.id, 'en_progreso')}
                                                            >
                                                                Iniciar consulta
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => updateAppointmentStatus(appointment.id, 'completada')}
                                                            >
                                                                Marcar como completada
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelada')}
                                                                className="text-red-600"
                                                            >
                                                                Cancelar cita
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => exportToCalendar(appointment)}>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Exportar a calendario
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => deleteAppointment(appointment.id)}
                                                        className="text-red-600"
                                                    >
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {format(new Date(appointment.appointment_date), "EEEE d 'de' MMMM", { locale: es })}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    • {format(new Date(appointment.appointment_date), "h:mm a")}
                                                </span>
                                                <Badge variant="outline">
                                                    {appointment.duration_minutes || 30} min
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                                                <span>{appointment.veterinarian_name || 'Sin veterinario'}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span>{appointment.pets?.owners?.full_name || 'Sin dueño'}</span>
                                            </div>

                                            <div className="pt-2">
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {appointment.reason || 'Sin motivo especificado'}
                                                </p>
                                                {appointment.notes && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                        {appointment.notes}
                                                    </p>
                                                )}
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="w-full mt-4"
                                                onClick={() => setViewingAppointment(appointment)}
                                            >
                                                Ver Detalles Completos
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAppointments.map((appointment) => (
                            <Card key={appointment.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {format(new Date(appointment.appointment_date), "dd")}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {format(new Date(appointment.appointment_date), "MMM", { locale: es })}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{appointment.pets?.name || 'Sin mascota'}</h3>
                                                    <Badge className={getStatusColor(appointment.status)}>
                                                        {appointment.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {appointment.reason || 'Sin motivo'} • {format(new Date(appointment.appointment_date), "h:mm a")}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="w-3 h-3" />
                                                        {appointment.veterinarian_name || 'Sin veterinario'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {appointment.pets?.owners?.full_name || 'Sin dueño'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setViewingAppointment(appointment)}
                                            >
                                                Ver
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => openEditModal(appointment)}
                                            >
                                                Editar
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para crear/editar cita */}
            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mascota *</label>
                                <Select
                                    value={formData.pet_id}
                                    onValueChange={(value) => setFormData({...formData, pet_id: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar mascota" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pets.map((pet) => (
                                            <SelectItem key={pet.id} value={pet.id}>
                                                {pet.name} ({pet.species} • {pet.breed || 'Sin raza'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Veterinario *</label>
                                <Select
                                    value={formData.veterinarian_id}
                                    onValueChange={(value) => setFormData({...formData, veterinarian_id: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar veterinario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vets.map((vet) => (
                                            <SelectItem key={vet.id} value={vet.id}>
                                                {vet.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha y Hora *</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.appointment_date}
                                    onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Duración (minutos) *</label>
                                <Select
                                    value={formData.duration_minutes.toString()}
                                    onValueChange={(value) => setFormData({...formData, duration_minutes: parseInt(value)})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar duración" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutos</SelectItem>
                                        <SelectItem value="30">30 minutos</SelectItem>
                                        <SelectItem value="45">45 minutos</SelectItem>
                                        <SelectItem value="60">60 minutos</SelectItem>
                                        <SelectItem value="90">90 minutos</SelectItem>
                                        <SelectItem value="120">120 minutos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo de la cita *</label>
                            <Textarea
                                placeholder="Describa el motivo de la consulta..."
                                value={formData.reason}
                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notas adicionales</label>
                            <Textarea
                                placeholder="Observaciones, síntomas, historial reciente..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setOpenModal(false);
                            resetForm();
                        }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                            {editingAppointment ? 'Actualizar Cita' : 'Crear Cita'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para ver detalles */}
            <Dialog open={!!viewingAppointment} onOpenChange={(open) => !open && setViewingAppointment(null)}>
                <DialogContent className="max-w-3xl">
                    {viewingAppointment && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Detalles de la Cita</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <PawPrint className="w-5 h-5" />
                                                Mascota
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Nombre</p>
                                                    <p className="font-medium">{viewingAppointment.pets?.name || 'No especificado'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Especie</p>
                                                    <p className="font-medium">{viewingAppointment.pets?.species || 'No especificado'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Raza</p>
                                                    <p className="font-medium">{viewingAppointment.pets?.breed || 'No especificada'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <User className="w-5 h-5" />
                                                Dueño
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Nombre</p>
                                                    <p className="font-medium">{viewingAppointment.pets?.owners?.full_name || 'No especificado'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Teléfono</p>
                                                    <p className="font-medium">{viewingAppointment.pets?.owners?.phone || 'No especificado'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Stethoscope className="w-5 h-5" />
                                                Veterinario
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Nombre</p>
                                                    <p className="font-medium">{viewingAppointment.veterinarian_name || 'No especificado'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">ID</p>
                                                    <p className="font-medium">{viewingAppointment.veterinarian_id || 'No especificado'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CalendarIcon className="w-5 h-5" />
                                            Información de la Cita
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                                                <p className="font-medium">
                                                    {format(new Date(viewingAppointment.appointment_date), "EEEE d 'de' MMMM yyyy 'a las' h:mm a", { locale: es })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Duración</p>
                                                <p className="font-medium">{viewingAppointment.duration_minutes || 30} minutos</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Estado</p>
                                                <Badge className={getStatusColor(viewingAppointment.status)}>
                                                    {getStatusIcon(viewingAppointment.status)}
                                                    {viewingAppointment.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Creada</p>
                                                <p className="font-medium">
                                                    {viewingAppointment.created_at ?
                                                        format(new Date(viewingAppointment.created_at), "dd/MM/yyyy") :
                                                        'No disponible'}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm text-muted-foreground">Motivo</p>
                                            <p className="font-medium mt-1">{viewingAppointment.reason || 'No especificado'}</p>
                                        </div>

                                        {viewingAppointment.notes && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Notas Adicionales</p>
                                                <p className="mt-1 bg-gray-50 p-3 rounded-md">{viewingAppointment.notes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => exportToCalendar(viewingAppointment)}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Exportar a Calendario
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setViewingAppointment(null);
                                            openEditModal(viewingAppointment);
                                        }}
                                    >
                                        Editar Cita
                                    </Button>
                                    <Button onClick={() => setViewingAppointment(null)}>
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};

export default Citas;