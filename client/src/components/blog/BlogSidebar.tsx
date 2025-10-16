import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useState } from "react";

interface PopularPost {
  title: string;
  href: string;
}

interface BlogSidebarProps {
  popularPosts?: PopularPost[];
  tags?: string[];
}

export function BlogSidebar({
  popularPosts = [],
  tags = []
}: BlogSidebarProps) {
  const [email, setEmail] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const query = formData.get('q');
    if (query) {
      window.location.href = `/sok?q=${encodeURIComponent(query.toString())}`;
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement subscription
    console.log('Subscribe:', email);
  };

  return (
    <aside className="sidebar space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sök</CardTitle>
        </CardHeader>
        <CardContent>
          <form role="search" onSubmit={handleSearch} className="flex gap-2">
            <label htmlFor="q" className="sr-only">
              Sök bland artiklar och lektioner
            </label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="q"
                name="q"
                type="search"
                placeholder="Sök artiklar..."
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">Sök</Button>
          </form>
        </CardContent>
      </Card>

      {/* Popular Posts */}
      {popularPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle id="pop" className="text-lg">Populära artiklar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="link-list space-y-3" aria-labelledby="pop">
              {popularPosts.map((post, index) => (
                <li key={index}>
                  <Link
                    href={post.href}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle id="tags" className="text-lg">Taggar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="tags flex flex-wrap gap-2" aria-labelledby="tags">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/tagg/${tag}`}
                    className="inline-block px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Newsletter Subscription */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200/50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl" />
        <CardHeader className="relative z-10">
          <CardTitle id="sub" className="text-lg text-gray-800">Prenumerera</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleSubscribe} aria-labelledby="sub" className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">
              Få de senaste artiklarna och lektionerna direkt i din inbox
            </p>
            <Input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Din e-postadress"
              required
              aria-label="E-postadress för prenumeration"
              className="border-blue-200 focus:border-blue-400"
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
              data-cta="subscribe"
            >
              Prenumerera
            </Button>
          </form>
        </CardContent>
      </Card>
    </aside>
  );
}
