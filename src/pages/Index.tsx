import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        
        setProducts(productsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 min-h-screen">
      <div className="mb-16 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 text-foreground">
          รายการสินค้า
        </h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6 transition-all duration-700 hover:w-32"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product, index) => (
          <Card
            key={product.id}
            className="group overflow-hidden border-border/40 bg-card hover:bg-accent/5 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-in fade-in zoom-in-95"
            style={{ 
              animationFillMode: "both", 
              animationDelay: `${index * 100}ms`, 
              animationDuration: "800ms" 
            }}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              <img
                src={product.imageUrl || "/placeholder.svg"}
                alt={product.name}
                className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            <CardContent className="p-6 relative bg-background/80 backdrop-blur-md border-t border-border/50">
              <h3 className="font-semibold text-xl mb-2 line-clamp-1 text-foreground transition-colors group-hover:text-primary">
                {product.name}
              </h3>
              <p className="text-2xl font-bold text-primary">
                ฿{product.price.toLocaleString()}
              </p>
            </CardContent>
            
            <CardFooter className="p-6 pt-0 bg-background/80 backdrop-blur-md">
              <Link to={`/product/${product.id}`} className="w-full">
                <Button className="w-full transition-all duration-300 active:scale-95 hover:shadow-lg relative overflow-hidden group/btn">
                  <span className="relative z-10 transition-transform duration-300 group-hover/btn:scale-105">
                    สั่งซื้อสินค้า
                  </span>
                  <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
