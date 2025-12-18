import {type JSX, useEffect, useState} from 'react';
import { supabase } from '../integrations/supabase/client';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
    Plus,
    Package,
    AlertTriangle,
    Search,
    Filter,
    TrendingDown,
    DollarSign,
    Box,
    Pill,
    Syringe,
    ShoppingBag,
    Bone,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Download,
    RefreshCw, Calendar
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    description: string | null;
    sku: string | null;
    quantity: number;
    min_quantity: number;
    unit_price: number;
    supplier: string | null;
    expiration_date: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    total_value?: number;
}

interface InventoryFormData {
    name: string;
    category: string;
    description: string;
    sku: string;
    quantity: string;
    min_quantity: string;
    unit_price: string;
    supplier: string;
    expiration_date: string;
}

const Inventario = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState<'activos' | 'inactivos' | 'todos'>('activos');

    // Modal states
    const [openModal, setOpenModal] = useState(false);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    // Form state
    const [formData, setFormData] = useState<InventoryFormData>({
        name: '',
        category: 'medicamento',
        description: '',
        sku: '',
        quantity: '0',
        min_quantity: '5',
        unit_price: '0',
        supplier: '',
        expiration_date: ''
    });

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('name');

            if (error) throw error;

            // Calcular valor total de cada item
            const itemsWithTotal = (data || []).map(item => ({
                ...item,
                total_value: (item.quantity || 0) * (item.unit_price || 0)
            }));

            setItems(itemsWithTotal);
        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Error al cargar inventario');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: 'medicamento',
            description: '',
            sku: '',
            quantity: '0',
            min_quantity: '5',
            unit_price: '0',
            supplier: '',
            expiration_date: ''
        });
        setEditingItem(null);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            description: item.description || '',
            sku: item.sku || '',
            quantity: item.quantity.toString(),
            min_quantity: item.min_quantity.toString(),
            unit_price: item.unit_price.toString(),
            supplier: item.supplier || '',
            expiration_date: item.expiration_date || ''
        });
        setOpenModal(true);
    };

    const handleSave = async () => {
        // Validaciones
        if (!formData.name || !formData.category) {
            toast.error('Nombre y categoría son obligatorios');
            return;
        }

        if (parseFloat(formData.quantity) < 0) {
            toast.error('La cantidad no puede ser negativa');
            return;
        }

        if (parseFloat(formData.min_quantity) < 0) {
            toast.error('El stock mínimo no puede ser negativo');
            return;
        }

        if (parseFloat(formData.unit_price) < 0) {
            toast.error('El precio no puede ser negativo');
            return;
        }

        try {
            const itemData = {
                name: formData.name,
                category: formData.category,
                description: formData.description || null,
                sku: formData.sku || null,
                quantity: parseInt(formData.quantity) || 0,
                min_quantity: parseInt(formData.min_quantity) || 5,
                unit_price: parseFloat(formData.unit_price) || 0,
                supplier: formData.supplier || null,
                expiration_date: formData.expiration_date || null,
                active: true
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('inventory')
                    .update(itemData)
                    .eq('id', editingItem.id);

                if (error) throw error;
                toast.success('Producto actualizado correctamente');
            } else {
                const { error } = await supabase
                    .from('inventory')
                    .insert(itemData);

                if (error) throw error;
                toast.success('Producto agregado correctamente');
            }

            resetForm();
            setOpenModal(false);
            loadInventory();
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error(error instanceof Error ? error.message : 'Error al guardar producto');
        }
    };

    const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('inventory')
                .update({ active: !currentStatus })
                .eq('id', itemId);

            if (error) throw error;

            toast.success(`Producto ${currentStatus ? 'desactivado' : 'activado'} correctamente`);
            loadInventory();
        } catch (error) {
            console.error('Error toggling item status:', error);
            toast.error('Error al cambiar estado del producto');
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', itemId);

            if (error) throw error;

            toast.success('Producto eliminado correctamente');
            loadInventory();
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Error al eliminar producto');
        }
    };

    const updateStock = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 0) {
            toast.error('La cantidad no puede ser negativa');
            return;
        }

        try {
            const { error } = await supabase
                .from('inventory')
                .update({ quantity: newQuantity })
                .eq('id', itemId);

            if (error) throw error;

            toast.success('Stock actualizado correctamente');
            loadInventory();
        } catch (error) {
            console.error('Error updating stock:', error);
            toast.error('Error al actualizar stock');
        }
    };

    const exportInventory = () => {
        const inventoryData = items.map(item => ({
            'Producto': item.name,
            'Categoría': getCategoryLabel(item.category),
            'SKU': item.sku || 'N/A',
            'Stock Actual': item.quantity,
            'Stock Mínimo': item.min_quantity,
            'Precio Unitario': `$${item.unit_price.toFixed(2)}`,
            'Valor Total': `$${(item.total_value || 0).toFixed(2)}`,
            'Proveedor': item.supplier || 'N/A',
            'Fecha Expiración': item.expiration_date ? format(new Date(item.expiration_date), 'dd/MM/yyyy') : 'N/A',
            'Estado': item.active ? 'Activo' : 'Inactivo',
            'Última Actualización': format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm')
        }));

        const csvHeaders = Object.keys(inventoryData[0]).join(',');
        const csvRows = inventoryData.map(item => Object.values(item).join(','));
        const csvContent = [csvHeaders, ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Inventario exportado correctamente');
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, JSX.Element> = {
            medicamento: <Pill className="w-5 h-5" />,
            vacuna: <Syringe className="w-5 h-5" />,
            suministro: <Box className="w-5 h-5" />,
            alimento: <Bone className="w-5 h-5" />,
            accesorio: <ShoppingBag className="w-5 h-5" />,
            otro: <Package className="w-5 h-5" />,
        };
        return icons[category] || <Package className="w-5 h-5" />;
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            medicamento: "bg-blue-100 text-blue-800 border-blue-200",
            vacuna: "bg-green-100 text-green-800 border-green-200",
            suministro: "bg-purple-100 text-purple-800 border-purple-200",
            alimento: "bg-yellow-100 text-yellow-800 border-yellow-200",
            accesorio: "bg-pink-100 text-pink-800 border-pink-200",
            otro: "bg-gray-100 text-gray-800 border-gray-200",
        };
        return colors[category] || "bg-gray-100 text-gray-800";
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            medicamento: 'Medicamento',
            vacuna: 'Vacuna',
            suministro: 'Suministro',
            alimento: 'Alimento',
            accesorio: 'Accesorio',
            otro: 'Otro',
        };
        return labels[category] || category;
    };

    const isLowStock = (item: InventoryItem) => item.quantity <= item.min_quantity;
    const isExpired = (item: InventoryItem) => {
        if (!item.expiration_date) return false;
        return new Date(item.expiration_date) < new Date();
    };
    const isNearExpiry = (item: InventoryItem) => {
        if (!item.expiration_date) return false;
        const expiryDate = new Date(item.expiration_date);
        const today = new Date();
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    };

    // Filtros y búsqueda
    const filteredItems = items.filter((item) => {
        // Filtro por búsqueda
        const searchMatch = search === '' ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.sku || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.supplier || '').toLowerCase().includes(search.toLowerCase());

        // Filtro por categoría
        const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;

        // Filtro por estado de stock
        let stockMatch = true;
        if (stockFilter === 'low') {
            stockMatch = isLowStock(item);
        } else if (stockFilter === 'expired') {
            stockMatch = isExpired(item);
        } else if (stockFilter === 'near_expiry') {
            stockMatch = isNearExpiry(item);
        }

        // Filtro por estado activo/inactivo
        let statusMatch = true;
        if (activeTab === 'activos') {
            statusMatch = item.active === true;
        } else if (activeTab === 'inactivos') {
            statusMatch = item.active === false;
        }

        return searchMatch && categoryMatch && stockMatch && statusMatch;
    });

    // Estadísticas
    const stats = {
        total: items.length,
        activos: items.filter(i => i.active).length,
        inactivos: items.filter(i => !i.active).length,
        lowStock: items.filter(isLowStock).length,
        expired: items.filter(isExpired).length,
        nearExpiry: items.filter(isNearExpiry).length,
        totalValue: items.reduce((sum, item) => sum + (item.total_value || 0), 0)
    };

    return (
        <Layout>
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Inventario</h1>
                        <p className="text-muted-foreground">
                            Control de productos, medicamentos y suministros veterinarios
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
                            onClick={exportInventory}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90"
                            onClick={() => {
                                resetForm();
                                setOpenModal(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Producto
                        </Button>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Productos</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Package className="w-8 h-8 text-purple-500" />
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
                                <Box className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                    <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
                                </div>
                                <TrendingDown className="w-8 h-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Próximos a Vencer</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.nearExpiry}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Vencidos</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Valor Total</p>
                                    <p className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</p>
                                </div>
                                <DollarSign className="w-8 h-8 text-blue-500" />
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
                                    placeholder="Buscar por nombre, SKU, descripción o proveedor..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las categorías</SelectItem>
                                        <SelectItem value="medicamento">Medicamento</SelectItem>
                                        <SelectItem value="vacuna">Vacuna</SelectItem>
                                        <SelectItem value="suministro">Suministro</SelectItem>
                                        <SelectItem value="alimento">Alimento</SelectItem>
                                        <SelectItem value="accesorio">Accesorio</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={stockFilter} onValueChange={setStockFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Estado Stock" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="low">Stock Bajo</SelectItem>
                                        <SelectItem value="near_expiry">Próximo a Vencer</SelectItem>
                                        <SelectItem value="expired">Vencido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Productos */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Cargando inventario...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <Card className="shadow-soft">
                        <CardContent className="py-12 text-center">
                            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-2">
                                {search || categoryFilter !== 'all' || stockFilter !== 'all' || activeTab !== 'todos'
                                    ? "No se encontraron productos con los filtros aplicados"
                                    : "No hay productos en inventario"}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setCategoryFilter('all');
                                    setStockFilter('all');
                                    setActiveTab('todos');
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </CardContent>
                    </Card>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => {
                            const lowStock = isLowStock(item);
                            const expired = isExpired(item);
                            const nearExpiry = isNearExpiry(item);

                            return (
                                <Card
                                    key={item.id}
                                    className={`hover:shadow-md transition-shadow ${
                                        expired ? "border-red-300 border-2" :
                                            nearExpiry ? "border-yellow-300 border-2" :
                                                lowStock ? "border-orange-300 border-2" : ""
                                    }`}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={`flex items-center gap-1 ${getCategoryColor(item.category)}`}>
                                                        {getCategoryIcon(item.category)}
                                                        {getCategoryLabel(item.category)}
                                                    </Badge>
                                                    {!item.active && (
                                                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                                            Inactivo
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardTitle className="text-xl flex items-center gap-2">
                                                    {item.name}
                                                </CardTitle>
                                                {item.sku && (
                                                    <p className="text-sm text-muted-foreground">
                                                        SKU: {item.sku}
                                                    </p>
                                                )}
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
                                                        setSelectedItem(item);
                                                        setOpenDetailModal(true);
                                                    }}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Ver detalles
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditModal(item)}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const newQuantity = prompt(`Nueva cantidad para ${item.name}:`, item.quantity.toString());
                                                        if (newQuantity !== null) {
                                                            updateStock(item.id, parseInt(newQuantity) || 0);
                                                        }
                                                    }}>
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        Ajustar stock
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleItemStatus(item.id, item.active)}>
                                                        {item.active ? 'Desactivar' : 'Activar'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => deleteItem(item.id)}
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
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Stock:</span>
                                                <div className="flex items-center gap-2">
                                                    {lowStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                                    {expired && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                                    {nearExpiry && !expired && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                                    <span className={`font-bold ${
                                                        expired ? "text-red-600" :
                                                            nearExpiry ? "text-yellow-600" :
                                                                lowStock ? "text-orange-600" : "text-foreground"
                                                    }`}>
                            {item.quantity}
                          </span>
                                                    <span className="text-sm text-muted-foreground">/ {item.min_quantity} min</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Precio Unitario:</span>
                                                <span className="font-bold text-blue-600">${item.unit_price.toFixed(2)}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Valor Total:</span>
                                                <span className="font-bold text-green-600">${(item.total_value || 0).toFixed(2)}</span>
                                            </div>

                                            {item.expiration_date && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Vence:</span>
                                                    <span className={`font-medium ${
                                                        expired ? "text-red-600" :
                                                            nearExpiry ? "text-yellow-600" : "text-foreground"
                                                    }`}>
                            {format(new Date(item.expiration_date), "dd/MM/yyyy")}
                          </span>
                                                </div>
                                            )}

                                            {item.supplier && (
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Proveedor: </span>
                                                    <span className="font-medium">{item.supplier}</span>
                                                </div>
                                            )}

                                            <Button
                                                variant="outline"
                                                className="w-full mt-4"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setOpenDetailModal(true);
                                                }}
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
                        {filteredItems.map((item) => {
                            const lowStock = isLowStock(item);
                            const expired = isExpired(item);
                            const nearExpiry = isNearExpiry(item);

                            return (
                                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${getCategoryColor(item.category)}`}>
                                                    {getCategoryIcon(item.category)}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{item.name}</h3>
                                                        <Badge className={getCategoryColor(item.category)}>
                                                            {getCategoryLabel(item.category)}
                                                        </Badge>
                                                        {!item.active && (
                                                            <Badge variant="outline">Inactivo</Badge>
                                                        )}
                                                        {expired && (
                                                            <Badge className="bg-red-100 text-red-800">Vencido</Badge>
                                                        )}
                                                        {nearExpiry && !expired && (
                                                            <Badge className="bg-yellow-100 text-yellow-800">Próximo a vencer</Badge>
                                                        )}
                                                        {lowStock && !expired && (
                                                            <Badge className="bg-orange-100 text-orange-800">Stock bajo</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        SKU: {item.sku || 'N/A'} • Proveedor: {item.supplier || 'N/A'}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              Stock: <span className={`font-bold ${
                                expired ? "text-red-600" :
                                    nearExpiry ? "text-yellow-600" :
                                        lowStock ? "text-orange-600" : "text-foreground"
                            }`}>{item.quantity}</span> / {item.min_quantity} min
                            </span>
                                                        <span>Precio: <span className="font-bold text-blue-600">${item.unit_price.toFixed(2)}</span></span>
                                                        <span>Valor: <span className="font-bold text-green-600">${(item.total_value || 0).toFixed(2)}</span></span>
                                                        {item.expiration_date && (
                                                            <span className={`${
                                                                expired ? "text-red-600" :
                                                                    nearExpiry ? "text-yellow-600" : "text-muted-foreground"
                                                            }`}>
                                Vence: {format(new Date(item.expiration_date), "dd/MM/yyyy")}
                              </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setOpenDetailModal(true);
                                                    }}
                                                >
                                                    Ver
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openEditModal(item)}
                                                >
                                                    Editar
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal para crear/editar producto */}
            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre *</label>
                                <Input
                                    placeholder="Nombre del producto"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Categoría *</label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({...formData, category: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="medicamento">Medicamento</SelectItem>
                                        <SelectItem value="vacuna">Vacuna</SelectItem>
                                        <SelectItem value="suministro">Suministro</SelectItem>
                                        <SelectItem value="alimento">Alimento</SelectItem>
                                        <SelectItem value="accesorio">Accesorio</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Descripción</label>
                            <Textarea
                                placeholder="Descripción detallada del producto"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SKU (Código)</label>
                                <Input
                                    placeholder="Código único del producto"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Proveedor</label>
                                <Input
                                    placeholder="Nombre del proveedor"
                                    value={formData.supplier}
                                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cantidad</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    min="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Stock Mínimo</label>
                                <Input
                                    type="number"
                                    placeholder="5"
                                    value={formData.min_quantity}
                                    onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                                    min="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Precio Unitario ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fecha de Expiración (opcional)</label>
                            <Input
                                type="date"
                                value={formData.expiration_date}
                                onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
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
                        <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                            {editingItem ? 'Actualizar Producto' : 'Agregar Producto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para ver detalles */}
            <Dialog open={openDetailModal} onOpenChange={setOpenDetailModal}>
                <DialogContent className="max-w-3xl">
                    {selectedItem && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Detalles del Producto: {selectedItem.name}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {getCategoryIcon(selectedItem.category)}
                                                Información General
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Nombre</p>
                                                <p className="font-medium">{selectedItem.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Categoría</p>
                                                <Badge className={getCategoryColor(selectedItem.category)}>
                                                    {getCategoryLabel(selectedItem.category)}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">SKU</p>
                                                <p className="font-medium">{selectedItem.sku || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Proveedor</p>
                                                <p className="font-medium">{selectedItem.supplier || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Estado</p>
                                                <Badge className={selectedItem.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                    {selectedItem.active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <DollarSign className="w-5 h-5" />
                                                Información de Stock
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Stock Actual</p>
                                                <div className="flex items-center gap-2">
                                                    {isLowStock(selectedItem) && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                                    {isExpired(selectedItem) && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                                    {isNearExpiry(selectedItem) && !isExpired(selectedItem) && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                                    <p className={`font-bold text-xl ${
                                                        isExpired(selectedItem) ? "text-red-600" :
                                                            isNearExpiry(selectedItem) ? "text-yellow-600" :
                                                                isLowStock(selectedItem) ? "text-orange-600" : "text-foreground"
                                                    }`}>
                                                        {selectedItem.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Stock Mínimo</p>
                                                <p className="font-medium">{selectedItem.min_quantity}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Precio Unitario</p>
                                                <p className="font-bold text-blue-600 text-xl">${selectedItem.unit_price.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Valor Total en Stock</p>
                                                <p className="font-bold text-green-600 text-xl">${(selectedItem.total_value || 0).toFixed(2)}</p>
                                            </div>
                                            {selectedItem.expiration_date && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Fecha de Expiración</p>
                                                    <p className={`font-medium ${
                                                        isExpired(selectedItem) ? "text-red-600" :
                                                            isNearExpiry(selectedItem) ? "text-yellow-600" : "text-foreground"
                                                    }`}>
                                                        {format(new Date(selectedItem.expiration_date), "dd/MM/yyyy")}
                                                        {isExpired(selectedItem) && ' (Vencido)'}
                                                        {isNearExpiry(selectedItem) && !isExpired(selectedItem) && ' (Próximo a vencer)'}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {selectedItem.description && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Descripción</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm whitespace-pre-line">{selectedItem.description}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Calendar className="w-5 h-5" />
                                            Información de Registro
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Registrado</p>
                                            <p className="font-medium">
                                                {format(new Date(selectedItem.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Última Actualización</p>
                                            <p className="font-medium">
                                                {format(new Date(selectedItem.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const newQuantity = prompt(`Nueva cantidad para ${selectedItem.name}:`, selectedItem.quantity.toString());
                                            if (newQuantity !== null) {
                                                updateStock(selectedItem.id, parseInt(newQuantity) || 0);
                                                setOpenDetailModal(false);
                                            }
                                        }}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Ajustar Stock
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setOpenDetailModal(false);
                                            openEditModal(selectedItem);
                                        }}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Producto
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

export default Inventario;