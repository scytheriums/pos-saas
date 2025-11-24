import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithSettings } from "@/lib/format";
import { useTenantSettings } from "@/contexts/SettingsContext";

interface ProductStat {
    id: string;
    name: string;
    revenue: number;
    profit: number;
    sales: number;
}

interface TopProductsTableProps {
    data: ProductStat[];
}

export function TopProductsTable({ data }: TopProductsTableProps) {
    const settings = useTenantSettings();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Sales</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((product, index) => {
                            const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                            return (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell className="text-right">{product.sales}</TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrencyWithSettings(product.revenue, settings)}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        {formatCurrencyWithSettings(product.profit, settings)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {margin.toFixed(1)}%
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
