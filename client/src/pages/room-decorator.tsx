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
  Home, 
  Sofa, 
  Lamp, 
  Flower,
  Palette,
  Save,
  Undo2,
  Lock,
  CheckCircle2,
  Eye,
  Grid3X3
} from 'lucide-react';
import type { ShopItem, StudentPurchase, StudentRoom } from '@shared/schema';

interface RoomLayout {
  furniture?: string[];
  decorations?: string[];
  wallpaper?: string;
  flooring?: string;
  lighting?: string;
}

interface PlacedItem {
  itemId: string;
  x: number;
  y: number;
}

export default function RoomDecorator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('furniture');
  const [currentRoom, setCurrentRoom] = useState<RoomLayout>({
    furniture: [],
    decorations: [],
  });
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [itemToPlace, setItemToPlace] = useState<ShopItem | null>(null);
  
  // Fetch current student room
  const { data: studentRoom, isLoading: roomLoading } = useQuery<StudentRoom>({
    queryKey: ['/api/student-room'],
    enabled: !!user && user.role === 'ELEV',
  });

  // Fetch purchased room items  
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<StudentPurchase[]>({
    queryKey: ['/api/student-purchases'],
    enabled: !!user && user.role === 'ELEV',
  });

  // Fetch all room items
  const { data: allItems = [], isLoading: itemsLoading } = useQuery<ShopItem[]>({
    queryKey: ['/api/shop-items'],
    enabled: !!user && user.role === 'ELEV',
  });

  // Save room mutation
  const saveRoomMutation = useMutation({
    mutationFn: async (roomData: { layout: RoomLayout; placedItems: PlacedItem[] }) => {
      return apiRequest('/api/student-room', 'POST', {
        wallpaperItemId: roomData.layout.wallpaper || null,
        flooringItemId: roomData.layout.flooring || null,
        lightingItemId: roomData.layout.lighting || null,
        furnitureItems: roomData.layout.furniture || [],
        decorationItems: roomData.layout.decorations || [],
        customLayout: roomData.placedItems,
      });
    },
    onSuccess: () => {
      toast({
        title: "Rum sparat!",
        description: "Ditt rum har uppdaterats framgångsrikt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/student-room'] });
    },
    onError: (error: any) => {
      console.error('Error saving room:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara ditt rum. Försök igen.",
        variant: "destructive",
      });
    },
  });

  // Filter items by category and owned status
  const roomItems = allItems.filter(item => item.category === 'Rum');
  const ownedItemIds = new Set(purchases.map(p => p.itemId));
  
  const getItemsBySubcategory = (subcategory: string) => {
    return roomItems.filter(item => {
      const tags = item.tags || [];
      return tags.includes(subcategory);
    });
  };

  // Initialize room from saved data
  useState(() => {
    if (studentRoom && !roomLoading) {
      setCurrentRoom({
        furniture: studentRoom.furnitureItems || [],
        decorations: studentRoom.decorationItems || [],
        wallpaper: studentRoom.wallpaperItemId || undefined,
        flooring: studentRoom.flooringItemId || undefined,
        lighting: studentRoom.lightingItemId || undefined,
      });
      setPlacedItems(studentRoom.customLayout as PlacedItem[] || []);
    }
  });

  // Handle item selection for background items (wallpaper, flooring, lighting)
  const handleBackgroundItemSelect = (item: ShopItem, category: string) => {
    if (!ownedItemIds.has(item.id)) {
      toast({
        title: "Item inte ägt",
        description: "Du måste köpa detta item i butiken först!",
        variant: "destructive",
      });
      return;
    }

    setCurrentRoom(prev => ({
      ...prev,
      [category]: item.id
    }));
  };

  // Handle furniture/decoration item placement
  const handleItemPlace = (item: ShopItem) => {
    if (!ownedItemIds.has(item.id)) {
      toast({
        title: "Item inte ägt",
        description: "Du måste köpa detta item i butiken först!",
        variant: "destructive",
      });
      return;
    }

    setItemToPlace(item);
    setIsPlacingMode(true);
  };

  // Handle room click for item placement
  const handleRoomClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingMode || !itemToPlace) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Add item to placed items
    setPlacedItems(prev => [
      ...prev,
      { itemId: itemToPlace.id, x, y }
    ]);

    // Add to appropriate category
    const tags = itemToPlace.tags || [];
    if (tags.includes('furniture')) {
      setCurrentRoom(prev => ({
        ...prev,
        furniture: [...(prev.furniture || []), itemToPlace.id]
      }));
    } else if (tags.includes('decorations')) {
      setCurrentRoom(prev => ({
        ...prev,
        decorations: [...(prev.decorations || []), itemToPlace.id]
      }));
    }

    // Exit placing mode
    setIsPlacingMode(false);
    setItemToPlace(null);
  };

  // Remove placed item
  const handleItemRemove = (itemId: string) => {
    setPlacedItems(prev => prev.filter(item => item.itemId !== itemId));
    
    setCurrentRoom(prev => ({
      ...prev,
      furniture: prev.furniture?.filter(id => id !== itemId) || [],
      decorations: prev.decorations?.filter(id => id !== itemId) || [],
    }));
  };

  // Remove background item
  const handleBackgroundItemRemove = (category: string) => {
    setCurrentRoom(prev => ({
      ...prev,
      [category]: undefined
    }));
  };

  // Reset to saved room
  const handleReset = () => {
    if (studentRoom) {
      setCurrentRoom({
        furniture: studentRoom.furnitureItems || [],
        decorations: studentRoom.decorationItems || [],
        wallpaper: studentRoom.wallpaperItemId || undefined,
        flooring: studentRoom.flooringItemId || undefined,
        lighting: studentRoom.lightingItemId || undefined,
      });
      setPlacedItems(studentRoom.customLayout as PlacedItem[] || []);
    }
  };

  // Get item by ID
  const getItemById = (itemId: string) => {
    return allItems.find(item => item.id === itemId);
  };

  // Check if room has changes
  const hasChanges = () => {
    if (!studentRoom) {
      return (
        Object.keys(currentRoom).length > 0 || 
        placedItems.length > 0
      );
    }
    
    const savedPlacedItems = studentRoom.customLayout as PlacedItem[] || [];
    
    return (
      JSON.stringify(currentRoom.furniture?.sort()) !== JSON.stringify((studentRoom.furnitureItems || []).sort()) ||
      JSON.stringify(currentRoom.decorations?.sort()) !== JSON.stringify((studentRoom.decorationItems || []).sort()) ||
      currentRoom.wallpaper !== (studentRoom.wallpaperItemId || undefined) ||
      currentRoom.flooring !== (studentRoom.flooringItemId || undefined) ||
      currentRoom.lighting !== (studentRoom.lightingItemId || undefined) ||
      JSON.stringify(placedItems) !== JSON.stringify(savedPlacedItems)
    );
  };

  if (!user || user.role !== 'ELEV') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 text-center">
            <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Åtkomst nekad</h2>
            <p className="text-gray-600 mb-4">Du behöver vara inloggad som elev för att dekorera ditt rum.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = [
    { id: 'furniture', name: 'Möbler', icon: Sofa, description: 'Soffar, bord, stolar' },
    { id: 'decorations', name: 'Dekorationer', icon: Flower, description: 'Växter, tavlor, prydnader' },
    { id: 'wallpaper', name: 'Tapet', icon: Palette, description: 'Väggfärger och mönster' },
    { id: 'flooring', name: 'Golv', icon: Grid3X3, description: 'Mattor och golvbeläggning' },
    { id: 'lighting', name: 'Belysning', icon: Lamp, description: 'Lampor och ljuskällor' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-room-decorator">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-main">
          Rum Dekoratör
        </h1>
        <p className="text-muted-foreground text-lg">
          Dekorera ditt rum med items du köpt i butiken
        </p>
        {isPlacingMode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">
              Placeringsläge: Klicka i rummet för att placera "{itemToPlace?.name}"
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlacingMode(false);
                setItemToPlace(null);
              }}
              className="mt-2"
            >
              Avbryt placering
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Room Preview */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Ditt Rum
              </CardTitle>
              <CardDescription>
                Klicka för att placera möbler och dekorationer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Room Display Area */}
              <div 
                className={`aspect-square rounded-lg border-2 border-dashed border-blue-200 relative overflow-hidden ${
                  isPlacingMode ? 'cursor-crosshair border-blue-400' : 'cursor-default'
                }`}
                onClick={handleRoomClick}
                data-testid="room-canvas"
              >
                {/* Wallpaper */}
                <div className="absolute inset-0">
                  {currentRoom.wallpaper ? (
                    <img 
                      src={getItemById(currentRoom.wallpaper)?.imageUrl || '/placeholder-wallpaper.png'} 
                      alt="Tapet"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-blue-50 to-blue-100" />
                  )}
                </div>

                {/* Flooring */}
                {currentRoom.flooring && (
                  <div className="absolute bottom-0 left-0 right-0 h-1/3">
                    <img 
                      src={getItemById(currentRoom.flooring)?.imageUrl || '/placeholder-floor.png'} 
                      alt="Golv"
                      className="w-full h-full object-cover object-bottom"
                    />
                  </div>
                )}

                {/* Lighting overlay */}
                {currentRoom.lighting && (
                  <div className="absolute inset-0 bg-gradient-radial from-yellow-200/30 via-transparent to-transparent" />
                )}

                {/* Placed Items */}
                {placedItems.map((placedItem, index) => {
                  const item = getItemById(placedItem.itemId);
                  if (!item) return null;

                  return (
                    <div
                      key={`${placedItem.itemId}-${index}`}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                      style={{
                        left: `${placedItem.x}%`,
                        top: `${placedItem.y}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPlacingMode) {
                          handleItemRemove(placedItem.itemId);
                        }
                      }}
                      data-testid={`placed-item-${placedItem.itemId}`}
                    >
                      <img
                        src={item.iconUrl || '/placeholder-item.png'}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded shadow-lg group-hover:ring-2 group-hover:ring-red-400"
                      />
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                        {item.name} (klicka för att ta bort)
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {placedItems.length === 0 && !currentRoom.wallpaper && !currentRoom.flooring && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Home className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Ditt rum är tomt</p>
                      <p className="text-gray-400 text-xs">Välj items nedan för att dekorera</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Room Stats */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Rumsstatus:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Sofa className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">
                      {(currentRoom.furniture || []).length} möbler
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flower className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">
                      {(currentRoom.decorations || []).length} dekorationer
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Palette className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">
                      {currentRoom.wallpaper ? 'Tapet' : 'Ingen tapet'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Grid3X3 className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">
                      {currentRoom.flooring ? 'Golv' : 'Standard golv'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasChanges()}
                  data-testid="button-reset-room"
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Återställ
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveRoomMutation.mutate({ layout: currentRoom, placedItems })}
                  disabled={!hasChanges() || saveRoomMutation.isPending}
                  data-testid="button-save-room"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saveRoomMutation.isPending ? 'Sparar...' : 'Spara'}
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
                Välj från dina ägda items för att dekorera ditt rum
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

                      {/* Clear Selection Button for background items */}
                      {['wallpaper', 'flooring', 'lighting'].includes(category.id) && 
                       currentRoom[category.id as keyof RoomLayout] && (
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBackgroundItemRemove(category.id)}
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
                          const isSelected = ['wallpaper', 'flooring', 'lighting'].includes(category.id)
                            ? currentRoom[category.id as keyof RoomLayout] === item.id
                            : (currentRoom.furniture || []).includes(item.id) || 
                              (currentRoom.decorations || []).includes(item.id);

                          return (
                            <Card
                              key={item.id}
                              className={`cursor-pointer transition-all hover:shadow-md relative ${
                                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                              } ${!isOwned ? 'opacity-50' : ''}`}
                              onClick={() => {
                                if (['wallpaper', 'flooring', 'lighting'].includes(category.id)) {
                                  handleBackgroundItemSelect(item, category.id);
                                } else {
                                  handleItemPlace(item);
                                }
                              }}
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