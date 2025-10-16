import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Palette, 
  Shirt, 
  Eye,
  Save,
  Undo2,
  Star,
  Lock,
  CheckCircle2
} from 'lucide-react';
import type { ShopItem, StudentPurchase, StudentAvatar } from '@shared/schema';

interface AvatarPreview {
  hair?: string;
  face?: string;
  outfit?: string;
  accessory?: string;
  background?: string;
}

export default function AvatarBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('hair');
  const [currentAvatar, setCurrentAvatar] = useState<AvatarPreview>({});
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  
  // Fetch current student avatar
  const { data: studentAvatar, isLoading: avatarLoading } = useQuery<StudentAvatar>({
    queryKey: ['/api/student-avatar'],
    enabled: !!user && user.role === 'ELEV',
  });

  // Fetch purchased avatar items  
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<StudentPurchase[]>({
    queryKey: ['/api/student-purchases'],
    enabled: !!user && user.role === 'ELEV',
  });

  // Fetch all avatar items
  const { data: allItems = [], isLoading: itemsLoading } = useQuery<ShopItem[]>({
    queryKey: ['/api/shop-items'],
    enabled: !!user && user.role === 'ELEV',
  });

  // Save avatar mutation
  const saveAvatarMutation = useMutation({
    mutationFn: async (avatarData: AvatarPreview) => {
      return apiRequest('/api/student-avatar', 'POST', {
        hairItemId: avatarData.hair || null,
        faceItemId: avatarData.face || null,
        outfitItemId: avatarData.outfit || null,
        accessoryItemId: avatarData.accessory || null,
        backgroundItemId: avatarData.background || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Avatar sparad!",
        description: "Din avatar har uppdaterats framgångsrikt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/student-avatar'] });
    },
    onError: (error: any) => {
      console.error('Error saving avatar:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara din avatar. Försök igen.",
        variant: "destructive",
      });
    },
  });

  // Filter items by category and owned status
  const avatarItems = allItems.filter(item => item.category === 'Avatar');
  const ownedItemIds = new Set(purchases.map(p => p.itemId));
  
  const getItemsBySubcategory = (subcategory: string) => {
    return avatarItems.filter(item => {
      const tags = item.tags || [];
      return tags.includes(subcategory);
    });
  };

  // Initialize avatar from saved data
  useState(() => {
    if (studentAvatar && !avatarLoading) {
      setCurrentAvatar({
        hair: studentAvatar.hairItemId || undefined,
        face: studentAvatar.faceItemId || undefined,
        outfit: studentAvatar.outfitItemId || undefined,
        accessory: studentAvatar.accessoryItemId || undefined,
        background: studentAvatar.backgroundItemId || undefined,
      });
    }
  });

  // Handle item selection
  const handleItemSelect = (item: ShopItem, category: string) => {
    if (!ownedItemIds.has(item.id)) {
      toast({
        title: "Item inte ägt",
        description: "Du måste köpa detta item i butiken först!",
        variant: "destructive",
      });
      return;
    }

    setCurrentAvatar(prev => ({
      ...prev,
      [category]: item.id
    }));
  };

  // Remove item from avatar
  const handleItemRemove = (category: string) => {
    setCurrentAvatar(prev => ({
      ...prev,
      [category]: undefined
    }));
  };

  // Reset to saved avatar
  const handleReset = () => {
    if (studentAvatar) {
      setCurrentAvatar({
        hair: studentAvatar.hairItemId || undefined,
        face: studentAvatar.faceItemId || undefined,
        outfit: studentAvatar.outfitItemId || undefined,
        accessory: studentAvatar.accessoryItemId || undefined,
        background: studentAvatar.backgroundItemId || undefined,
      });
    }
  };

  // Get item by ID
  const getItemById = (itemId: string) => {
    return allItems.find(item => item.id === itemId);
  };

  // Check if avatar has changes
  const hasChanges = () => {
    if (!studentAvatar) return Object.keys(currentAvatar).length > 0;
    
    return (
      currentAvatar.hair !== (studentAvatar.hairItemId || undefined) ||
      currentAvatar.face !== (studentAvatar.faceItemId || undefined) ||
      currentAvatar.outfit !== (studentAvatar.outfitItemId || undefined) ||
      currentAvatar.accessory !== (studentAvatar.accessoryItemId || undefined) ||
      currentAvatar.background !== (studentAvatar.backgroundItemId || undefined)
    );
  };

  if (!user || user.role !== 'ELEV') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Åtkomst nekad</h2>
            <p className="text-gray-600 mb-4">Du behöver vara inloggad som elev för att anpassa din avatar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = [
    { id: 'hair', name: 'Hår', icon: User, description: 'Välj frisyr och hårfärg' },
    { id: 'face', name: 'Ansikte', icon: Eye, description: 'Ögon, näsa, mun' },
    { id: 'outfit', name: 'Kläder', icon: Shirt, description: 'Tröjor, byxor och skor' },
    { id: 'accessory', name: 'Accessoarer', icon: Star, description: 'Hattar, glasögon, smycken' },
    { id: 'background', name: 'Bakgrund', icon: Palette, description: 'Bakgrundsmönster och färger' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-avatar-builder">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-main">
          Avatar Builder
        </h1>
        <p className="text-muted-foreground text-lg">
          Anpassa din avatar med items du köpt i butiken
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar Preview */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Din Avatar
              </CardTitle>
              <CardDescription>
                Förhandsvisning av din avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar Display Area */}
              <div className="aspect-square bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center relative overflow-hidden">
                {/* Background */}
                {currentAvatar.background && (
                  <div className="absolute inset-0">
                    <img 
                      src={getItemById(currentAvatar.background)?.imageUrl || '/placeholder-bg.png'} 
                      alt="Bakgrund"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Avatar Base */}
                <div className="relative z-10 w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  {/* Face */}
                  {currentAvatar.face ? (
                    <img 
                      src={getItemById(currentAvatar.face)?.imageUrl || '/placeholder-face.png'} 
                      alt="Ansikte"
                      className="w-24 h-24 object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                  
                  {/* Hair overlay */}
                  {currentAvatar.hair && (
                    <img 
                      src={getItemById(currentAvatar.hair)?.imageUrl || '/placeholder-hair.png'} 
                      alt="Hår"
                      className="absolute top-0 left-0 w-full h-full object-cover rounded-full"
                    />
                  )}
                </div>

                {/* Outfit */}
                {currentAvatar.outfit && (
                  <img 
                    src={getItemById(currentAvatar.outfit)?.imageUrl || '/placeholder-outfit.png'} 
                    alt="Kläder"
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-20 h-20 object-cover"
                  />
                )}

                {/* Accessory */}
                {currentAvatar.accessory && (
                  <img 
                    src={getItemById(currentAvatar.accessory)?.imageUrl || '/placeholder-accessory.png'} 
                    alt="Accessoar"
                    className="absolute top-4 right-4 w-12 h-12 object-cover"
                  />
                )}
              </div>

              {/* Current Items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Nuvarande items:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {categories.map(category => {
                    const itemId = currentAvatar[category.id as keyof AvatarPreview];
                    const item = itemId ? getItemById(itemId) : null;
                    
                    return (
                      <div key={category.id} className="flex items-center gap-1">
                        <category.icon className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600 truncate">
                          {item ? item.name : 'Ingen'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasChanges()}
                  data-testid="button-reset-avatar"
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Återställ
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveAvatarMutation.mutate(currentAvatar)}
                  disabled={!hasChanges() || saveAvatarMutation.isPending}
                  data-testid="button-save-avatar"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saveAvatarMutation.isPending ? 'Sparar...' : 'Spara'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Item Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Välj Items</CardTitle>
              <CardDescription>
                Välj från dina ägda items för att anpassa din avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="grid w-full grid-cols-5">
                  {categories.map(category => (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id}
                      className="flex flex-col gap-1 h-auto py-2"
                      data-testid={`tab-${category.id}`}
                    >
                      <category.icon className="w-4 h-4" />
                      <span className="text-xs">{category.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map(category => (
                  <TabsContent key={category.id} value={category.id} className="mt-6">
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>

                      {/* Clear Selection Button */}
                      {currentAvatar[category.id as keyof AvatarPreview] && (
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemRemove(category.id)}
                            data-testid={`button-clear-${category.id}`}
                          >
                            Ta bort {category.name.toLowerCase()}
                          </Button>
                        </div>
                      )}

                      {/* Items Grid */}
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {getItemsBySubcategory(category.id).map(item => {
                          const isOwned = ownedItemIds.has(item.id);
                          const isSelected = currentAvatar[category.id as keyof AvatarPreview] === item.id;

                          return (
                            <Card
                              key={item.id}
                              className={`cursor-pointer transition-all hover:shadow-md relative ${
                                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                              } ${!isOwned ? 'opacity-50' : ''}`}
                              onClick={() => handleItemSelect(item, category.id)}
                              data-testid={`item-${item.id}`}
                            >
                              <CardContent className="p-3">
                                <div className="aspect-square rounded-lg bg-gray-100 mb-2 relative overflow-hidden">
                                  <img
                                    src={item.iconUrl || '/placeholder-item.png'}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                  {!isOwned && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <Lock className="w-6 h-6 text-white" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-1 right-1">
                                      <CheckCircle2 className="w-5 h-5 text-primary bg-white rounded-full" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  {isOwned ? (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      Ägs
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {item.price} mynt
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {getItemsBySubcategory(category.id).length === 0 && (
                        <div className="text-center py-8">
                          <category.icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Inga {category.name.toLowerCase()} items tillgängliga än</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{previewItem.name}</DialogTitle>
              <DialogDescription>
                {previewItem.description || 'Ingen beskrivning tillgänglig'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden">
                <img
                  src={previewItem.imageUrl || '/placeholder-item.png'}
                  alt={previewItem.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {previewItem.category}
                </Badge>
                <Badge variant="secondary">
                  {previewItem.price} mynt
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewItem(null)}>
                Stäng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}