import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface PlaceholderProps {
  category: string;
}

export default function Placeholder({ category }: PlaceholderProps) {
  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'lasforstaelse': return 'Läsförståelse';
      case 'skrivande': return 'Skrivande';
      case 'muntligt': return 'Muntligt framförande';
      case 'nordiska-sprak': return 'Nordiska språk';
      case 'kallkritik': return 'Källkritik';
      default: return cat;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="text-6xl mb-6">🚧</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {getCategoryName(category)}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Den här sektionen är under utveckling och kommer snart att vara tillgänglig.
          </p>
          <p className="text-gray-500 mb-8">
            Just nu kan du utforska <strong>Grammatik</strong> som är fullt funktionell med ordklasser och interaktiva lektioner.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <span>←</span> Tillbaka till startsidan
              </Button>
            </Link>
            <Link href="/grammatik">
              <Button className="bg-blue-500 hover:bg-blue-600">
                Prova Grammatik
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}