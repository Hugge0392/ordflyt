import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { LessonCategory } from '@shared/schema';

interface CategoryBrowserViewProps {
  categories: LessonCategory[];
  onCategorySelect: (category: LessonCategory) => void;
  onSubcategorySelect?: (subcategory: LessonCategory) => void;
  selectedCategory?: LessonCategory;
  subcategories?: LessonCategory[];
  breadcrumbs?: { name: string; onClick: () => void }[];
}

export function CategoryBrowserView({
  categories,
  onCategorySelect,
  onSubcategorySelect,
  selectedCategory,
  subcategories = [],
  breadcrumbs = []
}: CategoryBrowserViewProps) {

  // Show subcategories if a category is selected and has subcategories
  const showSubcategories = selectedCategory && subcategories.length > 0;
  const displayCategories = showSubcategories ? subcategories : categories.filter(c => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <span>/</span>}
              <Button
                variant="ghost"
                size="sm"
                onClick={breadcrumb.onClick}
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
              >
                {breadcrumb.name}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      {selectedCategory && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (breadcrumbs.length > 1) {
                // Navigate one level up
                breadcrumbs[breadcrumbs.length - 2].onClick();
              } else {
                // Go back to top level
                onCategorySelect(selectedCategory);
              }
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </div>
      )}

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCategories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          
          return (
            <Card
              key={category.id}
              className="relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group border-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}25 100%)`,
                borderLeft: `4px solid ${category.color}`
              }}
              onClick={() => {
                if (showSubcategories && onSubcategorySelect) {
                  onSubcategorySelect(category);
                } else {
                  onCategorySelect(category);
                }
              }}
              data-testid={`card-category-${category.id}`}
            >
              <CardContent className="p-8 text-center">
                {/* Icon */}
                <div
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <IconComponent
                    className="h-10 w-10"
                    style={{ color: category.color }}
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2 text-gray-900">
                  {category.swedishName || category.name}
                </h3>

                {/* Description */}
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                {/* Subcategory indicator */}
                {!showSubcategories && subcategories.filter(sub => sub.parentId === category.id).length > 0 && (
                  <Badge variant="outline" className="mb-2">
                    {subcategories.filter(sub => sub.parentId === category.id).length} underkategorier
                  </Badge>
                )}
              </CardContent>

              {/* Hover Effect Overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                style={{ backgroundColor: category.color }}
              />
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {displayCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              📁
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {showSubcategories ? 'Inga underkategorier' : 'Inga kategorier'}
          </h3>
          <p className="text-gray-600">
            {showSubcategories 
              ? 'Denna kategori har inga underkategorier än.'
              : 'Det finns inga kategorier att visa än.'
            }
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get icon component
function getIconComponent(iconName?: string) {
  // Map icon names to components - you can extend this as needed
  const iconMap: Record<string, any> = {
    'book-open': () => <span>📚</span>,
    'language': () => <span>🌍</span>,
    'brain': () => <span>🧠</span>,
    'mic': () => <span>🎤</span>,
    'pencil': () => <span>✏️</span>,
    'users': () => <span>👥</span>,
  };

  // Default icons based on common patterns or fallback
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }

  // Fallback icon
  return () => <span>📖</span>;
}