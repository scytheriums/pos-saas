"use client";

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FolderTree, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

type Category = {
    id: string;
    name: string;
    parentId: string | null;
    productCount: number;
    children: Category[];
    path: string;
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryParent, setNewCategoryParent] = useState<string>('__root__');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCategoryName,
                    parentId: newCategoryParent === '__root__' ? null : newCategoryParent
                })
            });

            if (res.ok) {
                await fetchCategories();
                setIsCreateOpen(false);
                setNewCategoryName('');
                setNewCategoryParent('__root__');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create category');
            }
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('Failed to create category');
        }
    };

    const handleUpdate = async () => {
        if (!selectedCategory || !newCategoryName.trim()) return;

        try {
            const res = await fetch(`/api/categories/${selectedCategory.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName })
            });

            if (res.ok) {
                await fetchCategories();
                setIsEditOpen(false);
                setSelectedCategory(null);
                setNewCategoryName('');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to update category');
            }
        } catch (error) {
            console.error('Failed to update category:', error);
            alert('Failed to update category');
        }
    };

    const handleDelete = async (category: Category) => {
        if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

        try {
            const res = await fetch(`/api/categories/${category.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to delete category');
            }
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('Failed to delete category');
        }
    };

    const toggleExpand = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const openEditDialog = (category: Category) => {
        setSelectedCategory(category);
        setNewCategoryName(category.name);
        setIsEditOpen(true);
    };

    // Flatten categories for parent selector
    const flattenCategories = (cats: Category[], level = 0): { id: string; name: string; level: number }[] => {
        return cats.reduce((acc, cat) => {
            acc.push({ id: cat.id, name: cat.name, level });
            if (cat.children.length > 0) {
                acc.push(...flattenCategories(cat.children, level + 1));
            }
            return acc;
        }, [] as { id: string; name: string; level: number }[]);
    };

    const flatCategories = flattenCategories(categories);

    // Recursive category tree component
    const CategoryTreeItem = ({ category, level = 0 }: { category: Category; level?: number }) => {
        const hasChildren = category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);

        return (
            <div className="ml-4">
                <div className={`flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors ${level === 0 ? 'font-medium' : ''}`}>
                    {hasChildren ? (
                        <button onClick={() => toggleExpand(category.id)} className="p-1 hover:bg-muted rounded">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <div className="w-6" />
                    )}

                    <FolderTree className="h-4 w-4 text-muted-foreground" />

                    <span className="flex-1">{category.name}</span>

                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {category.productCount} products
                    </span>

                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(category)}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(category)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="ml-2 border-l-2 border-muted">
                        {category.children.map(child => (
                            <CategoryTreeItem key={child.id} category={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const totalCategories = flatCategories.length;
    const totalProducts = flatCategories.reduce((sum, cat) => {
        const fullCat = categories.find(c => c.id === cat.id);
        return sum + (fullCat?.productCount || 0);
    }, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Categories</h1>
                    <p className="text-xs text-muted-foreground">Organize your products with hierarchical categories</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-9 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Category</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">Category Name</Label>
                                <Input
                                    id="name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g., Electronics"
                                />
                            </div>
                            <div>
                                <Label htmlFor="parent">Parent Category (Optional)</Label>
                                <Select value={newCategoryParent} onValueChange={setNewCategoryParent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="None (Root Category)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__root__">None (Root Category)</SelectItem>
                                        {flatCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {'  '.repeat(cat.level)}└─ {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid gap-2 grid-cols-3">
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Total</p>
                            <p className="text-lg font-bold leading-none mt-1">{totalCategories}</p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Root</p>
                            <p className="text-lg font-bold leading-none mt-1">{categories.length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="py-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-none">Products</p>
                            <p className="text-lg font-bold leading-none mt-1">{totalProducts}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Category Tree */}
            <Card>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No categories yet. Create your first category to get started.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {categories.map(category => (
                                <CategoryTreeItem key={category.id} category={category} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="edit-name">Category Name</Label>
                            <Input
                                id="edit-name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
