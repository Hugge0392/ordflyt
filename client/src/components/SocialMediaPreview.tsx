import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
} from 'lucide-react';

interface SocialMediaPreviewProps {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  heroImageUrl?: string;
  socialImageUrl?: string;
  slug: string;
}

export default function SocialMediaPreview({
  title,
  metaTitle,
  metaDescription,
  heroImageUrl,
  socialImageUrl,
  slug,
}: SocialMediaPreviewProps) {
  const displayTitle = metaTitle || title || 'Din bloggpost titel';
  const displayDescription = metaDescription || 'Din meta beskrivning här...';
  const displayImage = socialImageUrl || heroImageUrl || '/placeholder-social.jpg';
  const displayUrl = `dinapp.se/lektionsmaterial/${slug || 'din-slug'}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <Share2 className="h-5 w-5 mr-2" />
          Social Media Förhandsvisning
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Se hur din bloggpost visas när den delas på sociala medier
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="facebook">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="facebook">
              <Facebook className="h-4 w-4 mr-1" />
              Facebook
            </TabsTrigger>
            <TabsTrigger value="twitter">
              <Twitter className="h-4 w-4 mr-1" />
              Twitter
            </TabsTrigger>
            <TabsTrigger value="linkedin">
              <Linkedin className="h-4 w-4 mr-1" />
              LinkedIn
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Facebook Preview */}
          <TabsContent value="facebook" className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    O
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Ordflyt</div>
                    <div className="text-xs text-gray-500">Precis nu · 🌍</div>
                  </div>
                </div>
              </div>
              <div className="aspect-[1.91/1] bg-gray-100">
                <img
                  src={displayImage}
                  alt="Social preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="p-3 bg-gray-50 border-t">
                <div className="text-xs text-gray-500 uppercase mb-1">
                  {displayUrl}
                </div>
                <div className="font-semibold text-base line-clamp-2">
                  {displayTitle}
                </div>
                <div className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {displayDescription}
                </div>
              </div>
            </div>
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-900">
                <strong>Rekommenderad bildstorlek:</strong> 1200 x 630 pixlar
              </p>
            </div>
          </TabsContent>

          {/* Twitter Preview */}
          <TabsContent value="twitter" className="mt-4">
            <div className="border rounded-2xl overflow-hidden bg-white">
              <div className="p-3 border-b">
                <div className="flex items-start gap-2">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold">
                    O
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm">Ordflyt</span>
                      <span className="text-gray-500 text-sm">@ordflyt · 2m</span>
                    </div>
                    <div className="text-sm mt-1">
                      Ny bloggpost! 📚✨
                    </div>
                  </div>
                </div>
              </div>
              <div className="border rounded-2xl overflow-hidden m-3 mt-2">
                <div className="aspect-[2/1] bg-gray-100">
                  <img
                    src={displayImage}
                    alt="Social preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-3 border-t">
                  <div className="font-semibold text-sm line-clamp-2">
                    {displayTitle}
                  </div>
                  <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                    {displayDescription}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    🔗 {displayUrl}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-900">
                <strong>Rekommenderad bildstorlek:</strong> 1200 x 600 pixlar
              </p>
            </div>
          </TabsContent>

          {/* LinkedIn Preview */}
          <TabsContent value="linkedin" className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold">
                    O
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Ordflyt</div>
                    <div className="text-xs text-gray-500">
                      Utbildning · 124 följare
                    </div>
                    <div className="text-xs text-gray-500">2m · 🌍</div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  Läs vår senaste bloggpost! 📖
                </div>
              </div>
              <div className="aspect-[1.91/1] bg-gray-100">
                <img
                  src={displayImage}
                  alt="Social preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="p-3 bg-gray-50">
                <div className="font-semibold text-base line-clamp-2">
                  {displayTitle}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {displayUrl}
                </div>
              </div>
            </div>
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-900">
                <strong>Rekommenderad bildstorlek:</strong> 1200 x 627 pixlar
              </p>
            </div>
          </TabsContent>

          {/* WhatsApp Preview */}
          <TabsContent value="whatsapp" className="mt-4">
            <div className="bg-[#e5ddd5] p-4 rounded-lg">
              <div className="bg-white rounded-lg shadow max-w-sm">
                <div className="aspect-[1.91/1] bg-gray-100 rounded-t-lg overflow-hidden">
                  <img
                    src={displayImage}
                    alt="Social preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-3 border-t-4 border-green-500">
                  <div className="font-semibold text-sm line-clamp-2">
                    {displayTitle}
                  </div>
                  <div className="text-xs text-gray-600 line-clamp-3 mt-1">
                    {displayDescription}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {displayUrl}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                <div className="bg-white rounded-full px-2 py-1">
                  10:34
                </div>
                <Badge variant="outline" className="bg-white">
                  ✓✓ Läst
                </Badge>
              </div>
            </div>
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-900">
                <strong>Tips:</strong> WhatsApp använder samma Open Graph data som Facebook
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Warnings */}
        {!displayImage.startsWith('http') && displayImage !== '/placeholder-social.jpg' && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-900">
              ⚠️ Ingen social media-bild vald. Lägg till en bild för bästa resultat vid delning.
            </p>
          </div>
        )}

        {displayDescription.length < 120 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">
              💡 Meta-beskrivningen är kort ({displayDescription.length} tecken). Rekommenderat: 120-160 tecken.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
