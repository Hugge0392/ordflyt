import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Coins, 
  Star,
  ArrowLeft,
  Sparkles,
  Shirt,
  Home,
  Palette,
  Crown,
  Gem,
  Eye,
  Check,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  type ShopItem, 
  type StudentCurrency,
  type StudentPurchase
} from "@shared/schema";

export default function StudentShop() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("avatar");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Get current student data
  const { data: studentData, isLoading: studentLoading } = useQuery<{
    student: {
      id: string;
      username: string;
      studentName: string;
      classId: string;
      mustChangePassword: boolean;
      lastLogin: string | null;
      createdAt: string;
    };
    session: {
      id: string;
      expiresAt: string;
    };
  }>({
    queryKey: ["/api/student/me"],
    enabled: isAuthenticated && user?.role === "ELEV",
  });

  const currentStudent = studentData?.student;

  // Fetch student currency
  const { data: currency, isLoading: currencyLoading, error: currencyError } = useQuery<StudentCurrency>({
    queryKey: [`/api/students/${currentStudent?.id}/currency`],
    enabled: !!currentStudent?.id,
  });

  // Fetch shop items
  const { data: shopItems = [], isLoading: itemsLoading, error: itemsError } = useQuery<ShopItem[]>({
    queryKey: ["/api/shop/items", selectedCategory, selectedSubcategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
      
      const url = `/api/shop/items${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: 2,
  });


  // Set page title and meta description
  useEffect(() => {
    document.title = "Butiken | KlassKamp";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Köp avatar-kläder, rumsdekoration och teman med mynt du tjänat från lektioner. Anpassa din spelupplevelse!');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Köp avatar-kläder, rumsdekoration och teman med mynt du tjänat från lektioner. Anpassa din spelupplevelse!';
      document.head.appendChild(meta);
    }
  }, []);

  // Fetch student purchases
  const { data: purchases = [], error: purchasesError } = useQuery<StudentPurchase[]>({
    queryKey: [`/api/students/${currentStudent?.id}/purchases`],
    enabled: !!currentStudent?.id,
  });

  // Display currency/purchase errors if present
  useEffect(() => {
    if (currencyError) {
      toast({
        title: "Kunde inte ladda dina mynt",
        description: "Försöker igen automatiskt...",
        variant: "destructive",
      });
    }
    if (purchasesError) {
      toast({
        title: "Kunde inte ladda dina köp",  
        description: "Vissa funktioner kanske inte fungerar som förväntat.",
        variant: "destructive",
      });
    }
  }, [currencyError, purchasesError, toast]);

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!currentStudent?.id) throw new Error("Ingen student inloggad");
      return apiRequest(`/api/students/${currentStudent.id}/purchases`, 'POST', { itemId });
    },
    onSuccess: () => {
      if (currentStudent?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/students/${currentStudent.id}/currency`] });
        queryClient.invalidateQueries({ queryKey: [`/api/students/${currentStudent.id}/purchases`] });
      }
      toast({
        title: "Köp genomfört! 🎉",
        description: "Varan har lagts till i din samling.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Köpet misslyckades",
        description: error.message || "Något gick fel. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (item: ShopItem) => {
    purchaseMutation.mutate(item.id);
  };

  const handlePreview = (item: ShopItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  const isItemOwned = (itemId: string) => {
    return purchases.some(purchase => purchase.itemId === itemId);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
      case 'rare': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600';
      case 'epic': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600';
      case 'legendary': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'rare': return <Star className="w-3 h-3" />;
      case 'epic': return <Gem className="w-3 h-3" />;
      case 'legendary': return <Crown className="w-3 h-3" />;
      default: return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'avatar': return <Shirt className="w-5 h-5" />;
      case 'room': return <Home className="w-5 h-5" />;
      case 'theme': return <Palette className="w-5 h-5" />;
      default: return <ShoppingCart className="w-5 h-5" />;
    }
  };

  const getSubcategories = (category: string) => {
    const subcategoryMap: Record<string, string[]> = {
      avatar: ['hair', 'clothes', 'accessories'],
      room: ['furniture', 'decoration', 'lighting', 'carpet'],
      theme: ['background']
    };
    return subcategoryMap[category] || [];
  };

  const getSubcategoryDisplayName = (subcategory: string) => {
    const nameMap: Record<string, string> = {
      hair: 'Frisyrer',
      clothes: 'Kläder', 
      accessories: 'Accessoarer',
      furniture: 'Möbler',
      decoration: 'Dekorationer',
      lighting: 'Belysning',
      carpet: 'Mattor',
      background: 'Teman'
    };
    return nameMap[subcategory] || subcategory;
  };

  const filteredItems = shopItems.filter(item => 
    !selectedSubcategory || item.subcategory === selectedSubcategory
  );

  // Show loading while auth or student data is loading
  if (authLoading || studentLoading || (isAuthenticated && !currentStudent)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 dark:from-pink-950 to-purple-100 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔄</div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Laddar elevprofil...</div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated as student
  if (!isAuthenticated || user?.role !== "ELEV") {
    window.location.href = "/login";
    return null;
  }

  if (itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 dark:from-pink-950 to-purple-100 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🛍️</div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Laddar butiken...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (itemsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 dark:from-pink-950 to-purple-100 dark:to-purple-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Kunde inte ladda butiken
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Något gick fel när vi försökte ladda varorna.
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/shop/items"] })}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            Försök igen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 dark:from-pink-950 via-purple-50 dark:via-purple-950 to-blue-100 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/elev">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-600"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tillbaka
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-pink-500" />
                  Butiken
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Anpassa din avatar och ditt rum</p>
              </div>
            </div>
            
            {/* Currency display */}
            <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900 px-4 py-2 rounded-full">
              <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-bold text-yellow-800 dark:text-yellow-200" data-testid="text-currency">
                {currency?.currentCoins || 150} mynt
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          {/* Category tabs */}
          <TabsList className="grid w-full grid-cols-3 bg-white/70 dark:bg-gray-800/70">
            <TabsTrigger value="avatar" className="flex items-center gap-2" data-testid="tab-avatar">
              <Shirt className="w-4 h-4" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="room" className="flex items-center gap-2" data-testid="tab-room">
              <Home className="w-4 h-4" />
              Rum
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2" data-testid="tab-theme">
              <Palette className="w-4 h-4" />
              Teman
            </TabsTrigger>
          </TabsList>

          {/* Content for each category */}
          <TabsContent value="avatar" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Avatar anpassning</h2>
              
              {/* Subcategory filters */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={selectedSubcategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubcategory(null)}
                  data-testid="button-subcategory-all"
                >
                  Alla
                </Button>
                {getSubcategories('avatar').map(subcategory => (
                  <Button
                    key={subcategory}
                    variant={selectedSubcategory === subcategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubcategory(subcategory)}
                    data-testid={`button-subcategory-${subcategory}`}
                  >
                    {getSubcategoryDisplayName(subcategory)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="room" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Rum dekorationer</h2>
              
              {/* Subcategory filters */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={selectedSubcategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubcategory(null)}
                  data-testid="button-subcategory-all"
                >
                  Alla
                </Button>
                {getSubcategories('room').map(subcategory => (
                  <Button
                    key={subcategory}
                    variant={selectedSubcategory === subcategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubcategory(subcategory)}
                    data-testid={`button-subcategory-${subcategory}`}
                  >
                    {getSubcategoryDisplayName(subcategory)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Teman för huvudmeny</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Ändra utseendet på din hemskärm med coola teman!
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Items grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => {
            const owned = isItemOwned(item.id);
            const canAfford = (currency?.currentCoins || 150) >= item.price;
            
            return (
              <Card 
                key={item.id}
                className={`group hover:shadow-lg dark:hover:shadow-gray-800/50 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-white/20 dark:border-gray-700/20 ${
                  owned ? 'ring-2 ring-green-400 dark:ring-green-600' : ''
                }`}
                data-testid={`card-shop-item-${item.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="relative">
                    {/* Item preview/icon */}
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 dark:from-gray-800 to-gray-200 dark:to-gray-700 rounded-lg flex items-center justify-center text-4xl mb-3">
                      {item.category === 'avatar' && '👤'}
                      {item.category === 'room' && '🏠'}
                      {item.category === 'theme' && '🎨'}
                    </div>
                    
                    {/* Rarity badge */}
                    <Badge 
                      className={`absolute top-2 right-2 text-xs flex items-center gap-1 ${getRarityColor(item.rarity || 'common')}`}
                      data-testid={`badge-rarity-${item.id}`}
                    >
                      {getRarityIcon(item.rarity || 'common')}
                      {(item.rarity || 'common').charAt(0).toUpperCase() + (item.rarity || 'common').slice(1)}
                    </Badge>

                    {/* Owned indicator */}
                    {owned && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  
                  <CardTitle className="text-lg dark:text-gray-100">{item.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                        {item.price}
                      </span>
                    </div>
                    
                    {/* Level requirement */}
                    {item.requiresLevel && item.requiresLevel > 1 && (
                      <Badge variant="outline" className="text-xs">
                        Nivå {item.requiresLevel}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(item)}
                      data-testid={`button-preview-${item.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Förhandsvisa
                    </Button>
                    
                    {!owned && (
                      <Button
                        size="sm"
                        className={`flex-1 ${
                          canAfford 
                            ? 'bg-pink-500 hover:bg-pink-600 text-white' 
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!canAfford || purchaseMutation.isPending}
                        onClick={() => handlePurchase(item)}
                        data-testid={`button-purchase-${item.id}`}
                      >
                        {purchaseMutation.isPending ? (
                          <div className="animate-spin">⏳</div>
                        ) : canAfford ? (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Köp
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Inte råd
                          </>
                        )}
                      </Button>
                    )}
                    
                    {owned && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-green-600 dark:text-green-400 border-green-600 dark:border-green-400"
                        disabled
                        data-testid={`button-owned-${item.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Ägs
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && !itemsLoading && (
          <div className="text-center py-12">
            <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-8 max-w-md mx-auto">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                {selectedSubcategory 
                  ? `Inga ${getSubcategoryDisplayName(selectedSubcategory).toLowerCase()} hittades`
                  : 'Inga varor hittades'
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                Fler varor kommer att läggas till snart! Genomför lektioner för att tjäna mynt.
              </p>
              <Link href="/elev">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  Tillbaka till lektioner
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Förhandsvisa: {previewItem?.name}
            </DialogTitle>
            <DialogDescription>
              Se hur {previewItem?.name} kommer att se ut
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="w-full h-48 bg-gradient-to-br from-gray-100 dark:from-gray-800 to-gray-200 dark:to-gray-700 rounded-lg flex items-center justify-center text-6xl mb-4">
              {previewItem?.category === 'avatar' && '👤'}
              {previewItem?.category === 'room' && '🏠'} 
              {previewItem?.category === 'theme' && '🎨'}
            </div>
            
            <div className="text-center">
              <h3 className="font-bold text-lg dark:text-gray-100">{previewItem?.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{previewItem?.description}</p>
              
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span>{previewItem?.price} mynt</span>
                </div>
                <Badge className={getRarityColor(previewItem?.rarity || 'common')}>
                  {previewItem?.rarity || 'common'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsPreviewOpen(false)}
            >
              Stäng
            </Button>
            {previewItem && !isItemOwned(previewItem.id) && (
              <Button 
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                disabled={!((currency?.currentCoins || 150) >= previewItem.price) || purchaseMutation.isPending}
                onClick={() => {
                  handlePurchase(previewItem);
                  setIsPreviewOpen(false);
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Köp nu
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}