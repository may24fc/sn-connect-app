'use client';

import {
  type ResourceCategoryRecord,
  type ResourceCategoryTreeNode,
  buildCategoryTree,
  useCreateResourceCategory,
  useDeleteResourceCategory,
  useResourceCategories,
  useUpdateResourceCategory,
} from '@/hooks/useResourceCategories';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  FolderPlus,
  GraduationCap,
  Heart,
  type LucideIcon,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

// Map of known lucide icon names to icon components
const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  GraduationCap,
  ScrollText,
  Heart,
  Wrench,
  Users,
  Building2,
  FileText,
  TrendingUp,
  AlertTriangle,
  FolderPlus,
  Edit2,
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

function getIconComponent(iconName: string | null): LucideIcon | null {
  if (!iconName) return null;
  return ICON_MAP[iconName] || null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ===== Category Form Modal =====

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string;
  displayOrder: number;
  isActive: boolean;
}

function CategoryFormModal({
  mode,
  initialData,
  parentOptions,
  onSave,
  onCancel,
  isSaving,
}: {
  mode: 'create' | 'edit';
  initialData?: Partial<CategoryFormData>;
  parentOptions: Array<{ id: string; name: string }>;
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [icon, setIcon] = useState(initialData?.icon || '');
  const [parentId, setParentId] = useState(initialData?.parentId || 'none');
  const [displayOrder, setDisplayOrder] = useState(initialData?.displayOrder ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [autoSlug, setAutoSlug] = useState(mode === 'create');

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      slug,
      description,
      icon,
      parentId: parentId === 'none' ? '' : parentId,
      displayOrder,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-popover p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {mode === 'create' ? 'Create Category' : 'Edit Category'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Training Materials"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                placeholder="e.g., training_materials"
                required
                pattern="^[a-z0-9_-]+$"
                title="Lowercase alphanumeric with hyphens/underscores"
              />
              {mode === 'create' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSlug(slugify(name));
                    setAutoSlug(true);
                  }}
                >
                  Auto
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon || 'none'} onValueChange={(v) => setIcon(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No icon</SelectItem>
                {AVAILABLE_ICONS.map((iconName) => {
                  const IconComp = ICON_MAP[iconName];
                  return (
                    <SelectItem key={iconName} value={iconName}>
                      <span className="flex items-center gap-2">
                        {IconComp && <IconComp className="h-4 w-4" />}
                        {iconName}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="None (root category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (root category)</SelectItem>
                {parentOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="flex items-end space-x-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                />
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name || !slug}>
              {isSaving
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create'
                  : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Category Tree Row =====

function CategoryTreeRow({
  node,
  depth,
  onEdit,
  onDelete,
  isDeletingId,
}: {
  node: ResourceCategoryTreeNode;
  depth: number;
  onEdit: (category: ResourceCategoryRecord) => void;
  onDelete: (id: string) => void;
  isDeletingId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const IconComponent = getIconComponent(node.icon);

  return (
    <>
      <tr className={!node.isActive ? 'opacity-50' : undefined}>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            {IconComponent && (
              <IconComponent className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{node.name}</span>
            {!node.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
          {node.slug}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
          {node.description || '—'}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
          <Badge variant="secondary">{node.resourceCount}</Badge>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {node.displayOrder}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(node.id)}
              disabled={isDeletingId === node.id}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <CategoryTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeletingId={isDeletingId}
          />
        ))}
    </>
  );
}

// ===== Main Page =====

export default function ResourceCategoriesPage() {
  const { addToast } = useToast();
  const { data: categories, isLoading, error } = useResourceCategories({ includeInactive: true });
  const createCategory = useCreateResourceCategory();
  const updateCategory = useUpdateResourceCategory();
  const deleteCategory = useDeleteResourceCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ResourceCategoryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const tree = useMemo(() => {
    if (!categories) return [];
    return buildCategoryTree(categories);
  }, [categories]);

  const parentOptions = useMemo(() => {
    if (!categories) return [];
    return categories
      .filter((c) => !c.parentId) // Only root categories can be parents
      .map((c) => ({ id: c.id, name: c.name }));
  }, [categories]);

  const handleCreate = useCallback(
    (data: CategoryFormData) => {
      createCategory.mutate(
        {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          icon: data.icon || null,
          parentId: data.parentId || null,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
        },
        {
          onSuccess: () => {
            addToast({ title: 'Category created', variant: 'success' });
            setShowForm(false);
          },
          onError: (err) => {
            addToast({ title: 'Error', description: err.message, variant: 'error' });
          },
        }
      );
    },
    [createCategory, addToast]
  );

  const handleUpdate = useCallback(
    (data: CategoryFormData) => {
      if (!editingCategory) return;
      updateCategory.mutate(
        {
          id: editingCategory.id,
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          icon: data.icon || null,
          parentId: data.parentId || null,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
        },
        {
          onSuccess: () => {
            addToast({ title: 'Category updated', variant: 'success' });
            setEditingCategory(null);
          },
          onError: (err) => {
            addToast({ title: 'Error', description: err.message, variant: 'error' });
          },
        }
      );
    },
    [editingCategory, updateCategory, addToast]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm('Are you sure you want to delete this category?')) return;
      setDeletingId(id);
      deleteCategory.mutate(id, {
        onSuccess: () => {
          addToast({ title: 'Category deleted', variant: 'success' });
          setDeletingId(null);
        },
        onError: (err) => {
          addToast({ title: 'Error', description: err.message, variant: 'error' });
          setDeletingId(null);
        },
      });
    },
    [deleteCategory, addToast]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/resources">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Resources
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Resource Categories</h1>
            <p className="text-muted-foreground">
              Manage categories and subcategories for resources
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categories?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Root Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tree.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {categories?.filter((c) => c.isActive).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading categories...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">Failed to load categories.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-300">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-600 dark:text-zinc-300">
                      Resources
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-600 dark:text-zinc-300">
                      Order
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {tree.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        No categories yet. Create your first category.
                      </td>
                    </tr>
                  ) : (
                    tree.map((node) => (
                      <CategoryTreeRow
                        key={node.id}
                        node={node}
                        depth={0}
                        onEdit={setEditingCategory}
                        onDelete={handleDelete}
                        isDeletingId={deletingId}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      {showForm && (
        <CategoryFormModal
          mode="create"
          parentOptions={parentOptions}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          isSaving={createCategory.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <CategoryFormModal
          mode="edit"
          initialData={{
            name: editingCategory.name,
            slug: editingCategory.slug,
            description: editingCategory.description || '',
            icon: editingCategory.icon || '',
            parentId: editingCategory.parentId || '',
            displayOrder: editingCategory.displayOrder,
            isActive: editingCategory.isActive,
          }}
          parentOptions={parentOptions.filter((p) => p.id !== editingCategory.id)}
          onSave={handleUpdate}
          onCancel={() => setEditingCategory(null)}
          isSaving={updateCategory.isPending}
        />
      )}
    </div>
  );
}
