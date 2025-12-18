import {type JSX, useEffect, useState} from 'react';
import { supabase } from '../integrations/supabase/client';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
    Plus,
    Search,
    User,
    Phone,
    Calendar,
    Heart,
    MoreVertical,
    Filter,
    Dog,
    Cat,
    Bird,
    Rabbit,
    Fish,
    Download,
    Edit,
    Trash2,
    Eye
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
    DialogDescription,
} from '../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Tabs,TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';

interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    age: number | null;
    weight: number | null;
    gender: string | null;
    color: string | null;
    owner_id: string;
    medical_history: string | null;
    allergies: string | null;
    photo_url: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    owners?: {
        full_name: string;
        phone: string;
        email: string | null;
        address: string | null;
    };
    appointment_count?: number;
}

interface Owner {
    id: string;
    full_name: string;
    email: string | null;
    phone: string;
    address: string | null;
    rfc: string | null;
}

interface PetFormData {
    name: string;
    species: string;
    breed: string;
    age: string;
    weight: string;
    gender: string;
    color: string;
    medical_history: string;
    allergies: string;
    photo_url: string;
    owner_id: string;
}

const Pacientes = () => {
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState<'activos' | 'inactivos' | 'todos'>('activos');

    // Modal states
    const [openModal, setOpenModal] = useState(false);
    const [openOwnerModal, setOpenOwnerModal] = useState(false);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

    // Form states
    const [petFormData, setPetFormData] = useState<PetFormData>({
        name: '',
        species: 'perro',
        breed: '',
        age: '',
        weight: '',
        gender: 'macho',
        color: '',
        medical_history: '',
        allergies: '',
        photo_url: '',
        owner_id: ''
    });

    const [ownerFormData, setOwnerFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        rfc: ''
    });

    const [owners, setOwners] = useState<Owner[]>([]);
    const [ownersLoading, setOwnersLoading] = useState(false);

    useEffect(() => {
        loadPets();
        loadOwners();
    }, []);

    useEffect(() => {
        if (openModal && owners.length === 0) {
            loadOwners();
        }
    }, [openModal]);

    const loadPets = async () => {
        try {
            setLoading(true);
            const { data: petsData, error: petsError } = await supabase
                .from('pets')
                .select(`
          *,
          owners (*)
        `)
                .order('created_at', { ascending: false });

            if (petsError) throw petsError;

            // Cargar conteo de citas para cada mascota
            const petsWithAppointments = await Promise.all(
                (petsData || []).map(async (pet) => {
                    const { count } = await supabase
                        .from('appointments')
                        .select('*', { count: 'exact', head: true })
                        .eq('pet_id', pet.id);

                    return {
                        ...pet,
                        appointment_count: count || 0
                    };
                })
            );

            setPets(petsWithAppointments);
        } catch (error) {
            console.error('Error loading pets:', error);
            toast.error('Error al cargar pacientes');
        } finally {
            setLoading(false);
        }
    };

    const loadOwners = async () => {
        try {
            setOwnersLoading(true);
            const { data, error } = await supabase
                .from('owners')
                .select('*')
                .order('full_name');

            if (error) throw error;
            setOwners(data || []);
        } catch (error) {
            console.error('Error loading owners:', error);
            toast.error('Error al cargar dueños');
        } finally {
            setOwnersLoading(false);
        }
    };

    const resetPetForm = () => {
        setPetFormData({
            name: '',
            species: 'perro',
            breed: '',
            age: '',
            weight: '',
            gender: 'macho',
            color: '',
            medical_history: '',
            allergies: '',
            photo_url: '',
            owner_id: ''
        });
        setEditingPet(null);
    };

    const openEditModal = (pet: Pet) => {
        setEditingPet(pet);
        setPetFormData({
            name: pet.name,
            species: pet.species,
            breed: pet.breed || '',
            age: pet.age?.toString() || '',
            weight: pet.weight?.toString() || '',
            gender: pet.gender || 'macho',
            color: pet.color || '',
            medical_history: pet.medical_history || '',
            allergies: pet.allergies || '',
            photo_url: pet.photo_url || '',
            owner_id: pet.owner_id
        });
        setOpenModal(true);
    };

    const handleSavePet = async () => {
        // Validaciones
        if (!petFormData.name || !petFormData.species || !petFormData.owner_id) {
            toast.error('Nombre, especie y dueño son obligatorios');
            return;
        }

        if (petFormData.age && (parseFloat(petFormData.age) < 0 || parseFloat(petFormData.age) > 50)) {
            toast.error('La edad debe estar entre 0 y 50 años');
            return;
        }

        if (petFormData.weight && parseFloat(petFormData.weight) <= 0) {
            toast.error('El peso debe ser mayor a 0');
            return;
        }

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;

            const petData = {
                name: petFormData.name,
                species: petFormData.species,
                breed: petFormData.breed || null,
                age: petFormData.age ? parseInt(petFormData.age) : null,
                weight: petFormData.weight ? parseFloat(petFormData.weight) : null,
                gender: petFormData.gender,
                color: petFormData.color || null,
                medical_history: petFormData.medical_history || null,
                allergies: petFormData.allergies || null,
                photo_url: petFormData.photo_url || null,
                owner_id: petFormData.owner_id,
                active: true,
                created_by: editingPet ? undefined : user?.id
            };

            if (editingPet) {
                const { error } = await supabase
                    .from('pets')
                    .update(petData)
                    .eq('id', editingPet.id);

                if (error) throw error;
                toast.success('Paciente actualizado correctamente');
            } else {
                const { error } = await supabase
                    .from('pets')
                    .insert(petData);

                if (error) throw error;
                toast.success('Paciente registrado correctamente');
            }

            resetPetForm();
            setOpenModal(false);
            loadPets();
        } catch (error) {
            console.error('Error saving pet:', error);
            toast.error(error instanceof Error ? error.message : 'Error al guardar paciente');
        }
    };

    const handleSaveOwner = async () => {
        if (!ownerFormData.full_name || !ownerFormData.phone) {
            toast.error('Nombre y teléfono son obligatorios');
            return;
        }

        try {
            const { data: auth } = await supabase.auth.getUser();
            const user = auth?.user;

            const { error } = await supabase
                .from('owners')
                .insert({
                    full_name: ownerFormData.full_name,
                    email: ownerFormData.email || null,
                    phone: ownerFormData.phone,
                    address: ownerFormData.address || null,
                    rfc: ownerFormData.rfc || null,
                    created_by: user?.id
                });

            if (error) throw error;

            toast.success('Dueño registrado correctamente');
            setOwnerFormData({
                full_name: '',
                email: '',
                phone: '',
                address: '',
                rfc: ''
            });
            setOpenOwnerModal(false);
            loadOwners();
        } catch (error) {
            console.error('Error saving owner:', error);
            toast.error('Error al registrar dueño');
        }
    };

    const togglePetStatus = async (petId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('pets')
                .update({ active: !currentStatus })
                .eq('id', petId);

            if (error) throw error;

            toast.success(`Paciente ${currentStatus ? 'desactivado' : 'activado'} correctamente`);
            loadPets();
        } catch (error) {
            console.error('Error toggling pet status:', error);
            toast.error('Error al cambiar estado del paciente');
        }
    };

    const deletePet = async (petId: string) => {
        if (!confirm('¿Estás seguro de eliminar este paciente? Esta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabase
                .from('pets')
                .delete()
                .eq('id', petId);

            if (error) throw error;

            toast.success('Paciente eliminado correctamente');
            loadPets();
        } catch (error) {
            console.error('Error deleting pet:', error);
            toast.error('Error al eliminar paciente');
        }
    };

    const exportPetData = (pet: Pet) => {
        const petData = {
            'Nombre': pet.name,
            'Especie': pet.species,
            'Raza': pet.breed || 'No especificada',
            'Edad': pet.age ? `${pet.age} años` : 'No especificada',
            'Peso': pet.weight ? `${pet.weight} kg` : 'No especificado',
            'Género': pet.gender || 'No especificado',
            'Color': pet.color || 'No especificado',
            'Dueño': pet.owners?.full_name || 'No especificado',
            'Teléfono': pet.owners?.phone || 'No especificado',
            'Email': pet.owners?.email || 'No especificado',
            'Historial Médico': pet.medical_history || 'No especificado',
            'Alergias': pet.allergies || 'No especificado',
            'Citas Registradas': pet.appointment_count || 0,
            'Estado': pet.active ? 'Activo' : 'Inactivo',
            'Registrado': format(new Date(pet.created_at), 'dd/MM/yyyy HH:mm')
        };

        const csvContent = Object.entries(petData)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paciente-${pet.name}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Datos exportados correctamente');
    };

    const getSpeciesIcon = (species: string) => {
        const icons: Record<string, JSX.Element> = {
            perro: <Dog className="w-5 h-5" />,
            gato: <Cat className="w-5 h-5" />,
            ave: <Bird className="w-5 h-5" />,
            conejo: <Rabbit className="w-5 h-5" />,
            pez: <Fish className="w-5 h-5" />,
        };
        return icons[species.toLowerCase()] || <Heart className="w-5 h-5" />;
    };

    const getGenderColor = (gender: string | null) => {
        const colors: Record<string, string> = {
            macho: "bg-blue-100 text-blue-800 border-blue-200",
            hembra: "bg-pink-100 text-pink-800 border-pink-200",
        };
        return colors[gender || ''] || "bg-gray-100 text-gray-800";
    };

    // Filtros y búsqueda
    const filteredPets = pets.filter((pet) => {
        // Filtro por búsqueda
        const searchMatch = search === '' ||
            pet.name.toLowerCase().includes(search.toLowerCase()) ||
            pet.species.toLowerCase().includes(search.toLowerCase()) ||
            (pet.breed || '').toLowerCase().includes(search.toLowerCase()) ||
            pet.owners?.full_name.toLowerCase().includes(search.toLowerCase());

        // Filtro por especie
        const speciesMatch = speciesFilter === 'all' || pet.species.toLowerCase() === speciesFilter.toLowerCase();

        // Filtro por estado activo/inactivo
        let statusMatch = true;
        if (activeTab === 'activos') {
            statusMatch = pet.active === true;
        } else if (activeTab === 'inactivos') {
            statusMatch = pet.active === false;
        }

        // Filtro por estado (activo/inactivo) desde el select
        if (statusFilter === 'activos') {
            statusMatch = statusMatch && pet.active === true;
        } else if (statusFilter === 'inactivos') {
            statusMatch = statusMatch && pet.active === false;
        }

        return searchMatch && speciesMatch && statusMatch;
    });

    // Estadísticas
    const stats = {
        total: pets.length,
        activos: pets.filter(p => p.active).length,
        inactivos: pets.filter(p => !p.active).length,
        perros: pets.filter(p => p.species.toLowerCase() === 'perro').length,
        gatos: pets.filter(p => p.species.toLowerCase() === 'gato').length,
    };

    return (
        <Layout>
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Pacientes</h1>
                        <p className="text-muted-foreground">
                            Administra las mascotas y sus historiales médicos
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
                            variant="outline"
                            onClick={() => setOpenOwnerModal(true)}
                        >
                            Nuevo Dueño
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90"
                            onClick={() => {
                                resetPetForm();
                                setOpenModal(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Paciente
                        </Button>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Pacientes</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Heart className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Activos</p>
                                    <p className="text-2xl font-bold">{stats.activos}</p>
                                </div>
                                <Dog className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Perros</p>
                                    <p className="text-2xl font-bold">{stats.perros}</p>
                                </div>
                                <Dog className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Gatos</p>
                                    <p className="text-2xl font-bold">{stats.gatos}</p>
                                </div>
                                <Cat className="w-8 h-8 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs de estado */}
                <Tabs defaultValue="activos" value={activeTab} onValueChange={(value) => setActiveTab(value as never)} className="mb-6">
                    <TabsList className="grid w-full md:w-auto grid-cols-3">
                        <TabsTrigger value="activos">Activos ({stats.activos})</TabsTrigger>
                        <TabsTrigger value="inactivos">Inactivos ({stats.inactivos})</TabsTrigger>
                        <TabsTrigger value="todos">Todos ({stats.total})</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Filtros y búsqueda */}
                <Card className="shadow-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
                                <Input
                                    placeholder="Buscar por nombre, especie, raza o dueño..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Especie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las especies</SelectItem>
                                        <SelectItem value="perro">Perro</SelectItem>
                                        <SelectItem value="gato">Gato</SelectItem>
                                        <SelectItem value="ave">Ave</SelectItem>
                                        <SelectItem value="conejo">Conejo</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        <SelectItem value="activos">Activos</SelectItem>
                                        <SelectItem value="inactivos">Inactivos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Pacientes */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Cargando pacientes...</p>
                    </div>
                ) : filteredPets.length === 0 ? (
                    <Card className="shadow-soft">
                        <CardContent className="py-12 text-center">
                            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-2">
                                {search || speciesFilter !== 'all' || statusFilter !== 'all' || activeTab !== 'todos'
                                    ? "No se encontraron pacientes con los filtros aplicados"
                                    : "No hay pacientes registrados"}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setSpeciesFilter('all');
                                    setStatusFilter('all');
                                    setActiveTab('todos');
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </CardContent>
                    </Card>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPets.map((pet) => (
                            <Card key={pet.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={pet.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                    {pet.active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                                {pet.gender && (
                                                    <Badge className={getGenderColor(pet.gender)}>
                                                        {pet.gender}
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                {getSpeciesIcon(pet.species)}
                                                {pet.name}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                {pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}
                                                {pet.breed && ` • ${pet.breed}`}
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
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedPet(pet);
                                                    setOpenDetailModal(true);
                                                }}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver detalles
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openEditModal(pet)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => exportPetData(pet)}>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Exportar datos
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => togglePetStatus(pet.id, pet.active)}>
                                                    {pet.active ? 'Desactivar' : 'Activar'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => deletePet(pet.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span>{pet.owners?.full_name || 'Sin dueño'}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            <span>{pet.owners?.phone || 'Sin teléfono'}</span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm">
                                            {pet.age !== null && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span>{pet.age} años</span>
                                                </div>
                                            )}
                                            {pet.weight !== null && (
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium">{pet.weight} kg</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Citas registradas:</span>
                                                <Badge variant="outline">{pet.appointment_count || 0}</Badge>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={() => {
                                                setSelectedPet(pet);
                                                setOpenDetailModal(true);
                                            }}
                                        >
                                            Ver Historial Completo
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPets.map((pet) => (
                            <Card key={pet.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl text-green-600">
                                                {getSpeciesIcon(pet.species)}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{pet.name}</h3>
                                                    <Badge className={pet.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                        {pet.active ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                    {pet.gender && (
                                                        <Badge className={getGenderColor(pet.gender)}>
                                                            {pet.gender}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {pet.species} • {pet.breed || 'Sin raza'} • Dueño: {pet.owners?.full_name}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    {pet.age !== null && (
                                                        <span>{pet.age} años</span>
                                                    )}
                                                    {pet.weight !== null && (
                                                        <span>{pet.weight} kg</span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                                                        {pet.owners?.phone || 'Sin teléfono'}
                          </span>
                                                    <Badge variant="outline">{pet.appointment_count || 0} citas</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedPet(pet);
                                                    setOpenDetailModal(true);
                                                }}
                                            >
                                                Ver
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => openEditModal(pet)}
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

            {/* Modal para crear/editar paciente */}
            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPet ? 'Editar Paciente' : 'Nuevo Paciente'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre *</label>
                                <Input
                                    placeholder="Nombre de la mascota"
                                    value={petFormData.name}
                                    onChange={(e) => setPetFormData({...petFormData, name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Especie *</label>
                                <Select
                                    value={petFormData.species}
                                    onValueChange={(value) => setPetFormData({...petFormData, species: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar especie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="perro">Perro</SelectItem>
                                        <SelectItem value="gato">Gato</SelectItem>
                                        <SelectItem value="ave">Ave</SelectItem>
                                        <SelectItem value="conejo">Conejo</SelectItem>
                                        <SelectItem value="hamster">Hamster</SelectItem>
                                        <SelectItem value="tortuga">Tortuga</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Raza</label>
                                <Input
                                    placeholder="Raza de la mascota"
                                    value={petFormData.breed}
                                    onChange={(e) => setPetFormData({...petFormData, breed: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Dueño *</label>
                                <Select
                                    value={petFormData.owner_id}
                                    onValueChange={(value) => setPetFormData({...petFormData, owner_id: value})}
                                    disabled={ownersLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar dueño" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {owners.map((owner) => (
                                            <SelectItem key={owner.id} value={owner.id}>
                                                {owner.full_name} ({owner.phone})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    ¿No encuentras al dueño?{' '}
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="p-0 h-auto text-xs"
                                        onClick={() => {
                                            setOpenModal(false);
                                            setOpenOwnerModal(true);
                                        }}
                                    >
                                        Regístralo aquí
                                    </Button>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Edad (años)</label>
                                <Input
                                    type="number"
                                    placeholder="Edad"
                                    value={petFormData.age}
                                    onChange={(e) => setPetFormData({...petFormData, age: e.target.value})}
                                    min="0"
                                    max="50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Peso (kg)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="Peso"
                                    value={petFormData.weight}
                                    onChange={(e) => setPetFormData({...petFormData, weight: e.target.value})}
                                    min="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Género</label>
                                <Select
                                    value={petFormData.gender}
                                    onValueChange={(value) => setPetFormData({...petFormData, gender: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar género" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="macho">Macho</SelectItem>
                                        <SelectItem value="hembra">Hembra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color</label>
                            <Input
                                placeholder="Color del pelaje/plumaje"
                                value={petFormData.color}
                                onChange={(e) => setPetFormData({...petFormData, color: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Historial Médico</label>
                            <Textarea
                                placeholder="Enfermedades previas, tratamientos, cirugías..."
                                value={petFormData.medical_history}
                                onChange={(e) => setPetFormData({...petFormData, medical_history: e.target.value})}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alergias</label>
                            <Textarea
                                placeholder="Alergias conocidas a medicamentos o alimentos"
                                value={petFormData.allergies}
                                onChange={(e) => setPetFormData({...petFormData, allergies: e.target.value})}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL de Foto (opcional)</label>
                            <Input
                                placeholder="https://ejemplo.com/foto.jpg"
                                value={petFormData.photo_url}
                                onChange={(e) => setPetFormData({...petFormData, photo_url: e.target.value})}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setOpenModal(false);
                            resetPetForm();
                        }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSavePet} className="bg-green-600 hover:bg-green-700">
                            {editingPet ? 'Actualizar Paciente' : 'Registrar Paciente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para nuevo dueño */}
            <Dialog open={openOwnerModal} onOpenChange={setOpenOwnerModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Dueño</DialogTitle>
                        <DialogDescription>
                            Registra un nuevo dueño para asociarlo a mascotas
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre Completo *</label>
                            <Input
                                placeholder="Nombre del dueño"
                                value={ownerFormData.full_name}
                                onChange={(e) => setOwnerFormData({...ownerFormData, full_name: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Teléfono *</label>
                            <Input
                                placeholder="Teléfono de contacto"
                                value={ownerFormData.phone}
                                onChange={(e) => setOwnerFormData({...ownerFormData, phone: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={ownerFormData.email}
                                onChange={(e) => setOwnerFormData({...ownerFormData, email: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Dirección</label>
                            <Input
                                placeholder="Dirección completa"
                                value={ownerFormData.address}
                                onChange={(e) => setOwnerFormData({...ownerFormData, address: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">RFC</label>
                            <Input
                                placeholder="RFC (opcional para facturación)"
                                value={ownerFormData.rfc}
                                onChange={(e) => setOwnerFormData({...ownerFormData, rfc: e.target.value})}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenOwnerModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveOwner} className="bg-blue-600 hover:bg-blue-700">
                            Registrar Dueño
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para ver detalles */}
            <Dialog open={openDetailModal} onOpenChange={setOpenDetailModal}>
                <DialogContent className="max-w-4xl">
                    {selectedPet && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Detalles del Paciente: {selectedPet.name}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {getSpeciesIcon(selectedPet.species)}
                                                Información Básica
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Nombre</p>
                                                <p className="font-medium">{selectedPet.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Especie</p>
                                                <p className="font-medium">{selectedPet.species}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Raza</p>
                                                <p className="font-medium">{selectedPet.breed || 'No especificada'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Edad</p>
                                                <p className="font-medium">{selectedPet.age ? `${selectedPet.age} años` : 'No especificada'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Peso</p>
                                                <p className="font-medium">{selectedPet.weight ? `${selectedPet.weight} kg` : 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Género</p>
                                                <Badge className={getGenderColor(selectedPet.gender)}>
                                                    {selectedPet.gender || 'No especificado'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Color</p>
                                                <p className="font-medium">{selectedPet.color || 'No especificado'}</p>
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
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Nombre</p>
                                                <p className="font-medium">{selectedPet.owners?.full_name || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Teléfono</p>
                                                <p className="font-medium">{selectedPet.owners?.phone || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p className="font-medium">{selectedPet.owners?.email || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Dirección</p>
                                                <p className="font-medium">{selectedPet.owners?.address || 'No especificado'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Calendar className="w-5 h-5" />
                                                Información Adicional
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Estado</p>
                                                <Badge className={selectedPet.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                    {selectedPet.active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Citas Registradas</p>
                                                <p className="font-medium">{selectedPet.appointment_count || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Registrado</p>
                                                <p className="font-medium">
                                                    {format(new Date(selectedPet.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Última Actualización</p>
                                                <p className="font-medium">
                                                    {format(new Date(selectedPet.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {selectedPet.medical_history && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Historial Médico</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm whitespace-pre-line">{selectedPet.medical_history}</p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {selectedPet.allergies && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Alergias</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm whitespace-pre-line">{selectedPet.allergies}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => exportPetData(selectedPet)}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Exportar Datos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setOpenDetailModal(false);
                                            openEditModal(selectedPet);
                                        }}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Paciente
                                    </Button>
                                    <Button onClick={() => setOpenDetailModal(false)}>
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

export default Pacientes;