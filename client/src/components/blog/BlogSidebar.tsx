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
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle id="sub" className="text-lg">Prenumerera</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubscribe} aria-labelledby="sub" className="space-y-3">
            <p className="text-sm text-gray-600">
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
            />
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
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
