import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Plus, FileText, Download } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Invoice {
    id: string;
    invoice_number: string;
    issue_date: string | null; // Corregido (antes solo string)
    total: number;
    status: string;
    cfdi_uuid: string | null;
    owners?: {
        full_name: string;
    };
    pets?: {
        name: string;
    };
}

const Facturacion = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
          id,
          invoice_number,
          issue_date,
          total,
          status,
          cfdi_uuid,
          owners (full_name),
          pets (name)
        `)
                .order('issue_date', { ascending: false });

            if (error) throw error;
            setInvoices((data as Invoice[]) || []);
        } catch (error: unknown) {
            toast.error('Error al cargar facturas');
            console.error('Error loading invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pendiente: 'bg-warning/10 text-warning',
            pagada: 'bg-success/10 text-success',
            cancelada: 'bg-destructive/10 text-destructive',
            vencida: 'bg-destructive/10 text-destructive',
        };
        return colors[status] || 'bg-muted text-muted-foreground';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pendiente: 'Pendiente',
            pagada: 'Pagada',
            cancelada: 'Cancelada',
            vencida: 'Vencida',
        };
        return labels[status] || status;
    };

    return (
        <Layout>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Facturación</h1>
                        <p className="text-muted-foreground">
                            Gestión de facturas y facturación electrónica CFDI 4.0
                        </p>
                    </div>
                    <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Factura
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Cargando facturas...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <Card className="shadow-soft">
                        <CardContent className="py-12 text-center">
                            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay facturas registradas</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {invoices.map((invoice) => (
                            <Card
                                key={invoice.id}
                                className="shadow-soft hover:shadow-medium transition-shadow"
                            >
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-lg">{invoice.invoice_number}</h3>
                                                <Badge className={getStatusColor(invoice.status)}>
                                                    {getStatusLabel(invoice.status)}
                                                </Badge>
                                                {invoice.cfdi_uuid && (
                                                    <Badge variant="outline">CFDI 4.0</Badge>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Cliente:</span>{' '}
                                                    <span className="font-medium">
                            {invoice.owners?.full_name || 'N/A'}
                          </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Paciente:</span>{' '}
                                                    <span className="font-medium">
                            {invoice.pets?.name || 'N/A'}
                          </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Fecha:</span>{' '}
                                                    <span className="font-medium">
                            {invoice.issue_date
                                ? format(new Date(invoice.issue_date), "d 'de' MMM, yyyy", { locale: es })
                                : 'N/A'}
                          </span>
                                                </div>
                                            </div>

                                            {invoice.cfdi_uuid && (
                                                <div className="text-xs text-muted-foreground">
                                                    UUID: {invoice.cfdi_uuid}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-right space-y-2">
                                            <div className="text-2xl font-bold text-primary">
                                                ${invoice.total.toFixed(2)}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">
                                                    <Download className="w-4 h-4 mr-1" />
                                                    PDF
                                                </Button>
                                                <Button size="sm" variant="outline">Ver</Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Facturacion;
